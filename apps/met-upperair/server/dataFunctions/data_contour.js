/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataContour = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.contour,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": true
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    if (curves.length > 1) {
        throw new Error("INFO:  There must only be one added curve.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    // initialize variables specific to the curve
    var curve = curves[0];
    var label = curve['label'];
    var xAxisParam = curve['x-axis-parameter'];
    var yAxisParam = curve['y-axis-parameter'];
    var xValClause = matsCollections['x-axis-parameter'].findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
    var yValClause = matsCollections['y-axis-parameter'].findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
    var database = curve['database'];
    var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
    var modelClause = "and h.model = '" + model + "'";
    var selectorPlotType = curve['plot-type'];
    var statistic = curve['statistic'];
    var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'][database][curve['data-source']][selectorPlotType];
    var statLineType = statisticOptionsMap[statistic][0];
    var statisticClause = "";
    var lineDataType = "";
    if (statLineType === 'scalar') {
        statisticClause = "count(ld.fbar) as n, " +
            "avg(ld.fbar) as sub_fbar, " +
            "avg(ld.obar) as sub_obar, " +
            "avg(ld.ffbar) as sub_ffbar, " +
            "avg(ld.oobar) as sub_oobar, " +
            "avg(ld.fobar) as sub_fobar, " +
            "avg(ld.total) as sub_total, ";
        lineDataType = "line_data_sl1l2";
    } else if (statLineType === 'vector') {
        statisticClause = "count(ld.ufbar) as n, " +
            "avg(ld.ufbar) as sub_ufbar, " +
            "avg(ld.vfbar) as sub_vfbar, " +
            "avg(ld.uobar) as sub_uobar, " +
            "avg(ld.vobar) as sub_vobar, " +
            "avg(ld.uvfobar) as sub_uvfobar, " +
            "avg(ld.uvffbar) as sub_uvffbar, " +
            "avg(ld.uvoobar) as sub_uvoobar, " +
            "avg(ld.f_speed_bar) as sub_f_speed_bar, " +
            "avg(ld.o_speed_bar) as sub_o_speed_bar, " +
            "avg(ld.total) as sub_total, ";
        lineDataType = "line_data_vl1l2";
    }
    statisticClause = statisticClause +
        "avg(unix_timestamp(ld.fcst_valid_beg)) as sub_secs, " +    // this is just a dummy for the common python function -- the actual value doesn't matter
        "count(h.fcst_lev) as sub_levs";      // this is just a dummy for the common python function -- the actual value doesn't matter
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
    var scale = curve['scale'];
    var scaleClause = "";
    if (scale !== 'All scales') {
        scaleClause = "and h.interp_pnts = '" + scale + "'";
    }
    var im = curve['interp-method'];
    var imClause = "";
    if (im !== 'All methods') {
        imClause = "and h.interp_mthd = '" + im + "'";
    }
    var variable = curve['variable'];
    var variableValuesMap = matsCollections['variable'].findOne({name: 'variable'}, {valuesMap: 1})['valuesMap'][database][curve['data-source']][selectorPlotType][statLineType];
    var variableClause = "and h.fcst_var = '" + variableValuesMap[variable] + "'";
    var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
    var validTimeClause = "";
    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
        if (curve['valid-time'] !== undefined && curve['valid-time'] !== matsTypes.InputTypes.unused) {
            vts = curve['valid-time'];
            vts = Array.isArray(vts) ? vts : [vts];
            vts = vts.map(function (vt) {
                return "'" + vt + "'";
            }).join(',');
            validTimeClause = "and unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 IN(" + vts + ")";
        }
    }
    // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
    // have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
    var forecastLengthsClause = "";
    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
        var fcsts = (curve['forecast-length'] === undefined || curve['forecast-length'] === matsTypes.InputTypes.unused) ? [] : curve['forecast-length'];
        fcsts = Array.isArray(fcsts) ? fcsts : [fcsts];
        if (fcsts.length > 0) {
            fcsts = fcsts.map(function (fl) {
                return "'" + fl + "','" + fl + "0000'";
            }).join(',');
            forecastLengthsClause = "and ld.fcst_lead IN(" + fcsts + ")";
        }
    }
    var dateString = "";
    var dateClause = "";
    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
        dateString = "unix_timestamp(ld.fcst_init_beg)";
    } else {
        dateString = "unix_timestamp(ld.fcst_valid_beg)";
    }
    dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
    var levelsClause = "";
    var levels = (curve['level'] === undefined || curve['level'] === matsTypes.InputTypes.unused) ? [] : curve['level'];
    levels = Array.isArray(levels) ? levels : [levels];
    if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level' && levels.length > 0) {
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
    // For contours, this functions as the colorbar label.
    var unitKey;
    if (statistic.includes("vector") && (statistic.includes("speed")  || statistic.includes("length")  || statistic.includes("Speed")  || statistic.includes("Length"))) {
        unitKey = "Vector wind speed";
    } else if (statistic.includes("vector") && (statistic.includes("direction")  || statistic.includes("angle")  || statistic.includes("Direction")  || statistic.includes("Angle"))){
        unitKey = "Vector wind direction";
    } else {
        unitKey = variable + " " + statistic;
    }
    curve['unitKey'] = unitKey;

    var d;
    // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters
    var statement = "{{xValClause}} " +
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
        "{{validTimeClause}} " +
        "{{forecastLengthsClause}} " +
        "{{levelsClause}} " +
        "{{descrsClause}} " +
        "and h.stat_header_id = ld.stat_header_id " +
        "group by xVal,yVal " +
        "order by xVal,yVal" +
        ";";

    statement = statement.replace('{{xValClause}}', xValClause);
    statement = statement.replace('{{yValClause}}', yValClause);
    statement = statement.replace('{{statisticClause}}', statisticClause);
    statement = statement.replace('{{queryTableClause}}', queryTableClause);
    statement = statement.replace('{{modelClause}}', modelClause);
    statement = statement.replace('{{regionsClause}}', regionsClause);
    statement = statement.replace('{{imClause}}', imClause);
    statement = statement.replace('{{scaleClause}}', scaleClause);
    statement = statement.replace('{{variableClause}}', variableClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.replace('{{forecastLengthsClause}}', forecastLengthsClause);
    statement = statement.replace('{{levelsClause}}', levelsClause);
    statement = statement.replace('{{descrsClause}}', descrsClause);
    statement = statement.replace('{{dateClause}}', dateClause);
    statement = statement.split('{{dateString}}').join(dateString);
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
            recordCount: queryResult.data.xTextOutput.length
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
            if (error.includes('Unknown column')) {
                throw new Error("INFO:  The statistic/variable combination [" + statistic + " and " + variable + "] is not supported by the database for the model/regions [" + model + " and " + regions + "].");
            } else {
                throw new Error(error);
            }
        }
    }

    var postQueryStartMoment = moment();

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const mean = d.glob_stats.mean;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['zmin'] = d.zmin;
    curve['zmax'] = d.zmax;
    curve['xAxisKey'] = xAxisParam;
    curve['yAxisKey'] = yAxisParam;
    const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + label] = {
        begin: postQueryStartMoment.format(),
        finish: postQueryFinishMoment.format(),
        duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "statType": "met-" + statLineType, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};