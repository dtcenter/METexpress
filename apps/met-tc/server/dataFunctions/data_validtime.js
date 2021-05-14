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

dataValidTime = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.validtime,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
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
        var year = curve['year'];
        var storm = curve['storm'];
        var stormClause;
        if (storm === "All storms") {
            stormClause = "and h.storm_id like '" + basin + "%" + year.toString() + "'";
        } else {
            stormClause = "and h.storm_id = '" + storm.split(" - ")[0] + "'";
        }
        var truth = curve['truth'];
        var truthClause = "and h.bmodel = '" + truth + "'";
        var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
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
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable + statistic (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select unix_timestamp(ld.fcst_valid)%(24*3600)/3600 as hr_of_day, " +
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
                "{{forecastLengthsClause}} " +
                "{{levelsClause}} " +
                "{{descrsClause}} " +
                "and h.tcst_header_id = ld.tcst_header_id " +
                "group by hr_of_day " +
                "order by hr_of_day" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{stormClause}}', stormClause);
            statement = statement.replace('{{truthClause}}', truthClause);
            statement = statement.replace('{{forecastLengthsClause}}', forecastLengthsClause);
            statement = statement.replace('{{levelsClause}}', levelsClause);
            statement = statement.replace('{{descrsClause}}', descrsClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBPython(sumPool, statement, statLineType, statistic, appParams, vts);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.x.length
                };
                // get the data back from the query
                d = queryResult.data;
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // this is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                }
            } else {
                dataFoundForAnyCurve = true;
            }

            // set axis limits based on returned data
            var postQueryStartMoment = moment();
            if (dataFoundForCurve) {
                xmin = xmin < d.xmin ? xmin : d.xmin;
                xmax = xmax > d.xmax ? xmax : d.xmax;
                ymin = ymin < d.ymin ? ymin : d.ymin;
                ymax = ymax > d.ymax ? ymax : d.ymax;
            }
        } else {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams);
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
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        };
    }  // end for curves

    if (!dataFoundForAnyCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "statType": "met-" + statLineType,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};