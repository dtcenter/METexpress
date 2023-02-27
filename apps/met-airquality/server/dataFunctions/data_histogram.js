/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataHistogram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.histogram,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const alreadyMatched = false;
  const dataRequests = {}; // used to store data queries
  const queryArray = [];
  const differenceArray = [];
  let dataFoundForCurve = [];
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const allStatTypes = [];
  const dataset = [];
  const allReturnedSubStats = [];
  const allReturnedSubSecs = [];
  const allReturnedSubLevs = [];
  const axisMap = Object.create(null);

  // process user bin customizations
  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const { yAxisFormat } = binParams;
  const { binNum } = binParams;

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    const { diffFrom } = curve;
    dataFoundForCurve[curveIndex] = true;
    const { label } = curve;
    const { database } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[database][curve["data-source"]][0];
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
        "avg(ld.fbar) as fbar, " +
        "avg(ld.obar) as obar, " +
        "group_concat(distinct ld.fbar, ';', ld.obar, ';', ld.ffbar, ';', ld.oobar, ';', ld.fobar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
      lineDataType = "line_data_sl1l2";
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
      regions = regions
        .map(function (r) {
          return `'${r}'`;
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
    const { threshold } = curve;
    let thresholdClause = "";
    if (threshold !== "All thresholds") {
      thresholdClause = `and h.fcst_thresh = '${threshold}'`;
    }
    let vts = ""; // start with an empty string that we can pass to the python script if there aren't vts.
    let validTimeClause = "";
    if (
      curve["valid-time"] !== undefined &&
      curve["valid-time"] !== matsTypes.InputTypes.unused
    ) {
      vts = curve["valid-time"];
      vts = Array.isArray(vts) ? vts : [vts];
      vts = vts
        .map(function (vt) {
          return `'${vt}'`;
        })
        .join(",");
      validTimeClause = `and unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 IN(${vts})`;
    }
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
    if (fcsts.length > 0) {
      fcsts = fcsts
        .map(function (fl) {
          return `'${fl}','${fl}0000'`;
        })
        .join(",");
      forecastLengthsClause = `and ld.fcst_lead IN(${fcsts})`;
    }
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
    appParams.aggMethod = "Mean statistic";
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable (axisKey) it will use the same axis.
    // Histograms should have everything under the same axisKey.
    let axisKey = yAxisFormat;
    if (yAxisFormat === "Relative frequency") {
      axisKey += " (x100)";
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    var dReturn;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement =
        "select unix_timestamp(ld.fcst_valid_beg) as avtime, " +
        "count(distinct unix_timestamp(ld.fcst_valid_beg)) as N_times, " +
        "min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, " +
        "max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, " +
        "sum(ld.total) as N0, " +
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
        "{{validTimeClause}} " +
        "{{forecastLengthsClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "and h.stat_header_id = ld.stat_header_id " +
        "group by avtime " +
        "order by avtime" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{regionsClause}}", regionsClause);
      statement = statement.replace("{{imClause}}", imClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{variableClause}}", variableClause);
      statement = statement.replace("{{thresholdClause}}", thresholdClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
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
        fcstOffset: 0,
        vts,
      });
    } else {
      // this is a difference curve
      differenceArray.push({
        dataset,
        diffFrom,
        appParams: JSON.parse(JSON.stringify(appParams)),
        isCTC: statType === "ctc",
        isScalar: statType === "scalar",
      });
    }
  } // end for curves

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statements to the query function
    queryResult = matsDataQueryUtils.queryDBPython(sumPool, queryArray);
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
  for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    if (
      queryResult.error[curveIndex] !== undefined &&
      queryResult.error[curveIndex] !== ""
    ) {
      if (queryResult.error[curveIndex] === matsTypes.Messages.NO_DATA_FOUND) {
        // this is NOT an error just a no data condition
        dataFoundForCurve = false;
      } else {
        // this is an error returned by the mysql database
        error += `Error from verification query: <br>${queryResult.error[curveIndex]}<br> query: <br>${statement}<br>`;
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
  for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    curve = curves[curveIndex];
    if (curveIndex < dReturn.length) {
      d = dReturn[curveIndex];
      allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
      allReturnedSubSecs.push(d.subSecs);
      allReturnedSubLevs.push(d.subLevs);
    }
  }
  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    dataFoundForCurve,
    statType: allStatTypes,
    axisMap,
    yAxisFormat,
    varUnits: "",
  };
  const bookkeepingParams = {
    alreadyMatched,
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataHistogram(
    allReturnedSubStats,
    allReturnedSubSecs,
    allReturnedSubLevs,
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    binParams,
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
