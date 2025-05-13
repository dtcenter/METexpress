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
    mode_obj_pair: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.threshold,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
    ],
  };

  const masterStatsOptionsMap = {
    mode_obj_pair: {
      // Many of these are not pair statistics ("mode_pair"
      // and "precalculated" are paired, "mode_single" are not),
      // but they are kept in the same dictionary as a simplification
      // because they have the same metadata by necessity. The same is
      // not necessarily true for other apps' line types; for example
      // line_data_ecnt and line_data_pct in MET Ensemble.

      // --------- Precalculated Pair Statistics ------------
      "Model-obs centroid distance": ["precalculated", "ld.centroid_dist"],
      "Model-obs angle difference": ["precalculated", "ld.angle_diff"],
      "Model-obs aspect difference": ["precalculated", "ld.aspect_diff"],
      "Model/obs area ratio": ["precalculated", "ld.area_ratio"],
      "Model/obs intersection area": ["precalculated", "ld.intersection_area"],
      "Model/obs union area": ["precalculated", "ld.union"],
      "Model/obs symmetric difference area": ["precalculated", "ld.union"],
      "Model/obs consumption ratio": ["precalculated", "ld.intersection_over_area"],
      "Model/obs curvature ratio": ["precalculated", "ld.curvature_ratio"],
      "Model/obs complexity ratio": ["precalculated", "ld.complexity_ratio"],
      "Model/obs percentile intensity ratio": [
        "precalculated",
        "ld.percentile_intensity_ratio",
      ],
      "Model/obs interest": ["precalculated", "ld.interest"],

      // --------- Pair Statistics ------------
      "OTS (Object Threat Score)": ["mode_pair"],
      "MMI (Median of Maximum Interest)": ["mode_pair"],
      "CSI (Critical Success Index)": ["mode_pair"],
      "FAR (False Alarm Ratio)": ["mode_pair"],
      "PODy (Probability of positive detection)": ["mode_pair"],
      "Object frequency bias": ["mode_pair"],
      "Model-obs centroid distance (unique pairs)": ["mode_pair"],

      // --------- Single Statistics ------------
      "Ratio of simple objects that are forecast objects": ["mode_single"],
      "Ratio of simple objects that are observation objects": ["mode_single"],
      "Ratio of simple objects that are matched": ["mode_single"],
      "Ratio of simple objects that are unmatched": ["mode_single"],
      "Ratio of simple forecast objects that are matched": ["mode_single"],
      "Ratio of simple forecast objects that are unmatched": ["mode_single"],
      "Ratio of simple observed objects that are matched": ["mode_single"],
      "Ratio of simple observed objects that are unmatched": ["mode_single"],
      "Ratio of simple matched objects that are forecast objects": ["mode_single"],
      "Ratio of simple matched objects that are observed objects": ["mode_single"],
      "Ratio of simple unmatched objects that are forecast objects": ["mode_single"],
      "Ratio of simple unmatched objects that are observed objects": ["mode_single"],
      "Ratio of forecast objects that are simple": ["mode_single"],
      "Ratio of forecast objects that are cluster": ["mode_single"],
      "Ratio of observed objects that are simple": ["mode_single"],
      "Ratio of observed objects that are cluster": ["mode_single"],
      "Ratio of cluster objects that are forecast objects": ["mode_single"],
      "Ratio of cluster objects that are observation objects": ["mode_single"],
      "Ratio of simple forecasts to simple observations (frequency bias)": [
        "mode_single",
      ],
      "Ratio of simple observations to simple forecasts (1 / frequency bias)": [
        "mode_single",
      ],
      "Ratio of cluster objects to simple objects": ["mode_single"],
      "Ratio of simple objects to cluster objects": ["mode_single"],
      "Ratio of forecast cluster objects to forecast simple objects": ["mode_single"],
      "Ratio of forecast simple objects to forecast cluster objects": ["mode_single"],
      "Ratio of observed cluster objects to observed simple objects": ["mode_single"],
      "Ratio of observed simple objects to observed cluster objects": ["mode_single"],
      "Area-weighted ratio of simple objects that are forecast objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple objects that are observation objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple objects that are matched": ["mode_single"],
      "Area-weighted ratio of simple objects that are unmatched": ["mode_single"],
      "Area-weighted ratio of simple forecast objects that are matched": [
        "mode_single",
      ],
      "Area-weighted ratio of simple forecast objects that are unmatched": [
        "mode_single",
      ],
      "Area-weighted ratio of simple observed objects that are matched": [
        "mode_single",
      ],
      "Area-weighted ratio of simple observed objects that are unmatched": [
        "mode_single",
      ],
      "Area-weighted ratio of simple matched objects that are forecast objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple matched objects that are observed objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple unmatched objects that are forecast objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple unmatched objects that are observed objects": [
        "mode_single",
      ],
      "Area-weighted ratio of forecast objects that are simple": ["mode_single"],
      "Area-weighted ratio of forecast objects that are cluster": ["mode_single"],
      "Area-weighted ratio of observed objects that are simple": ["mode_single"],
      "Area-weighted ratio of observed objects that are cluster": ["mode_single"],
      "Area-weighted ratio of cluster objects that are forecast objects": [
        "mode_single",
      ],
      "Area-weighted ratio of cluster objects that are observation objects": [
        "mode_single",
      ],
      "Area-weighted ratio of simple forecasts to simple observations (frequency bias)":
        ["mode_single"],
      "Area-weighted ratio of simple observations to simple forecasts (1 / frequency bias)":
        ["mode_single"],
      "Area-weighted ratio of cluster objects to simple objects": ["mode_single"],
      "Area-weighted ratio of simple objects to cluster objects": ["mode_single"],
      "Area-weighted ratio of forecast cluster objects to forecast simple objects": [
        "mode_single",
      ],
      "Area-weighted ratio of forecast simple objects to forecast cluster objects": [
        "mode_single",
      ],
      "Area-weighted ratio of observed cluster objects to observed simple objects": [
        "mode_single",
      ],
      "Area-weighted ratio of observed simple objects to observed cluster objects": [
        "mode_single",
      ],
    },
  };

  const aggMethodOptionsMap = {
    mode_pair: {
      "Overall statistic": ["aggStat"],
    },
    mode_single: {
      "Overall statistic": ["aggStat"],
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
  const forecastLengthOptionsMap = {};
  const levelOptionsMap = {};
  const thresholdOptionsMap = {};
  const radiiOptionsMap = {};
  const scaleOptionsMap = {};
  const descrOptionsMap = {};

  let rows;
  let thisGroup;
  let dbs;
  let dbArr;
  try {
    rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool,
      "select * from mode_database_groups order by db_group;"
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
      "select distinct db from mode_metexpress_metadata;"
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
      forecastLengthOptionsMap[thisDB] = {};
      levelOptionsMap[thisDB] = {};
      thresholdOptionsMap[thisDB] = {};
      radiiOptionsMap[thisDB] = {};
      scaleOptionsMap[thisDB] = {};
      descrOptionsMap[thisDB] = {};

      rows = await matsDataQueryUtils.queryMySQL(
        global.sumPool,
        `select model,display_text,line_data_table,variable,levels,descrs,fcst_orig,trshs,radii,gridpoints,mindate,maxdate from mode_metexpress_metadata where db = '${thisDB}' group by model,display_text,line_data_table,variable,levels,descrs,fcst_orig,trshs,radii,gridpoints,mindate,maxdate order by model,line_data_table,variable;`
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

        const { trshs } = rows[i];
        const trshArr = trshs
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < trshArr.length; j += 1) {
          trshArr[j] = trshArr[j].replace(/'|\[|\]/g, "");
        }

        const { radii } = rows[i];
        const radiiArr = radii
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < radiiArr.length; j += 1) {
          radiiArr[j] = radiiArr[j].replace(/'|\[|\]/g, "");
        }

        const scales = rows[i].gridpoints;
        const scalesArr = scales
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < scalesArr.length; j += 1) {
          scalesArr[j] = scalesArr[j].replace(/'|\[|\]/g, "");
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
        forecastLengthOptionsMap[thisDB][model] =
          forecastLengthOptionsMap[thisDB][model] === undefined
            ? {}
            : forecastLengthOptionsMap[thisDB][model];
        levelOptionsMap[thisDB][model] =
          levelOptionsMap[thisDB][model] === undefined
            ? {}
            : levelOptionsMap[thisDB][model];
        thresholdOptionsMap[thisDB][model] =
          thresholdOptionsMap[thisDB][model] === undefined
            ? {}
            : thresholdOptionsMap[thisDB][model];
        radiiOptionsMap[thisDB][model] =
          radiiOptionsMap[thisDB][model] === undefined
            ? {}
            : radiiOptionsMap[thisDB][model];
        scaleOptionsMap[thisDB][model] =
          scaleOptionsMap[thisDB][model] === undefined
            ? {}
            : scaleOptionsMap[thisDB][model];
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
            forecastLengthOptionsMap[thisDB][model][thisPlotType] = {};
            levelOptionsMap[thisDB][model][thisPlotType] = {};
            thresholdOptionsMap[thisDB][model][thisPlotType] = {};
            radiiOptionsMap[thisDB][model][thisPlotType] = {};
            scaleOptionsMap[thisDB][model][thisPlotType] = {};
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
              forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                {};
              levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              radiiOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
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
              forecastLengthOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = forecastLengthArr;
              levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = levelsArr;
              thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = trshArr;
              radiiOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = radiiArr;
              scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = scalesArr;
              descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = descrsArr;
              dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = {
                minDate: rowMinDate,
                maxDate: rowMaxDate,
              };
            } else {
              // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
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
              thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                trshArr
              );
              radiiOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                radiiOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                radiiArr
              );
              scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                jsonFriendlyVariable
              ] = _.union(
                scaleOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  jsonFriendlyVariable
                ],
                scalesArr
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
      hideOtherFor: {
        "object-matching": [
          "Ratio of simple objects that are forecast objects",
          "Ratio of simple objects that are observation objects",
          "Ratio of simple objects that are matched",
          "Ratio of simple objects that are unmatched",
          "Ratio of simple forecast objects that are matched",
          "Ratio of simple forecast objects that are unmatched",
          "Ratio of simple observed objects that are matched",
          "Ratio of simple observed objects that are unmatched",
          "Ratio of simple matched objects that are forecast objects",
          "Ratio of simple matched objects that are observed objects",
          "Ratio of simple unmatched objects that are forecast objects",
          "Ratio of simple unmatched objects that are observed objects",
          "Ratio of forecast objects that are simple",
          "Ratio of forecast objects that are cluster",
          "Ratio of observed objects that are simple",
          "Ratio of observed objects that are cluster",
          "Ratio of cluster objects that are forecast objects",
          "Ratio of cluster objects that are observation objects",
          "Ratio of simple forecasts to simple observations (frequency bias)",
          "Ratio of simple observations to simple forecasts (1 / frequency bias)",
          "Ratio of cluster objects to simple objects",
          "Ratio of simple objects to cluster objects",
          "Ratio of forecast cluster objects to forecast simple objects",
          "Ratio of forecast simple objects to forecast cluster objects",
          "Ratio of observed cluster objects to observed simple objects",
          "Ratio of observed simple objects to observed cluster objects",
          "Area-weighted ratio of simple objects that are forecast objects",
          "Area-weighted ratio of simple objects that are observation objects",
          "Area-weighted ratio of simple objects that are matched",
          "Area-weighted ratio of simple objects that are unmatched",
          "Area-weighted ratio of simple forecast objects that are matched",
          "Area-weighted ratio of simple forecast objects that are unmatched",
          "Area-weighted ratio of simple observed objects that are matched",
          "Area-weighted ratio of simple observed objects that are unmatched",
          "Area-weighted ratio of simple matched objects that are forecast objects",
          "Area-weighted ratio of simple matched objects that are observed objects",
          "Area-weighted ratio of simple unmatched objects that are forecast objects",
          "Area-weighted ratio of simple unmatched objects that are observed objects",
          "Area-weighted ratio of forecast objects that are simple",
          "Area-weighted ratio of forecast objects that are cluster",
          "Area-weighted ratio of observed objects that are simple",
          "Area-weighted ratio of observed objects that are cluster",
          "Area-weighted ratio of cluster objects that are forecast objects",
          "Area-weighted ratio of cluster objects that are observation objects",
          "Area-weighted ratio of simple forecasts to simple observations (frequency bias)",
          "Area-weighted ratio of simple observations to simple forecasts (1 / frequency bias)",
          "Area-weighted ratio of cluster objects to simple objects",
          "Area-weighted ratio of simple objects to cluster objects",
          "Area-weighted ratio of forecast cluster objects to forecast simple objects",
          "Area-weighted ratio of forecast simple objects to forecast cluster objects",
          "Area-weighted ratio of observed cluster objects to observed simple objects",
          "Area-weighted ratio of observed simple objects to observed cluster objects",
        ],
        "object-simplicity": [
          "Ratio of simple objects that are forecast objects",
          "Ratio of simple objects that are observation objects",
          "Ratio of simple objects that are matched",
          "Ratio of simple objects that are unmatched",
          "Ratio of simple forecast objects that are matched",
          "Ratio of simple forecast objects that are unmatched",
          "Ratio of simple observed objects that are matched",
          "Ratio of simple observed objects that are unmatched",
          "Ratio of simple matched objects that are forecast objects",
          "Ratio of simple matched objects that are observed objects",
          "Ratio of simple unmatched objects that are forecast objects",
          "Ratio of simple unmatched objects that are observed objects",
          "Ratio of forecast objects that are simple",
          "Ratio of forecast objects that are cluster",
          "Ratio of observed objects that are simple",
          "Ratio of observed objects that are cluster",
          "Ratio of cluster objects that are forecast objects",
          "Ratio of cluster objects that are observation objects",
          "Ratio of simple forecasts to simple observations (frequency bias)",
          "Ratio of simple observations to simple forecasts (1 / frequency bias)",
          "Ratio of cluster objects to simple objects",
          "Ratio of simple objects to cluster objects",
          "Ratio of forecast cluster objects to forecast simple objects",
          "Ratio of forecast simple objects to forecast cluster objects",
          "Ratio of observed cluster objects to observed simple objects",
          "Ratio of observed simple objects to observed cluster objects",
          "Area-weighted ratio of simple objects that are forecast objects",
          "Area-weighted ratio of simple objects that are observation objects",
          "Area-weighted ratio of simple objects that are matched",
          "Area-weighted ratio of simple objects that are unmatched",
          "Area-weighted ratio of simple forecast objects that are matched",
          "Area-weighted ratio of simple forecast objects that are unmatched",
          "Area-weighted ratio of simple observed objects that are matched",
          "Area-weighted ratio of simple observed objects that are unmatched",
          "Area-weighted ratio of simple matched objects that are forecast objects",
          "Area-weighted ratio of simple matched objects that are observed objects",
          "Area-weighted ratio of simple unmatched objects that are forecast objects",
          "Area-weighted ratio of simple unmatched objects that are observed objects",
          "Area-weighted ratio of forecast objects that are simple",
          "Area-weighted ratio of forecast objects that are cluster",
          "Area-weighted ratio of observed objects that are simple",
          "Area-weighted ratio of observed objects that are cluster",
          "Area-weighted ratio of cluster objects that are forecast objects",
          "Area-weighted ratio of cluster objects that are observation objects",
          "Area-weighted ratio of simple forecasts to simple observations (frequency bias)",
          "Area-weighted ratio of simple observations to simple forecasts (1 / frequency bias)",
          "Area-weighted ratio of cluster objects to simple objects",
          "Area-weighted ratio of simple objects to cluster objects",
          "Area-weighted ratio of forecast cluster objects to forecast simple objects",
          "Area-weighted ratio of forecast simple objects to forecast cluster objects",
          "Area-weighted ratio of observed cluster objects to observed simple objects",
          "Area-weighted ratio of observed simple objects to observed cluster objects",
        ],
      },
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

  if (
    (await matsCollections.variable.findOneAsync({ name: "variable" })) === undefined
  ) {
    await matsCollections.variable.insertAsync({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: variableOptionsMap,
      options:
        variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType],
      valuesMap: variableValuesMap,
      superiorNames: ["database", "data-source", "plot-type", "statistic"],
      dependentNames: [
        "forecast-length",
        "level",
        "threshold",
        "radius",
        "scale",
        "description",
        "dates",
        "curve-dates",
      ],
      controlButtonCovered: true,
      unique: false,
      default:
        variableOptionsMap[defaultDB][defaultModel][defaultPlotType][
          defaultStatType
        ][0],
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
            options:
              variableOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ],
            default:
              variableOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][0],
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const thresholdOptions =
    thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ];
  let thresholdDefault;
  if (thresholdOptions.indexOf("NA") !== -1) {
    thresholdDefault = "NA";
  } else {
    [thresholdDefault] = thresholdOptions;
  }

  if (
    (await matsCollections.threshold.findOneAsync({ name: "threshold" })) === undefined
  ) {
    await matsCollections.threshold.insertAsync({
      name: "threshold",
      type: matsTypes.InputTypes.select,
      optionsMap: thresholdOptionsMap,
      options: thresholdOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      unique: false,
      default: thresholdDefault,
      controlButtonVisibility: "block",
      gapAbove: true,
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.threshold.findOneAsync({
      name: "threshold",
    });
    if (!matsDataUtils.areObjectsEqual(thresholdOptionsMap, currentParam.optionsMap)) {
      // have to reload threshold data
      await matsCollections.threshold.updateAsync(
        { name: "threshold" },
        {
          $set: {
            optionsMap: thresholdOptionsMap,
            options: thresholdOptions,
            default: thresholdDefault,
          },
        }
      );
    }
  }

  if ((await matsCollections.radius.findOneAsync({ name: "radius" })) === undefined) {
    await matsCollections.radius.insertAsync({
      name: "radius",
      type: matsTypes.InputTypes.select,
      optionsMap: radiiOptionsMap,
      options:
        radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      unique: false,
      default:
        radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.radius.findOneAsync({ name: "radius" });
    if (!matsDataUtils.areObjectsEqual(radiiOptionsMap, currentParam.optionsMap)) {
      // have to reload im data
      await matsCollections.radius.updateAsync(
        { name: "radius" },
        {
          $set: {
            optionsMap: radiiOptionsMap,
            options:
              radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ],
            default:
              radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  radiiOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ][0],
          },
        }
      );
    }
  }

  if ((await matsCollections.scale.findOneAsync({ name: "scale" })) === undefined) {
    await matsCollections.scale.insertAsync({
      name: "scale",
      type: matsTypes.InputTypes.select,
      optionsMap: scaleOptionsMap,
      options:
        scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "variable"],
      controlButtonCovered: true,
      unique: false,
      default:
        scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.scale.findOneAsync({ name: "scale" });
    if (!matsDataUtils.areObjectsEqual(scaleOptionsMap, currentParam.optionsMap)) {
      // have to reload scale data
      await matsCollections.scale.updateAsync(
        { name: "scale" },
        {
          $set: {
            optionsMap: scaleOptionsMap,
            options:
              scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ],
            default:
              scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  scaleOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ][0],
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
  let fhrDefault;
  if (fhrOptions.indexOf("6") !== -1) {
    fhrDefault = "6";
  } else if (fhrOptions.indexOf("24") !== -1) {
    fhrDefault = "24";
  } else {
    [fhrDefault] = fhrOptions;
  }

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
      default: fhrDefault,
      controlButtonVisibility: "block",
      controlButtonText: "forecast lead time",
      multiple: true,
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 5,
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
            default: fhrDefault,
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
      None: ["unix_timestamp(h.fcst_valid)"],
      "1hr": [
        `ceil(${3600}*floor(((unix_timestamp(h.fcst_valid))+${3600}/2)/${3600}))`,
      ],
      "3hr": [
        `ceil(${3600 * 3}*floor(((unix_timestamp(h.fcst_valid))+${3600 * 3}/2)/${
          3600 * 3
        }))`,
      ],
      "6hr": [
        `ceil(${3600 * 6}*floor(((unix_timestamp(h.fcst_valid))+${3600 * 6}/2)/${
          3600 * 6
        }))`,
      ],
      "12hr": [
        `ceil(${3600 * 12}*floor(((unix_timestamp(h.fcst_valid))+${3600 * 12}/2)/${
          3600 * 12
        }))`,
      ],
      "1D": [
        `ceil(${3600 * 24}*floor(((unix_timestamp(h.fcst_valid))+${3600 * 24}/2)/${
          3600 * 24
        }))`,
      ],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((unix_timestamp(h.fcst_valid))+${
          3600 * 24 * 3
        }/2)/${3600 * 24 * 3}))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((unix_timestamp(h.fcst_valid))+${
          3600 * 24 * 7
        }/2)/${3600 * 24 * 7}))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((unix_timestamp(h.fcst_valid))+${
          3600 * 24 * 30
        }/2)/${3600 * 24 * 30}))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((unix_timestamp(h.fcst_valid))+${
          3600 * 24 * 60
        }/2)/${3600 * 24 * 60}))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((unix_timestamp(h.fcst_valid))+${
          3600 * 24 * 90
        }/2)/${3600 * 24 * 90}))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((unix_timestamp(h.fcst_valid))+${
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
  if (levelOptions.indexOf("L0") !== -1) {
    levelDefault = "L0";
  } else if (levelOptions.indexOf("A24") !== -1) {
    levelDefault = "A24";
  } else if (levelOptions.indexOf("A06") !== -1) {
    levelDefault = "A06";
  } else if (levelOptions.indexOf("A03") !== -1) {
    levelDefault = "A03";
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
      default:
        descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          Object.keys(
            descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
          )[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 6,
      multiple: false,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.description.findOne({ name: "description" });
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
            default:
              descrOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][
                Object.keys(
                  descrOptionsMap[defaultDB][defaultModel][defaultPlotType][
                    defaultStatType
                  ]
                )[0]
              ][0],
          },
        }
      );
    }
  }

  if (
    (await matsCollections["object-matching"].findOneAsync({
      name: "object-matching",
    })) === undefined
  ) {
    await matsCollections["object-matching"].insertAsync({
      name: "object-matching",
      type: matsTypes.InputTypes.select,
      options: ["All pairs", "Matched pairs"],
      controlButtonCovered: true,
      unique: false,
      default: "All pairs",
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 7,
    });
  }

  if (
    (await matsCollections["object-simplicity"].findOneAsync({
      name: "object-simplicity",
    })) === undefined
  ) {
    await matsCollections["object-simplicity"].insertAsync({
      name: "object-simplicity",
      type: matsTypes.InputTypes.select,
      options: ["All objects", "Simple objects", "Cluster objects"],
      controlButtonCovered: true,
      unique: false,
      default: "Simple objects",
      controlButtonVisibility: "block",
      gapBelow: true,
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 7,
    });
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
      displayGroup: 8,
    });
  }

  // determine date defaults for dates and curveDates
  // these defaults are app-specific and not controlled by the user
  minDate =
    dbDateRangeMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
      )[0]
    ].minDate;
  maxDate =
    dbDateRangeMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      Object.keys(
        descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType]
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
      displayGroup: 9,
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
        ["", "threshold", ", "],
        ["rad: ", "raduis", ", "],
        ["", "scale", "km, "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ", "],
        ["desc: ", "description", ", "],
        ["matching: ", "object-matching", ", "],
        ["simplicity: ", "object-simplicity", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "statistic",
        "variable",
        "threshold",
        "radius",
        "scale",
        "valid-time",
        "average",
        "forecast-length",
        "level",
        "description",
        "object-matching",
        "object-simplicity",
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
        ["", "threshold", ", "],
        ["rad: ", "raduis", ", "],
        ["", "scale", "km, "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["desc: ", "description", ", "],
        ["matching: ", "object-matching", ", "],
        ["simplicity: ", "object-simplicity", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "statistic",
        "variable",
        "threshold",
        "radius",
        "scale",
        "dieoff-type",
        "valid-time",
        "utc-cycle-start",
        "level",
        "description",
        "object-matching",
        "object-simplicity",
        "aggregation-method",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.threshold,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["rad: ", "raduis", ", "],
        ["", "scale", "km, "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["desc: ", "description", ", "],
        ["matching: ", "object-matching", ", "],
        ["simplicity: ", "object-simplicity", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "statistic",
        "variable",
        "radius",
        "scale",
        "forecast-length",
        "valid-time",
        "level",
        "description",
        "object-matching",
        "object-simplicity",
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
        ["", "threshold", ", "],
        ["rad: ", "raduis", ", "],
        ["", "scale", "km, "],
        ["", "variable", " "],
        ["", "statistic", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["desc: ", "description", ", "],
        ["matching: ", "object-matching", ", "],
        ["simplicity: ", "object-simplicity", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "statistic",
        "variable",
        "threshold",
        "radius",
        "scale",
        "forecast-length",
        "level",
        "description",
        "object-matching",
        "object-simplicity",
        "aggregation-method",
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
      plotType: matsTypes.PlotTypes.threshold,
      graphFunction: "graphPlotly",
      dataFunction: "dataThreshold",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
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
    "mode_metexpress_metadata",
    "mode_database_groups",
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
