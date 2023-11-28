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
    hasLevels: false,
  };
  const alreadyMatched = false;
  const dataRequests = {}; // used to store data queries
  const queryArray = [];
  const differenceArray = [];
  let statement;
  let dReturn;
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

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    dataFoundForCurve[curveIndex] = true;
    const { label } = curve;
    const { database } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[database][curve["data-source"]][0];
    const modelClause = `and h.amodel = '${model}'`;
    const selectorPlotType = curve["plot-type"];
    const { statistic } = curve;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap[database][curve["data-source"]][selectorPlotType];
    const statLineType = statisticOptionsMap[statistic][0];
    let statisticClause = "";
    let lineDataType = "";
    if (statLineType === "precalculated") {
      statisticClause = `avg(${statisticOptionsMap[statistic][2]}) as stat, group_concat(distinct ${statisticOptionsMap[statistic][2]}, ';', 9999, ';', unix_timestamp(ld.fcst_valid) order by unix_timestamp(ld.fcst_valid)) as sub_data`;
      [, lineDataType] = statisticOptionsMap[statistic];
    }
    const queryTableClause = `from ${database}.tcst_header h, ${database}.${lineDataType} ld`;
    const { basin } = curve;
    const { storm } = curve;
    let stormClause;
    if (storm === "All storms") {
      stormClause = `and h.storm_id like '${basin}%'`;
    } else {
      stormClause = `and h.storm_id = '${storm.split(" - ")[0]}'`;
    }
    const truthStr = curve.truth;
    const truth = Object.keys(
      matsCollections.truth.findOne({ name: "truth" }).valuesMap
    ).find(
      (key) =>
        matsCollections.truth.findOne({ name: "truth" }).valuesMap[key] === truthStr
    );
    const truthClause = `and h.bmodel = '${truth}'`;
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
      validTimeClause = `and unix_timestamp(ld.fcst_valid)%(24*3600)/3600 IN(${vts})`;
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
    const dateClause = `and unix_timestamp(ld.fcst_valid) >= ${fromSecs} and unix_timestamp(ld.fcst_valid) <= ${toSecs}`;
    let levels =
      curve.level === undefined || curve.level === matsTypes.InputTypes.unused
        ? []
        : curve.level;
    const levelValuesMap = matsCollections.level.findOne(
      { name: "level" },
      { valuesMap: 1 }
    ).valuesMap;
    const levelKeys = Object.keys(levelValuesMap);
    let levelKey;
    let levelsClause = "";
    levels = Array.isArray(levels) ? levels : [levels];
    if (levels.length > 0 && lineDataType !== "line_data_probrirw") {
      levels = levels
        .map(function (l) {
          for (let lidx = 0; lidx < levelKeys.length; lidx += 1) {
            levelKey = levelKeys[lidx];
            if (levelValuesMap[levelKey].name === l) {
              return `'${levelKey}'`;
            }
          }
          return null;
        })
        .join(",");
      levelsClause = `and ld.level IN(${levels})`;
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

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "select unix_timestamp(ld.fcst_valid) as avtime, " +
        "count(distinct unix_timestamp(ld.fcst_valid)) as N_times, " +
        "min(unix_timestamp(ld.fcst_valid)) as min_secs, " +
        "max(unix_timestamp(ld.fcst_valid)) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{modelClause}} " +
        "{{stormClause}} " +
        "{{truthClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthsClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "and h.tcst_header_id = ld.tcst_header_id " +
        "group by avtime " +
        "order by avtime" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{stormClause}}", stormClause);
      statement = statement.replace("{{truthClause}}", truthClause);
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
