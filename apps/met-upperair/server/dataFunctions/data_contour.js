/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

/* eslint-disable no-await-in-loop */

global.dataContour = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.contour,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error("INFO:  There must only be one added curve.");
  }

  const axisMap = Object.create(null);
  const allStatTypes = [];

  let error = "";
  const dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  const xAxisParam = plotParams["x-axis-parameter"];
  const yAxisParam = plotParams["y-axis-parameter"];
  const xValClause = (
    await matsCollections.PlotParams.findOneAsync({
      name: "x-axis-parameter",
    })
  ).optionsMap[xAxisParam];
  const yValClause = (
    await matsCollections.PlotParams.findOneAsync({
      name: "y-axis-parameter",
    })
  ).optionsMap[yAxisParam];

  // initialize variables specific to this curve
  const curve = curves[0];
  const { label } = curve;
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
      "count(ld.fbar) as n, " +
      "avg(ld.fbar) as fbar, " +
      "avg(ld.obar) as obar, " +
      "group_concat(distinct ld.fbar, ';', ld.obar, ';', ld.ffbar, ';', ld.oobar, ';', ld.fobar, ';', " +
      "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
    lineDataType = "line_data_sl1l2";
  } else if (statLineType === "vector") {
    statisticClause =
      "count(ld.ufbar) as n, " +
      "avg(ld.ufbar) as ufbar, " +
      "avg(ld.vfbar) as vfbar, " +
      "avg(ld.uobar) as uobar, " +
      "avg(ld.vobar) as vobar, " +
      "group_concat(distinct ld.ufbar, ';', ld.vfbar, ';', ld.uobar, ';', ld.vobar, ';', " +
      "ld.uvfobar, ';', ld.uvffbar, ';', ld.uvoobar, ';', ld.f_speed_bar, ';', ld.o_speed_bar, ';', " +
      "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
    lineDataType = "line_data_vl1l2";
  }

  const queryTableClause = `from ${database}.stat_header h, ${database}.${lineDataType} ld`;

  let regions =
    curve.region === undefined || curve.region === matsTypes.InputTypes.unused
      ? []
      : curve.region;
  regions = Array.isArray(regions) ? regions : [regions];
  let regionsClause = "";
  if (regions.length > 0) {
    const regionValues = (await matsCollections.region.findOneAsync({ name: "region" }))
      .valuesMap;
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

  const { truth } = curve;
  const truthClause = `and h.obtype = '${truth}'`;

  let vts = ""; // start with an empty string that we can pass to the python script if there aren't vts.
  let validTimeClause = "";
  if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
    if (
      curve["valid-time"] !== undefined &&
      curve["valid-time"] !== matsTypes.InputTypes.unused
    ) {
      vts = curve["valid-time"];
      vts = Array.isArray(vts) ? vts : [vts];
      const queryVts = vts
        .map(function (vt) {
          return `'${vt}'`;
        })
        .join(",");
      validTimeClause = `and unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 IN(${queryVts})`;
    }
  }

  // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
  // have been sanitized for display purposes in the forecastValueMap.
  // now we have to go get the damn ole unsanitary ones for the database.
  let forecastLengthsClause = "";
  if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
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
  }

  let dateString = "";
  let dateClause = "";
  if (
    (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
    xAxisParam !== "Valid Date" &&
    yAxisParam !== "Valid Date"
  ) {
    dateString = "unix_timestamp(ld.fcst_init_beg)";
  } else {
    dateString = "unix_timestamp(ld.fcst_valid_beg)";
  }
  dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;

  let levelsClause = "";
  let levels =
    curve.level === undefined || curve.level === matsTypes.InputTypes.unused
      ? []
      : curve.level;
  levels = Array.isArray(levels) ? levels : [levels];
  if (
    xAxisParam !== "Pressure level" &&
    yAxisParam !== "Pressure level" &&
    levels.length > 0
  ) {
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
    if (xAxisParam === "Pressure level" || yAxisParam === "Pressure level") {
      levels = levels.filter((lev) => lev.toString().startsWith("P")); // remove anything that isn't a pressure level for this plot.
    }
    levels = levels
      .map(function (l) {
        return `'${l}'`;
      })
      .join(",");
    levelsClause = `and h.fcst_lev IN(${levels})`;
  }

  let descrs =
    curve.description === undefined || curve.description === matsTypes.InputTypes.unused
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

  appParams.aggMethod = curve["aggregation-method"];
  const statType = `met-${statLineType}`;
  allStatTypes.push(statType);
  // For contours, this functions as the colorbar label.
  let unitKey;
  if (
    statistic.includes("vector") &&
    (statistic.includes("speed") ||
      statistic.includes("length") ||
      statistic.includes("Speed") ||
      statistic.includes("Length"))
  ) {
    unitKey = "Vector wind speed";
  } else if (
    statistic.includes("vector") &&
    (statistic.includes("direction") ||
      statistic.includes("angle") ||
      statistic.includes("Direction") ||
      statistic.includes("Angle"))
  ) {
    unitKey = "Vector wind direction";
  } else {
    unitKey = `${variable} ${statistic}`;
  }
  curve.unitKey = unitKey;

  let d;
  // this is a database driven curve, not a difference curve
  // prepare the query from the above parameters
  let statement =
    "{{xValClause}} " +
    "{{yValClause}} " +
    "min({{dateString}}) as min_secs, " +
    "max({{dateString}}) as max_secs, " +
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
    "{{forecastLengthsClause}} " +
    "{{levelsClause}} " +
    "{{descrsClause}} " +
    "and h.stat_header_id = ld.stat_header_id " +
    "group by xVal,yVal " +
    "order by xVal,yVal" +
    ";";

  statement = statement.replace("{{xValClause}}", xValClause);
  statement = statement.replace("{{yValClause}}", yValClause);
  statement = statement.replace("{{statisticClause}}", statisticClause);
  statement = statement.replace("{{queryTableClause}}", queryTableClause);
  statement = statement.replace("{{modelClause}}", modelClause);
  statement = statement.replace("{{regionsClause}}", regionsClause);
  statement = statement.replace("{{imClause}}", imClause);
  statement = statement.replace("{{scaleClause}}", scaleClause);
  statement = statement.replace("{{variableClause}}", variableClause);
  statement = statement.replace("{{truthClause}}", truthClause);
  statement = statement.replace("{{validTimeClause}}", validTimeClause);
  statement = statement.replace("{{forecastLengthsClause}}", forecastLengthsClause);
  statement = statement.replace("{{levelsClause}}", levelsClause);
  statement = statement.replace("{{descrsClause}}", descrsClause);
  statement = statement.replace("{{dateClause}}", dateClause);
  statement = statement.split("{{dateString}}").join(dateString);
  dataRequests[label] = statement;

  const queryArray = [
    {
      statement,
      statLineType,
      statistic,
      appParams: JSON.parse(JSON.stringify(appParams)),
      fcsts: ["0"],
      vts,
    },
  ];

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
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
    [d] = queryResult.data;
  } catch (e) {
    // this is an error produced by a bug in the query function, not an error returned by the mysql database
    e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
    throw new Error(e.message);
  }

  // parse any errors from the python code
  if (queryResult.error[0] !== undefined && queryResult.error[0] !== "") {
    if (queryResult.error[0] === matsTypes.Messages.NO_DATA_FOUND) {
      // this is NOT an error just a no data condition
      dataFoundForCurve = false;
    } else {
      // this is an error returned by the mysql database
      error += `Error from verification query: <br>${queryResult.error[0]}<br> query: <br>${statement}<br>`;
      throw new Error(error);
    }
  }

  if (!dataFoundForCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  const postQueryStartMoment = moment();

  // set curve annotation to be the curve mean -- may be recalculated later
  // also pass previously calculated axis stats to curve options
  const { mean } = d.glob_stats;
  const annotation =
    mean === undefined
      ? `${label}- mean = NoData`
      : `${label}- mean = ${mean.toPrecision(4)}`;
  curve.annotation = annotation;
  curve.xmin = d.xmin;
  curve.xmax = d.xmax;
  curve.ymin = d.ymin;
  curve.ymax = d.ymax;
  curve.zmin = d.zmin;
  curve.zmax = d.zmax;
  curve.xAxisKey = xAxisParam;
  curve.yAxisKey = yAxisParam;
  const cOptions = await matsDataCurveOpsUtils.generateContourCurveOptions(
    curve,
    axisMap,
    d,
    appParams
  ); // generate plot with data, curve annotation, axis labels, etc.
  dataset.push(cOptions);
  const postQueryFinishMoment = moment();
  dataRequests["post data retrieval (query) process time"] = {
    begin: postQueryStartMoment.format(),
    finish: postQueryFinishMoment.format(),
    duration: `${moment
      .duration(postQueryFinishMoment.diff(postQueryStartMoment))
      .asSeconds()} seconds`,
  };

  // process the data returned by the query
  const curveInfoParams = { curve: curves, statType: allStatTypes, axisMap };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataContour(
    dataset,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  return result;
};
