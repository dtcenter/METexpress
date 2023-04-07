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

dataDieOff = function (plotParams, plotFunction) {
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
    let matchFlag = "";
    let simpleFlag = "";
    let statisticClause = "";
    let queryTableClause = "";
    let headerIdClause = "";
    let matchedFlagClause = "";
    let simpleFlagClause = "";
    if (statLineType === "precalculated") {
      statisticClause = `avg(${statisticOptionsMap[statistic][1]}) as stat, group_concat(distinct ${statisticOptionsMap[statistic][1]}, ';', 1, ';', unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev) as sub_data`;
      queryTableClause = `from ${database}.mode_header h, ${database}.mode_obj_pair ld`;
      headerIdClause = "and h.mode_header_id = ld.mode_header_id";
      matchFlag = curve["object-matching"];
      simpleFlag = curve["object-simplicity"];
    } else if (statLineType === "mode_single") {
      statisticClause =
        "avg(ld1.area) as area, " +
        "group_concat(distinct ld1.object_id, ';', ld1.object_cat, ';', ld1.area, ';', h.n_valid, ';', ld1.fcst_flag, ';', ld1.simple_flag, ';', ld1.matched_flag, ';', " +
        "unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev) as sub_data";
      queryTableClause = `from ${database}.mode_header h, ${database}.mode_obj_single ld1`;
      headerIdClause = "and h.mode_header_id = ld1.mode_header_id";
    } else if (statLineType === "mode_pair") {
      statisticClause =
        "avg(ld.interest) as interest, " +
        "group_concat(distinct h.mode_header_id, ';', ld.object_id, ';', ld1.object_id, ';', ld1.object_cat, ';', ld.interest, ';', ld.centroid_dist, ';', " +
        "ld1.area, ';', ld1.intensity_nn, ';', ld1.centroid_lat, ';', ld1.centroid_lon, ';', h.n_valid, ';', " +
        "unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev, h.mode_header_id, ld.object_id, ld1.object_id) as sub_data";
      queryTableClause = `from ${database}.mode_header h, ${database}.mode_obj_pair ld, ${database}.mode_obj_single ld1`;
      headerIdClause =
        "and h.mode_header_id = ld.mode_header_id and h.mode_header_id = ld1.mode_header_id " +
        "and (ld.object_id like concat(ld1.object_id, '_%') or ld.object_id like concat('%_', ld1.object_id))";
      matchFlag = curve["object-matching"];
      simpleFlag = curve["object-simplicity"];
    }
    if (matchFlag === "Matched pairs") {
      matchedFlagClause = "and ld.matched_flag = 1";
    }
    if (simpleFlag === "Simple objects") {
      simpleFlagClause = "and ld.simple_flag = 1";
    } else if (simpleFlag === "Cluster objects") {
      simpleFlagClause = "and ld.simple_flag = 0";
    }
    const { scale } = curve;
    let scaleClause = "";
    if (scale !== "All scales") {
      scaleClause = `and h.grid_res = '${scale}'`;
    }
    const { radius } = curve;
    let radiusClause = "";
    if (radius !== "All radii") {
      radiusClause = `and h.fcst_rad = '${radius}'`;
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
      thresholdClause = `and h.fcst_thr = '${threshold}'`;
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
    let dateClause = `and unix_timestamp(h.fcst_valid) >= '${fromSecs}' and unix_timestamp(h.fcst_valid) <= '${toSecs}' `;
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
        validTimeClause = `and unix_timestamp(h.fcst_valid)%(24*3600)/3600 IN(${vts})`;
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
        utcCycleStartClause = `and unix_timestamp(h.fcst_init)%(24*3600)/3600 IN(${utcCycleStart})`;
      }
      dateClause = `and unix_timestamp(h.fcst_init) >= ${fromSecs} and unix_timestamp(h.fcst_init) <= ${toSecs}`;
    } else {
      dateClause = `and unix_timestamp(h.fcst_init) = ${fromSecs}`;
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
    const axisKey = statistic;
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      statement =
        "select h.fcst_lead as fcst_lead, " +
        "count(distinct unix_timestamp(h.fcst_valid)) as N_times, " +
        "min(unix_timestamp(h.fcst_valid)) as min_secs, " +
        "max(unix_timestamp(h.fcst_valid)) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{modelClause}} " +
        "{{radiusClause}} " +
        "{{scaleClause}} " +
        "{{variableClause}} " +
        "{{thresholdClause}} " +
        "{{validTimeClause}} " +
        "{{utcCycleStartClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "{{matchedFlagClause}} " +
        "{{simpleFlagClause}} " +
        "{{headerIdClause}} " +
        "group by fcst_lead " +
        "order by fcst_lead" +
        ";";

      statement = statement.replace("{{modelClause}}", modelClause);
      statement = statement.replace("{{radiusClause}}", radiusClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{variableClause}}", variableClause);
      statement = statement.replace("{{thresholdClause}}", thresholdClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
      statement = statement.replace("{{levelsClause}}", levelsClause);
      statement = statement.replace("{{descrsClause}}", descrsClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{headerIdClause}}", headerIdClause);
      statement = statement.replace("{{matchedFlagClause}}", matchedFlagClause);
      statement = statement.replace("{{simpleFlagClause}}", simpleFlagClause);
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
        differenceArray[curveIndex - dReturn.length].isCTC,
        differenceArray[curveIndex - dReturn.length].isScalar
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
