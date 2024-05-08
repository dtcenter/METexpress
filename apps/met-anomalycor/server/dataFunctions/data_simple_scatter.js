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

// eslint-disable-next-line no-undef
dataSimpleScatter = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.simpleScatter,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const dataRequests = {}; // used to store data queries
  const queryArray = [];
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
  const axisXMap = Object.create(null);
  const axisYMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const database = curve.database.replace(/___/g, ".");
    const binParam = curve["bin-parameter"];
    const binClause = matsCollections["bin-parameter"].findOne({
      name: "bin-parameter",
    }).optionsMap[binParam];
    const modelDisplay = curve["data-source"].replace(/___/g, ".");
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[database][modelDisplay][0];
    const modelClause = `and h.model = '${model}'`;
    const selectorPlotType = curve["plot-type"];
    const statisticXSelect = curve.statistic;
    const statisticYSelect = curve["y-statistic"];
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap[database][curve["data-source"]][selectorPlotType];
    const statLineType = statisticOptionsMap[statisticXSelect][0];
    let statisticClauseX = "";
    let statisticClauseY = "";
    let lineDataType = "";
    if (statLineType === "scalar") {
      statisticClauseX =
        "count(ld.fabar) as nX, " +
        "avg(ld.fabar) as fbarX, " +
        "avg(ld.oabar) as obarX, " +
        "group_concat(distinct ld.fabar, ';', ld.oabar, ';', ld.ffabar, ';', ld.ooabar, ';', ld.foabar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_dataX";
      statisticClauseY =
        "count(ld.fabar) as nY, " +
        "avg(ld.fabar) as fbarY, " +
        "avg(ld.oabar) as obarY, " +
        "group_concat(distinct ld.fabar, ';', ld.oabar, ';', ld.ffabar, ';', ld.ooabar, ';', ld.foabar, ';', " +
        "ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_dataY";
      lineDataType = "line_data_sal1l2";
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
    const variableXStr = curve.variable;
    const variableYStr = curve["y-variable"];
    const variableValuesMap = matsCollections.variable.findOne(
      { name: "variable" },
      { valuesMap: 1 }
    ).valuesMap[database][curve["data-source"]][selectorPlotType][statLineType];
    const variableX = variableValuesMap[variableXStr];
    const variableY = variableValuesMap[variableYStr];
    const variableClauseX = `and h.fcst_var = '${variableValuesMap[variableX]}'`;
    const variableClauseY = `and h.fcst_var = '${variableValuesMap[variableY]}'`;
    const { truth } = curve;
    let truthClause = "";
    if (truth !== "Any truth dataset") {
      truthClause = `and h.obtype = '${truth}'`;
    }
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let vts = ""; // start with an empty string that we can pass to the python script if there aren't vts.
    let validTimeClause = "";
    if (binParam !== "Valid UTC hour") {
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
    }
    // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
    // have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
    let forecastLengthsClause = "";
    if (binParam !== "Fcst lead time") {
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
    }
    let dateString = "";
    let dateClause = "";
    if (binParam === "Init Date" && binParam !== "Valid Date") {
      dateString = "unix_timestamp(ld.fcst_init_beg)";
    } else {
      dateString = "unix_timestamp(ld.fcst_valid_beg)";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    let levels =
      curve.level === undefined || curve.level === matsTypes.InputTypes.unused
        ? []
        : curve.level;
    levels = Array.isArray(levels) ? levels : [levels];
    if (binParam !== "Pressure level" && levels.length > 0) {
      levels = levels
        .map(function (l) {
          // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
          return `'${l}','${l}='`;
        })
        .join(",");
    } else {
      // we can't just leave the level clause out, because we might end up with some non-metadata-approved levels in the mix
      levels = matsCollections.level.findOne({ name: "level" }, { optionsMap: 1 })
        .optionsMap[database][curve["data-source"]][selectorPlotType][statLineType][
        variableX
      ];
      levels = levels
        .map(function (l) {
          return `'${l}'`;
        })
        .join(",");
    }
    const levelsClause = `and h.fcst_lev IN(${levels})`;
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
    appParams.aggMethod = curve["aggregation-method"];
    const statType = `met-${statLineType}`;
    allStatTypes.push(statType);
    curves[curveIndex].axisXKey = `${variableXStr} ${statisticXSelect}`; // stash the axisKey to use it later for axis options
    curves[curveIndex].axisYKey = `${variableYStr} ${statisticYSelect}`; // stash the axisKey to use it later for axis options
    curves[curveIndex].binParam = binParam; // stash the binParam to use it later for axis options

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "{{binClause}} " +
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
        "group by binVal " +
        "order by binVal" +
        ";";

      statement = statement.replace("{{binClause}}", binClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{regionsClause}}", regionsClause);
      statement = statement.replace("{{imClause}}", imClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{truthClause}}", truthClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthsClause}}", forecastLengthsClause);
      statement = statement.replace("{{levelsClause}}", levelsClause);
      statement = statement.replace("{{descrsClause}}", descrsClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      statement = statement.split("{{dateString}}").join(dateString);

      let statement1 = statement.replace("{{statisticClause}}", statisticClauseX);
      statement1 = statement1.replace("{{variableClause}}", variableClauseX);
      let statement2 = statement.replace("{{statisticClause}}", statisticClauseY);
      statement2 = statement2.replace("{{variableClause}}", variableClauseY);

      dataRequests[label] = statement;

      queryArray.push({
        statement: [statement1, statement2],
        statLineType,
        statistic: `${statisticXSelect}__vs__${statisticYSelect}`,
        appParams: JSON.parse(JSON.stringify(appParams)),
        fcstOffset: 0,
        vts,
      });
    } else {
      // this is a difference curve -- not supported for scatter plots
      throw new Error(
        "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
      );
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
    d = dReturn[curveIndex];
    // set axis limits based on returned data
    if (dataFoundForCurve) {
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
    const cOptions = matsDataCurveOpsUtils.generateScatterCurveOptions(
      curve,
      curveIndex,
      axisXMap,
      axisYMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    statType: allStatTypes,
    axisXMap,
    axisYMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataSimpleScatter(
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
