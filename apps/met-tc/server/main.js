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
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin', 'year'],
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
        "line_data_tcmpr": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.histogram, matsTypes.PlotTypes.yearToYear],
        "line_data_probrirw": [matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.histogram]
    };

    const masterStatsOptionsMap = {
        "line_data_tcmpr": {
            'Track error (nm)': ['precalculated', 'line_data_tcmpr', 'ld.tk_err'],
            'X error (nm)': ['precalculated', 'line_data_tcmpr', 'ld.x_err'],
            'Y error (nm)': ['precalculated', 'line_data_tcmpr', 'ld.y_err'],
            'Along track error (nm)': ['precalculated', 'line_data_tcmpr', 'ld.altk_err'],
            'Cross track error (nm)': ['precalculated', 'line_data_tcmpr', 'ld.crtk_err'],
            'Model distance to land (nm)': ['precalculated', 'line_data_tcmpr', 'ld.adland'],
            'Truth distance to land (nm)': ['precalculated', 'line_data_tcmpr', 'ld.bdland'],
            'Model-truth distance to land (nm)': ['precalculated', 'line_data_tcmpr', 'ld.adland-ld.bdland'],
            'Model MSLP (mb)': ['precalculated', 'line_data_tcmpr', 'ld.amslp'],
            'Truth MSLP (mb)': ['precalculated', 'line_data_tcmpr', 'ld.bmslp'],
            'Model-truth MSLP (mb)': ['precalculated', 'line_data_tcmpr', 'ld.amslp-ld.bmslp'],
            'Model maximum wind speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.amax_wind'],
            'Truth maximum wind speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.bmax_wind'],
            'Model-truth maximum wind speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.amax_wind-ld.bmax_wind'],
            'Model radius of maximum winds (nm)': ['precalculated', 'line_data_tcmpr', 'ld.amrd'],
            'Truth radius of maximum winds (nm)': ['precalculated', 'line_data_tcmpr', 'ld.bmrd'],
            'Model-truth radius of maximum winds (nm)': ['precalculated', 'line_data_tcmpr', 'ld.amrd-ld.bmrd'],
            'Model eye diameter (nm)': ['precalculated', 'line_data_tcmpr', 'ld.aeye'],
            'Truth eye diameter (nm)': ['precalculated', 'line_data_tcmpr', 'ld.beye'],
            'Model-truth eye diameter (nm)': ['precalculated', 'line_data_tcmpr', 'ld.aeye-ld.beye'],
            'Model storm speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.aspeed'],
            'Truth storm speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.bspeed'],
            'Model-truth storm speed (kts)': ['precalculated', 'line_data_tcmpr', 'ld.aspeed-ld.bspeed'],
            'Model storm direction (deg)': ['precalculated', 'line_data_tcmpr', 'ld.adir'],
            'Truth storm direction (deg)': ['precalculated', 'line_data_tcmpr', 'ld.bdir'],
            'Model-truth storm direction (deg)': ['precalculated', 'line_data_tcmpr', 'ld.adir-ld.bdir']
        },
        "line_data_probrirw": {
            'RI start hour': ['precalculated', 'line_data_probrirw', 'ld.rirw_beg'],
            'RI end hour': ['precalculated', 'line_data_probrirw', 'ld.rirw_end'],
            'RI time duration': ['precalculated', 'line_data_probrirw', 'ld.rirw_window'],
            'RI end model max wind speed (kts)': ['precalculated', 'line_data_probrirw', 'ld.awind_end'],
            'RI start truth max wind speed (kts)': ['precalculated', 'line_data_probrirw', 'ld.bwind_beg'],
            'RI end truth max wind speed (kts)': ['precalculated', 'line_data_probrirw', 'ld.bwind_end'],
            'RI truth start to end change in max wind speed (kts)': ['precalculated', 'line_data_probrirw', 'ld.bdelta'],
            'RI truth maximum change in max wind speed (kts)': ['precalculated', 'line_data_probrirw', 'ld.bdelta_max']
        }
    };

    const bestTrackDefs = {
        "TD": {
            "name": "Tropical depression (wind <34kt)",
            "order": "0"
        },
        "TS": {
            "name": "Tropical storm (wind 34–63 kt)",
            "order": "1"
        },
        "HU": {
            "name": "Hurricane (wind ≥64 kt)",
            "order": "2"
        },
        "EX": {
            "name": "Extratropical cyclone (any intensity)",
            "order": "3"
        },
        "SD": {
            "name": "Subtropical depression (wind <34kt)",
            "order": "4"
        },
        "SS": {
            "name": "Subtropical storm (wind ≥34kt)",
            "order": "5"
        },
        "LO": {
            "name": "Low that isn't a tropical, subtropical, or extratropical cyclone",
            "order": "6"
        },
        "WV": {
            "name": "Tropical wave (any intensity)",
            "order": "7"
        },
        "DB": {
            "name": "Disturbance (any intensity)",
            "order": "8"
        },
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
    var basinOptionsMap = {};
    var yearOptionsMap = {};
    var stormsOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var levelOptionsMap = {};
    var sourceOptionsMap = {};
    var descrOptionsMap = {};

    var rows;
    var thisGroup;
    var dbs;
    var dbArr;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select * from tc_database_groups order by db_group;");
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select distinct db from tc_mats_metadata;");
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
            basinOptionsMap[thisDB] = {};
            yearOptionsMap[thisDB] = {};
            stormsOptionsMap[thisDB] = {};
            forecastLengthOptionsMap[thisDB] = {};
            levelOptionsMap[thisDB] = {};
            sourceOptionsMap[thisDB] = {};
            descrOptionsMap[thisDB] = {};

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate from tc_mats_metadata where db = '" + thisDB + "' group by model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate order by model,line_data_table,basin,year;");
            for (i = 0; i < rows.length; i++) {

                var model_value = rows[i].model.trim();
                var model = rows[i].display_text.trim();
                modelOptionsMap[thisDB][model] = [model_value];

                var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
                var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");

                var line_data_table = rows[i].line_data_table.trim();
                var validPlotTypes = masterPlotTypeOptionsMap[line_data_table];
                plotTypeOptionsMap[thisDB][model] = plotTypeOptionsMap[thisDB][model] === undefined ? validPlotTypes : _.union(plotTypeOptionsMap[thisDB][model], validPlotTypes);
                var validStats = masterStatsOptionsMap[line_data_table];
                var basin = rows[i].basin.trim();
                var year = rows[i].year;

                var storms = rows[i].storms;
                var stormsArr = storms.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < stormsArr.length; j++) {
                    stormsArr[j] = stormsArr[j].replace(/'|\[|\]/g, "");
                }
                stormsArr.unshift('All storms');

                var sources = rows[i].truths;
                var sourceArr = sources.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < sourceArr.length; j++) {
                    sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
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
                var dummyObj;
                for (var j = 0; j < levelsArrRaw.length; j++) {
                    // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
                    dummyLevel = levelsArrRaw[j].replace(/'|\[|\]|\=/g, "");
                    if (Object.keys(bestTrackDefs).indexOf(dummyLevel) !== -1) {
                        dummyObj = bestTrackDefs[dummyLevel];
                    } else {
                        dummyObj = {
                            "name": dummyLevel,
                            "order": 10 + j
                        };
                    }
                    levelsArr.push(dummyObj);
                }
                levelsArr = levelsArr.sort((a, b) => (a.order > b.order) ? 1 : -1);
                levelsArr = levelsArr.map(a => a.name);

                var descrs = rows[i].descrs;
                var descrsArr = descrs.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < descrsArr.length; j++) {
                    descrsArr[j] = descrsArr[j].replace(/'|\[|\]|\=/g, "");
                }

                statisticOptionsMap[thisDB][model] = statisticOptionsMap[thisDB][model] === undefined ? {} : statisticOptionsMap[thisDB][model];
                basinOptionsMap[thisDB][model] = basinOptionsMap[thisDB][model] === undefined ? {} : basinOptionsMap[thisDB][model];
                yearOptionsMap[thisDB][model] = yearOptionsMap[thisDB][model] === undefined ? {} : yearOptionsMap[thisDB][model];
                stormsOptionsMap[thisDB][model] = stormsOptionsMap[thisDB][model] === undefined ? {} : stormsOptionsMap[thisDB][model];
                forecastLengthOptionsMap[thisDB][model] = forecastLengthOptionsMap[thisDB][model] === undefined ? {} : forecastLengthOptionsMap[thisDB][model];
                levelOptionsMap[thisDB][model] = levelOptionsMap[thisDB][model] === undefined ? {} : levelOptionsMap[thisDB][model];
                sourceOptionsMap[thisDB][model] = sourceOptionsMap[thisDB][model] === undefined ? {} : sourceOptionsMap[thisDB][model];
                descrOptionsMap[thisDB][model] = descrOptionsMap[thisDB][model] === undefined ? {} : descrOptionsMap[thisDB][model];
                dbDateRangeMap[thisDB][model] = dbDateRangeMap[thisDB][model] === undefined ? {} : dbDateRangeMap[thisDB][model];

                var thisPlotType;
                for (var ptidx = 0; ptidx < validPlotTypes.length; ptidx++) {
                    thisPlotType = validPlotTypes[ptidx];
                    if (statisticOptionsMap[thisDB][model][thisPlotType] === undefined) {
                        // if we haven't encountered this plot type for this model yet, initialize everything
                        statisticOptionsMap[thisDB][model][thisPlotType] = validStats;
                        basinOptionsMap[thisDB][model][thisPlotType] = {};
                        yearOptionsMap[thisDB][model][thisPlotType] = {};
                        stormsOptionsMap[thisDB][model][thisPlotType] = {};
                        forecastLengthOptionsMap[thisDB][model][thisPlotType] = {};
                        levelOptionsMap[thisDB][model][thisPlotType] = {};
                        sourceOptionsMap[thisDB][model][thisPlotType] = {};
                        descrOptionsMap[thisDB][model][thisPlotType] = {};
                        dbDateRangeMap[thisDB][model][thisPlotType] = {};
                    } else {
                        // if we have encountered this plot type for this model, add in any new stats
                        statisticOptionsMap[thisDB][model][thisPlotType] = {...statisticOptionsMap[thisDB][model][thisPlotType], ...validStats};
                    }
                    const theseValidStats = Object.keys(validStats);
                    var thisValidStatType;
                    for (var vsidx = 0; vsidx < theseValidStats.length; vsidx++) {
                        thisValidStatType = validStats[theseValidStats[vsidx]][0];
                        if (stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType] === undefined) {
                            // if we haven't encountered this variable for this stat yet, initialize everything
                            basinOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = [];
                            yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                            dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                        }
                        if (stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] === undefined) {
                            // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                            basinOptionsMap[thisDB][model][thisPlotType][thisValidStatType].push(basin);
                            yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = [];
                            stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = {};
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = {};
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = {};
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = sourceArr;
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = descrsArr;
                            dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin] = {};
                        } else {
                            // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                            sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = _.union(sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin], sourceArr);
                            descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] = _.union(descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin], descrsArr);
                        }
                        if (stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] === undefined) {
                            // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                            yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin].push(year);
                            stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = stormsArr;
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = forecastLengthArr;
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = levelsArr;
                            dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = {
                                minDate: rowMinDate,
                                maxDate: rowMaxDate
                            };
                        } else {
                            // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                            stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = _.union(stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year], stormsArr);
                            forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = _.union(forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year], forecastLengthArr);
                            levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year] = _.union(levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][year], levelsArr);
                            dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][minDate] = dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][minDate] < rowMinDate ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][minDate] : rowMinDate;
                            dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][maxDate] = dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][maxDate] > rowMaxDate ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][year][maxDate] : rowMaxDate;
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

    var defaultGroup = (Object.keys(dbGroupMap).indexOf("mollytc") !== -1) ? "mollytc" : Object.keys(dbGroupMap)[0];
    var defaultDB = (dbGroupMap[defaultGroup].indexOf("mv_testtc") !== -1) ? "mv_testtc" : dbGroupMap[defaultGroup][0];
    var defaultModel = (Object.keys(modelOptionsMap[defaultDB]).indexOf("AEMI") !== -1) ? "AEMI" : Object.keys(modelOptionsMap[defaultDB])[0];
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
                dependentNames: ["plot-type"],
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

    const basinOptions = basinOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType];
    var defaultBasin;
    if (basinOptions.indexOf("AL") !== -1) {
        defaultBasin = "AL";
    } else {
        defaultBasin = basinOptions[0];
    }

    if (matsCollections["basin"].findOne({name: 'basin'}) == undefined) {
        matsCollections["basin"].insert(
            {
                name: 'basin',
                type: matsTypes.InputTypes.select,
                optionsMap: basinOptionsMap,
                options: basinOptions,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic'],
                dependentNames: ["year", "truth", "description"],
                controlButtonCovered: true,
                unique: false,
                default: defaultBasin,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["basin"].findOne({name: 'basin'});
        if (!matsDataUtils.areObjectsEqual(basinOptionsMap, currentParam.optionsMap)) {
            // have to reload basin data
            matsCollections["basin"].update({name: 'basin'}, {
                $set: {
                    optionsMap: basinOptionsMap,
                    options: basinOptions,
                    default: defaultBasin
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
                dependentNames: ["basin"],
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

    const defaultYear = yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][0];
    
    if (matsCollections["year"].findOne({name: 'year'}) == undefined) {
        matsCollections["year"].insert(
            {
                name: 'year',
                type: matsTypes.InputTypes.select,
                optionsMap: yearOptionsMap,
                options: yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin'],
                dependentNames: ["storm", "forecast-length", "level", "dates", "curve-dates"],
                controlButtonCovered: true,
                unique: false,
                default: defaultYear,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["year"].findOne({name: 'year'});
        if (!matsDataUtils.areObjectsEqual(yearOptionsMap, currentParam.optionsMap)) {
            // have to reload year data
            matsCollections["year"].update({name: 'year'}, {
                $set: {
                    optionsMap: yearOptionsMap,
                    options: yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                    default: defaultYear
                }
            });
        }
    }

    if (matsCollections["storm"].findOne({name: 'storm'}) == undefined) {
        matsCollections["storm"].insert(
            {
                name: 'storm',
                type: matsTypes.InputTypes.select,
                optionsMap: stormsOptionsMap,
                options: stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin', 'year'],
                controlButtonCovered: true,
                unique: false,
                default: stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear][0],
                controlButtonVisibility: 'block',
                // multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["storm"].findOne({name: 'storm'});
        if (!matsDataUtils.areObjectsEqual(stormsOptionsMap, currentParam.optionsMap)) {
            // have to reload storm data
            matsCollections["storm"].update({name: 'storm'}, {
                $set: {
                    optionsMap: stormsOptionsMap,
                    options: stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear],
                    default: stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear][0]
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
                options: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin'],
                controlButtonCovered: true,
                unique: false,
                default: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][0],
                controlButtonVisibility: 'block',
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
                    options: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                    default: sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][0]
                }
            });
        }
    }

    const fhrOptions = forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear];
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
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin', 'year'],
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
            'None': ['unix_timestamp(ld.fcst_valid)'],
            '1hr': ['ceil(' + 3600 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 + '/2)/' + 3600 + '))'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((unix_timestamp(ld.fcst_valid))+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
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

    if (matsCollections["level"].findOne({name: 'level'}) == undefined) {
        matsCollections["level"].insert(
            {
                name: 'level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear],
                valuesMap: bestTrackDefs,
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin', 'year'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "Storm Classification",
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
                    options: levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin][defaultYear],
                    default: matsTypes.InputTypes.unused
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
                options: descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin'],
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
                    options: descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][defaultBasin],
                    default: matsTypes.InputTypes.unused
                }
            });
        }
    }

    // determine date defaults for dates and curveDates
    var defaultDb = matsCollections["database"].findOne({name: "database"}, {default: 1}).default;
    var dbDateRanges = matsCollections["database"].findOne({name: "database"}, {dates: 1}).dates;
    var defaultDataSource = matsCollections["data-source"].findOne({name: "data-source"}, {default: 1}).default;
    minDate = dbDateRanges[defaultDb][defaultDataSource][defaultPlotType][defaultStatType][defaultBasin][defaultYear].minDate;
    maxDate = dbDateRanges[defaultDb][defaultDataSource][defaultPlotType][defaultStatType][defaultBasin][defaultYear].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDatesTC(minDate, maxDate);
    minDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");

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
                superiorNames: ['database', 'data-source', 'plot-type', 'statistic', 'basin', 'year'],
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
                ['', 'basin', ', '],
                ['', 'year', ' '],
                ['', 'storm', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ' ']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "valid-time", "average", "forecast-length", "level", "description"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'basin', ', '],
                ['', 'year', ' '],
                ['', 'storm', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ' '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "dieoff-type", "valid-time", "utc-cycle-start", "level", "description", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'basin', ', '],
                ['', 'year', ' '],
                ['', 'storm', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ' '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "forecast-length", "level", "description", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'basin', ', '],
                ['', 'year', ' '],
                ['', 'storm', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ' '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "valid-time", "forecast-length", "level", "description", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.yearToYear,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'basin', ' '],
                ['', 'storm', ', '],
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['desc: ', 'description', ' ']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "storm", "truth", "valid-time", "forecast-length", "level", "description"
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
            plotType: matsTypes.PlotTypes.yearToYear,
            graphFunction: "graphPlotly",
            dataFunction: "dataYearToYear",
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
    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "mats_metadata", ['tc_mats_metadata', 'tc_database_groups']);
    try {
        matsMethods.resetApp({
            appPools: allPools,
            appMdr: mdr,
            appType: matsTypes.AppTypes.metexpress,
            app: 'met-tc',
            title: "MET TC",
            group: "METexpress"
        });
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
