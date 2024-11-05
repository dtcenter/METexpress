/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from "meteor/meteor";
import { mysql } from "meteor/pcel:mysql";
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

// determined in doCurveParanms
let minDate;
let maxDate;
let dstr;

const doPlotParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.PlotParams.remove({});
  }
  if (matsCollections.PlotParams.find().count() === 0) {
    matsCollections.PlotParams.insert({
      name: "dates",
      type: matsTypes.InputTypes.dateRange,
      options: [""],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: [
        "database",
        "data-source",
        "plot-type",
        "statistic",
        "basin",
        "year",
      ],
      controlButtonCovered: true,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
      help: "dateHelp.html",
    });

    const plotFormats = {};
    plotFormats[matsTypes.PlotFormats.none] = "no diffs";
    plotFormats[matsTypes.PlotFormats.matching] = "show matching diffs";
    plotFormats[matsTypes.PlotFormats.pairwise] = "pairwise diffs";
    matsCollections.PlotParams.insert({
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

    const yAxisOptionsMap = {
      "Relative frequency": ["relFreq"],
      Number: ["number"],
    };
    matsCollections.PlotParams.insert({
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
    matsCollections.PlotParams.insert({
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

    matsCollections.PlotParams.insert({
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

    matsCollections.PlotParams.insert({
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

    matsCollections.PlotParams.insert({
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

    matsCollections.PlotParams.insert({
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

    matsCollections.PlotParams.insert({
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
    const currentParam = matsCollections.PlotParams.findOne({ name: "dates" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload model data
      matsCollections.PlotParams.update(
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

const doCurveParams = function () {
  // force a reset if requested - simply remove all the existing params to force a reload
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    const params = matsCollections.CurveParamsInfo.find({
      curve_params: { $exists: true },
    }).fetch()[0].curve_params;
    for (let cp = 0; cp < params.length; cp += 1) {
      matsCollections[params[cp]].remove({});
    }
  }

  const masterPlotTypeOptionsMap = {
    line_data_tcmpr: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
      matsTypes.PlotTypes.yearToYear,
    ],
    line_data_ctc: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
      matsTypes.PlotTypes.yearToYear,
    ],
  };

  const masterStatsOptionsMap = {
    line_data_tcmpr: {
      "Track error (nm)": ["precalculated", "line_data_tcmpr", "ld.tk_err"],
      "X error (nm)": ["precalculated", "line_data_tcmpr", "ld.x_err"],
      "Y error (nm)": ["precalculated", "line_data_tcmpr", "ld.y_err"],
      "Along track error (nm)": ["precalculated", "line_data_tcmpr", "ld.altk_err"],
      "Cross track error (nm)": ["precalculated", "line_data_tcmpr", "ld.crtk_err"],
      "Model distance to land (nm)": ["precalculated", "line_data_tcmpr", "ld.adland"],
      "Truth distance to land (nm)": ["precalculated", "line_data_tcmpr", "ld.bdland"],
      "Model-truth distance to land (nm)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.adland-ld.bdland",
      ],
      "Model MSLP (mb)": ["precalculated", "line_data_tcmpr", "ld.amslp"],
      "Truth MSLP (mb)": ["precalculated", "line_data_tcmpr", "ld.bmslp"],
      "Model-truth MSLP (mb)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.amslp-ld.bmslp",
      ],
      "Model maximum wind speed (kts)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.amax_wind",
      ],
      "Truth maximum wind speed (kts)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.bmax_wind",
      ],
      "Model-truth maximum wind speed (kts)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.amax_wind-ld.bmax_wind",
      ],
      "Model radius of maximum winds (nm)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.amrd",
      ],
      "Truth radius of maximum winds (nm)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.bmrd",
      ],
      "Model-truth radius of maximum winds (nm)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.amrd-ld.bmrd",
      ],
      "Model eye diameter (nm)": ["precalculated", "line_data_tcmpr", "ld.aeye"],
      "Truth eye diameter (nm)": ["precalculated", "line_data_tcmpr", "ld.beye"],
      "Model-truth eye diameter (nm)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.aeye-ld.beye",
      ],
      "Model storm speed (kts)": ["precalculated", "line_data_tcmpr", "ld.aspeed"],
      "Truth storm speed (kts)": ["precalculated", "line_data_tcmpr", "ld.bspeed"],
      "Model-truth storm speed (kts)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.aspeed-ld.bspeed",
      ],
      "Model storm direction (deg)": ["precalculated", "line_data_tcmpr", "ld.adir"],
      "Truth storm direction (deg)": ["precalculated", "line_data_tcmpr", "ld.bdir"],
      "Model-truth storm direction (deg)": [
        "precalculated",
        "line_data_tcmpr",
        "ld.adir-ld.bdir",
      ],
    },
    line_data_ctc: {
      "Rapid Intensification CSI (Critical Success Index)": ["ctc"],
      "Rapid Intensification FAR (False Alarm Ratio)": ["ctc"],
      "Rapid Intensification FBIAS (Frequency Bias)": ["ctc"],
      "Rapid Intensification GSS (Gilbert Skill Score)": ["ctc"],
      "Rapid Intensification HSS (Heidke Skill Score)": ["ctc"],
      "Rapid Intensification PODy (Probability of positive detection)": ["ctc"],
      "Rapid Intensification PODn (Probability of negative detection)": ["ctc"],
      "Rapid Intensification POFD (Probability of false detection)": ["ctc"],
    },
  };

  const aggMethodOptionsMap = {
    precalculated: {
      "Mean statistic": ["meanStat"],
      "Median statistic": ["medStat"],
    },
    ctc: {
      "Overall statistic": ["aggStat"],
    },
  };

  const bestTrackDefs = matsDataUtils.readableTCCategories();

  const modelAcronymDecoder = matsDataUtils.readableAdeckModels();

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
  const basinOptionsMap = {};
  const yearOptionsMap = {};
  const stormsOptionsMap = {};
  const variableOptionsMap = {};
  const forecastLengthOptionsMap = {};
  const levelOptionsMap = {};
  const thresholdOptionsMap = {};
  const sourceOptionsMap = {};
  const descrOptionsMap = {};

  let rows;
  let thisGroup;
  let dbs;
  let dbArr;
  try {
    rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool, // eslint-disable-line no-undef
      "select * from cyclone_database_groups order by db_group;"
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
    rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool, // eslint-disable-line no-undef
      "select distinct db from cyclone_metexpress_metadata;"
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
      basinOptionsMap[thisDB] = {};
      yearOptionsMap[thisDB] = {};
      stormsOptionsMap[thisDB] = {};
      variableOptionsMap[thisDB] = {};
      forecastLengthOptionsMap[thisDB] = {};
      levelOptionsMap[thisDB] = {};
      thresholdOptionsMap[thisDB] = {};
      sourceOptionsMap[thisDB] = {};
      descrOptionsMap[thisDB] = {};

      rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
        sumPool, // eslint-disable-line no-undef
        `select model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate from cyclone_metexpress_metadata where db = '${thisDB}' group by model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate order by model,line_data_table,basin,year desc;`
      );
      for (let i = 0; i < rows.length; i += 1) {
        const modelValue = rows[i].model.trim();
        let model;
        if (Object.keys(modelAcronymDecoder).includes(modelValue)) {
          model = modelAcronymDecoder[modelValue];
        } else if (modelValue.match(/AP\d\d/)) {
          model = `${modelValue}: GFS Ensemble Member ${modelValue.slice(-2)}`;
        } else if (modelValue.match(/AN\d\d/)) {
          model = `${modelValue}: GFS Ensemble Member -${modelValue.slice(-2)}`;
        } else if (modelValue.match(/CP\d\d/)) {
          model = `${modelValue}: Canadian Ensemble Member ${modelValue.slice(-2)}`;
        } else if (modelValue.match(/UE\d\d/)) {
          model = `${modelValue}: UKMET MOGREPS Ensemble Member ${modelValue.slice(
            -2
          )}`;
        } else if (modelValue.match(/EE\d\d/)) {
          model = `${modelValue}: ECMWF EPS Ensemble Member ${modelValue.slice(
            -2
          )} (GTS Tracker)`;
        } else if (modelValue.match(/EN\d\d/)) {
          model = `${modelValue}: ECMWF EPS Ensemble Member ${modelValue.slice(
            -2
          )} (NCEP Tracker)`;
        } else if (modelValue.match(/EP\d\d/)) {
          model = `${modelValue}: ECMWF EPS Ensemble Member ${(
            Number(modelValue.slice(-2)) + 25
          ).toString()} (NCEP Tracker)`;
        } else if (modelValue.match(/RI\d\d/)) {
          model = `${modelValue}: Rapid Intensification Aid ${modelValue.slice(-2)}`;
        } else if (modelValue.match(/GP\d\d/)) {
          model = `${modelValue}: GFDL Ensemble Member ${modelValue.slice(-2)}`;
        } else if (modelValue.match(/G\d\dI/)) {
          model = `${modelValue}: GFDL Ensemble Member ${modelValue.slice(1, 3)}`;
        } else if (modelValue.match(/G\d\d2/)) {
          model = `${modelValue}: GFDL Ensemble Member ${modelValue.slice(1, 3)}`;
        } else if (modelValue.match(/HW\d\d/)) {
          model = `${modelValue}: HWRF Ensemble Member ${modelValue.slice(-2)}`;
        } else {
          model = modelValue;
        }
        modelOptionsMap[thisDB][model] = [modelValue];

        const rowMinDate = moment
          .utc(rows[i].mindate * 1000)
          .format("MM/DD/YYYY HH:mm");
        const rowMaxDate = moment
          .utc(rows[i].maxdate * 1000)
          .format("MM/DD/YYYY HH:mm");

        const basin = rows[i].basin.trim();
        const { year } = rows[i];

        const { storms } = rows[i];
        const stormsArr = storms
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < stormsArr.length; j += 1) {
          stormsArr[j] = stormsArr[j].replace(/'|\[|\]/g, "");
        }
        stormsArr.unshift("All storms");

        const sources = rows[i].truths;
        const sourceArr = sources
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < sourceArr.length; j += 1) {
          sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
          if (Object.keys(modelAcronymDecoder).includes(sourceArr[j])) {
            sourceArr[j] = modelAcronymDecoder[sourceArr[j]];
          } else {
            modelAcronymDecoder[sourceArr[j]] = sourceArr[j];
          }
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
        let levelsArr = [];
        let dummyLevel;
        let dummyObj;
        for (let j = 0; j < levelsArrRaw.length; j += 1) {
          // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
          dummyLevel = levelsArrRaw[j].replace(/'|\[|\]|=/g, "");
          if (Object.keys(bestTrackDefs).indexOf(dummyLevel) !== -1) {
            dummyObj = bestTrackDefs[dummyLevel];
          } else {
            dummyObj = {
              name: dummyLevel,
              order: 10 + j,
            };
          }
          levelsArr.push(dummyObj);
        }
        levelsArr = levelsArr.sort((a, b) => (a.order > b.order ? 1 : -1));
        levelsArr = levelsArr.map((a) => a.name);

        const { descrs } = rows[i];
        const descrsArr = descrs
          .split(",")
          .map(Function.prototype.call, String.prototype.trim);
        for (let j = 0; j < descrsArr.length; j += 1) {
          descrsArr[j] = descrsArr[j].replace(/'|\[|\]|=/g, "");
        }

        // get any CTC RI stats for this model
        const riRows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
          sumPool, // eslint-disable-line no-undef
          `select model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,trshs,interp_mthds,gridpoints,truths,mindate,maxdate from cyclone_ri_metexpress_metadata where db = '${thisDB}' and model = '${modelValue}' group by model,display_text,line_data_table,variable,regions,levels,descrs,fcst_orig,trshs,interp_mthds,gridpoints,truths,mindate,maxdate order by model,line_data_table,variable;`
        );

        let variablesArr;
        let thresholdArr;
        let lineDataTables;
        if (riRows.length > 0) {
          variablesArr = [];
          thresholdArr = [];
          lineDataTables = [rows[i].line_data_table.trim(), "line_data_ctc"];
          for (let l = 0; l < riRows.length; l += 1) {
            const variable = riRows[l].variable.trim();
            variablesArr.push(variable);

            const { trshs } = riRows[l];
            const trshArr = trshs
              .split(",")
              .map(Function.prototype.call, String.prototype.trim);
            for (let j = 0; j < trshArr.length; j += 1) {
              trshArr[j] = trshArr[j].replace(/'|\[|\]/g, "");
            }
            thresholdArr = thresholdArr.concat(trshArr);
          }

          variablesArr = [...new Set(variablesArr)].sort(); // make sure all variables are unique, then sort
          thresholdArr = [...new Set(thresholdArr)].sort(); // make sure all thresholds are unique, then sort
        } else {
          variablesArr = ["NA"];
          thresholdArr = ["NA"];
          lineDataTables = [rows[i].line_data_table.trim()];
        }

        statisticOptionsMap[thisDB][model] =
          statisticOptionsMap[thisDB][model] === undefined
            ? {}
            : statisticOptionsMap[thisDB][model];
        basinOptionsMap[thisDB][model] =
          basinOptionsMap[thisDB][model] === undefined
            ? {}
            : basinOptionsMap[thisDB][model];
        yearOptionsMap[thisDB][model] =
          yearOptionsMap[thisDB][model] === undefined
            ? {}
            : yearOptionsMap[thisDB][model];
        stormsOptionsMap[thisDB][model] =
          stormsOptionsMap[thisDB][model] === undefined
            ? {}
            : stormsOptionsMap[thisDB][model];
        variableOptionsMap[thisDB][model] =
          variableOptionsMap[thisDB][model] === undefined
            ? {}
            : variableOptionsMap[thisDB][model];
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
        sourceOptionsMap[thisDB][model] =
          sourceOptionsMap[thisDB][model] === undefined
            ? {}
            : sourceOptionsMap[thisDB][model];
        descrOptionsMap[thisDB][model] =
          descrOptionsMap[thisDB][model] === undefined
            ? {}
            : descrOptionsMap[thisDB][model];
        dbDateRangeMap[thisDB][model] =
          dbDateRangeMap[thisDB][model] === undefined
            ? {}
            : dbDateRangeMap[thisDB][model];

        for (let l = 0; l < lineDataTables.length; l += 1) {
          const lineDataTable = lineDataTables[l];
          const validPlotTypes = masterPlotTypeOptionsMap[lineDataTable];
          plotTypeOptionsMap[thisDB][model] =
            plotTypeOptionsMap[thisDB][model] === undefined
              ? validPlotTypes
              : _.union(plotTypeOptionsMap[thisDB][model], validPlotTypes);
          const validStats = masterStatsOptionsMap[lineDataTable];

          let thisPlotType;
          for (let ptidx = 0; ptidx < validPlotTypes.length; ptidx += 1) {
            thisPlotType = validPlotTypes[ptidx];
            if (statisticOptionsMap[thisDB][model][thisPlotType] === undefined) {
              // if we haven't encountered this plot type for this model yet, initialize everything
              statisticOptionsMap[thisDB][model][thisPlotType] = validStats;
              basinOptionsMap[thisDB][model][thisPlotType] = {};
              yearOptionsMap[thisDB][model][thisPlotType] = {};
              stormsOptionsMap[thisDB][model][thisPlotType] = {};
              variableOptionsMap[thisDB][model][thisPlotType] = {};
              forecastLengthOptionsMap[thisDB][model][thisPlotType] = {};
              levelOptionsMap[thisDB][model][thisPlotType] = {};
              thresholdOptionsMap[thisDB][model][thisPlotType] = {};
              sourceOptionsMap[thisDB][model][thisPlotType] = {};
              descrOptionsMap[thisDB][model][thisPlotType] = {};
              dbDateRangeMap[thisDB][model][thisPlotType] = {};
            } else {
              // if we have encountered this plot type for this model, add in any new stats
              statisticOptionsMap[thisDB][model][thisPlotType] = {
                ...statisticOptionsMap[thisDB][model][thisPlotType],
                ...validStats,
              };
            }
            const theseValidStats = Object.keys(validStats);
            let thisValidStatType;
            for (let vsidx = 0; vsidx < theseValidStats.length; vsidx += 1) {
              [thisValidStatType] = validStats[theseValidStats[vsidx]];
              if (
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType] ===
                undefined
              ) {
                // if we haven't encountered this variable for this stat yet, initialize everything
                basinOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = [];
                yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                forecastLengthOptionsMap[thisDB][model][thisPlotType][
                  thisValidStatType
                ] = {};
                levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                  {};
                sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] = {};
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType] = {};
              }
              if (
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] === undefined
              ) {
                // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                basinOptionsMap[thisDB][model][thisPlotType][thisValidStatType].push(
                  basin
                );
                yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] =
                  [];
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = {};
                variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = variablesArr;
                forecastLengthOptionsMap[thisDB][model][thisPlotType][
                  thisValidStatType
                ][basin] = {};
                levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] =
                  {};
                thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = thresholdArr;
                sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = sourceArr;
                descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] =
                  descrsArr;
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin] =
                  {};
              } else {
                // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = _.union(
                  variableOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                    basin
                  ],
                  variablesArr
                );
                thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = _.union(
                  thresholdOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                    basin
                  ],
                  thresholdArr
                );
                sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ] = _.union(
                  sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                    basin
                  ],
                  sourceArr
                );
                descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin] =
                  _.union(
                    descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                      basin
                    ],
                    descrsArr
                  );
              }
              if (
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] === undefined
              ) {
                // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                  basin
                ].push(year);
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] = stormsArr;
                forecastLengthOptionsMap[thisDB][model][thisPlotType][
                  thisValidStatType
                ][basin][year] = forecastLengthArr;
                levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] = levelsArr;
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] = {
                  minDate: rowMinDate,
                  maxDate: rowMaxDate,
                };
              } else {
                // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] = _.union(
                  stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                    basin
                  ][year],
                  stormsArr
                );
                forecastLengthOptionsMap[thisDB][model][thisPlotType][
                  thisValidStatType
                ][basin][year] = _.union(
                  forecastLengthOptionsMap[thisDB][model][thisPlotType][
                    thisValidStatType
                  ][basin][year],
                  forecastLengthArr
                );
                levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ] = _.union(
                  levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType][
                    basin
                  ][year],
                  levelsArr
                );
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ][minDate] =
                  dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                    year
                  ][minDate] < rowMinDate
                    ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                        basin
                      ][year][minDate]
                    : rowMinDate;
                dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                  year
                ][maxDate] =
                  dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][basin][
                    year
                  ][maxDate] > rowMaxDate
                    ? dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType][
                        basin
                      ][year][maxDate]
                    : rowMaxDate;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  if (matsCollections.label.findOne({ name: "label" }) === undefined) {
    matsCollections.label.insert({
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
      help: "label.html",
    });
  }
  // get the default group, db, and model that were specified in the settings file. If none exist, take
  // the first available option for each in the selector.
  const requestedGroup = matsCollections.Settings.findOne({}).appDefaultGroup;
  const defaultGroup =
    Object.keys(dbGroupMap).indexOf(requestedGroup) !== -1
      ? requestedGroup
      : Object.keys(dbGroupMap)[0];
  const requestedDB = matsCollections.Settings.findOne({}).appDefaultDB;
  const defaultDB =
    dbGroupMap[defaultGroup].indexOf(requestedDB) !== -1
      ? requestedDB
      : dbGroupMap[defaultGroup][0];
  const requestedModel = matsCollections.Settings.findOne({}).appDefaultModel;
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

  if (matsCollections.group.findOne({ name: "group" }) === undefined) {
    matsCollections.group.insert({
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
    const currentParam = matsCollections.group.findOne({ name: "group" });
    if (!matsDataUtils.areObjectsEqual(currentParam.options, Object.keys(dbGroupMap))) {
      // have to reload group data
      matsCollections.group.update(
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

  if (matsCollections.database.findOne({ name: "database" }) === undefined) {
    matsCollections.database.insert({
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
    const currentParam = matsCollections.database.findOne({ name: "database" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, dbGroupMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap)
    ) {
      // have to reload database data
      matsCollections.database.update(
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

  if (matsCollections["data-source"].findOne({ name: "data-source" }) === undefined) {
    matsCollections["data-source"].insert({
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
    const currentParam = matsCollections["data-source"].findOne({
      name: "data-source",
    });
    if (!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap)) {
      // have to reload model data
      matsCollections["data-source"].update(
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

  if (matsCollections["plot-type"].findOne({ name: "plot-type" }) === undefined) {
    matsCollections["plot-type"].insert({
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
    const currentParam = matsCollections["plot-type"].findOne({ name: "plot-type" });
    if (!matsDataUtils.areObjectsEqual(plotTypeOptionsMap, currentParam.optionsMap)) {
      // have to reload model data
      matsCollections["plot-type"].update(
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
  const basinOptions =
    basinOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType];
  let defaultBasin;
  if (basinOptions.indexOf("AL") !== -1) {
    defaultBasin = "AL";
  } else {
    [defaultBasin] = basinOptions;
  }

  if (matsCollections.basin.findOne({ name: "basin" }) === undefined) {
    matsCollections.basin.insert({
      name: "basin",
      type: matsTypes.InputTypes.select,
      optionsMap: basinOptionsMap,
      options: basinOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic"],
      dependentNames: ["year", "variable", "threshold", "truth", "description"],
      controlButtonCovered: true,
      unique: false,
      default: defaultBasin,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.basin.findOne({ name: "basin" });
    if (!matsDataUtils.areObjectsEqual(basinOptionsMap, currentParam.optionsMap)) {
      // have to reload basin data
      matsCollections.basin.update(
        { name: "basin" },
        {
          $set: {
            optionsMap: basinOptionsMap,
            options: basinOptions,
            default: defaultBasin,
          },
        }
      );
    }
  }

  if (matsCollections.statistic.findOne({ name: "statistic" }) === undefined) {
    matsCollections.statistic.insert({
      name: "statistic",
      type: matsTypes.InputTypes.select,
      optionsMap: statisticOptionsMap,
      options: Object.keys(
        statisticOptionsMap[defaultDB][defaultModel][defaultPlotType]
      ),
      valuesMap: masterStatsValuesMap,
      superiorNames: ["database", "data-source", "plot-type"],
      dependentNames: ["basin", "aggregation-method"],
      hideOtherFor: {
        variable: Object.keys(masterStatsOptionsMap.line_data_tcmpr),
        threshold: Object.keys(masterStatsOptionsMap.line_data_tcmpr),
        year: Object.keys(masterStatsOptionsMap.line_data_ctc),
        storm: Object.keys(masterStatsOptionsMap.line_data_ctc),
        level: Object.keys(masterStatsOptionsMap.line_data_ctc),
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
    const currentParam = matsCollections.statistic.findOne({ name: "statistic" });
    if (!matsDataUtils.areObjectsEqual(statisticOptionsMap, currentParam.optionsMap)) {
      // have to reload region data
      matsCollections.statistic.update(
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

  // display most recent year as default
  // these defaults are app-specific and not controlled by the user
  const [defaultYear] =
    yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ];

  if (matsCollections.year.findOne({ name: "year" }) === undefined) {
    matsCollections.year.insert({
      name: "year",
      type: matsTypes.InputTypes.select,
      optionsMap: yearOptionsMap,
      options:
        yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
      dependentNames: ["storm", "forecast-length", "level", "dates", "curve-dates"],
      controlButtonCovered: true,
      unique: false,
      default: defaultYear,
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.year.findOne({ name: "year" });
    if (!matsDataUtils.areObjectsEqual(yearOptionsMap, currentParam.optionsMap)) {
      // have to reload year data
      matsCollections.year.update(
        { name: "year" },
        {
          $set: {
            optionsMap: yearOptionsMap,
            options:
              yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
                defaultBasin
              ],
            default: defaultYear,
          },
        }
      );
    }
  }

  if (matsCollections.storm.findOne({ name: "storm" }) === undefined) {
    matsCollections.storm.insert({
      name: "storm",
      type: matsTypes.InputTypes.select,
      optionsMap: stormsOptionsMap,
      options:
        stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][defaultYear],
      superiorNames: [
        "database",
        "data-source",
        "plot-type",
        "statistic",
        "basin",
        "year",
      ],
      controlButtonCovered: true,
      unique: false,
      default:
        stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][defaultYear][0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.storm.findOne({ name: "storm" });
    if (!matsDataUtils.areObjectsEqual(stormsOptionsMap, currentParam.optionsMap)) {
      // have to reload storm data
      matsCollections.storm.update(
        { name: "storm" },
        {
          $set: {
            optionsMap: stormsOptionsMap,
            options:
              stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][defaultYear],
            default:
              stormsOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][defaultYear][0],
          },
        }
      );
    }
  }

  if (matsCollections.truth.findOne({ name: "truth" }) === undefined) {
    matsCollections.truth.insert({
      name: "truth",
      type: matsTypes.InputTypes.select,
      optionsMap: sourceOptionsMap,
      options:
        sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ],
      valuesMap: modelAcronymDecoder,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
      controlButtonCovered: true,
      unique: false,
      default:
        sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][0],
      controlButtonVisibility: "block",
      gapBelow: true,
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.truth.findOne({ name: "truth" });
    if (!matsDataUtils.areObjectsEqual(sourceOptionsMap, currentParam.optionsMap)) {
      // have to reload truth data
      matsCollections.truth.update(
        { name: "truth" },
        {
          $set: {
            optionsMap: sourceOptionsMap,
            options:
              sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin],
            default:
              sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][0],
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const variableOptions =
    variableOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ];
  const variableDefault = variableOptions[0];

  if (matsCollections.variable.findOne({ name: "variable" }) === undefined) {
    matsCollections.variable.insert({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: variableOptionsMap,
      options: variableOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: variableDefault,
      controlButtonVisibility: "block",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.variable.findOne({
      name: "variable",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, variableOptionsMap)) {
      // have to reload forecast length data
      matsCollections.variable.update(
        { name: "variable" },
        {
          $set: {
            optionsMap: variableOptionsMap,
            options: variableOptions,
            default: variableDefault,
          },
        }
      );
    }
  }

  // these defaults are app-specific and not controlled by the user
  const thresholdOptions =
    thresholdOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ];
  const thresholdDefault = thresholdOptions[0];

  if (matsCollections.threshold.findOne({ name: "threshold" }) === undefined) {
    matsCollections.threshold.insert({
      name: "threshold",
      type: matsTypes.InputTypes.select,
      optionsMap: thresholdOptionsMap,
      options: thresholdOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: thresholdDefault,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 5,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.threshold.findOne({
      name: "threshold",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdOptionsMap)) {
      // have to reload forecast length data
      matsCollections.threshold.update(
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

  // these defaults are app-specific and not controlled by the user
  const fhrOptions =
    forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ][defaultYear];
  let fhrDefault;
  if (fhrOptions.indexOf("24") !== -1) {
    fhrDefault = "24";
  } else if (fhrOptions.indexOf("12") !== -1) {
    fhrDefault = "12";
  } else {
    [fhrDefault] = fhrOptions;
  }

  if (
    matsCollections["forecast-length"].findOne({ name: "forecast-length" }) ===
    undefined
  ) {
    matsCollections["forecast-length"].insert({
      name: "forecast-length",
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options: fhrOptions,
      superiorNames: [
        "database",
        "data-source",
        "plot-type",
        "statistic",
        "basin",
        "year",
      ],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: fhrDefault,
      controlButtonVisibility: "block",
      controlButtonText: "forecast lead time",
      gapAbove: true,
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 5,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["forecast-length"].findOne({
      name: "forecast-length",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)
    ) {
      // have to reload forecast length data
      matsCollections["forecast-length"].update(
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

  if (matsCollections["dieoff-type"].findOne({ name: "dieoff-type" }) === undefined) {
    const dieoffOptionsMap = {
      Dieoff: [matsTypes.ForecastTypes.dieoff],
      "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
      "Single cycle forecast (uses first date in range)": [
        matsTypes.ForecastTypes.singleCycle,
      ],
    };
    matsCollections["dieoff-type"].insert({
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
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 5,
    });
  }

  if (matsCollections["valid-time"].findOne({ name: "valid-time" }) === undefined) {
    matsCollections["valid-time"].insert({
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
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if (
    matsCollections["utc-cycle-start"].findOne({ name: "utc-cycle-start" }) ===
    undefined
  ) {
    matsCollections["utc-cycle-start"].insert({
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
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if (matsCollections.average.findOne({ name: "average" }) === undefined) {
    const optionsMap = {
      None: ["unix_timestamp(ld.fcst_valid)"],
      "1hr": [
        `ceil(${3600}*floor(((unix_timestamp(ld.fcst_valid))+${3600}/2)/${3600}))`,
      ],
      "3hr": [
        `ceil(${3600 * 3}*floor(((unix_timestamp(ld.fcst_valid))+${3600 * 3}/2)/${
          3600 * 3
        }))`,
      ],
      "6hr": [
        `ceil(${3600 * 6}*floor(((unix_timestamp(ld.fcst_valid))+${3600 * 6}/2)/${
          3600 * 6
        }))`,
      ],
      "12hr": [
        `ceil(${3600 * 12}*floor(((unix_timestamp(ld.fcst_valid))+${3600 * 12}/2)/${
          3600 * 12
        }))`,
      ],
      "1D": [
        `ceil(${3600 * 24}*floor(((unix_timestamp(ld.fcst_valid))+${3600 * 24}/2)/${
          3600 * 24
        }))`,
      ],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 3
        }/2)/${3600 * 24 * 3}))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 7
        }/2)/${3600 * 24 * 7}))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 30
        }/2)/${3600 * 24 * 30}))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 60
        }/2)/${3600 * 24 * 60}))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 90
        }/2)/${3600 * 24 * 90}))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((unix_timestamp(ld.fcst_valid))+${
          3600 * 24 * 180
        }/2)/${3600 * 24 * 180}))`,
      ],
    };
    matsCollections.average.insert({
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

  if (matsCollections.level.findOne({ name: "level" }) === undefined) {
    matsCollections.level.insert({
      name: "level",
      type: matsTypes.InputTypes.select,
      optionsMap: levelOptionsMap,
      options:
        levelOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][defaultYear],
      valuesMap: bestTrackDefs,
      superiorNames: [
        "database",
        "data-source",
        "plot-type",
        "statistic",
        "basin",
        "year",
      ],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      controlButtonText: "Storm Classification",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 6,
      multiple: true,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.level.findOne({ name: "level" });
    if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
      // have to reload level data
      matsCollections.level.update(
        { name: "level" },
        {
          $set: {
            optionsMap: levelOptionsMap,
            options:
              levelOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][defaultYear],
            default: matsTypes.InputTypes.unused,
          },
        }
      );
    }
  }

  if (matsCollections.description.findOne({ name: "description" }) === undefined) {
    matsCollections.description.insert({
      name: "description",
      type: matsTypes.InputTypes.select,
      optionsMap: descrOptionsMap,
      options:
        descrOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
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
    const currentParam = matsCollections.description.findOne({ name: "description" });
    if (!matsDataUtils.areObjectsEqual(descrOptionsMap, currentParam.optionsMap)) {
      // have to reload description data
      matsCollections.description.update(
        { name: "description" },
        {
          $set: {
            optionsMap: descrOptionsMap,
            options:
              descrOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin],
            default: matsTypes.InputTypes.unused,
          },
        }
      );
    }
  }

  if (
    matsCollections["aggregation-method"].findOne({ name: "aggregation-method" }) ===
    undefined
  ) {
    matsCollections["aggregation-method"].insert({
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
  const defaultDb = matsCollections.database.findOne(
    { name: "database" },
    { default: 1 }
  ).default;
  const dbDateRanges = matsCollections.database.findOne(
    { name: "database" },
    { dates: 1 }
  ).dates;
  const defaultDataSource = matsCollections["data-source"].findOne(
    { name: "data-source" },
    { default: 1 }
  ).default;
  minDate =
    dbDateRanges[defaultDb][defaultDataSource][defaultPlotType][defaultStatType][
      defaultBasin
    ][defaultYear].minDate;
  maxDate =
    dbDateRanges[defaultDb][defaultDataSource][defaultPlotType][defaultStatType][
      defaultBasin
    ][defaultYear].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDatesTC(minDate, maxDate);
  minDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minDate).format("MM/DD/YYYY HH:mm")} - ${moment
    .utc(maxDate)
    .format("MM/DD/YYYY HH:mm")}`;

  if (matsCollections["curve-dates"].findOne({ name: "curve-dates" }) === undefined) {
    const optionsMap = {
      "1 day": ["1 day"],
      "3 days": ["3 days"],
      "7 days": ["7 days"],
      "31 days": ["31 days"],
      "90 days": ["90 days"],
      "180 days": ["180 days"],
      "365 days": ["365 days"],
    };
    matsCollections["curve-dates"].insert({
      name: "curve-dates",
      type: matsTypes.InputTypes.dateRange,
      optionsMap,
      options: Object.keys(optionsMap).sort(),
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: [
        "database",
        "data-source",
        "plot-type",
        "statistic",
        "basin",
        "year",
      ],
      controlButtonCovered: true,
      unique: false,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 8,
      help: "dateHelp.html",
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["curve-dates"].findOne({
      name: "curve-dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload dates data
      matsCollections["curve-dates"].update(
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
const doCurveTextPatterns = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.CurveTextPatterns.remove({});
  }
  if (matsCollections.CurveTextPatterns.find().count() === 0) {
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "basin", ", "],
        ["", "year", " "],
        ["", "storm", " "],
        ["", "threshold", " "],
        ["", "statistic", " "],
        ["", "variable", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ", "],
        ["", "truth", ""],
        [", desc: ", "description", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "basin",
        "statistic",
        "variable",
        "year",
        "storm",
        "truth",
        "valid-time",
        "average",
        "forecast-length",
        "level",
        "description",
        "aggregation-method",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dieoff,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "basin", ", "],
        ["", "year", " "],
        ["", "storm", " "],
        ["", "threshold", " "],
        ["", "statistic", " "],
        ["", "variable", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["", "truth", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "basin",
        "statistic",
        "variable",
        "year",
        "storm",
        "truth",
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
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "basin", ", "],
        ["", "year", " "],
        ["", "storm", " "],
        ["", "threshold", " "],
        ["", "statistic", " "],
        ["", "variable", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["", "truth", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "basin",
        "statistic",
        "variable",
        "year",
        "storm",
        "truth",
        "forecast-length",
        "level",
        "description",
        "aggregation-method",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.yearToYear,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "basin", " "],
        ["", "threshold", " "],
        ["", "statistic", " "],
        ["", "variable", " "],
        ["", "aggregation-method", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ""],
        [", desc: ", "description", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "basin",
        "statistic",
        "variable",
        "truth",
        "valid-time",
        "forecast-length",
        "level",
        "description",
        "aggregation-method",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "database", "."],
        ["", "data-source", " in "],
        ["", "basin", ", "],
        ["", "year", " "],
        ["", "storm", " "],
        ["", "statistic", ", "],
        ["level: ", "level", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ", "],
        ["desc: ", "description", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "group",
        "database",
        "data-source",
        "basin",
        "statistic",
        "year",
        "storm",
        "truth",
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

const doSavedCurveParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.SavedCurveParams.remove({});
  }
  if (matsCollections.SavedCurveParams.find().count() === 0) {
    matsCollections.SavedCurveParams.insert({ clName: "changeList", changeList: [] });
  }
};

const doPlotGraph = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.PlotGraphFunctions.remove({});
  }
  if (matsCollections.PlotGraphFunctions.find().count() === 0) {
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieoff",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.yearToYear,
      graphFunction: "graphPlotly",
      dataFunction: "dataYearToYear",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
      checked: false,
    });
  }
};

Meteor.startup(function () {
  matsCollections.Databases.remove({});
  if (matsCollections.Databases.find({}).count() < 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "main startup: corrupted Databases collection: dropping Databases collection"
    );
    matsCollections.Databases.drop();
  }
  if (matsCollections.Databases.find({}).count() === 0) {
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
        matsCollections.Databases.insert(databases[di]);
      }
    }
  }

  // create list of all pools
  const allPools = [];
  const sumSettings = matsCollections.Databases.findOne(
    { role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active" },
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
    // eslint-disable-next-line no-undef
    sumPool = mysql.createPool(sumSettings);
    allPools.push({ pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("sumPool", "metexpress_metadata", [
    "cyclone_metexpress_metadata",
    "cyclone_database_groups",
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
// eslint-disable-next-line no-undef
appSpecificResetRoutines = [
  doPlotGraph,
  doCurveParams,
  doSavedCurveParams,
  doPlotParams,
  doCurveTextPatterns,
];
