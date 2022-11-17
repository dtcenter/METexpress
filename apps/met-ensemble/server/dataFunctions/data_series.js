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

dataSeries = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.timeSeries,
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
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
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
        var statisticClause = "";
        var lineDataType = "";
        if (statLineType === 'precalculated') {
            statisticClause = "avg(" + statisticOptionsMap[statistic][2] + ") as stat, group_concat(distinct " + statisticOptionsMap[statistic][2] + ", ';', ld.total, ';', unix_timestamp(ld.fcst_valid_beg), ';', h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_data";
            lineDataType = statisticOptionsMap[statistic][1];
        }
        var queryTableClause = "from " + database + ".stat_header h, " + database + "." + lineDataType + " ld";
        var regions = (curve['region'] === undefined || curve['region'] === matsTypes.InputTypes.unused) ? [] : curve['region'];
        regions = Array.isArray(regions) ? regions : [regions];
        var regionsClause = "";
        if (regions.length > 0) {
            regions = regions.map(function (r) {
                return "'" + r + "'";
            }).join(',');
            regionsClause = "and h.vx_mask IN(" + regions + ")";
        }
        var variable = curve['variable'];
        var variableValuesMap = matsCollections['variable'].findOne({name: 'variable'}, {valuesMap: 1})['valuesMap'][database][curve['data-source']][selectorPlotType][statLineType];
        var variableClause = "and h.fcst_var = '" + variableValuesMap[variable] + "'";
        var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
        var validTimeClause = "";
        if (curve['valid-time'] !== undefined && curve['valid-time'] !== matsTypes.InputTypes.unused) {
            vts = curve['valid-time'];
            vts = Array.isArray(vts) ? vts : [vts];
            vts = vts.map(function (vt) {
                return "'" + vt + "'";
            }).join(',');
            validTimeClause = "and unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 IN(" + vts + ")";
        }
        // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
        // have been sanitized for display purposes in the forecastValueMap.
        // now we have to go get the damn ole unsanitary ones for the database.
        var forecastLengthsClause = "";
        var fcsts = (curve['forecast-length'] === undefined || curve['forecast-length'] === matsTypes.InputTypes.unused) ? [] : curve['forecast-length'];
        fcsts = Array.isArray(fcsts) ? fcsts : [fcsts];
        var fcstOffset = fcsts[0];
        if (fcsts.length > 0) {
            fcsts = fcsts.map(function (fl) {
                return "'" + fl + "','" + fl + "0000'";
            }).join(',');
            forecastLengthsClause = "and ld.fcst_lead IN(" + fcsts + ")";
        }
        var dateClause = "and unix_timestamp(ld.fcst_valid_beg) >= " + fromSecs + " and unix_timestamp(ld.fcst_valid_beg) <= " + toSecs;
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
        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections['average'].findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        var statType = "met-" + statLineType;
        allStatTypes.push(statType);
        appParams['aggMethod'] = curve['aggregation-method'];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable + statistic (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = variable + " " + statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var dReturn;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select {{average}} as avtime, " +
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
                "{{variableClause}} " +
                "{{validTimeClause}} " +
                "{{forecastLengthsClause}} " +
                "{{levelsClause}} " +
                "{{descrsClause}} " +
                "and h.stat_header_id = ld.stat_header_id " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{regionsClause}}', regionsClause);
            statement = statement.replace('{{variableClause}}', variableClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthsClause}}', forecastLengthsClause);
            statement = statement.replace('{{levelsClause}}', levelsClause);
            statement = statement.replace('{{descrsClause}}', descrsClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            dataRequests[label] = statement;

            queryArray.push({
                "statement": statement,
                "statLineType": statLineType,
                "statistic": statistic,
                "appParams": JSON.parse(JSON.stringify(appParams)),
                "fcstOffset": fcstOffset,
                "vts": vts
            });

        } else {
            // this is a difference curve
            differenceArray.push({
                "dataset": dataset,
                "diffFrom": diffFrom,
                "appParams": JSON.parse(JSON.stringify(appParams)),
                "isCTC": statType === "ctc",
                "isScalar": statType === "scalar"
            });
        }

    }  // end for curves
debugger;
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
debugger;
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
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(differenceArray[curveIndex-dReturn.length]["dataset"], differenceArray[curveIndex-dReturn.length]["diffFrom"], differenceArray[curveIndex-dReturn.length]["appParams"], differenceArray[curveIndex-dReturn.length]["isCTC"], differenceArray[curveIndex-dReturn.length]["isScalar"]);
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