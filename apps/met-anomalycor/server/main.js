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
        "line_data_sal1l2": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.profile, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour],
        "line_data_val1l2": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.profile, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.contour]
    };

    const masterStatsOptionsMap = {
        "line_data_sal1l2": {
            'ACC': ['scalar']
        },
        "line_data_val1l2": {
            'Vector ACC': ['vector']
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
    var imOptionsMap = {};
    var scaleOptionsMap = {};
    var descrOptionsMap = {};

    var rows;
    var thisGroup;
    var dbs;
    var dbArr;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select * from anomalycor_database_groups order by db_group;");
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select distinct db from anomalycor_mats_metadata;");
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
            imOptionsMap[thisDB] = {};
            scaleOptionsMap[thisDB] = {};
            descrOptionsMap[thisDB] = {};

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,interp_mthds,gridpoints,mindate,maxdate from anomalycor_mats_metadata where db = '" + thisDB + "' group by model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,interp_mthds,gridpoints,mindate,maxdate order by model,line_data_table,variable;");
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
                imOptionsMap[thisDB][model] = imOptionsMap[thisDB][model] === undefined ? {} : imOptionsMap[thisDB][model];
                scaleOptionsMap[thisDB][model] = scaleOptionsMap[thisDB][model] === undefined ? {} : scaleOptionsMap[thisDB][model];
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
                        imOptionsMap[thisDB][model][thisPlotType] = {};
                        scaleOptionsMap[thisDB][model][thisPlotType] = {};
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
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                        }
                        if (variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] === undefined) {
                            // if we haven't encountered this variable for this plot type yet, just store the variable-dependent arrays
                            variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType].push(jsonFriendlyVariable);
                            variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = variable;
                            regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = regionsArr;
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = forecastLengthArr;
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = levelsArr;
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = imsArr;
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = scalesArr;
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = descrsArr;
                        } else {
                            // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                            regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], regionsArr);
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], forecastLengthArr);
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], levelsArr);
                            imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(imOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], imsArr);
                            scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable] = _.union(scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][jsonFriendlyVariable], scalesArr);
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

    var defaultGroup = (Object.keys(dbGroupMap).indexOf("NO GROUP") !== -1) ? "NO GROUP" : Object.keys(dbGroupMap)[0];
    var defaultDB = (dbGroupMap[defaultGroup].indexOf("mv_gsl_global_g2g") !== -1) ? "mv_gsl_global_g2g" : dbGroupMap[defaultGroup][0];
    var defaultModel = (Object.keys(modelOptionsMap[defaultDB]).indexOf("GFS") !== -1) ? "GFS" : Object.keys(modelOptionsMap[defaultDB])[0];
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

    const regionOptions = regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var regionDefault;
    if (regionOptions.indexOf("FULL") !== -1) {
        regionDefault = "FULL";
    } else if (regionOptions.indexOf("CONUS") !== -1) {
        regionDefault = "CONUS";
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

    const variableOptions = variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType];
    var variableDefault;
    if (variableOptions.indexOf("HGT") !== -1) {
        variableDefault = "HGT";
    } else {
        variableDefault = variableOptions[0];
    }

    if (matsCollections["variable"].findOne({name: 'variable'}) == undefined) {
        matsCollections["variable"].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptions,
                valuesMap: variableValuesMap,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic'],
                dependentNames: ["region", "forecast-length", "level", "description"],
                controlButtonCovered: true,
                unique: false,
                default: variableDefault,
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
                    options: variableOptions,
                    default: variableDefault
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

    const fhrOptions = forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var fhrDefault;
    if (fhrOptions.indexOf("120") !== -1) {
        fhrDefault = "120";
    } else if (fhrOptions.indexOf("24") !== -1) {
        fhrDefault = "24";
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

    const levelOptions = levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][Object.keys(levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType])[0]];
    var levelDefault;
    if (levelOptions.indexOf("P500") !== -1) {
        levelDefault = "P500";
    } else if (levelOptions.indexOf("SFC") !== -1) {
        levelDefault = "SFC";
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
                multiple: true
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

    if (matsCollections["x-axis-parameter"].findOne({name: 'x-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "select ld.fcst_lead as xVal, ",
            'Pressure level': "select h.fcst_lev as xVal, ",
            'Valid UTC hour': "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(ld.fcst_valid_beg) as xVal, ",
            'Init Date': "select unix_timestamp(ld.fcst_init_beg) as xVal, "
        };

        matsCollections["x-axis-parameter"].insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 7,
            });
    }

    if (matsCollections["y-axis-parameter"].findOne({name: 'y-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "ld.fcst_lead as yVal, ",
            'Pressure level': "h.fcst_lev as yVal, ",
            'Valid UTC hour': "unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(ld.fcst_valid_beg) as yVal, ",
            'Init Date': "unix_timestamp(ld.fcst_init_beg) as yVal, "
        };

        matsCollections["y-axis-parameter"].insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 7,
            });
    }

    // determine date defaults for dates and curveDates
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
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ''],
                [', desc: ', 'description', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "valid-time", "average", "forecast-length", "level", "description"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "valid-time", "forecast-length", "description", "curve-dates"
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
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "dieoff-type", "valid-time", "utc-cycle-start", "level", "description", "curve-dates"
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
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "forecast-length", "level", "description", "curve-dates"
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
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "valid-time", "forecast-length", "level", "description", "curve-dates"
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
                ['', 'interp-method', ' '],
                ['', 'scale', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ''],
                [', desc: ', 'description', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "interp-method", "scale", "valid-time", "forecast-length", "level", "description", "x-axis-parameter", "y-axis-parameter"
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
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphPlotly",
            dataFunction: "dataProfile",
            checked: false
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
    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "mats_metadata", ['anomalycor_mats_metadata', 'anomalycor_database_groups']);
    const appCurveParams = [
        "label",
        "group",
        "database",
        "data-source",
        "plot-type",
        "region",
        "statistic",
        "variable",
        "interp-method",
        "scale",
        "forecast-length",
        "dieoff-type",
        "valid-time",
        "utc-cycle-start",
        "average",
        "level",
        "description",
        "x-axis-parameter",
        "y-axis-parameter",
        "curve-dates"
    ];
    try {
        matsMethods.resetApp({ appPools: allPools, appCurveParams: appCurveParams, appMdr: mdr, appType: matsTypes.AppTypes.metexpress, app: 'met-anomalycor', title: "MET Anomaly Correlation", group: "METexpress"});
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
