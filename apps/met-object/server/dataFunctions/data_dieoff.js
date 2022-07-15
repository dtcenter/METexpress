/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataDieOff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.dieoff,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": true
    };
    var dataRequests = {}; // used to store data queries
    var queryArray = [];
    var differenceArray = [];
    var dataFoundForCurve = true;
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var allStatTypes = [];
    var dataset = [];
    var utcCycleStarts = [];
    var axisMap = Object.create(null);
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var idealValues = [];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var database = curve['database'];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        var modelClause = "and h.model = '" + model + "'";
        var selectorPlotType = curve['plot-type'];
        var statistic = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'][database][curve['data-source']][selectorPlotType];
        var statLineType = statisticOptionsMap[statistic][0];
        var matchFlag = curve['object-matching'];
        var simpleFlag = curve['object-simplicity'];
        var statisticClause = "";
        var statisticClause2 = "";
        var lineDataType = "";
        var lineDataType2 = "";
        var queryTableClause = "";
        var queryTableClause2 = "";
        var headerIdClause = "";
        var headerIdClause2 = "";
        var matchedFlagClause = "";
        var matchedFlagClause2 = "";
        var simpleFlagClause = "";
        var simpleFlagClause2 = "";
        if (statLineType === 'precalculated') {
            statisticClause = "avg(" + statisticOptionsMap[statistic][2] + ") as stat, group_concat(distinct " + statisticOptionsMap[statistic][2] + ", ';', h.n_valid, ';', unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev) as sub_data";
            lineDataType = statisticOptionsMap[statistic][1];
        } else if (statLineType === 'mode_pair') {
            statisticClause = "avg(ld.interest) as interest, " +
                "group_concat(distinct ld.interest, ';', ld.object_id, ';', h.mode_header_id, ';', ld.centroid_dist, ';', unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev) as sub_data";
            statisticClause2 = "avg(ld2.area) as area, " +
                "group_concat(distinct ld2.object_id, ';', h.mode_header_id, ';', ld2.area, ';', ld2.intensity_nn, ';', ld2.centroid_lat, ';', ld2.centroid_lon, ';', unix_timestamp(h.fcst_valid), ';', h.fcst_lev order by unix_timestamp(h.fcst_valid), h.fcst_lev) as sub_data2";
            lineDataType = "mode_obj_pair";
            lineDataType2 = "mode_obj_single";
        }
        queryTableClause = "from " + database + ".mode_header h, " + database + "." + lineDataType + " ld";
        headerIdClause = "and h.mode_header_id = ld.mode_header_id";
        if (matchFlag === "Matched pairs") {
            matchedFlagClause = "and ld.matched_flag = 1";
        }
        if (simpleFlag === "Simple objects") {
            simpleFlagClause = "and ld.simple_flag = 1";
        } else if (simpleFlag === "Cluster objects") {
            simpleFlagClause = "and ld.simple_flag = 0";
        }
        if (lineDataType2 !== "") {
            queryTableClause2 = "from " + database + ".mode_header h, " + database + "." + lineDataType2 + " ld2";
            headerIdClause2 = "and h.mode_header_id = ld2.mode_header_id";
            if (matchFlag === "Matched pairs") {
                matchedFlagClause2 = "and ld2.matched_flag = 1";
            }
            if (simpleFlag === "Simple objects") {
                simpleFlagClause2 = "and ld2.simple_flag = 1";
            } else if (simpleFlag === "Cluster objects") {
                simpleFlagClause2 = "and ld2.simple_flag = 0";
            }
        }
        var scale = curve['scale'];
        var scaleClause = "";
        if (scale !== 'All scales') {
            scaleClause = "and h.grid_res = '" + scale + "'";
        }
        var radius = curve['radius'];
        var radiusClause = "";
        if (radius !== 'All radii') {
            radiusClause = "and h.fcst_rad = '" + radius + "'";
        }
        var variable = curve['variable'];
        var variableValuesMap = matsCollections['variable'].findOne({name: 'variable'}, {valuesMap: 1})['valuesMap'][database][curve['data-source']][selectorPlotType][statLineType];
        var variableClause = "and h.fcst_var = '" + variableValuesMap[variable] + "'";
        var threshold = curve['threshold'];
        var thresholdClause = "";
        if (threshold !== 'All thresholds') {
            thresholdClause = "and h.fcst_thr = '" + threshold + "'"
        }
        var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
        var validTimeClause = "";
        var utcCycleStart;
        var utcCycleStartClause = "";
        var dieoffTypeStr = curve['dieoff-type'];
        var dieoffTypeOptionsMap = matsCollections['dieoff-type'].findOne({name: 'dieoff-type'}, {optionsMap: 1})['optionsMap'];
        var dieoffType = dieoffTypeOptionsMap[dieoffTypeStr][0];
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dateClause = "and unix_timestamp(h.fcst_valid) >= '" + fromSecs + "' and unix_timestamp(h.fcst_valid) <= '" + toSecs + "' ";
        if (dieoffType === matsTypes.ForecastTypes.dieoff) {
            vts = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (vts.length !== 0 && vts !== matsTypes.InputTypes.unused) {
                vts = curve['valid-time'];
                vts = Array.isArray(vts) ? vts : [vts];
                vts = vts.map(function (vt) {
                    return "'" + vt + "'";
                }).join(',');
                validTimeClause = "and unix_timestamp(h.fcst_valid)%(24*3600)/3600 IN(" + vts + ")";
            }
        } else if (dieoffType === matsTypes.ForecastTypes.utcCycle) {
            utcCycleStart = curve['utc-cycle-start'] === undefined ? [] : curve['utc-cycle-start'];
            if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
                utcCycleStart = utcCycleStart.map(function (u) {
                    return "'" + u + "'";
                }).join(',');
                utcCycleStartClause = "and unix_timestamp(h.fcst_init)%(24*3600)/3600 IN(" + utcCycleStart + ")";
            }
            dateClause = "and unix_timestamp(h.fcst_init) >= " + fromSecs + " and unix_timestamp(h.fcst_init) <= " + toSecs;
        } else {
            dateClause = "and unix_timestamp(h.fcst_init) = " + fromSecs;
        }
        var levels = (curve['level'] === undefined || curve['level'] === matsTypes.InputTypes.unused) ? [] : curve['level'];
        var levelsClause = "";
        levels = Array.isArray(levels) ? levels : [levels];
        if (levels.length > 0) {
            levels = levels.map(function (l) {
                // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
                return "'" + l + "','" + l + "='";
            }).join(',');
            levelsClause = "and h.fcst_lev IN(" + levels + ")";
        } else {
            // we can't just leave the level clause out, because we might end up with some non-metadata-approved levels in the mix
            levels = matsCollections['level'].findOne({name: 'level'}, {optionsMap: 1})['optionsMap'][database][curve['data-source']][selectorPlotType][statLineType][variable];
            levels = levels.map(function (l) {
                return "'" + l + "'";
            }).join(',');
            levelsClause = "and h.fcst_lev IN(" + levels + ")";
        }
        var descrs = (curve['description'] === undefined || curve['description'] === matsTypes.InputTypes.unused) ? [] : curve['description'];
        var descrsClause = "";
        descrs = Array.isArray(descrs) ? descrs : [descrs];
        if (descrs.length > 0) {
            descrs = descrs.map(function (d) {
                return "'" + d + "'";
            }).join(',');
            descrsClause = "and h.descr IN(" + descrs + ")";
        }
        var statType = "met-" + statLineType;
        allStatTypes.push(statType);
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable + statistic (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var dReturn;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement1 = "";    // some mode statistics require two queries
            var statement2 = "";
            var statement = "select h.fcst_lead as fcst_lead, " +
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

            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{radiusClause}}', radiusClause);
            statement = statement.replace('{{scaleClause}}', scaleClause);
            statement = statement.replace('{{variableClause}}', variableClause);
            statement = statement.replace('{{thresholdClause}}', thresholdClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{levelsClause}}', levelsClause);
            statement = statement.replace('{{descrsClause}}', descrsClause);
            statement = statement.replace('{{dateClause}}', dateClause);

            statement1 = statement.replace('{{statisticClause}}', statisticClause);
            statement1 = statement1.replace('{{queryTableClause}}', queryTableClause);
            statement1 = statement1.replace('{{headerIdClause}}', headerIdClause);
            statement1 = statement1.replace('{{matchedFlagClause}}', matchedFlagClause);
            statement1 = statement1.replace('{{simpleFlagClause}}', simpleFlagClause);

            if (lineDataType2 !== "") {
                statement2 = statement.replace('{{statisticClause}}', statisticClause2);
                statement2 = statement2.replace('{{queryTableClause}}', queryTableClause2);
                statement2 = statement2.replace('{{headerIdClause}}', headerIdClause2);
                statement2 = statement2.replace('{{matchedFlagClause}}', matchedFlagClause2);
                statement2 = statement2.replace('{{simpleFlagClause}}', simpleFlagClause2);
                statement = statement1 + " ||| " + statement2;
            } else {
                statement = statement1
            }
            dataRequests[label] = statement;

            queryArray.push({
                "statement": statement,
                "statLineType": statLineType,
                "statistic": statistic,
                "appParams": appParams,
                "vts": vts
            });

        } else {
            // this is a difference curve
            differenceArray.push({
               "dataset": dataset,
               "diffFrom": diffFrom,
               "appParams": appParams,
                "isCTC": statType === "ctc"
            });
        }

    }  // end for curves

    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try {
        // send the query statements to the query function
        queryResult = matsDataQueryUtils.queryDBPython(sumPool, queryArray);
        finishMoment = moment();
        dataRequests["data retrieval (query) time"] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
            recordCount: queryResult.data.length
        };
        // get the data back from the query
        dReturn = queryResult.data;
    } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
    }

    // parse any errors from the python code
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        if (queryResult.error[curveIndex] !== undefined && queryResult.error[curveIndex] !== "") {
            if (queryResult.error[curveIndex] === matsTypes.Messages.NO_DATA_FOUND) {
                // this is NOT an error just a no data condition
                dataFoundForCurve = false;
            } else {
                // this is an error returned by the mysql database
                error += "Error from verification query: <br>" + queryResult.error[curveIndex] + "<br> query: <br>" + statement + "<br>";
                throw (new Error(error));
            }
        } else {
            dataFoundForAnyCurve = true;
        }
    }

    if (!dataFoundForAnyCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    var postQueryStartMoment = moment();
    var d;
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
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
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(differenceArray[curveIndex-dReturn.length]["dataset"], differenceArray[curveIndex-dReturn.length]["diffFrom"], differenceArray[curveIndex-dReturn.length]["appParams"], differenceArray[curveIndex-dReturn.length]["isCTC"]);
            d = diffResult.dataset;
            xmin = xmin < d.xmin ? xmin : d.xmin;
            xmax = xmax > d.xmax ? xmax : d.xmax;
            ymin = ymin < d.ymin ? ymin : d.ymin;
            ymax = ymax > d.ymax ? ymax : d.ymax;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.sum / d.x.length;
        const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
    }

    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "statType": allStatTypes,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time"] = {
        begin: postQueryStartMoment.format(),
        finish: postQueryFinishMoment.format(),
        duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
    plotFunction(result);
};