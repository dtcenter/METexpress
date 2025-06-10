/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import { Meteor } from "meteor/meteor";
import { moment } from "meteor/momentjs:moment";
import { _ } from "meteor/underscore";
import {
  matsMethods,
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsDataQueryUtils,
  matsParamUtils,
} from "meteor/randyp:mats-common";
// eslint-disable-next-line import/no-extraneous-dependencies
import mysql from "mysql2/promise";

/* eslint-disable no-await-in-loop */

// determined in doCurveParanms
let minDate;
let maxDate;
let dstr;

const doPlotParams = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.PlotParams.removeAsync({});
  }
  if ((await matsCollections.PlotParams.find().countAsync()) === 0) {
    await matsCollections.PlotParams.insertAsync({
      name: "dates",
      type: matsTypes.InputTypes.dateRange,
      options: [""],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
    });

    const plotFormats = {};
    plotFormats[matsTypes.PlotFormats.none] = "no diffs";
    plotFormats[matsTypes.PlotFormats.matching] = "show matching diffs";
    plotFormats[matsTypes.PlotFormats.pairwise] = "pairwise diffs";
    await matsCollections.PlotParams.insertAsync({
      name: "plotFormat",
      type: matsTypes.InputTypes.select,
      optionsMap: plotFormats,
      options: [
        matsTypes.PlotFormats.none,
        matsTypes.PlotFormats.matching,
        matsTypes.PlotFormats.pairwise,
      ],
      default: matsTypes.PlotFormats.none,
      controlButtonCovered: true,
      controlButtonText: "Difference Curves",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });

    const histogramOptionsMap = {
      "Rank Histogram": ["rhist"],
      "Probability Integral Transform Histogram": ["phist"],
      "Relative Position Histogram": ["relp"],
    };
    await matsCollections.PlotParams.insertAsync({
      name: "histogram-type-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: histogramOptionsMap,
      options: Object.keys(histogramOptionsMap),
      default: Object.keys(histogramOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "Histogram Type",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
    });

    const yAxisOptionsMap = {
      "Relative frequency": ["relFreq"],
      Number: ["number"],
    };
    await matsCollections.PlotParams.insertAsync({
      name: "histogram-yaxis-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: yAxisOptionsMap,
      options: Object.keys(yAxisOptionsMap),
      default: Object.keys(yAxisOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "Y-axis mode",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });

    const binOptionsMap = {
      "Default bins": ["default"],
      "Set number of bins": ["binNumber"],
      "Make zero a bin bound": ["zeroBound"],
      "Choose a bin bound": ["chooseBound"],
      "Set number of bins and make zero a bin bound": ["binNumberWithZero"],
      "Set number of bins and choose a bin bound": ["binNumberWithChosen"],
      "Manual bins": ["manual"],
      "Manual bin start, number, and stride": ["manualStride"],
    };
    await matsCollections.PlotParams.insertAsync({
      name: "histogram-bin-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: binOptionsMap,
      options: Object.keys(binOptionsMap),
      hideOtherFor: {
        "bin-number": [
          "Default bins",
          "Make zero a bin bound",
          "Manual bins",
          "Choose a bin bound",
        ],
        "bin-pivot": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Set number of bins and make zero a bin bound",
          "Manual bins",
          "Manual bin start, number, and stride",
        ],
        "bin-start": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bins",
        ],
        "bin-stride": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bins",
        ],
        "bin-bounds": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bin start, number, and stride",
        ],
      },
      default: Object.keys(binOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "customize bins",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "bin-number",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "2",
      max: "100",
      step: "any",
      default: "12",
      controlButtonCovered: true,
      controlButtonText: "number of bins",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "bin-pivot",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin pivot value",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 2,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "bin-start",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin start",
      displayOrder: 6,
      displayPriority: 1,
      displayGroup: 2,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "bin-stride",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin stride",
      displayOrder: 7,
      displayPriority: 1,
      displayGroup: 2,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "bin-bounds",
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      default: " ",
      controlButtonCovered: true,
      controlButtonText: "bin bounds (Enter numbers separated by commas)",
      displayOrder: 8,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // need to update the dates selector if the metadata has changed
    const currentParam = await matsCollections.PlotParams.findOneAsync({
      name: "dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload model data
      await matsCollections.PlotParams.updateAsync(
        { name: "dates" },
        {
          $set: {
            startDate: minDate,
            stopDate: maxDate,
            default: dstr,
          },
        }
      );
    }
  }
};

const doCurveParams = async function () {
  // force a reset if requested - simply remove all the existing params to force a reload
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    const params = (
      await matsCollections.CurveParamsInfo.findOneAsync({
        curve_params: { $exists: true },
      })
    ).curve_params;
    for (let cp = 0; cp < params.length; cp += 1) {
      await matsCollections[params[cp]].removeAsync({});
    }
  }

  const masterPlotTypeOptionsMap = {
    line_data_ecnt: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
    ],
    line_data_cnt: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
    ],
    line_data_pstd: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
    ],
    line_data_nbrcnt: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
    ],
    line_data_rhist: [matsTypes.PlotTypes.ensembleHistogram],
    line_data_pct: [
      matsTypes.PlotTypes.reliability,
      matsTypes.PlotTypes.roc,
      matsTypes.PlotTypes.performanceDiagram,
    ],
  };

  const masterStatsOptionsMap = {
    line_data_ecnt: {
      RMSE: ["ecnt", "line_data_ecnt", "ld.rmse"],
      "RMSE with obs error": ["ecnt", "line_data_ecnt", "ld.rmse_oerr"],
      Spread: ["ecnt", "line_data_ecnt", "ld.spread"],
      "Spread with obs error": ["ecnt", "line_data_ecnt", "ld.spread_oerr"],
      "ME (Additive bias)": ["ecnt", "line_data_ecnt", "ld.me"],
      "ME with obs error": ["ecnt", "line_data_ecnt", "ld.me_oerr"],
      CRPS: ["ecnt", "line_data_ecnt", "ld.crps"],
      CRPSS: ["ecnt", "line_data_ecnt", "ld.crpss"],
    },
    line_data_cnt: {
      MAE: ["ecnt", "line_data_cnt", "ld.mae"],
    },
    line_data_pstd: {
      BS: ["precalculated", "line_data_pstd", "ld.brier"],
      BSS: ["precalculated", "line_data_pstd", "ld.bss"],
      "BS reliability": ["precalculated", "line_data_pstd", "ld.reliability"],
      "BS resolution": ["precalculated", "line_data_pstd", "ld.resolution"],
      "BS uncertainty": ["precalculated", "line_data_pstd", "ld.uncertainty"],
      "BS lower confidence limit": ["precalculated", "line_data_pstd", "ld.brier_ncl"],
      "BS upper confidence limit": ["precalculated", "line_data_pstd", "ld.brier_ncu"],
      "ROC AUC": ["precalculated", "line_data_pstd", "ld.roc_auc"],
    },
    line_data_nbrcnt: {
      FSS: ["nbrcnt"],
    },
    line_data_pct: {
      Reliability: ["precalculated", "line_data_pct", ""],
      ROC: ["precalculated", "line_data_pct", ""],
      PerformanceDiagram: ["precalculated", "line_data_pct", ""],
    },
    line_data_rhist: {
      rhist: ["precalculated", "line_data_rhist", ""],
      phist: ["precalculated", "line_data_phist", ""],
      relp: ["precalculated", "line_data_relp ", ""],
    },
  };

  const aggMethodOptionsMap = {
    ecnt: {
      "Mean statistic weighted by N": ["weightMeanStat"],
      "Mean statistic": ["meanStat"],
      "Median statistic": ["medStat"],
    },
    nbrcnt: {
      "Overall statistic": ["aggStat"],
      "Mean statistic": ["meanStat"],
      "Median statistic": ["medStat"],
    },
    precalculated: {
      "Mean statistic": ["meanStat"],
      "Median statistic": ["medStat"],
    },
  };

  let masterStatsValuesMap = {};
  const lineTypes = Object.keys(masterStatsOptionsMap);
  for (let si = 0; si < lineTypes.length; si += 1) {
    masterStatsValuesMap = {
      ...masterStatsValuesMap,
      ...masterStatsOptionsMap[lineTypes[si]],
    };
  }

  const myDBs = [];
  const dbGroupMap = {};
  const modelOptionsMap = {};
  const dbDateRangeMap = {};
  const plotTypeOptionsMap = {};
  const statisticOptionsMap = {};
  const variableOptionsMap = {};
  const variableValuesMap = {};
  const regionModelOptionsMap = {};
  const forecastLengthOptionsMap = {};
  const levelOptionsMap = {};
  const descrOptionsMap = {};

  let rows;
  let thisGroup;
  let dbs;
  let dbArr;
  try {
    rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool,
      "select * from ensemble_database_groups order by db_group;"
    );
    for (let i = 0; i < rows.length; i += 1) {
      thisGroup = rows[i].db_group.trim().replace(/\./g, "___");
      dbs = rows[i].dbs;
      dbArr = dbs.split(",").map(Function.prototype.call, String.prototype.trim);
      for (let j = 0; j < dbArr.length; j += 1) {
        dbArr[j] = dbArr[j].replace(/'|\[|\]/g, "").replace(/\./g, "___");
      }
      dbGroupMap[thisGroup] = dbArr;
    }
  } catch (err) {
    throw new Error(err.message);
  }

  let thisDB;
  try {
    rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool,
      "select distinct db from ensemble_metexpress_metadata;"
    );
    for (let i = 0; i < rows.length; i += 1) {
      thisDB = rows[i].db.trim().replace(/\./g, "___");
      myDBs.push(thisDB);
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let k = 0; k < myDBs.length; k += 1) {
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
      descrOptionsMap[thisDB] = {};

      rows = await matsDataQueryUtils.queryMySQL(
        global.sumPool,
        `select model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,mindate,maxdate from ensemble_metexpress_metadata where db = '${thisDB}' group by model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,mindate,maxdate order by model,line_data_table,variable;`
      );
      for (let i = 0; i < rows.length; i += 1) {
        const modelValue = rows[i].model.trim();
        const model = rows[i].display_text.trim().replace(/\./g, "___");
        modelOptionsMap[thisDB][model] = [modelValue];

        const rowMinDate = moment
          .utc(rows[i].mindate * 1000)
          .format("MM/DD/YYYY HH:mm");
        const rowMaxDate = moment
          .utc(rows[i].maxdate * 1000)
          .format("MM/DD/YYYY HH:mm");

        const lineDataTable = rows[i].line_data_table.trim();
        const validPlotTypes = masterPlotTypeOptionsMap[lineDataTable];
        plotTypeOptionsMap[thisDB][model] =
          plotTypeOptionsMap[thisDB][model] === undefined
            ? validPlotTypes
            : _.union(plotTypeOptionsMap[thisDB][model], validPlotTypes);
        const validStats = masterStatsOptionsMap[lineDataTable];
        const variable = rows[i].variable.trim();

        const { regions } = rows[i];
        const regionsArr = regions
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < regionsArr.length; j += 1) {
          regionsArr[j] = regionsArr[j].replace(/'|\[|\]/g, "").replace(/\./g, "___");
        }

        const forecastLengths = rows[i].fcst_orig;
        const forecastLengthArr = forecastLengths
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < forecastLengthArr.length; j += 1) {
          forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]|0000/g, "");
        }

        const { levels } = rows[i];
        const levelsArrRaw = levels
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        const levelsArr = [];
        let dummyLevel;
        for (let j = 0; j < levelsArrRaw.length; j += 1) {
          // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
          dummyLevel = levelsArrRaw[j].replace(/'|\[|\]|=/g, "");
          if (levelsArr.indexOf(dummyLevel) === -1) {
            levelsArr.push(dummyLevel);
          }
        }

        const { descrs } = rows[i];
        const descrsArr = descrs
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < descrsArr.length; j += 1) {
          descrsArr[j] = descrsArr[j].replace(/'|\[|\]|=/g, "");
        }

        statisticOptionsMap[thisDB][model] =
          statisticOptionsMap[thisDB][model] === undefined
            ? {}
            : statisticOptionsMap[thisDB][model];
        variableOptionsMap[thisDB][model] =
          variableOptionsMap[thisDB][model] === undefined
            ? {}
            : variableOptionsMap[thisDB][model];
        variableValuesMap[thisDB][model] =
          variableValuesMap[thisDB][model] === undefined
            ? {}
            : variableValuesMap[thisDB][model];
        regionModelOptionsMap[thisDB][model] =
          regionModelOptionsMap[thisDB][model] === undefined
            ? {}
            : regionModelOptionsMap[thisDB][model];
        forecastLengthOptionsMap[thisDB][model] =
          forecastLengthOptionsMap[thisDB][model] === undefined
            ? {}
            : forecastLengthOptionsMap[thisDB][model];
        levelOptionsMap[thisDB][model] =
          levelOptionsMap[thisDB][model] === undefined
            ? {}
            : levelOptionsMap[thisDB][model];
        descrOptionsMap[thisDB][model] =
          descrOptionsMap[thisDB][model] === undefined
            ? {}
            : descrOptionsMap[thisDB][model];
        dbDateRangeMap[thisDB][model] =
          dbDateRangeMap[thisDB][model] === undefined
            ? {}
            : dbDateRangeMap[thisDB][model];

        let thisPlotType;
        for (let ptidx = 0; ptidx < validPlotTypes.length; ptidx += 1) {
          thisPlotType = validPlotTypes[ptidx];
          if (statisticOptionsMap[thisDB][model][thisPlotType] === undefined) {
            // if we haven't encountered this plot type for this model yet, initialize everything
            statisticOptionsMap[thisDB][model][thisPlotType] = validStats;
            variableOptionsMap[thisDB][model][thisPlotType] = {};
            variableValuesMap[thisDB][model][thisPlotType] = {};
            regionModelOptionsMap[thisDB][model][thisPlotType] = {};
            forecastLengthOptionsMap[thisDB][model][thisPlotType] = {};
            levelOptionsMap[thisDB][model][thisPlotType] = {};
            descrOptionsMap[thisDB][model][thisPlotType] = {};
            dbDateRangeMap[thisDB][model][thisPlotType] = {};
          } else {
            // if we have encountered this plot type for this model, add in any new stats
            statisticOptionsMap[thisDB][model][thisPlotType] = {
              ...statisticOptionsMap[thisDB][model][thisPlotType],
              ...validStats,
            };
          }
          const jsonFriendlyVariable = variable.replace(/\./g, "_");
          const theseValidStats = Object.keys(validStats);
          let thisValidStatType;
          for (let vsidx = 0; vsidx < theseValidStats.length; vsidx += 1) {
            [thisValidStatType] = validStats[theseValidStats[vsidx]];
            if (
              variableValuesMap[thisDB][model][thisPlotType][thisValidStatType] ===
              undefined
            ) {
              // if we haven't encountered this variable for this stat yet, initialize everything
              variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = [];
              variableValuesMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                {};
              forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                {};
              levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType] = {};
            }
            if (
              variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] === undefined
            ) {
              // if we haven't encountered this variable for this plot type yet, just store the variable-dependent arrays
              variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType].push(
                jsonFriendlyVariable
              );
              variableValuesMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = variable;
              regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = regionsArr;
              forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = forecastLengthArr;
              levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = levelsArr;
              descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = descrsArr;
              dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = { minDate: rowMinDate, maxDate: rowMaxDate };
            } else {
              // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
              regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                regionModelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                regionsArr
              );
              forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                forecastLengthOptionsMap[thisDB][model][thisPlotType][
                  thisValidStatType
                ][jsonFriendlyVariable],
                forecastLengthArr
              );
              levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                levelsArr
              );
              descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                descrsArr
              );
              dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ].minDate =
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ].minDate < rowMinDate
                  ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                      jsonFriendlyVariable
                    ].minDate
                  : rowMinDate;
              dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ].maxDate =
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ].maxDate > rowMaxDate
                  ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                      jsonFriendlyVariable
                    ].maxDate
                  : rowMaxDate;
            }
          }
        }
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  if ((await matsCollections.label.findOneAsync({ name: "label" })) === undefined) {
    await matsCollections.label.insertAsync({
      name: "label",
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      controlButtonCovered: true,
      default: "",
      unique: true,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
    });
  }
  // get the default group, db, and model that were specified in the settings file. If none exist, take
  // the first available option for each in the selector.
  const requestedGroup = settings.appDefaultGroup;
  const defaultGroup =
    Object.keys(dbGroupMap).indexOf(requestedGroup) !== -1
      ? requestedGroup
      : Object.keys(dbGroupMap)[0];
  const requestedDB = settings.appDefaultDB;
  const defaultDB =
    dbGroupMap[defaultGroup].indexOf(requestedDB) !== -1
      ? requestedDB
      : dbGroupMap[defaultGroup][0];
  const requestedModel = settings.appDefaultModel;
  const defaultModel =
    Object.keys(modelOptionsMap[defaultDB]).indexOf(requestedModel) !== -1
      ? requestedModel
      : Object.keys(modelOptionsMap[defaultDB])[0];

  // these defaults are app-specific and not controlled by the user
  const defaultPlotType = matsTypes.PlotTypes.timeSeries;
  const defaultStatistic = Object.keys(
    statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]
  )[0];
  const defaultStatType = masterStatsValuesMap[defaultStatistic][0];

  if ((await matsCollections.group.findOneAsync({ name: "group" })) === undefined) {
    await matsCollections.group.insertAsync({
      name: "group",
      type: matsTypes.InputTypes.select,
      options: Object.keys(dbGroupMap),
      dependentNames: ["database"],
      controlButtonCovered: true,
      default: defaultGroup,
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.group.findOneAsync({ name: "group" });
    if (!matsDataUtils.areObjectsEqual(currentParam.options, Object.keys(dbGroupMap))) {
      // have to reload group data
      await matsCollections.group.updateAsync(
        { name: "group" },
        {
          $set: {
            options: Object.keys(dbGroupMap),
            default: defaultGroup,
          },
        }
      );
    }
  }

  if (
    (await matsCollections.database.findOneAsync({ name: "database" })) === undefined
  ) {
    await matsCollections.database.insertAsync({
      name: "database",
      type: matsTypes.InputTypes.select,
      optionsMap: dbGroupMap,
      options: dbGroupMap[defaultGroup],
      dates: dbDateRangeMap,
      superiorNames: ["group"],
      dependentNames: ["data-source"],
      controlButtonCovered: true,
      default: defaultDB,
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.database.findOneAsync({
      name: "database",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, dbGroupMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap)
    ) {
      // have to reload database data
      await matsCollections.database.updateAsync(
        { name: "database" },
        {
          $set: {
            optionsMap: dbGroupMap,
            dates: dbDateRangeMap,
            options: dbGroupMap[defaultGroup],
            default: defaultDB,
          },
        }
      );
    }
  }

  if (
    (await matsCollections["data-source"].findOneAsync({ name: "data-source" })) ===
    undefined
  ) {
    await matsCollections["data-source"].insertAsync({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      options: Object.keys(modelOptionsMap[defaultDB]),
      superiorNames: ["database"],
      dependentNames: ["plot-type"],
      controlButtonCovered: true,
      default: defaultModel,
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["data-source"].findOneAsync({
      name: "data-source",
    });
    if (!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap)) {
      // have to reload model data
      await matsCollections["data-source"].updateAsync(
        { name: "data-source" },
        {
          $set: {
            optionsMap: modelOptionsMap,
            options: Object.keys(modelOptionsMap[defaultDB]),
            default: defaultModel,
          },
        }
      );
    }
  }

  if (
    (await matsCollections["plot-type"].findOneAsync({ name: "plot-type" })) ===
    undefined
  ) {
    await matsCollections["plot-type"].insertAsync({
      name: "plot-type",
      type: matsTypes.InputTypes.select,
      optionsMap: plotTypeOptionsMap,
      options: plotTypeOptionsMap[defaultDB][defaultModel],
      superiorNames: ["database", "data-source"],
      dependentNames: ["statistic"],
      controlButtonCovered: false,
      default: defaultPlotType,
      unique: false,
      controlButtonVisibility: "none",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["plot-type"].findOneAsync({
      name: "plot-type",
    });
    if (!matsDataUtils.areObjectsEqual(plotTypeOptionsMap, currentParam.optionsMap)) {
      // have to reload model data
      await matsCollections["plot-type"].updateAsync(
        { name: "plot-type" },
        {
          $set: {
            optionsMap: plotTypeOptionsMap,
            options: plotTypeOptionsMap[defaultDB][defaultModel],
            default: defaultPlotType,
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const regionOptions =
    regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ];
  let regionDefault;
  if (regionOptions.indexOf("FULL") !== -1) {
    regionDefault = "FULL";
  } else if (regionOptions.indexOf("G002") !== -1) {
    regionDefault = "G002";
  } else if (regionOptions.indexOf("CONUS") !== -1) {
    regionDefault = "CONUS";
  } else {
    [regionDefault] = regionOptions;
  }

  if ((await matsCollections.region.findOneAsync({ name: "region" })) === undefined) {
    await matsCollections.region.insertAsync({
      name: "region",
      type: matsTypes.InputTypes.select,
      optionsMap: regionModelOptionsMap,
      options: regionOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      unique: false,
      default: regionDefault,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.region.findOneAsync({ name: "region" });
    if (
      !matsDataUtils.areObjectsEqual(regionModelOptionsMap, currentParam.optionsMap)
    ) {
      // have to reload region data
      await matsCollections.region.updateAsync(
        { name: "region" },
        {
          $set: {
            optionsMap: regionModelOptionsMap,
            options: regionOptions,
            default: regionDefault,
          },
        }
      );
    }
  }

  if (
    (await matsCollections.statistic.findOneAsync({ name: "statistic" })) === undefined
  ) {
    await matsCollections.statistic.insertAsync({
      name: "statistic",
      type: matsTypes.InputTypes.select,
      optionsMap: statisticOptionsMap,
      options: Object.keys(
        statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]
      ),
      valuesMap: masterStatsValuesMap,
      superiorNames: ["database", "data-source", "plot-type"],
      dependentNames: ["variable", "aggregation-method"],
      controlButtonCovered: true,
      unique: false,
      default: defaultStatistic,
      controlButtonText: "statistic",
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.statistic.findOneAsync({
      name: "statistic",
    });
    if (!matsDataUtils.areObjectsEqual(statisticOptionsMap, currentParam.optionsMap)) {
      // have to reload region data
      await matsCollections.statistic.updateAsync(
        { name: "statistic" },
        {
          $set: {
            optionsMap: statisticOptionsMap,
            options: Object.keys(
              statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]
            ),
            default: defaultStatistic,
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const variableOptions =
    variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType];
  let variableDefault;
  if (variableOptions.indexOf("PROB(APCP_06>12_700)") !== -1) {
    variableDefault = "PROB(APCP_06>12_700)";
  } else {
    [variableDefault] = variableOptions;
  }

  if (
    (await matsCollections.variable.findOneAsync({ name: "variable" })) === undefined
  ) {
    await matsCollections.variable.insertAsync({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: variableOptionsMap,
      options: variableOptions,
      valuesMap: variableValuesMap,
      superiorNames: ["database", "data-source", "plot-type", "statistic"],
      dependentNames: [
        "region",
        "forecast-length",
        "level",
        "description",
        "dates",
        "curve-dates",
      ],
      controlButtonCovered: true,
      unique: false,
      default: variableDefault,
      controlButtonText: "variable",
      controlButtonVisibility: "block",
      gapBelow: true,
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.variable.findOneAsync({
      name: "variable",
    });
    if (
      !matsDataUtils.areObjectsEqual(variableOptionsMap, currentParam.optionsMap) ||
      !matsDataUtils.areObjectsEqual(variableValuesMap, currentParam.valuesMap)
    ) {
      // have to reload variable data
      await matsCollections.variable.updateAsync(
        { name: "variable" },
        {
          $set: {
            optionsMap: variableOptionsMap,
            valuesMap: variableValuesMap,
            options: variableOptions,
            default: variableDefault,
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const fhrOptions =
    forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][
          defaultStatType
        ]
      )[0]
    ];

  if (
    (await matsCollections["forecast-length"].findOneAsync({
      name: "forecast-length",
    })) === undefined
  ) {
    await matsCollections["forecast-length"].insertAsync({
      name: "forecast-length",
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options: fhrOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      controlButtonText: "forecast lead time",
      gapAbove: true,
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["forecast-length"].findOneAsync({
      name: "forecast-length",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)
    ) {
      // have to reload forecast length data
      await matsCollections["forecast-length"].updateAsync(
        { name: "forecast-length" },
        {
          $set: {
            optionsMap: forecastLengthOptionsMap,
            options: fhrOptions,
          },
        }
      );
    }
  }

  if (
    (await matsCollections["dieoff-type"].findOneAsync({ name: "dieoff-type" })) ===
    undefined
  ) {
    const dieoffOptionsMap = {
      Dieoff: [matsTypes.ForecastTypes.dieoff],
      "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
      "Single cycle forecast (uses first date in range)": [
        matsTypes.ForecastTypes.singleCycle,
      ],
    };
    await matsCollections["dieoff-type"].insertAsync({
      name: "dieoff-type",
      type: matsTypes.InputTypes.select,
      optionsMap: dieoffOptionsMap,
      options: Object.keys(dieoffOptionsMap),
      hideOtherFor: {
        "valid-time": [
          "Dieoff for a specified UTC cycle init hour",
          "Single cycle forecast (uses first date in range)",
        ],
        "utc-cycle-start": [
          "Dieoff",
          "Single cycle forecast (uses first date in range)",
        ],
      },
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(dieoffOptionsMap)[0],
      controlButtonVisibility: "block",
      controlButtonText: "dieoff type",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 5,
    });
  }

  if (
    (await matsCollections["valid-time"].findOneAsync({ name: "valid-time" })) ===
    undefined
  ) {
    await matsCollections["valid-time"].insertAsync({
      name: "valid-time",
      type: matsTypes.InputTypes.select,
      options: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
      ],
      selected: [],
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      controlButtonText: "valid utc hour",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if (
    (await matsCollections["utc-cycle-start"].findOneAsync({
      name: "utc-cycle-start",
    })) === undefined
  ) {
    await matsCollections["utc-cycle-start"].insertAsync({
      name: "utc-cycle-start",
      type: matsTypes.InputTypes.select,
      options: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
      ],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: ["12"],
      controlButtonVisibility: "block",
      controlButtonText: "utc cycle init hour",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if ((await matsCollections.average.findOneAsync({ name: "average" })) === undefined) {
    const optionsMap = {
      None: ["unix_timestamp(ld.fcst_valid_beg)"],
      "1hr": [
        `ceil(${3600}*floor(((unix_timestamp(ld.fcst_valid_beg))+${3600}/2)/${3600}))`,
      ],
      "3hr": [
        `ceil(${3600 * 3}*floor(((unix_timestamp(ld.fcst_valid_beg))+${3600 * 3}/2)/${
          3600 * 3
        }))`,
      ],
      "6hr": [
        `ceil(${3600 * 6}*floor(((unix_timestamp(ld.fcst_valid_beg))+${3600 * 6}/2)/${
          3600 * 6
        }))`,
      ],
      "12hr": [
        `ceil(${3600 * 12}*floor(((unix_timestamp(ld.fcst_valid_beg))+${3600 * 12}/2)/${
          3600 * 12
        }))`,
      ],
      "1D": [
        `ceil(${3600 * 24}*floor(((unix_timestamp(ld.fcst_valid_beg))+${3600 * 24}/2)/${
          3600 * 24
        }))`,
      ],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 3
        }/2)/${3600 * 24 * 3}))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 7
        }/2)/${3600 * 24 * 7}))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 30
        }/2)/${3600 * 24 * 30}))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 60
        }/2)/${3600 * 24 * 60}))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 90
        }/2)/${3600 * 24 * 90}))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((unix_timestamp(ld.fcst_valid_beg))+${
          3600 * 24 * 180
        }/2)/${3600 * 24 * 180}))`,
      ],
    };
    await matsCollections.average.insertAsync({
      name: "average",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      controlButtonCovered: true,
      unique: false,
      default: "None",
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 6,
    });
  }

  // these defaults are app-specific and not controlled by the user
  const levelOptions =
    levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ];
  let levelDefault;
  if (levelOptions.indexOf("A06") !== -1) {
    levelDefault = "A06";
  } else {
    [levelDefault] = levelOptions;
  }

  if ((await matsCollections.level.findOneAsync({ name: "level" })) === undefined) {
    await matsCollections.level.insertAsync({
      name: "level",
      type: matsTypes.InputTypes.select,
      optionsMap: levelOptionsMap,
      options: levelOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: levelDefault,
      controlButtonVisibility: "block",
      controlButtonText: "Level",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 6,
      multiple: false,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.level.findOneAsync({ name: "level" });
    if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
      // have to reload level data
      await matsCollections.level.updateAsync(
        { name: "level" },
        {
          $set: {
            optionsMap: levelOptionsMap,
            options: levelOptions,
            default: levelDefault,
          },
        }
      );
    }
  }

  if (
    (await matsCollections.description.findOneAsync({ name: "description" })) ===
    undefined
  ) {
    await matsCollections.description.insertAsync({
      name: "description",
      type: matsTypes.InputTypes.select,
      optionsMap: descrOptionsMap,
      options:
        descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      gapBelow: true,
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 6,
      multiple: true,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.description.findOneAsync({
      name: "description",
    });
    if (!matsDataUtils.areObjectsEqual(descrOptionsMap, currentParam.optionsMap)) {
      // have to reload description data
      await matsCollections.description.updateAsync(
        { name: "description" },
        {
          $set: {
            optionsMap: descrOptionsMap,
            options:
              descrOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  descrOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ],
            default: matsTypes.InputTypes.unused,
          },
        }
      );
    }
  }

  if (
    (await matsCollections["aggregation-method"].findOneAsync({
      name: "aggregation-method",
    })) === undefined
  ) {
    await matsCollections["aggregation-method"].insertAsync({
      name: "aggregation-method",
      type: matsTypes.InputTypes.select,
      optionsMap: aggMethodOptionsMap,
      options: Object.keys(aggMethodOptionsMap[defaultStatType]),
      superiorNames: ["statistic"],
      default: Object.keys(aggMethodOptionsMap[defaultStatType])[0],
      controlButtonCovered: true,
      gapAbove: true,
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 7,
    });
  }

  // determine date defaults for dates and curveDates
  // these defaults are app-specific and not controlled by the user
  minDate =
    dbDateRangeMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ].minDate;
  maxDate =
    dbDateRangeMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        regionModelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
  const minusMonthMinDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm")} - ${moment
    .utc(maxDate)
    .format("MM/DD/YYYY HH:mm")}`;

  if (
    (await matsCollections["curve-dates"].findOneAsync({ name: "curve-dates" })) ===
    undefined
  ) {
    const optionsMap = {
      "1 day": ["1 day"],
      "3 days": ["3 days"],
      "7 days": ["7 days"],
      "31 days": ["31 days"],
      "90 days": ["90 days"],
      "180 days": ["180 days"],
      "365 days": ["365 days"],
    };
    await matsCollections["curve-dates"].insertAsync({
      name: "curve-dates",
      type: matsTypes.InputTypes.dateRange,
      optionsMap,
      options: Object.keys(optionsMap).sort(),
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      unique: false,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 8,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["curve-dates"].findOneAsync({
      name: "curve-dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload dates data
      await matsCollections["curve-dates"].updateAsync(
        { name: "curve-dates" },
        {
          $set: {
            startDate: minDate,
            stopDate: maxDate,
            default: dstr,
          },
        }
      );
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
const doCurveTextPatterns = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.CurveTextPatterns.removeAsync({});
  }
  if ((await matsCollections.CurveTextPatterns.find().countAsync()) === 0) {
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ""],
        [", desc: ", "description", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "statistic",
        "variable",
        "valid-time",
        "average",
        "forecast-length",
        "level",
        "description",
        "aggregation-method",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.dieoff,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "statistic",
        "variable",
        "dieoff-type",
        "valid-time",
        "utc-cycle-start",
        "level",
        "description",
        "aggregation-method",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "statistic",
        "variable",
        "forecast-length",
        "level",
        "description",
        "aggregation-method",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "statistic",
        "variable",
        "valid-time",
        "forecast-length",
        "level",
        "description",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.ensembleHistogram,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "variable",
        "valid-time",
        "forecast-length",
        "level",
        "description",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.reliability,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
        [", desc: ", "description", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "variable",
        "valid-time",
        "forecast-length",
        "level",
        "description",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.roc,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
        [", desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "variable",
        "valid-time",
        "forecast-length",
        "level",
        "description",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.performanceDiagram,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
        [", desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "region",
        "variable",
        "valid-time",
        "forecast-length",
        "level",
        "description",
        "curve-dates",
      ],
      groupSize: 6,
    });
  }
};

const doSavedCurveParams = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    matsCollections.SavedCurveParams.remove({});
  }
  if ((await matsCollections.SavedCurveParams.find().countAsync()) === 0) {
    await matsCollections.SavedCurveParams.insertAsync({
      clName: "changeList",
      changeList: [],
    });
  }
};

const doPlotGraph = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.PlotGraphFunctions.removeAsync({});
  }
  if ((await matsCollections.PlotGraphFunctions.find().countAsync()) === 0) {
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieoff",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.ensembleHistogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataEnsembleHistogram",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.reliability,
      graphFunction: "graphPlotly",
      dataFunction: "dataReliability",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.roc,
      graphFunction: "graphPlotly",
      dataFunction: "dataROC",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.performanceDiagram,
      graphFunction: "graphPlotly",
      dataFunction: "dataPerformanceDiagram",
      checked: false,
    });
  }
};

Meteor.startup(async function () {
  await matsCollections.Databases.removeAsync({});
  if ((await matsCollections.Databases.find({}).countAsync()) < 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "main startup: corrupted Databases collection: dropping Databases collection"
    );
    await matsCollections.Databases.dropAsync();
  }
  if ((await matsCollections.Databases.find({}).countAsync()) === 0) {
    let databases;
    if (
      Meteor.settings === undefined ||
      Meteor.settings.private === undefined ||
      Meteor.settings.private.databases === undefined
    ) {
      databases = undefined;
    } else {
      databases = Meteor.settings.private.databases;
    }
    if (databases !== null && databases !== undefined && Array.isArray(databases)) {
      for (let di = 0; di < databases.length; di += 1) {
        await matsCollections.Databases.insertAsync(databases[di]);
      }
    }
  }

  // create list of all pools
  const allPools = [];
  const sumSettings = await matsCollections.Databases.findOneAsync(
    {
      role: matsTypes.DatabaseRoles.SUMS_DATA,
      status: "active",
    },
    {
      host: 1,
      port: 1,
      user: 1,
      password: 1,
      database: 1,
      connectionLimit: 1,
    }
  );
  // the pool is intended to be global
  if (sumSettings) {
    global.sumPool = mysql.createPool({
      host: sumSettings.host,
      port: sumSettings.port,
      user: sumSettings.user,
      password: sumSettings.password,
      database: sumSettings.database,
      connectionLimit: sumSettings.connectionLimit,
    });
    allPools.push({ pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("sumPool", "metexpress_metadata", [
    "ensemble_metexpress_metadata",
    "ensemble_database_groups",
  ]);
  try {
    matsMethods.resetApp({
      appPools: allPools,
      appMdr: mdr,
      appType: matsTypes.AppTypes.metexpress,
    });
  } catch (error) {
    throw new Error(error.message);
  }
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
global.appSpecificResetRoutines = [
  doPlotGraph,
  doCurveParams,
  doSavedCurveParams,
  doPlotParams,
  doCurveTextPatterns,
];
