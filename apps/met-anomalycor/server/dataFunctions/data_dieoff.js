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

// eslint-disable-next-line no-undef
dataDieoff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dieoff,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const dataRequests = {}; // used to store data queries
  const queryArray = [];
  const differenceArray = [];
  let statement;
  let dReturn;
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const allStatTypes = [];
  const dataset = [];
  const utcCycleStarts = [];
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;
  const idealValues = [];

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const database = curve.database.replace(/___/g, ".");
    const modelDisplay = curve["data-source"].replace(/___/g, ".");
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[database][modelDisplay][0];
    const modelClause = `and h.model = '${model}'`;
    const selectorPlotType = curve["plot-type"];
    const { statistic } = curve;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap[database][curve["data-source"]][selectorPlotType];
    const statLineType = statisticOptionsMap[statistic][0];
    let statisticClause = "";
    let lineDataType = "";
    if (statLineType === "scalar") {
      statisticClause =
        "avg(ld.fabar) as fbar, " +
        "avg(ld.oabar) as obar, " +
        "group_concat(distinct ld.fabar, ';', ld.oabar, ';', ld.ffabar, ';', ld.ooabar, ';', ld.foabar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_sal1l2";
    } else if (statLineType === "vector") {
      statisticClause =
        "avg(ld.ufabar) as ufbar, " +
        "avg(ld.vfabar) as vfbar, " +
        "avg(ld.uoabar) as uobar, " +
        "avg(ld.voabar) as vobar, " +
        "group_concat(distinct ld.ufabar, ';', ld.vfabar, ';', ld.uoabar, ';', ld.voabar, ';', " +
        "ld.uvfoabar, ';', ld.uvffabar, ';', ld.uvooabar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_val1l2";
    }
    const queryTableClause = `from ${database}.stat_header h, ${database}.${lineDataType} ld`;
    let regions =
      curve.region === undefined || curve.region === matsTypes.InputTypes.unused
        ? []
        : curve.region;
    regions = Array.isArray(regions) ? regions : [regions];
    let regionsClause = "";
    if (regions.length > 0) {
      regions = regions
        .map(function (r) {
          return `'${Object.keys(
            matsCollections.region.findOne({ name: "region" }).valuesMap
          ).find(
            (key) =>
              matsCollections.region.findOne({ name: "region" }).valuesMap[key] ===
              r.replace(/___/g, ".")
          )}'`;
        })
        .join(",");
      regionsClause = `and h.vx_mask IN(${regions})`;
    }
    const { scale } = curve;
    let scaleClause = "";
    if (scale !== "All scales") {
      scaleClause = `and h.interp_pnts = '${scale}'`;
    }
    const im = curve["interp-method"];
    let imClause = "";
    if (im !== "All methods") {
      imClause = `and h.interp_mthd = '${im}'`;
    }
    const { variable } = curve;
    const variableValuesMap = matsCollections.variable.findOne(
      { name: "variable" },
      { valuesMap: 1 }
    ).valuesMap[database][curve["data-source"]][selectorPlotType][statLineType];
    const variableClause = `and h.fcst_var = '${variableValuesMap[variable]}'`;
    const { truth } = curve;
    let truthClause = "";
    if (truth !== "Any truth dataset") {
      truthClause = `and h.obtype = '${truth}'`;
    }
    let vts = ""; // start with an empty string that we can pass to the python script if there aren't vts.
    let validTimeClause = "";
    let utcCycleStart;
    let utcCycleStartClause = "";
    const dieoffTypeStr = curve["dieoff-type"];
    const dieoffTypeOptionsMap = matsCollections["dieoff-type"].findOne(
      { name: "dieoff-type" },
      { optionsMap: 1 }
    ).optionsMap;
    const dieoffType = dieoffTypeOptionsMap[dieoffTypeStr][0];
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateClause = `and unix_timestamp(ld.fcst_valid_beg) >= '${fromSecs}' and unix_timestamp(ld.fcst_valid_beg) <= '${toSecs}' `;
    if (dieoffType === matsTypes.ForecastTypes.dieoff) {
      vts = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (vts.length !== 0 && vts !== matsTypes.InputTypes.unused) {
        vts = curve["valid-time"];
        vts = Array.isArray(vts) ? vts : [vts];
        vts = vts
          .map(function (vt) {
            return `'${vt}'`;
          })
          .join(",");
        validTimeClause = `and unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 IN(${vts})`;
      }
    } else if (dieoffType === matsTypes.ForecastTypes.utcCycle) {
      utcCycleStart =
        curve["utc-cycle-start"] === undefined ? [] : curve["utc-cycle-start"];
      if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
        utcCycleStart = utcCycleStart
          .map(function (u) {
            return `'${u}'`;
          })
          .join(",");
        utcCycleStartClause = `and unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 IN(${utcCycleStart})`;
      }
      dateClause = `and unix_timestamp(ld.fcst_init_beg) >= ${fromSecs} and unix_timestamp(ld.fcst_init_beg) <= ${toSecs}`;
    } else {
      dateClause = `and unix_timestamp(ld.fcst_init_beg) = ${fromSecs}`;
    }
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
      levels = matsCollections.level.findOne({ name: "level" }, { optionsMap: 1 })
        .optionsMap[database][curve["data-source"]][selectorPlotType][statLineType][
        variable
      ];
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
    const statType = `met-${statLineType}`;
    allStatTypes.push(statType);
    appParams.aggMethod = curve["aggregation-method"];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const axisKey = "ACC";
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "select ld.fcst_lead as fcst_lead, " +
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
        "{{truthClause}} " +
        "{{validTimeClause}} " +
        "{{utcCycleStartClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "and h.stat_header_id = ld.stat_header_id " +
        "group by fcst_lead " +
        "order by fcst_lead" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{regionsClause}}", regionsClause);
      statement = statement.replace("{{imClause}}", imClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{variableClause}}", variableClause);
      statement = statement.replace("{{truthClause}}", truthClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
      statement = statement.replace("{{levelsClause}}", levelsClause);
      statement = statement.replace("{{descrsClause}}", descrsClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      dataRequests[label] = statement;

      queryArray.push({
        statement,
        statLineType,
        statistic,
        appParams: JSON.parse(JSON.stringify(appParams)),
        fcstOffset: 0,
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
    queryResult = matsDataQueryUtils.queryDBPython(sumPool, queryArray); // eslint-disable-line no-undef
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
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
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
  const result = matsDataProcessUtils.processDataXYCurve(
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
  plotFunction(result);
};
