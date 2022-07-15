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

dataYearToYear = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.yearToYear,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
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
        var modelClause = "and h.amodel = '" + model + "'";
        var selectorPlotType = curve['plot-type'];
        var statistic = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'][database][curve['data-source']][selectorPlotType];
        var statLineType = statisticOptionsMap[statistic][0];
        var statisticClause = "";
        var lineDataType = "";
        if (statLineType === 'precalculated') {
            statisticClause = "avg(" + statisticOptionsMap[statistic][2] + ") as stat, group_concat(distinct " + statisticOptionsMap[statistic][2] + ", ';', 9999, ';', unix_timestamp(ld.fcst_valid) order by unix_timestamp(ld.fcst_valid)) as sub_data";
            lineDataType = statisticOptionsMap[statistic][1];
        }
        var queryTableClause = "from " + database + ".tcst_header h, " + database + "." + lineDataType + " ld";
        var basin = curve['basin'];
        var stormClause = "and h.basin = '" + basin + "'";
        var truthStr = curve['truth'];
        var truth = Object.keys(matsCollections['truth'].findOne({name: 'truth'}).valuesMap).find(key => matsCollections['truth'].findOne({name: 'truth'}).valuesMap[key] === truthStr);
        var truthClause = "and h.bmodel = '" + truth + "'";
        var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
        var validTimeClause = "";
        if (curve['valid-time'] !== undefined && curve['valid-time'] !== matsTypes.InputTypes.unused) {
            vts = curve['valid-time'];
            vts = Array.isArray(vts) ? vts : [vts];
            vts = vts.map(function (vt) {
                return "'" + vt + "'";
            }).join(',');
            validTimeClause = "and unix_timestamp(ld.fcst_valid)%(24*3600)/3600 IN(" + vts + ")";
        }
        // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
        // have been sanitized for display purposes in the forecastValueMap.
        // now we have to go get the damn ole unsanitary ones for the database.
        var forecastLengthsClause = "";
        var fcsts = (curve['forecast-length'] === undefined || curve['forecast-length'] === matsTypes.InputTypes.unused) ? [] : curve['forecast-length'];
        fcsts = Array.isArray(fcsts) ? fcsts : [fcsts];
        if (fcsts.length > 0) {
            fcsts = fcsts.map(function (fl) {
                return "'" + fl + "','" + fl + "0000'";
            }).join(',');
            forecastLengthsClause = "and ld.fcst_lead IN(" + fcsts + ")";
        }
        var levels = (curve['level'] === undefined || curve['level'] === matsTypes.InputTypes.unused) ? [] : curve['level'];
        var levelValuesMap = matsCollections['level'].findOne({name: 'level'}, {valuesMap: 1})['valuesMap'];
        var levelKeys = Object.keys(levelValuesMap);
        var levelKey;
        var levelsClause = "";
        levels = Array.isArray(levels) ? levels : [levels];
        if (levels.length > 0 && lineDataType !== "line_data_probrirw") {
            levels = levels.map(function (l) {
                for (var lidx = 0; lidx < levelKeys.length; lidx++) {
                    levelKey = levelKeys[lidx];
                    if (levelValuesMap[levelKey].name === l) {
                        return "'" + levelKey + "'";
                    }
                }
            }).join(',');
            levelsClause = "and ld.level IN(" + levels + ")";
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
            var statement = "select substring(h.storm_id, -4) as year, " +
                "count(distinct unix_timestamp(ld.fcst_valid)) as N_times, " +
                "min(unix_timestamp(ld.fcst_valid)) as min_secs, " +
                "max(unix_timestamp(ld.fcst_valid)) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{modelClause}} " +
                "{{stormClause}} " +
                "{{truthClause}} " +
                "{{validTimeClause}} " +
                "{{forecastLengthsClause}} " +
                "{{levelsClause}} " +
                "{{descrsClause}} " +
                "and h.tcst_header_id = ld.tcst_header_id " +
                "group by year " +
                "order by year" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{stormClause}}', stormClause);
            statement = statement.replace('{{truthClause}}', truthClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthsClause}}', forecastLengthsClause);
            statement = statement.replace('{{levelsClause}}', levelsClause);
            statement = statement.replace('{{descrsClause}}', descrsClause);
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