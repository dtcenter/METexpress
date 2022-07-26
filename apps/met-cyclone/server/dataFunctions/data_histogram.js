/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataHistogram = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.histogram,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var alreadyMatched = false;
    var dataRequests = {}; // used to store data queries
    var queryArray = [];
    var differenceArray = [];
    var dataFoundForCurve = [];
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var allStatTypes = [];
    var dataset = [];
    var allReturnedSubStats = [];
    var allReturnedSubSecs = [];
    var allReturnedSubLevs = [];
    var axisMap = Object.create(null);

    // process user bin customizations
    const binParams = matsDataUtils.setHistogramParameters(plotParams);
    const yAxisFormat = binParams.yAxisFormat;
    const binNum = binParams.binNum;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        dataFoundForCurve[curveIndex] = true;
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
        var year = curve['year'];
        var storm = curve['storm'];
        var stormClause;
        if (storm === "All storms") {
            stormClause = "and h.storm_id like '" + basin + "%" + year.toString() + "'";
        } else {
            stormClause = "and h.storm_id = '" + storm.split(" - ")[0] + "'";
        }
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
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dateClause = "and unix_timestamp(ld.fcst_valid) >= " + fromSecs + " and unix_timestamp(ld.fcst_valid) <= " + toSecs;
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
        // variable (axisKey) it will use the same axis.
        // Histograms should have everything under the same axisKey.
        var axisKey = yAxisFormat;
        if (yAxisFormat === 'Relative frequency') {
            axisKey = axisKey + " (x100)"
        }
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

        var dReturn;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select unix_timestamp(ld.fcst_valid) as avtime, " +
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

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{stormClause}}', stormClause);
            statement = statement.replace('{{truthClause}}', truthClause);
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
                "appParams": appParams,
                "vts": vts
            });

        } else {
            // this is a difference curve
            differenceArray.push({
               "dataset": dataset,
               "diffFrom": diffFrom,
               "appParams": appParams,
                "isCTC": statType === "ctc",
                "isScalar": statType === "scalar"
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
            allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
            allReturnedSubSecs.push(d.subSecs);
            allReturnedSubLevs.push(d.subLevs);
        }
    }
    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "dataFoundForCurve": dataFoundForCurve,
        "statType": allStatTypes,
        "axisMap": axisMap,
        "yAxisFormat": yAxisFormat
    };
    const bookkeepingParams = {
        "alreadyMatched": alreadyMatched,
        "dataRequests": dataRequests,
        "totalProcessingStart": totalProcessingStart
    };
    var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, allReturnedSubLevs, dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time"] = {
        begin: postQueryStartMoment.format(),
        finish: postQueryFinishMoment.format(),
        duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
    plotFunction(result);
};