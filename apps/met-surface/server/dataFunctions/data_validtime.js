/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataDiffUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

/* eslint-disable no-await-in-loop */

global.dataValidTime = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.validtime,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  const queryArray = [];
  const differenceArray = [];
  let dReturn;
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;

  let axisKey;
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  const allStatTypes = [];
  const utcCycleStarts = [];
  const idealValues = [];

  let statement = "";
  let error = "";
  const dataset = [];

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const database = curve.database.replace(/___/g, ".");
    const modelDisplay = curve["data-source"].replace(/___/g, ".");
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[database][modelDisplay][0];
    const modelClause = `and h.model = '${model}'`;

    const selectorPlotType = curve["plot-type"];
    const { statistic } = curve;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap[database][curve["data-source"]][selectorPlotType];
    const statLineType = statisticOptionsMap[statistic][0];
    let statisticClause = "";
    let lineDataType = "";
    if (statLineType === "scalar") {
      statisticClause =
        "avg(ld.fbar) as fbar, " +
        "avg(ld.obar) as obar, " +
        "group_concat(distinct ld.fbar, ';', ld.obar, ';', ld.ffbar, ';', ld.oobar, ';', ld.fobar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_sl1l2";
    } else if (statLineType === "vector") {
      statisticClause =
        "avg(ld.ufbar) as ufbar, " +
        "avg(ld.vfbar) as vfbar, " +
        "avg(ld.uobar) as uobar, " +
        "avg(ld.vobar) as vobar, " +
        "group_concat(distinct ld.ufbar, ';', ld.vfbar, ';', ld.uobar, ';', ld.vobar, ';', " +
        "ld.uvfobar, ';', ld.uvffbar, ';', ld.uvoobar, ';', ld.f_speed_bar, ';', ld.o_speed_bar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_vl1l2";
    } else if (statLineType === "ctc") {
      statisticClause =
        "sum(ld.fy_oy) as fy_oy, " +
        "sum(ld.fy_on) as fy_on, " +
        "sum(ld.fn_oy) as fn_oy, " +
        "sum(ld.fn_on) as fn_on, " +
        "group_concat(distinct ld.fy_oy, ';', ld.fy_on, ';', ld.fn_oy, ';', ld.fn_on, ';', ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_ctc";
    }

    const queryTableClause = `from ${database}.stat_header h, ${database}.${lineDataType} ld`;

    let regions =
      curve.region === undefined || curve.region === matsTypes.InputTypes.unused
        ? []
        : curve.region;
    regions = Array.isArray(regions) ? regions : [regions];
    let regionsClause = "";
    if (regions.length > 0) {
      const regionValues = (
        await matsCollections.region.findOneAsync({ name: "region" })
      ).valuesMap;
      regions = regions
        .map(function (r) {
          return `'${Object.keys(regionValues).find(
            (key) => regionValues[key] === r.replace(/___/g, ".")
          )}'`;
        })
        .join(",");
      regionsClause = `and h.vx_mask IN(${regions})`;
    }

    const { scale } = curve;
    const scaleClause = `and h.interp_pnts = '${scale}'`;
    const im = curve["interp-method"];
    const imClause = `and h.interp_mthd = '${im}'`;

    const { variable } = curve;
    const variableValuesMap = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).valuesMap[database][curve["data-source"]][selectorPlotType][statLineType];
    const variableClause = `and h.fcst_var = '${variableValuesMap[variable]}'`;

    const { threshold } = curve;
    const thresholdClause = `and h.fcst_thresh = '${threshold}'`;
    const { truth } = curve;
    const truthClause = `and h.obtype = '${truth}'`;
    const vts = ""; // have an empty string that we can pass to the python script.
    // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
    // have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
    let forecastLengthsClause = "";
    let fcsts =
      curve["forecast-length"] === undefined ||
      curve["forecast-length"] === matsTypes.InputTypes.unused
        ? []
        : curve["forecast-length"];
    fcsts = Array.isArray(fcsts) ? fcsts : [fcsts];
    if (fcsts.length === 0) {
      // want to rope in all valid forecast lengths
      fcsts = (
        await matsCollections["forecast-length"].findOneAsync({
          name: "forecast-length",
        })
      ).optionsMap[database][curve["data-source"]][selectorPlotType][statLineType][
        variable
      ];
    }
    const queryFcsts = fcsts
      .map(function (fl) {
        return `'${fl}','${fl}0000'`;
      })
      .join(",");
    forecastLengthsClause = `and ld.fcst_lead IN(${queryFcsts})`;

    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    const dateClause = `and unix_timestamp(ld.fcst_valid_beg) >= ${fromSecs} and unix_timestamp(ld.fcst_valid_beg) <= ${toSecs}`;

    let levels =
      curve.level === undefined || curve.level === matsTypes.InputTypes.unused
        ? []
        : curve.level;
    let levelsClause = "";
    levels = Array.isArray(levels) ? levels : [levels];
    if (levels.length > 0) {
      levels = levels
        .map(function (l) {
          // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
          return `'${l}','${l}='`;
        })
        .join(",");
      levelsClause = `and h.fcst_lev IN(${levels})`;
    } else {
      // we can't just leave the level clause out, because we might end up with some non-metadata-approved levels in the mix
      levels = (await matsCollections.level.findOneAsync({ name: "level" })).optionsMap[
        database
      ][curve["data-source"]][selectorPlotType][statLineType][variable];
      levels = levels
        .map(function (l) {
          return `'${l}'`;
        })
        .join(",");
      levelsClause = `and h.fcst_lev IN(${levels})`;
    }

    let descrs =
      curve.description === undefined ||
      curve.description === matsTypes.InputTypes.unused
        ? []
        : curve.description;
    let descrsClause = "";
    descrs = Array.isArray(descrs) ? descrs : [descrs];
    if (descrs.length > 0) {
      descrs = descrs
        .map(function (d) {
          return `'${d}'`;
        })
        .join(",");
      descrsClause = `and h.descr IN(${descrs})`;
    }
    const statType =
      curve["aggregation-method"] === "Overall statistic" && statLineType === "ctc"
        ? statLineType
        : `met-${statLineType}`;
    allStatTypes.push(statType);
    appParams.aggMethod = curve["aggregation-method"];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    if (
      statistic.includes("vector") &&
      (statistic.includes("speed") ||
        statistic.includes("length") ||
        statistic.includes("Speed") ||
        statistic.includes("Length"))
    ) {
      axisKey = "Vector wind speed";
    } else if (
      statistic.includes("vector") &&
      (statistic.includes("direction") ||
        statistic.includes("angle") ||
        statistic.includes("Direction") ||
        statistic.includes("Angle"))
    ) {
      axisKey = "Vector wind direction";
    } else {
      axisKey = `${variable} ${statistic}`;
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as hr_of_day, " +
        "count(distinct unix_timestamp(ld.fcst_valid_beg)) as nTimes, " +
        "min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, " +
        "max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, " +
        "sum(ld.total) as n0, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{modelClause}} " +
        "{{regionsClause}} " +
        "{{imClause}} " +
        "{{scaleClause}} " +
        "{{variableClause}} " +
        "{{thresholdClause}} " +
        "{{truthClause}} " +
        "{{forecastLengthsClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "and h.stat_header_id = ld.stat_header_id " +
        "group by hr_of_day " +
        "order by hr_of_day" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{regionsClause}}", regionsClause);
      statement = statement.replace("{{imClause}}", imClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{variableClause}}", variableClause);
      statement = statement.replace("{{thresholdClause}}", thresholdClause);
      statement = statement.replace("{{truthClause}}", truthClause);
      statement = statement.replace("{{forecastLengthsClause}}", forecastLengthsClause);
      statement = statement.replace("{{levelsClause}}", levelsClause);
      statement = statement.replace("{{descrsClause}}", descrsClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      dataRequests[label] = statement;

      queryArray.push({
        statement,
        statLineType,
        statistic,
        appParams: JSON.parse(JSON.stringify(appParams)),
        fcsts: ["0"],
        vts,
      });
    } else {
      // this is a difference curve
      differenceArray.push({
        dataset,
        diffFrom,
        appParams: JSON.parse(JSON.stringify(appParams)),
      });
    }
  } // end for curves

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statements to the query function
    queryResult = await matsDataQueryUtils.queryDBPython(global.sumPool, queryArray);
    finishMoment = moment();
    dataRequests["data retrieval (query) time"] = {
      begin: startMoment.format(),
      finish: finishMoment.format(),
      duration: `${moment
        .duration(finishMoment.diff(startMoment))
        .asSeconds()} seconds`,
      recordCount: queryResult.data.length,
    };
    // get the data back from the query
    dReturn = queryResult.data;
  } catch (e) {
    // this is an error produced by a bug in the query function, not an error returned by the mysql database
    e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
    throw new Error(e.message);
  }

  // parse any errors from the python code
  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    if (
      queryResult.error[curveIndex] !== undefined &&
      queryResult.error[curveIndex] !== ""
    ) {
      if (queryResult.error[curveIndex] === matsTypes.Messages.NO_DATA_FOUND) {
        // this is NOT an error just a no data condition
        dataFoundForCurve = false;
      } else {
        // this is an error returned by the mysql database
        error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
        throw new Error(error);
      }
    } else {
      dataFoundForAnyCurve = true;
    }
  }

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  const postQueryStartMoment = moment();
  let d;
  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    const curve = curves[curveIndex];
    if (curveIndex < dReturn.length) {
      d = dReturn[curveIndex];
      // set axis limits based on returned data
      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        differenceArray[curveIndex - dReturn.length].dataset,
        differenceArray[curveIndex - dReturn.length].diffFrom,
        differenceArray[curveIndex - dReturn.length].appParams,
        allStatTypes
      );
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const mean = d.sum / d.x.length;
    const annotation =
      mean === undefined
        ? `${curve.label}- mean = NoData`
        : `${curve.label}- mean = ${mean.toPrecision(4)}`;
    curve.annotation = annotation;
    curve.xmin = d.xmin;
    curve.xmax = d.xmax;
    curve.ymin = d.ymin;
    curve.ymax = d.ymax;
    const cOptions = await matsDataCurveOpsUtils.generateSeriesCurveOptions(
      curve,
      curveIndex,
      axisMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    idealValues,
    utcCycleStarts,
    statType: allStatTypes,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = await matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  const postQueryFinishMoment = moment();
  dataRequests["post data retrieval (query) process time"] = {
    begin: postQueryStartMoment.format(),
    finish: postQueryFinishMoment.format(),
    duration: `${moment
      .duration(postQueryFinishMoment.diff(postQueryStartMoment))
      .asSeconds()} seconds`,
  };
  return result;
};
