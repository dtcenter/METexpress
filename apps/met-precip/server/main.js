/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
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

        const xOptionsMap = {
            'Fcst lead time': "select ld.fcst_lead as xVal, ",
            'Valid UTC hour': "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(ld.fcst_valid_beg) as xVal, ",
            'Init Date': "select unix_timestamp(ld.fcst_init_beg) as xVal, "
        };

        matsCollections.PlotParams.insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(xOptionsMap),
                optionsMap: xOptionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(xOptionsMap)[2],
                controlButtonVisibility: 'block',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 2,
            });

        const yOptionsMap = {
            'Fcst lead time': "ld.fcst_lead as yVal, ",
            'Valid UTC hour': "unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(ld.fcst_valid_beg) as yVal, ",
            'Init Date': "unix_timestamp(ld.fcst_init_beg) as yVal, "
        };

        matsCollections.PlotParams.insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(yOptionsMap),
                optionsMap: yOptionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(yOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 2,
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
        const params = matsCollections.CurveParamsInfo.find({"curve_params": {"$exists": true}}).fetch()[0]["curve_params"];
        for (var cp = 0; cp < params.length; cp++) {
            matsCollections[params[cp]].remove({});
        }
    }

    const masterPlotTypeOptionsMap = {
        "line_data_sl1l2": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.threshold, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.gridscale, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour],
        "line_data_ctc": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.threshold, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.gridscale, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour],
        "line_data_eclv": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.threshold, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.gridscale, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour],
        "line_data_nbrcnt": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.threshold, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.gridscale, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour]
    };

    const masterStatsOptionsMap = {
        "line_data_sl1l2": {
            'RMSE': ['scalar'],
            'Bias-corrected RMSE': ['scalar'],
            'MSE': ['scalar'],
            'Bias-corrected MSE': ['scalar'],
            'ME (Additive bias)': ['scalar'],
            'Fractional Error': ['scalar'],
            'Multiplicative bias': ['scalar'],
            'Forecast mean': ['scalar'],
            'Observed mean': ['scalar'],
            'Forecast stdev': ['scalar'],
            'Observed stdev': ['scalar'],
            'Error stdev': ['scalar'],
            'Pearson correlation': ['scalar']
        },
        "line_data_ctc": {
            'CSI': ['ctc'],
            'FAR': ['ctc'],
            'FBIAS': ['ctc'],
            'GSS': ['ctc'],
            'HSS': ['ctc'],
            'PODy': ['ctc'],
            'PODn': ['ctc'],
            'POFD': ['ctc']
        },
        "line_data_eclv": {
            'EV': ['precalculated', 'line_data_eclv', 'ld.value_baser']
        },
        "line_data_nbrcnt": {
            'FSS': ['precalculated', 'line_data_nbrcnt', 'ld.fss']
        }
    };

    var masterStatsValuesMap = {};
    const lineTypes = Object.keys(masterStatsOptionsMap);
    for (var si = 0; si < lineTypes.length; si++) {
        masterStatsValuesMap = {...masterStatsValuesMap, ...masterStatsOptionsMap[lineTypes[si]]};
    }

    var myDBs = [];
    var dbGroupMap = {};
    var modelOptionsMap = {};
    var dbDateRangeMap = {};
    var plotTypeOptionsMap = {};
    var statisticOptionsMap = {};
    var variableOptionsMap = {};
    var variableValuesMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var levelOptionsMap = {};
    var thresholdOptionsMap = {};
    var imOptionsMap = {};
    var scaleOptionsMap = {};
    var sourceOptionsMap = {};
    var descrOptionsMap = {};

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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select distinct db from precip_metexpress_metadata;");
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
            plotTypeOptionsMap[thisDB] = {};
            statisticOptionsMap[thisDB] = {};
            variableOptionsMap[thisDB] = {};
            variableValuesMap[thisDB] = {};
            regionModelOptionsMap[thisDB] = {};
            forecastLengthOptionsMap[thisDB] = {};
            levelOptionsMap[thisDB] = {};
            thresholdOptionsMap[thisDB] = {};
            imOptionsMap[thisDB] = {};
            scaleOptionsMap[thisDB] = {};
            sourceOptionsMap[thisDB] = {};
            descrOptionsMap[thisDB] = {};

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,trshs,interp_mthds,gridpoints,truths,mindate,maxdate from precip_metexpress_metadata where db = '" + thisDB + "' group by model,display_text,line_data_table,variable,regions,levels,descrs,fcst_lens,fcst_orig,trshs,interp_mthds,gridpoints,truths,mindate,maxdate order by model,line_data_table,variable;");
            for (i = 0; i < rows.length; i++) {

                var model_value = rows[i].model.trim();
                var model = rows[i].display_text.trim();
                modelOptionsMap[thisDB][model] = [model_value];

                var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
                var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
                if (dbDateRangeMap[thisDB][model] === undefined) {
                    dbDateRangeMap[thisDB][model] = {minDate: rowMinDate, maxDate: rowMaxDate};
                } else {
                    dbDateRangeMap[thisDB][model][minDate] = dbDateRangeMap[thisDB][model][minDate] < rowMinDate ? dbDateRangeMap[thisDB][model][minDate] : rowMinDate;
                    dbDateRangeMap[thisDB][model][maxDate] = dbDateRangeMap[thisDB][model][maxDate] > rowMaxDate ? dbDateRangeMap[thisDB][model][maxDate] : rowMaxDate;
                }

                var line_data_table = rows[i].line_data_table.trim();
                var validPlotTypes = masterPlotTypeOptionsMap[line_data_table];
                plotTypeOptionsMap[thisDB][model] = plotTypeOptionsMap[thisDB][model] === undefined ? validPlotTypes : _.union(plotTypeOptionsMap[thisDB][model], validPlotTypes);
                var validStats = masterStatsOptionsMap[line_data_table];
                var variable = rows[i].variable.trim();

                var regions = rows[i].regions;
                var regionsArr = regions.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < regionsArr.length; j++) {
                    regionsArr[j] = regionsArr[j].replace(/'|\[|\]/g, "");
                }

                var sources = rows[i].truths;
                var sourceArr = sources.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < sourceArr.length; j++) {
                    sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
                }
                sourceArr.unshift('Any obs type');

                var forecastLengths = rows[i].fcst_orig;
                var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < forecastLengthArr.length; j++) {
                    forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]|0000/g, "");
                }

                var levels = rows[i].levels;
                var levelsArrRaw = levels.split(',').map(Function.prototype.call, String.prototype.trim);
                var levelsArr = [];
                var dummyLevel;
                for (var j = 0; j < levelsArrRaw.length; j++) {
                    // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
                    dummyLevel = levelsArrRaw[j].replace(/'|\[|\]|\=/g, "");
                    if (levelsArr.indexOf(dummyLevel) === -1) {
                        levelsArr.push(dummyLevel);
                    }
                }

                var trshs = rows[i].trshs;
                var trshArr = trshs.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < trshArr.length; j++) {
                    trshArr[j] = trshArr[j].replace(/'|\[|\]/g, "");
                }
                trshArr.unshift('All thresholds');

                var ims = rows[i].interp_mthds;
                var imsArr = ims.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < imsArr.length; j++) {
                    imsArr[j] = imsArr[j].replace(/'|\[|\]/g, "");
                }
                imsArr.unshift('All methods');

                var scales = rows[i].gridpoints;
                var scalesArr = scales.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < scalesArr.length; j++) {
                    scalesArr[j] = scalesArr[j].replace(/'|\[|\]/g, "");
                }
                scalesArr.unshift('All scales');

                var descrs = rows[i].descrs;
                var descrsArr = descrs.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < descrsArr.length; j++) {
                    descrsArr[j] = descrsArr[j].replace(/'|\[|\]|\=/g, "");
                }

                statisticOptionsMap[thisDB][model] = statisticOptionsMap[thisDB][model] === undefined ? {} : statisticOptionsMap[thisDB][model];
                variableOptionsMap[thisDB][model] = variableOptionsMap[thisDB][model] === undefined ? {} : variableOptionsMap[thisDB][model];
                variableValuesMap[thisDB][model] = variableValuesMap[thisDB][model] === undefined ? {} : variableValuesMap[thisDB][model];
                regionModelOptionsMap[thisDB][model] = regionModelOptionsMap[thisDB][model] === undefined ? {} : regionModelOptionsMap[thisDB][model];
                forecastLengthOptionsMap[thisDB][model] = forecastLengthOptionsMap[thisDB][model] === undefined ? {} : forecastLengthOptionsMap[thisDB][model];
                levelOptionsMap[thisDB][model] = levelOptionsMap[thisDB][model] === undefined ? {} : levelOptionsMap[thisDB][model];
                thresholdOptionsMap[thisDB][model] = thresholdOptionsMap[thisDB][model] === undefined ? {} : thresholdOptionsMap[thisDB][model];
                imOptionsMap[thisDB][model] = imOptionsMap[thisDB][model] === undefined ? {} : imOptionsMap[thisDB][model];
                scaleOptionsMap[thisDB][model] = scaleOptionsMap[thisDB][model] === undefined ? {} : scaleOptionsMap[thisDB][model];
                sourceOptionsMap[thisDB][model] = sourceOptionsMap[thisDB][model] === undefined ? {} : sourceOptionsMap[thisDB][model];
                descrOptionsMap[thisDB][model] = descrOptionsMap[thisDB][model] === undefined ? {} : descrOptionsMap[thisDB][model];

                var thisPlotType;
                for (var ptidx = 0; ptidx < validPlotTypes.length; ptidx++) {
                    thisPlotType = validPlotTypes[ptidx];
                    if (statisticOptionsMap[thisDB][model][thisPlotType] === undefined) {
                        // if we haven't encountered this plot type for this model yet, initialize everything
                        statisticOptionsMap[thisDB][model][thisPlotType] = validStats;
                        variableOptionsMap[thisDB][model][thisPlotType] = {};
                        variableValuesMap[thisDB][model][thisPlotType] = {};
                        regionModelOptionsMap[thisDB][model][thisPlotType] = {};
                        forecastLengthOptionsMap[thisDB][model][thisPlotType] = {};
                        levelOptionsMap[thisDB][model][thisPlotType] = {};
                        thresholdOptionsMap[thisDB][model][thisPlotType] = {};
                        imOptionsMap[thisDB][model][thisPlotType] = {};
                        scaleOptionsMap[thisDB][model][thisPlotType] = {};
                        sourceOptionsMap[thisDB][model][thisPlotType] = {};
                        descrOptionsMap[thisDB][model][thisPlotType] = {};
                    } else {
                        // if we have encountered this plot type for this model, add in any new stats
                        statisticOptionsMap[thisDB][model][thisPlotType] = {...statisticOptionsMap[thisDB][model][thisPlotType], ...validStats};
                    }
                    const jsonFriendlyVariable = variable.replace(/\./g, "_");
                    const theseValidStats = Object.keys(validStats);
                    var thisValidStatType;
                    for (var vsidx = 0; vsidx < theseValidStats.length; vsidx++) {
                        thisValidStatType = validStats[theseValidStats[vsidx]][0];
                        if (variableValuesMap[thisDB][model][thisPlotType][thisValidStatType] === undefined) {
                            // if we haven't encountered this variable for this stat yet, initialize everything
                            variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = [];
                            variableValuesMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                        }
                        if (variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] === undefined) {
                            // if we haven't encountered this variable for this plot type yet, just store the variable-dependent arrays
                            variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType].push(jsonFriendlyVariable);
                            variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = variable;
                            regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = regionsArr;
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = forecastLengthArr;
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = levelsArr;
                            thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = trshArr;
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = imsArr;
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = scalesArr;
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = sourceArr;
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = descrsArr;
                        } else {
                            // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                            regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], regionsArr);
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], forecastLengthArr);
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], levelsArr);
                            thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], trshArr);
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], imsArr);
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], scalesArr);
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], sourceArr);
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], descrsArr);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.log(err.message);
    }

    if (matsCollections["label"].findOne({name: 'label'}) == undefined) {
        matsCollections["label"].insert(
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
    // get the default group, db, and model that were specified in the settings file. If none exist, take
    // the first available option for each in the selector.
    var requestedGroup = matsCollections.Settings.findOne({}).appDefaultGroup;
    var defaultGroup = (Object.keys(dbGroupMap).indexOf(requestedGroup) !== -1) ? requestedGroup : Object.keys(dbGroupMap)[0];
    var requestedDB = matsCollections.Settings.findOne({}).appDefaultDB;
    var defaultDB = (dbGroupMap[defaultGroup].indexOf(requestedDB) !== -1) ? requestedDB : dbGroupMap[defaultGroup][0];
    var requestedModel = matsCollections.Settings.findOne({}).appDefaultModel;
    var defaultModel = (Object.keys(modelOptionsMap[defaultDB]).indexOf(requestedModel) !== -1) ? requestedModel : Object.keys(modelOptionsMap[defaultDB])[0];

    // these defaults are app-specific and not controlled by the user
    var defaultPlotType = matsTypes.PlotTypes.timeSeries;
    var defaultStatistic = Object.keys(statisticOptionsMap[defaultDB][defaultModel][defaultPlotType])[0];
    var defaultStatType = masterStatsValuesMap[defaultStatistic][0];

    if (matsCollections["group"].findOne({name: 'group'}) == undefined) {
        matsCollections["group"].insert(
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
        var currentParam = matsCollections["group"].findOne({name: 'group'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.options, Object.keys(dbGroupMap)))) {
            // have to reload group data
            if (process.env.NODE_ENV === "development") {
                console.log("updating group data")
            }
            matsCollections["group"].update({name: 'group'}, {
                $set: {
                    options: Object.keys(dbGroupMap),
                    default: defaultGroup,
                }
            });
        }
    }

    if (matsCollections["database"].findOne({name: 'database'}) == undefined) {
        matsCollections["database"].insert(
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
        var currentParam = matsCollections["database"].findOne({name: 'database'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, dbGroupMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap))) {
            // have to reload database data
            if (process.env.NODE_ENV === "development") {
                console.log("updating database data")
            }
            matsCollections["database"].update({name: 'database'}, {
                $set: {
                    optionsMap: dbGroupMap,
                    dates: dbDateRangeMap,
                    options: dbGroupMap[defaultGroup],
                    default: defaultDB
                }
            });
        }
    }

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[defaultDB]),
                superiorNames: ["database"],
                dependentNames: ["plot-type", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: defaultModel,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if ((!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap))) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[defaultDB]),
                    default: defaultModel
                }
            });
        }
    }

    if (matsCollections["plot-type"].findOne({name: 'plot-type'}) == undefined) {
        matsCollections["plot-type"].insert(
            {
                name: 'plot-type',
                type: matsTypes.InputTypes.select,
                optionsMap: plotTypeOptionsMap,
                options: plotTypeOptionsMap[defaultDB][defaultModel],
                superiorNames: ['database', 'data-source'],
                dependentNames: ["statistic"],
                controlButtonCovered: false,
                default: defaultPlotType,
                unique: false,
                controlButtonVisibility: 'none',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["plot-type"].findOne({name: 'plot-type'});
        if ((!matsDataUtils.areObjectsEqual(plotTypeOptionsMap, currentParam.optionsMap))) {
            // have to reload model data
            matsCollections["plot-type"].update({name: 'plot-type'}, {
                $set: {
                    optionsMap: plotTypeOptionsMap,
                    options: plotTypeOptionsMap[defaultDB][defaultModel],
                    default: defaultPlotType
                }
            });
        }
    }

    // these defaults are app-specific and not controlled by the user
    const regionOptions = regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var regionDefault;
    if (regionOptions.indexOf("FULL") !== -1) {
        regionDefault = "FULL";
    } else if (regionOptions.indexOf("G002") !== -1) {
        regionDefault = "G002";
    } else if (regionOptions.indexOf("CONUS") !== -1) {
        regionDefault = "CONUS";
    } else if (regionOptions.indexOf("G218/APL") !== -1) {
        regionDefault = "G218/APL";
    } else {
        regionDefault = regionOptions[0];
    }

    if (matsCollections["region"].findOne({name: 'region'}) == undefined) {
        matsCollections["region"].insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionOptions,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                controlButtonCovered: true,
                unique: false,
                default: regionDefault,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                help: 'region.html'
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(regionModelOptionsMap, currentParam.optionsMap)) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    options: regionOptions,
                    default: regionDefault
                }
            });
        }
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statisticOptionsMap,
                options: Object.keys(statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]),
                valuesMap: masterStatsValuesMap,
                superiorNames: ['database', 'data-source', 'plot-type'],
                dependentNames: ["variable"],
                controlButtonCovered: true,
                unique: false,
                default: defaultStatistic,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["statistic"].findOne({name: 'statistic'});
        if (!matsDataUtils.areObjectsEqual(statisticOptionsMap, currentParam.optionsMap)) {
            // have to reload region data
            matsCollections["statistic"].update({name: 'statistic'}, {
                $set: {
                    optionsMap: statisticOptionsMap,
                    options: Object.keys(statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]),
                    default: defaultStatistic
                }
            });
        }
    }

    if (matsCollections["variable"].findOne({name: 'variable'}) == undefined) {
        matsCollections["variable"].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType],
                valuesMap: variableValuesMap,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic'],
                dependentNames: ["region", "forecast-length", "level", "threshold", "interp-method", "scale", "truth", "description"],
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["variable"].findOne({name: 'variable'});
        if ((!matsDataUtils.areObjectsEqual(variableOptionsMap, currentParam.optionsMap)) ||
            (!matsDataUtils.areObjectsEqual(variableValuesMap, currentParam.valuesMap))) {
            // have to reload variable data
            matsCollections["variable"].update({name: 'variable'}, {
                $set: {
                    optionsMap: variableOptionsMap,
                    valuesMap: variableValuesMap,
                    options: variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType],
                    default: variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][0]
                }
            });
        }
    }

    if (matsCollections["threshold"].findOne({name: 'threshold'}) == undefined) {
        matsCollections["threshold"].insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdOptionsMap,
                options: thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["threshold"].findOne({name: 'threshold'});
        if (!matsDataUtils.areObjectsEqual(thresholdOptionsMap, currentParam.optionsMap)) {
            // have to reload threshold data
            matsCollections["threshold"].update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdOptionsMap,
                    options: thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                    default: thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0]
                }
            });
        }
    }

    if (matsCollections["interp-method"].findOne({name: 'interp-method'}) == undefined) {
        matsCollections["interp-method"].insert(
            {
                name: 'interp-method',
                type: matsTypes.InputTypes.select,
                optionsMap: imOptionsMap,
                options: imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                controlButtonCovered: true,
                unique: false,
                default: imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["interp-method"].findOne({name: 'interp-method'});
        if (!matsDataUtils.areObjectsEqual(imOptionsMap, currentParam.optionsMap)) {
            // have to reload im data
            matsCollections["interp-method"].update({name: 'interp-method'}, {
                $set: {
                    optionsMap: imOptionsMap,
                    options: imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                    default: imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(imOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0]
                }
            });
        }
    }

    if (matsCollections["scale"].findOne({name: 'scale'}) == undefined) {
        matsCollections["scale"].insert(
            {
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleOptionsMap,
                options: scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                controlButtonCovered: true,
                unique: false,
                default: scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["scale"].findOne({name: 'scale'});
        if (!matsDataUtils.areObjectsEqual(scaleOptionsMap, currentParam.optionsMap)) {
            // have to reload scale data
            matsCollections["scale"].update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleOptionsMap,
                    options: scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                    default: scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0]
                }
            });
        }
    }

    if (matsCollections["truth"].findOne({name: 'truth'}) == undefined) {
        matsCollections["truth"].insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: sourceOptionsMap,
                options: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                controlButtonCovered: true,
                unique: false,
                default: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "obs type",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["truth"].findOne({name: 'truth'});
        if (!matsDataUtils.areObjectsEqual(sourceOptionsMap, currentParam.optionsMap)) {
            // have to reload truth data
            matsCollections["truth"].update({name: 'truth'}, {
                $set: {
                    optionsMap: sourceOptionsMap,
                    options: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                    default: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]][0]
                }
            });
        }
    }

    // these defaults are app-specific and not controlled by the user
    const fhrOptions = forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var fhrDefault;
    if (fhrOptions.indexOf("24") !== -1) {
        fhrDefault = "24";
    } else if (fhrOptions.indexOf("12") !== -1) {
        fhrDefault = "12";
    } else {
        fhrDefault = fhrOptions[0];
    }

    if (matsCollections["forecast-length"].findOne({name: 'forecast-length'}) == undefined) {
        matsCollections["forecast-length"].insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: fhrOptions,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
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
        var currentParam = matsCollections["forecast-length"].findOne({name: 'forecast-length'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap))) {
            // have to reload forecast length data
            matsCollections["forecast-length"].update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: fhrOptions,
                    default: fhrDefault
                }
            });
        }
    }

    if (matsCollections["dieoff-type"].findOne({name: 'dieoff-type'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections["dieoff-type"].insert(
            {
                name: 'dieoff-type',
                type: matsTypes.InputTypes.select,
                optionsMap: dieoffOptionsMap,
                options: Object.keys(dieoffOptionsMap),
                hideOtherFor: {
                    'valid-time': ["Dieoff for a specified UTC cycle init hour", "Single cycle forecast (uses first date in range)"],
                    'utc-cycle-start': ["Dieoff", "Single cycle forecast (uses first date in range)"],
                },
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(dieoffOptionsMap)[0],
                controlButtonVisibility: 'block',
                controlButtonText: 'dieoff type',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections["valid-time"].findOne({name: 'valid-time'}) == undefined) {
        matsCollections["valid-time"].insert(
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
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 5,
                multiple: true
            });
    }

    if (matsCollections["utc-cycle-start"].findOne({name: 'utc-cycle-start'}) == undefined) {
        matsCollections["utc-cycle-start"].insert(
            {
                name: 'utc-cycle-start',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                controlButtonCovered: true,
                unique: false,
                default: 12,
                controlButtonVisibility: 'block',
                controlButtonText: "utc cycle init hour",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    if (matsCollections["average"].findOne({name: 'average'}) == undefined) {
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
        matsCollections["average"].insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6
            });
    }

    // these defaults are app-specific and not controlled by the user
    const levelOptions = levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var levelDefault;
    if (levelOptions.indexOf("L0") !== -1) {
        levelDefault = "L0";
    } else if (levelOptions.indexOf("A24") !== -1) {
        levelDefault = "A24";
    } else if (levelOptions.indexOf("A06") !== -1) {
        levelDefault = "A06";
    } else if (levelOptions.indexOf("A03") !== -1) {
        levelDefault = "A03";
    } else {
        levelDefault = levelOptions[0];
    }

    if (matsCollections["level"].findOne({name: 'level'}) == undefined) {
        matsCollections["level"].insert(
            {
                name: 'level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptions,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
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
        var currentParam = matsCollections["level"].findOne({name: 'level'});
        if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
            // have to reload level data
            matsCollections["level"].update({name: 'level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptions,
                    default: levelDefault
                }
            });
        }
    }

    if (matsCollections["description"].findOne({name: 'description'}) == undefined) {
        matsCollections["description"].insert(
            {
                name: 'description',
                type: matsTypes.InputTypes.select,
                optionsMap: descrOptionsMap,
                options: descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'variable'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 6,
                multiple: true
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["description"].findOne({name: 'description'});
        if (!matsDataUtils.areObjectsEqual(descrOptionsMap, currentParam.optionsMap)) {
            // have to reload description data
            matsCollections["description"].update({name: 'description'}, {
                $set: {
                    optionsMap: descrOptionsMap,
                    options: descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]],
                    default: matsTypes.InputTypes.unused
                }
            });
        }
    }

    // determine date defaults for dates and curveDates
    // these defaults are app-specific and not controlled by the user
    var defaultDb = matsCollections["database"].findOne({name: "database"}, {default: 1}).default;
    var dbDateRanges = matsCollections["database"].findOne({name: "database"}, {dates: 1}).dates;
    var defaultDataSource = matsCollections["data-source"].findOne({name: "data-source"}, {default: 1}).default;
    minDate = dbDateRanges[defaultDb][defaultDataSource].minDate;
    maxDate = dbDateRanges[defaultDb][defaultDataSource].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
    const minusMonthMinDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");

    if (matsCollections["curve-dates"].findOne({name: 'curve-dates'}) == undefined) {
        const optionsMap = {
            '1 day': ['1 day'],
            '3 days': ['3 days'],
            '7 days': ['7 days'],
            '31 days': ['31 days'],
            '90 days': ['90 days'],
            '180 days': ['180 days'],
            '365 days': ['365 days']
        };
        matsCollections["curve-dates"].insert(
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
        var currentParam = matsCollections["curve-dates"].findOne({name: 'curve-dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload dates data
            matsCollections["curve-dates"].update({name: 'curve-dates'}, {
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
                ['', 'threshold', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ', '],
                ['', 'truth', ''],
                [', desc: ', 'description', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "scale", "valid-time", "average", "forecast-length", "level", "truth", "description"
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
                ['', 'threshold', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "scale", "dieoff-type", "valid-time", "utc-cycle-start", "level", "truth", "description", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.threshold,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "forecast-length", "valid-time", "level", "truth", "description", "curve-dates"
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
                ['', 'threshold', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "scale", "forecast-length", "level", "truth", "description", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.gridscale,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ', '],
                ['', 'interp-method', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "valid-time", "forecast-length", "level", "truth", "description", "curve-dates"
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
                ['', 'threshold', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "scale", "valid-time", "forecast-length", "level", "truth", "description", "curve-dates"
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
                ['', 'threshold', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ''],
                [', desc: ', 'description', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "threshold", "interp-method", "scale", "valid-time", "forecast-length", "level", "truth", "description"
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
            plotType: matsTypes.PlotTypes.threshold,
            graphFunction: "graphPlotly",
            dataFunction: "dataThreshold",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphPlotly",
            dataFunction: "dataValidTime",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.gridscale,
            graphFunction: "graphPlotly",
            dataFunction: "dataGridScale",
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
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find({}).count() < 0) {
        console.log('main startup: corrupted Databases collection: dropping Databases collection');
        matsCollections.Databases.drop();
    }
    if (matsCollections.Databases.find({}).count() === 0) {
        var databases = undefined;
        if (Meteor.settings == undefined || Meteor.settings.private == undefined || Meteor.settings.private.databases == undefined) {
            databases = undefined;
        } else {
            databases = Meteor.settings.private.databases;
        }
        if (databases !== null && databases !== undefined && Array.isArray(databases)) {
            for (var di = 0; di < databases.length; di++) {
                matsCollections.Databases.insert(databases[di]);
            }
        }
    }

    // create list of all pools
    var allPools = [];
    const sumSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}, {
        host: 1,
        port: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    if (sumSettings) {
        sumPool = mysql.createPool(sumSettings);
        allPools.push({pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA});
    }

    // create list of tables we need to monitor for update
    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "metexpress_metadata", ['precip_metexpress_metadata', 'precip_database_groups']);
    try {
        matsMethods.resetApp({appPools: allPools, appMdr: mdr, appType: matsTypes.AppTypes.metexpress});
    } catch (error) {
        console.log(error.message);
    }
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
