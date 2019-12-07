/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';

// determined in doCurveParanms
var minDate;
var maxDate;
var dstr;

const doPlotParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    if (matsCollections.PlotParams.find().count() == 0) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['database', 'data-source'],
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "dateHelp.html"
            });

        var plotFormats = {};
        plotFormats[matsTypes.PlotFormats.matching] = 'show matching diffs';
        plotFormats[matsTypes.PlotFormats.pairwise] = 'pairwise diffs';
        plotFormats[matsTypes.PlotFormats.none] = 'no diffs';
        matsCollections.PlotParams.insert(
            {
                name: 'plotFormat',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: [matsTypes.PlotFormats.matching, matsTypes.PlotFormats.pairwise, matsTypes.PlotFormats.none],
                default: matsTypes.PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });

        const yAxisOptionsMap = {
            "Relative frequency": ["relFreq"],
            "Number": ["number"]
        };
        matsCollections.PlotParams.insert(
            {
                name: 'histogram-yaxis-controls',
                type: matsTypes.InputTypes.select,
                optionsMap: yAxisOptionsMap,
                options: Object.keys(yAxisOptionsMap),
                default: Object.keys(yAxisOptionsMap)[0],
                controlButtonCovered: true,
                controlButtonText: 'Y-axis mode',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });

        const binOptionsMap = {
            "Default bins": ["default"],
            "Set number of bins": ["binNumber"],
            "Make zero a bin bound": ["zeroBound"],
            "Choose a bin bound": ["chooseBound"],
            "Set number of bins and make zero a bin bound": ["binNumberWithZero"],
            "Set number of bins and choose a bin bound": ["binNumberWithChosen"],
            "Manual bins": ["manual"],
            "Manual bin start, number, and stride": ["manualStride"]
        };
        matsCollections.PlotParams.insert(
            {
                name: 'histogram-bin-controls',
                type: matsTypes.InputTypes.select,
                optionsMap: binOptionsMap,
                options: Object.keys(binOptionsMap),
                hideOtherFor: {
                    'bin-number': ["Default bins", "Make zero a bin bound", "Manual bins", "Choose a bin bound"],
                    'bin-pivot': ["Default bins", "Set number of bins", "Make zero a bin bound", "Set number of bins and make zero a bin bound", "Manual bins", "Manual bin start, number, and stride"],
                    'bin-start': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
                    'bin-stride': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
                    'bin-bounds': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bin start, number, and stride"],
                },
                default: Object.keys(binOptionsMap)[0],
                controlButtonCovered: true,
                controlButtonText: 'customize bins',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-number',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '2',
                max: '100',
                step: 'any',
                default: '12',
                controlButtonCovered: true,
                controlButtonText: "number of bins",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-pivot',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin pivot value",
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-start',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin start",
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-stride',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin stride",
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-bounds',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                default: ' ',
                controlButtonCovered: true,
                controlButtonText: "bin bounds (enter numbers separated by commas)",
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // need to update the dates selector if the metadata has changed
        var currentParam = matsCollections.PlotParams.findOne({name: 'dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload model data
            matsCollections.PlotParams.update({name: 'dates'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }
};

const doCurveParams = function () {
    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    var myDBs = [];
    var dbGroupMap = {};
    var modelOptionsMap = {};
    var dbDateRangeMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var forecastValueOptionsMap = {};
    var levelOptionsMap = {};
    var variableOptionsMap = {};
    var thresholdOptionsMap = {};
    var scaleOptionsMap = {};
    var sourceOptionsMap = {};

    var rows;
    var thisGroup;
    var dbs;
    var dbArr;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select * from precip_database_groups order by db_group;");
        for (var i = 0; i < rows.length; i++) {
            thisGroup = rows[i].db_group.trim();
            dbs = rows[i].dbs;
            dbArr = dbs.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < dbArr.length; j++) {
                dbArr[j] = dbArr[j].replace(/'|\[|\]/g, "");
            }
            dbGroupMap[thisGroup] = dbArr;
        }
    } catch (err) {
        console.log(err.message);
    }

    var thisDB;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT DISTINCT db FROM precip_mats_metadata;");
        for (i = 0; i < rows.length; i++) {
            thisDB = rows[i].db.trim();
            myDBs.push(thisDB);
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        for (var k = 0; k < myDBs.length; k++) {
            thisDB = myDBs[k];
            modelOptionsMap[thisDB] = {};
            dbDateRangeMap[thisDB] = {};
            forecastLengthOptionsMap[thisDB] = {};
            forecastValueOptionsMap[thisDB] = {};
            levelOptionsMap[thisDB] = {};
            variableOptionsMap[thisDB] = {};
            regionModelOptionsMap[thisDB] = {};
            thresholdOptionsMap[thisDB] = {};
            scaleOptionsMap[thisDB] = {};
            sourceOptionsMap[thisDB] = {};

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,regions,levels,fcst_lens,fcst_orig,variables,trshs,gridpoints,truths,mindate,maxdate from precip_mats_metadata where db = '" + thisDB + "' group by model,display_text,regions,levels,fcst_lens,fcst_orig,variables,trshs,gridpoints,truths,mindate,maxdate order by model;");
            for (i = 0; i < rows.length; i++) {

                var model_value = rows[i].model.trim();
                var model = rows[i].display_text.trim();
                modelOptionsMap[thisDB][model] = [model_value];

                var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
                var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
                dbDateRangeMap[thisDB][model] = {minDate: rowMinDate, maxDate: rowMaxDate};

                var sources = rows[i].truths;
                var sourceArr = sources.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < sourceArr.length; j++) {
                    sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
                }
                sourceArr.unshift('Any obs type');
                sourceOptionsMap[thisDB][model] = sourceArr;

                var forecastLengths = rows[i].fcst_lens;
                var forecastValues = rows[i].fcst_orig;
                var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
                var forecastValueArr = forecastValues.split(',').map(Function.prototype.call, String.prototype.trim);
                var forecastValue;
                var lengthValMap = {};
                for (var j = 0; j < forecastLengthArr.length; j++) {
                    forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
                    forecastValue = forecastValueArr[j].replace(/'|\[|\]/g, "");
                    if (forecastValue === 'dflt') {
                        // we couldn't parse the forecast lengths in the metadata script,
                        // so we need to check for multiple formats in our query.
                        forecastValue = forecastLengthArr[j] + ',' + (Number(forecastLengthArr[j]) * 10000).toString();
                    }
                    lengthValMap[forecastLengthArr[j]] = forecastValue;
                }
                forecastLengthOptionsMap[thisDB][model] = forecastLengthArr;
                forecastValueOptionsMap[thisDB][model] = lengthValMap;

                var levels = rows[i].levels;
                var levelArr = levels.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < levelArr.length; j++) {
                    levelArr[j] = levelArr[j].replace(/'|\[|\]/g, "");
                }
                levelOptionsMap[thisDB][model] = levelArr;

                var variables = rows[i].variables;
                var variableArr = variables.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < variableArr.length; j++) {
                    variableArr[j] = variableArr[j].replace(/'|\[|\]/g, "");
                }
                variableOptionsMap[thisDB][model] = variableArr;

                var trshs = rows[i].trshs;
                var trshArr = trshs.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < trshArr.length; j++) {
                    trshArr[j] = trshArr[j].replace(/'|\[|\]/g, "");
                }
                trshArr.unshift('All thresholds');
                thresholdOptionsMap[thisDB][model] = trshArr;

                var regions = rows[i].regions;
                var regionsArr = regions.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < regionsArr.length; j++) {
                    regionsArr[j] = regionsArr[j].replace(/'|\[|\]/g, "");
                }
                regionModelOptionsMap[thisDB][model] = regionsArr;

                var scales = rows[i].gridpoints;
                var scalesArr = scales.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < scalesArr.length; j++) {
                    scalesArr[j] = scalesArr[j].replace(/'|\[|\]/g, "");
                }
                scalesArr.unshift('All scales');
                scaleOptionsMap[thisDB][model] = scalesArr;
            }
        }

    } catch (err) {
        console.log(err.message);
    }

    if (matsCollections.CurveParams.findOne({name: 'label'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'label',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: '',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: 'label.html'
            }
        );
    }

    var defaultGroup = (Object.keys(dbGroupMap).indexOf("PROD") !== -1) ? "PROD" : Object.keys(dbGroupMap)[0];
    var defaultDB = dbGroupMap[defaultGroup][0];

    if (matsCollections.CurveParams.findOne({name: 'group'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'group',
                type: matsTypes.InputTypes.select,
                options: Object.keys(dbGroupMap),
                dependentNames: ["database"],
                controlButtonCovered: true,
                default: defaultGroup,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'group'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.options, Object.keys(dbGroupMap)))) {
            // have to reload group data
            if (process.env.NODE_ENV === "development") {
                console.log("updating group data")
            }
            matsCollections.CurveParams.update({name: 'group'}, {
                $set: {
                    options: Object.keys(dbGroupMap),
                    default: defaultGroup,
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'database'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'database',
                type: matsTypes.InputTypes.select,
                optionsMap: dbGroupMap,
                options: dbGroupMap[defaultGroup],
                dates: dbDateRangeMap,
                superiorNames: ["group"],
                dependentNames: ["data-source"],
                controlButtonCovered: true,
                default: defaultDB,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'database'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, dbGroupMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap))) {
            // have to reload database data
            if (process.env.NODE_ENV === "development") {
                console.log("updating database data")
            }
            matsCollections.CurveParams.update({name: 'database'}, {
                $set: {
                    optionsMap: dbGroupMap,
                    dates: dbDateRangeMap,
                    options: dbGroupMap[defaultGroup],
                    default: defaultDB
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'data-source'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[defaultDB]),
                levelsMap: levelOptionsMap, // need to know what levels the metadata allows for each model.
                superiorNames: ["database"],
                dependentNames: ["region", "variable", "threshold", "scale", "forecast-length", "level", "truth", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[defaultDB])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
        if ((!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap)) ||
            (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.levelsMap))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    levelsMap: levelOptionsMap,
                    options: Object.keys(modelOptionsMap[defaultDB]),
                    default: Object.keys(modelOptionsMap[defaultDB])[0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'region'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]],
                superiorNames: ['database', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                help: 'region.html'
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(regionModelOptionsMap, currentParam.optionsMap)) {
            // have to reload region data
            matsCollections.CurveParams.update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    options: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]],
                    default: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const statOptionsMap = {
            'RMSE': ['scalar'],
            'Bias-corrected RMSE': ['scalar'],
            'MSE': ['scalar'],
            'Bias-corrected MSE': ['scalar'],
            'ME (Additive bias)': ['scalar'],
            'Multiplicative bias': ['scalar'],
            'Forecast mean': ['scalar'],
            'Observed mean': ['scalar'],
            'Forecast stdev': ['scalar'],
            'Observed stdev': ['scalar'],
            'Error stdev': ['scalar'],
            'Pearson correlation': ['scalar'],
            'CSI': ['ctc'],
            'FAR': ['ctc'],
            'FBIAS': ['ctc'],
            'GSS': ['ctc'],
            'HSS': ['ctc'],
            'PODy': ['ctc'],
            'PODn': ['ctc'],
            'POFD': ['ctc']
        };

        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statOptionsMap,
                options: Object.keys(statOptionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(statOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'variable'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]],
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'variable'});
        if (!matsDataUtils.areObjectsEqual(variableOptionsMap, currentParam.optionsMap)) {
            // have to reload variable data
            matsCollections.CurveParams.update({name: 'variable'}, {
                $set: {
                    optionsMap: variableOptionsMap,
                    options: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]],
                    default: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'threshold'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdOptionsMap,
                options: thresholdOptionsMap[defaultDB][Object.keys(thresholdOptionsMap[defaultDB])[0]],
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: thresholdOptionsMap[defaultDB][Object.keys(thresholdOptionsMap[defaultDB])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'threshold'});
        if (!matsDataUtils.areObjectsEqual(thresholdOptionsMap, currentParam.optionsMap)) {
            // have to reload threshold data
            matsCollections.CurveParams.update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdOptionsMap,
                    options: thresholdOptionsMap[defaultDB][Object.keys(thresholdOptionsMap[defaultDB])[0]],
                    default: thresholdOptionsMap[defaultDB][Object.keys(thresholdOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'scale'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleOptionsMap,
                options: scaleOptionsMap[defaultDB][Object.keys(scaleOptionsMap[defaultDB])[0]],
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: scaleOptionsMap[defaultDB][Object.keys(scaleOptionsMap[defaultDB])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'scale'});
        if (!matsDataUtils.areObjectsEqual(scaleOptionsMap, currentParam.optionsMap)) {
            // have to reload scale data
            matsCollections.CurveParams.update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleOptionsMap,
                    options: scaleOptionsMap[defaultDB][Object.keys(scaleOptionsMap[defaultDB])[0]],
                    default: scaleOptionsMap[defaultDB][Object.keys(scaleOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'truth'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: sourceOptionsMap,
                options: sourceOptionsMap[defaultDB][Object.keys(sourceOptionsMap[defaultDB])[0]],
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: sourceOptionsMap[defaultDB][Object.keys(sourceOptionsMap[defaultDB])[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "obs type",
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'truth'});
        if (!matsDataUtils.areObjectsEqual(sourceOptionsMap, currentParam.optionsMap)) {
            // have to reload truth data
            matsCollections.CurveParams.update({name: 'truth'}, {
                $set: {
                    optionsMap: sourceOptionsMap,
                    options: sourceOptionsMap[defaultDB][Object.keys(sourceOptionsMap[defaultDB])[0]],
                    default: sourceOptionsMap[defaultDB][Object.keys(sourceOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    const fhrOptions = forecastLengthOptionsMap[defaultDB][Object.keys(forecastLengthOptionsMap[defaultDB])[0]];
    var fhrDefault;
    if (fhrOptions.indexOf("24") !== -1) {
        fhrDefault = "24";
    } else if (fhrOptions.indexOf("12") !== -1) {
        fhrDefault = "12";
    } else {
        fhrDefault = fhrOptions[0];
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: fhrOptions,
                valuesMap: forecastValueOptionsMap,
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: fhrDefault,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, forecastValueOptionsMap))) {
            // have to reload forecast length data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    valuesMap: forecastValueOptionsMap,
                    options: fhrOptions,
                    default: fhrDefault
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'dieoff-type'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-type',
                type: matsTypes.InputTypes.select,
                optionsMap: dieoffOptionsMap,
                options: Object.keys(dieoffOptionsMap),
                hideOtherFor: {
                    'valid-time': ["Dieoff for a specified UTC cycle init hour", "Single cycle forecast (uses first date in range)"],
                    'utc-cycle-start': ["Dieoff", "Single cycle forecast (uses first date in range)"],
                },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(dieoffOptionsMap)[0],
                controlButtonVisibility: 'block',
                controlButtonText: 'dieoff type',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'valid-time'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: [],
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'utc-cycle-start',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 12,
                controlButtonVisibility: 'block',
                controlButtonText: "utc cycle init hour",
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'average'}) == undefined) {
        const optionsMap = {
            'None': ['unix_timestamp(ld.fcst_valid_beg)'],
            '1hr': ['ceil(' + 3600 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 + '/2)/' + 3600 + '))'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((unix_timestamp(ld.fcst_valid_beg))+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
        };
        matsCollections.CurveParams.insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6
            });
    }

    const levelOptions = levelOptionsMap[defaultDB][Object.keys(levelOptionsMap[defaultDB])[0]];
    var levelDefault;
    if (levelOptions.indexOf("P500") !== -1) {
        levelDefault = "P500";
    } else if (levelOptions.indexOf("SFC") !== -1) {
        levelDefault = "SFC";
    } else {
        levelDefault = levelOptions[0];
    }

    if (matsCollections.CurveParams.findOne({name: 'level'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptions,
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: levelDefault,
                controlButtonVisibility: 'block',
                controlButtonText: "Level",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
                multiple: false
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'level'});
        if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
            // have to reload level data
            matsCollections.CurveParams.update({name: 'level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptions,
                    default: levelDefault
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "select ld.fcst_lead as xVal, ",
            'Threshold': "select h.fcst_thresh as xVal, ",
            'Scale': "select h.interp_pnts as xVal, ",
            'Valid UTC hour': "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(ld.fcst_valid_beg) as xVal, ",
            'Init Date': "select unix_timestamp(ld.fcst_init_beg) as xVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[5],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 7,
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "ld.fcst_lead as yVal, ",
            'Threshold': "h.fcst_thresh as yVal, ",
            'Scale': "h.interp_pnts as yVal, ",
            'Valid UTC hour': "unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(ld.fcst_valid_beg) as yVal, ",
            'Init Date': "unix_timestamp(ld.fcst_init_beg) as yVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 7,
            });
    }

    // determine date defaults for dates and curveDates
    var defaultDb = matsCollections.CurveParams.findOne({name: "database"}, {default: 1}).default;
    var dbDateRanges = matsCollections.CurveParams.findOne({name: "database"}, {dates: 1}).dates;
    var defaultDataSource = matsCollections.CurveParams.findOne({name: "data-source"}, {default: 1}).default;
    minDate = dbDateRanges[defaultDb][defaultDataSource].minDate;
    maxDate = dbDateRanges[defaultDb][defaultDataSource].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
    const minusMonthMinDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");

    if (matsCollections.CurveParams.findOne({name: 'curve-dates'}) == undefined) {
        const optionsMap = {
            '1 day': ['1 day'],
            '3 days': ['3 days'],
            '7 days': ['7 days'],
            '31 days': ['31 days'],
            '90 days': ['90 days'],
            '180 days': ['180 days'],
            '365 days': ['365 days']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'curve-dates',
                type: matsTypes.InputTypes.dateRange,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap).sort(),
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['database', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 8,
                help: "dateHelp.html"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'curve-dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload dates data
            matsCollections.CurveParams.update({name: 'curve-dates'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding matsCollections.PlotGraphFunctions.PlotType value.
 See curve_item.js and standAlone.js.
 */
const doCurveTextPatterns = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' '],
                ['', 'truth', ' ']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "scale", "valid-time", "average", "forecast-length", "level", "truth"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "scale", "dieoff-type", "valid-time", "utc-cycle-start", "level", "truth", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "scale", "forecast-length", "level", "truth", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "scale", "valid-time", "forecast-length", "level", "truth", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', ']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "scale", "valid-time", "forecast-length", "level", "truth", "x-axis-parameter", "y-axis-parameter"
            ],
            groupSize: 6
        });
    }
};

const doSavedCurveParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

const doPlotGraph = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotGraphFunctions.remove({});
    }
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            graphFunction: "graphPlotly",
            dataFunction: "dataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphPlotly",
            dataFunction: "dataDieOff",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphPlotly",
            dataFunction: "dataValidTime",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.histogram,
            graphFunction: "graphPlotly",
            dataFunction: "dataHistogram",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.contour,
            graphFunction: "graphPlotly",
            dataFunction: "dataContour",
            checked: false
        });
    }
};


Meteor.startup(function () {
    if (Meteor.settings.private == null) {
        console.log("There is a problem with your Meteor.settings.private being undefined. Did you forget the -- settings argument?");
        throw new Meteor.Error("There is a problem with your Meteor.settings.private being undefined. Did you forget the -- settings argument?");
    }
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find({}).count() === 0) {
        var databases = Meteor.settings.private.databases;
        if (databases !== null && databases !== undefined && Array.isArray(databases)) {
            for (var di = 0; di < databases.length; di++) {
                matsCollections.Databases.insert(databases[di]);
            }
        }
    }

    var sumSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}, {
        host: 1,
        port: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "mats_metadata", ['precip_mats_metadata', 'precip_database_groups']);
    matsMethods.resetApp({appMdr: mdr, appType: matsTypes.AppTypes.metexpress, app: 'met-precip'});
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
appSpecificResetRoutines = [
    doPlotGraph,
    doCurveParams,
    doSavedCurveParams,
    doPlotParams,
    doCurveTextPatterns
];
