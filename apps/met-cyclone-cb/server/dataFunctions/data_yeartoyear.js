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

global.dataYearToYear = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.yearToYear,
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

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    let docIDTemplate =
      "MET:DD:MET:{{database}}:{{version}}:{{model}}:{{truth}}:{{stormID}}:{{basin}}:{{stormNumber}}:{{stormName}}:{{date}}:{{lineType}}";

    const database = curve.database.replace(/___/g, ".");
    const versions = (await matsCollections.database.findOneAsync({ name: "database" }))
      .valuesMap;
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[database][curve["data-source"]][0];

    docIDTemplate = docIDTemplate.replace("{{database}}", database);
    docIDTemplate = docIDTemplate.replace("{{model}}", model);

    const truthStr = curve.truth;
    const truthValues = (await matsCollections.truth.findOneAsync({ name: "truth" }))
      .valuesMap;
    const truth = Object.keys(truthValues).find((key) => truthValues[key] === truthStr);

    docIDTemplate = docIDTemplate.replace("{{truth}}", truth);

    const selectorPlotType = curve["plot-type"];
    const { statistic } = curve;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap[database][curve["data-source"]][selectorPlotType];
    const statLineType = statisticOptionsMap[statistic][0];
    const lineType = statisticOptionsMap[statistic][1];
    const statField = statisticOptionsMap[statistic][2];
    const statisticClause =
      "ARRAY_SORT(ARRAY_AGG([m0.VALID, m0.STORM_ID, CASE WHEN m0.data IS NOT NULL THEN m0.data ELSE NULL END])) data";

    docIDTemplate = docIDTemplate.replace("{{lineType}}", lineType);

    const { basin } = curve;

    docIDTemplate = docIDTemplate.replace("{{basin}}", basin);

    const dbDateRangeMap = (
      await matsCollections.database.findOneAsync({ name: "database" })
    ).dates[database][curve["data-source"]][selectorPlotType][statLineType][basin];
    const years = Object.keys(dbDateRangeMap);

    let storms = [];
    const stormsOptionsMap = (
      await matsCollections.storm.findOneAsync({ name: "storm" })
    ).optionsMap;
    for (let yidx = 0; yidx < years.length; yidx += 1) {
      const theseStorms =
        stormsOptionsMap[database][curve["data-source"]][selectorPlotType][
          statLineType
        ][basin][years[yidx]];
      theseStorms.shift();
      storms = storms.concat(theseStorms);
    }

    let levels =
      curve.level === undefined || curve.level === matsTypes.InputTypes.unused
        ? []
        : curve.level;
    const levelValuesMap = (await matsCollections.level.findOneAsync({ name: "level" }))
      .valuesMap;
    const levelKeys = Object.keys(levelValuesMap);
    let levelKey;
    levels = Array.isArray(levels) ? levels : [levels];
    if (levels.length === 0) {
      // want to rope in all valid levels
      levels = (await matsCollections.level.findOneAsync({ name: "level" })).optionsMap[
        database
      ][curve["data-source"]][selectorPlotType][statLineType][basin][curve.year];
    }
    levels = levels.map(function (l) {
      for (let lidx = 0; lidx < levelKeys.length; lidx += 1) {
        levelKey = levelKeys[lidx];
        if (levelValuesMap[levelKey].name === l) {
          return `${levelKey}`;
        }
      }
      return null;
    });

    const queryTableClause = `from {{vxDBTARGET}} m0`;

    let vts = ""; // start with an empty string that we can pass to the python script if there aren't vts.
    if (
      curve["valid-time"] !== undefined &&
      curve["valid-time"] !== matsTypes.InputTypes.unused
    ) {
      vts = curve["valid-time"];
      vts = Array.isArray(vts) ? vts : [vts];
    }

    // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
    // have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
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
        basin
      ][curve.year];
    }
    fcsts = fcsts.map(function (fl) {
      let numFl = Number(fl);
      let retFl;
      let negative = false;
      if (numFl < 0) {
        negative = true;
        numFl = Math.abs(numFl);
      }
      if (numFl < 10) {
        retFl = `0${numFl}0000`;
      } else {
        retFl = `${numFl}0000`;
      }
      if (negative) retFl = `-${retFl}`;
      return retFl;
    });

    let descrs =
      curve.description === undefined ||
      curve.description === matsTypes.InputTypes.unused
        ? []
        : curve.description;
    descrs = Array.isArray(descrs) ? descrs : [descrs];
    let descrsClause = "";
    if (descrs.length > 0 && !(descrs.length === 1 && descrs[0] === "NA")) {
      descrs = descrs
        .map(function (d) {
          return `'${d}'`;
        })
        .join(",");
      descrsClause = `WHERE DESCR IN[${descrs}]`;
    }

    const statType = `met-${statLineType}`;
    allStatTypes.push(statType);
    appParams.aggMethod = curve["aggregation-method"];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const axisKey = statistic
      .replace("Truth ", "")
      .replace("Model ", "")
      .replace("Model-truth ", "");
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "select DATE_PART_STR(MILLIS_TO_STR(VALID*1000, '1111-11-11'), 'year') as year, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "USE KEYS {{docIDTemplate}} " +
        "{{descrsClause}} " +
        "GROUP BY DATE_PART_STR(MILLIS_TO_STR(VALID*1000, '1111-11-11'), 'year') " +
        "ORDER BY year " +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{descrsClause}}", descrsClause);
      if (statLineType !== "precalculated") {
        statement = statement.replace(/VALID/g, "FCST_VALID_BEG");
      }
      statement = global.cbPool.trfmSQLForDbTarget(statement);
      dataRequests[label] = statement;

      queryArray.push({
        statement,
        docIDTemplate,
        database,
        lineType,
        statLineType,
        statistic,
        statField,
        appParams: JSON.parse(JSON.stringify(appParams)),
        dateVariable: statLineType === "precalculated" ? "VALID" : "FCST_VALID_BEG",
        fromSecs,
        toSecs,
        fcsts,
        vts:
          vts.length === 0
            ? vts
            : vts
                .map(function (vt) {
                  return `'${vt}'`;
                })
                .join(","),
        levels,
        versions,
        storms,
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
    queryResult = await matsDataQueryUtils.queryCBPython(global.cbPool, queryArray);
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
