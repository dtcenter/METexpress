/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import { Meteor } from "meteor/meteor";
import moment from "moment";
import { _ } from "meteor/underscore";
import {
  matsMethods,
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsCouchbaseUtils,
  matsParamUtils,
} from "meteor/randyp:mats-common";

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
    TCMPR: [
      matsTypes.PlotTypes.timeSeries,
      matsTypes.PlotTypes.dieoff,
      matsTypes.PlotTypes.validtime,
      matsTypes.PlotTypes.histogram,
      matsTypes.PlotTypes.yearToYear,
    ],
  };

  const masterStatsOptionsMap = {
    TCMPR: {
      "Track error (nm)": ["precalculated", "TCMPR", "tkErr"],
      "X error (nm)": ["precalculated", "TCMPR", "xErr"],
      "Y error (nm)": ["precalculated", "TCMPR", "yErr"],
      "Along track error (nm)": ["precalculated", "TCMPR", "altkErr"],
      "Cross track error (nm)": ["precalculated", "TCMPR", "crtkErr"],
      "Model distance to land (nm)": ["precalculated", "TCMPR", "adland"],
      "Truth distance to land (nm)": ["precalculated", "TCMPR", "bdland"],
      "Model-truth distance to land (nm)": [
        "precalculated",
        "TCMPR",
        ["adland", "bdland", "minus"],
      ],
      "Model MSLP (mb)": ["precalculated", "TCMPR", "amslp"],
      "Truth MSLP (mb)": ["precalculated", "TCMPR", "bmslp"],
      "Model-truth MSLP (mb)": ["precalculated", "TCMPR", ["amslp", "bmslp", "minus"]],
      "Model maximum wind speed (kts)": ["precalculated", "TCMPR", "amaxWind"],
      "Truth maximum wind speed (kts)": ["precalculated", "TCMPR", "bmaxWind"],
      "Model-truth maximum wind speed (kts)": [
        "precalculated",
        "TCMPR",
        ["amaxWind", "bmaxWind", "minus"],
      ],
      "Model radius of maximum winds (nm)": ["precalculated", "TCMPR", "amrd"],
      "Truth radius of maximum winds (nm)": ["precalculated", "TCMPR", "bmrd"],
      "Model-truth radius of maximum winds (nm)": [
        "precalculated",
        "TCMPR",
        ["amrd", "bmrd", "minus"],
      ],
      "Model eye diameter (nm)": ["precalculated", "TCMPR", "aeye"],
      "Truth eye diameter (nm)": ["precalculated", "TCMPR", "beye"],
      "Model-truth eye diameter (nm)": [
        "precalculated",
        "TCMPR",
        ["aeye", "beye", "minus"],
      ],
      "Model storm speed (kts)": ["precalculated", "TCMPR", "aspeed"],
      "Truth storm speed (kts)": ["precalculated", "TCMPR", "bspeed"],
      "Model-truth storm speed (kts)": [
        "precalculated",
        "TCMPR",
        ["aspeed", "bspeed", "minus"],
      ],
      "Model storm direction (deg)": ["precalculated", "TCMPR", "adir"],
      "Truth storm direction (deg)": ["precalculated", "TCMPR", "bdir"],
      "Model-truth storm direction (deg)": [
        "precalculated",
        "TCMPR",
        ["adir", "bdir", "minus"],
      ],
    },
  };

  const aggMethodOptionsMap = {
    precalculated: {
      "Mean statistic": ["meanStat"],
      "Median statistic": ["medStat"],
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
  const validVersions = [];
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
  try {
    const queryStr = global.cbPool.trfmSQLForDbTarget(
      'SELECT DISTINCT m0.VERSION FROM {{vxDBTARGET}} m0 WHERE m0.subset = "MET" AND m0.subtype = "MET" AND m0.type = "DD";'
    );
    rows = await global.cbPool.queryCB(queryStr);
    for (let ridx = 0; ridx < rows.length; ridx += 1) {
      validVersions.push(rows[ridx].VERSION);
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    const queryStr = global.cbPool.trfmSQLForDbTarget(
      'select raw md from {{vxDBTARGET}} md USE KEYS "MD:METexpressGui:met-cyclone:V01"'
    );
    [rows] = await global.cbPool.queryCB(queryStr);
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    const { datasets } = rows;
    for (let didx = 0; didx < datasets.length; didx += 1) {
      const thisDataset = datasets[didx];
      const thisDB = thisDataset.dataset;
      myDBs.push(thisDataset.dataset);

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

      const { models } = thisDataset;
      if (models) {
        for (let midx = 0; midx < models.length; midx += 1) {
          const thisModel = models[midx];
          const modelValue = thisModel.model;
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

          statisticOptionsMap[thisDB][model] = {};
          basinOptionsMap[thisDB][model] = {};
          yearOptionsMap[thisDB][model] = {};
          stormsOptionsMap[thisDB][model] = {};
          variableOptionsMap[thisDB][model] = {};
          forecastLengthOptionsMap[thisDB][model] = {};
          levelOptionsMap[thisDB][model] = {};
          thresholdOptionsMap[thisDB][model] = {};
          sourceOptionsMap[thisDB][model] = {};
          descrOptionsMap[thisDB][model] = {};
          dbDateRangeMap[thisDB][model] = {};

          const lineDataTables = thisModel.linetypes;
          if (lineDataTables) {
            for (let lidx = 0; lidx < lineDataTables.length; lidx += 1) {
              const thisLineDataTable = lineDataTables[lidx];
              const lineDataTable = thisLineDataTable.linetype;
              if (lineDataTable in masterPlotTypeOptionsMap) {
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
                      stormsOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ] === undefined
                    ) {
                      // if we haven't encountered this statType for this plotType yet, initialize everything
                      basinOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        [];
                      yearOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                      stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                      variableOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ] = {};
                      forecastLengthOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ] = {};
                      levelOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                      thresholdOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ] = {};
                      sourceOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                      descrOptionsMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                      dbDateRangeMap[thisDB][model][thisPlotType][thisValidStatType] =
                        {};
                    }

                    const { basins } = thisLineDataTable;
                    if (basins) {
                      for (let bidx = 0; bidx < basins.length; bidx += 1) {
                        const thisBasin = basins[bidx];
                        const { basin } = thisBasin;
                        if (
                          stormsOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] === undefined
                        ) {
                          // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                          basinOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ].push(basin);
                          yearOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = [];
                          stormsOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                          variableOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = ["NA"]; // dummy for when we support RI stats in this app
                          forecastLengthOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                          levelOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                          thresholdOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = ["NA"]; // dummy for when we support RI stats in this app
                          sourceOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                          descrOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                          dbDateRangeMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = {};
                        } else {
                          // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                          variableOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = _.union(
                            variableOptionsMap[thisDB][model][thisPlotType][
                              thisValidStatType
                            ][basin],
                            ["NA"]
                          ); // dummy for when we support RI stats in this app
                          thresholdOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin] = _.union(
                            thresholdOptionsMap[thisDB][model][thisPlotType][
                              thisValidStatType
                            ][basin],
                            ["NA"]
                          ); // dummy for when we support RI stats in this app
                        }

                        const { years } = thisBasin;
                        if (years) {
                          for (let yidx = 0; yidx < years.length; yidx += 1) {
                            const thisYear = years[yidx];
                            const { year } = thisYear;

                            const stormsArr =
                              thisYear.mdcounts.storms !== undefined &&
                              thisYear.mdcounts.storms !== null
                                ? JSON.parse(
                                    JSON.stringify(thisYear.mdcounts.storms)
                                  ).sort() // use JSON to force a deep copy
                                : ["NA"];
                            let forecastLengthArr =
                              thisYear.mdcounts.fcstLens !== undefined &&
                              thisYear.mdcounts.fcstLens !== null
                                ? JSON.parse(JSON.stringify(thisYear.mdcounts.fcstLens)) // use JSON to force a deep copy
                                : ["NA"];
                            const levelsArrRaw =
                              thisYear.mdcounts.levels !== undefined &&
                              thisYear.mdcounts.levels !== null
                                ? JSON.parse(JSON.stringify(thisYear.mdcounts.levels)) // use JSON to force a deep copy
                                : ["NA"];
                            const sourceArr =
                              thisYear.mdcounts.truths !== undefined &&
                              thisYear.mdcounts.truths !== null
                                ? JSON.parse(
                                    JSON.stringify(thisYear.mdcounts.truths)
                                  ).sort() // use JSON to force a deep copy
                                : ["NA"];
                            const descrArr =
                              thisYear.mdcounts.descriptions !== undefined &&
                              thisYear.mdcounts.descriptions !== null
                                ? JSON.parse(
                                    JSON.stringify(thisYear.mdcounts.descriptions)
                                  ).sort() // use JSON to force a deep copy
                                : ["NA"];
                            const rowMinDate = moment
                              .utc(thisYear.mdcounts.mindate * 1000)
                              .format("MM/DD/YYYY HH:mm");
                            const rowMaxDate = moment
                              .utc(thisYear.mdcounts.maxdate * 1000)
                              .format("MM/DD/YYYY HH:mm");

                            stormsArr.unshift("All storms");

                            for (let j = 0; j < forecastLengthArr.length; j += 1) {
                              forecastLengthArr[j] = forecastLengthArr[j].replace(
                                /0000/g,
                                ""
                              );
                            }
                            forecastLengthArr = forecastLengthArr.sort(function (a, b) {
                              return Number(a) - Number(b);
                            });

                            let levelsArr = [];
                            let dummyLevel;
                            let dummyObj;
                            for (let j = 0; j < levelsArrRaw.length; j += 1) {
                              // sometimes bad vsdb parsing sticks an = on the end of levels in the db, so check for that.
                              dummyLevel = levelsArrRaw[j].replace(/=/g, "");
                              if (
                                Object.keys(bestTrackDefs).indexOf(dummyLevel) !== -1
                              ) {
                                dummyObj = bestTrackDefs[dummyLevel];
                              } else {
                                dummyObj = {
                                  name: dummyLevel,
                                  order: 10 + j,
                                };
                              }
                              levelsArr.push(dummyObj);
                            }
                            levelsArr = levelsArr.sort((a, b) =>
                              a.order > b.order ? 1 : -1
                            );
                            levelsArr = levelsArr.map((a) => a.name);

                            for (let j = 0; j < sourceArr.length; j += 1) {
                              if (
                                Object.keys(modelAcronymDecoder).includes(sourceArr[j])
                              ) {
                                sourceArr[j] = modelAcronymDecoder[sourceArr[j]];
                              } else {
                                modelAcronymDecoder[sourceArr[j]] = sourceArr[j];
                              }
                            }

                            if (
                              stormsOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] === undefined
                            ) {
                              // if we haven't encountered this basin for this plot type yet, just store the basin-dependent arrays
                              yearOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin].push(year);
                              stormsOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = stormsArr;
                              forecastLengthOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = forecastLengthArr;
                              levelOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = levelsArr;
                              sourceOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = sourceArr;
                              descrOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = descrArr;
                              dbDateRangeMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = {
                                minDate: rowMinDate,
                                maxDate: rowMaxDate,
                              };
                            } else {
                              // if we have encountered this variable for this plot type, we need to take the unions of existing and new arrays
                              stormsOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = _.union(
                                stormsOptionsMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year],
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
                              levelOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = _.union(
                                levelOptionsMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year],
                                levelsArr
                              );
                              sourceOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = _.union(
                                sourceOptionsMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year],
                                sourceArr
                              );
                              descrOptionsMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year] = _.union(
                                descrOptionsMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year],
                                descrArr
                              );
                              dbDateRangeMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year][minDate] =
                                dbDateRangeMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year][minDate] < rowMinDate
                                  ? dbDateRangeMap[thisDB][model][thisPlotType][
                                      thisValidStatType
                                    ][basin][year][minDate]
                                  : rowMinDate;
                              dbDateRangeMap[thisDB][model][thisPlotType][
                                thisValidStatType
                              ][basin][year][maxDate] =
                                dbDateRangeMap[thisDB][model][thisPlotType][
                                  thisValidStatType
                                ][basin][year][maxDate] > rowMaxDate
                                  ? dbDateRangeMap[thisDB][model][thisPlotType][
                                      thisValidStatType
                                    ][basin][year][maxDate]
                                  : rowMaxDate;
                            }
                            yearOptionsMap[thisDB][model][thisPlotType][
                              thisValidStatType
                            ][basin] = yearOptionsMap[thisDB][model][thisPlotType][
                              thisValidStatType
                            ][basin].sort(function (a, b) {
                              return Number(b) - Number(a);
                            });
                          }
                        }
                        if (
                          Object.keys(
                            stormsOptionsMap[thisDB][model][thisPlotType][
                              thisValidStatType
                            ][basin]
                          ).length === 0
                        ) {
                          delete yearOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete stormsOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete variableOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete forecastLengthOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete levelOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete thresholdOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete sourceOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete descrOptionsMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                          delete dbDateRangeMap[thisDB][model][thisPlotType][
                            thisValidStatType
                          ][basin];
                        }
                      }
                    }
                    if (
                      Object.keys(
                        stormsOptionsMap[thisDB][model][thisPlotType][thisValidStatType]
                      ).length === 0
                    ) {
                      delete basinOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete yearOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete stormsOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete variableOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete forecastLengthOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete levelOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete thresholdOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete sourceOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete descrOptionsMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                      delete dbDateRangeMap[thisDB][model][thisPlotType][
                        thisValidStatType
                      ];
                    }
                  }
                  if (
                    Object.keys(stormsOptionsMap[thisDB][model][thisPlotType])
                      .length === 0
                  ) {
                    delete statisticOptionsMap[thisDB][model][thisPlotType];
                    delete basinOptionsMap[thisDB][model][thisPlotType];
                    delete yearOptionsMap[thisDB][model][thisPlotType];
                    delete stormsOptionsMap[thisDB][model][thisPlotType];
                    delete variableOptionsMap[thisDB][model][thisPlotType];
                    delete forecastLengthOptionsMap[thisDB][model][thisPlotType];
                    delete levelOptionsMap[thisDB][model][thisPlotType];
                    delete thresholdOptionsMap[thisDB][model][thisPlotType];
                    delete sourceOptionsMap[thisDB][model][thisPlotType];
                    delete descrOptionsMap[thisDB][model][thisPlotType];
                    delete dbDateRangeMap[thisDB][model][thisPlotType];
                  }
                }
              }
            }
          }
          if (Object.keys(stormsOptionsMap[thisDB][model]).length === 0) {
            delete modelOptionsMap[thisDB][model];
            delete statisticOptionsMap[thisDB][model];
            delete basinOptionsMap[thisDB][model];
            delete yearOptionsMap[thisDB][model];
            delete stormsOptionsMap[thisDB][model];
            delete variableOptionsMap[thisDB][model];
            delete forecastLengthOptionsMap[thisDB][model];
            delete levelOptionsMap[thisDB][model];
            delete thresholdOptionsMap[thisDB][model];
            delete sourceOptionsMap[thisDB][model];
            delete descrOptionsMap[thisDB][model];
            delete dbDateRangeMap[thisDB][model];
          }
        }
      }
      if (Object.keys(stormsOptionsMap[thisDB]).length === 0) {
        myDBs.pop();
        delete modelOptionsMap[thisDB];
        delete statisticOptionsMap[thisDB];
        delete basinOptionsMap[thisDB];
        delete yearOptionsMap[thisDB];
        delete stormsOptionsMap[thisDB];
        delete variableOptionsMap[thisDB];
        delete forecastLengthOptionsMap[thisDB];
        delete levelOptionsMap[thisDB];
        delete thresholdOptionsMap[thisDB];
        delete sourceOptionsMap[thisDB];
        delete descrOptionsMap[thisDB];
        delete dbDateRangeMap[thisDB];
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
  const requestedDB = settings.appDefaultDB;
  const defaultDB = myDBs.indexOf(requestedDB) !== -1 ? requestedDB : myDBs[0];
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

  if (
    (await matsCollections.database.findOneAsync({ name: "database" })) === undefined
  ) {
    await matsCollections.database.insertAsync({
      name: "database",
      type: matsTypes.InputTypes.select,
      options: myDBs,
      valuesMap: validVersions,
      dates: dbDateRangeMap,
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
    if (!matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap)) {
      // have to reload database data
      await matsCollections.database.updateAsync(
        { name: "database" },
        {
          $set: {
            dates: dbDateRangeMap,
            options: myDBs,
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
  const basinOptions =
    basinOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType];
  let defaultBasin;
  if (basinOptions.indexOf("AL") !== -1) {
    defaultBasin = "AL";
  } else {
    [defaultBasin] = basinOptions;
  }

  if ((await matsCollections.basin.findOneAsync({ name: "basin" })) === undefined) {
    await matsCollections.basin.insertAsync({
      name: "basin",
      type: matsTypes.InputTypes.select,
      optionsMap: basinOptionsMap,
      options: basinOptions,
      superiorNames: ["database", "data-source", "plot-type", "statistic"],
      dependentNames: ["year", "variable", "threshold"],
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
    const currentParam = await matsCollections.basin.findOneAsync({ name: "basin" });
    if (!matsDataUtils.areObjectsEqual(basinOptionsMap, currentParam.optionsMap)) {
      // have to reload basin data
      await matsCollections.basin.updateAsync(
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
      dependentNames: ["basin", "aggregation-method"],
      hideOtherFor: {
        variable: Object.keys(masterStatsOptionsMap.TCMPR),
        threshold: Object.keys(masterStatsOptionsMap.TCMPR),
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

  // display most recent year as default
  // these defaults are app-specific and not controlled by the user
  const [defaultYear] =
    yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ];

  if ((await matsCollections.year.findOneAsync({ name: "year" })) === undefined) {
    await matsCollections.year.insertAsync({
      name: "year",
      type: matsTypes.InputTypes.select,
      optionsMap: yearOptionsMap,
      options:
        yearOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ],
      superiorNames: ["database", "data-source", "plot-type", "statistic", "basin"],
      dependentNames: [
        "storm",
        "forecast-length",
        "level",
        "truth",
        "description",
        "dates",
        "curve-dates",
      ],
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
    const currentParam = await matsCollections.year.findOneAsync({ name: "year" });
    if (!matsDataUtils.areObjectsEqual(yearOptionsMap, currentParam.optionsMap)) {
      // have to reload year data
      await matsCollections.year.updateAsync(
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

  if ((await matsCollections.storm.findOneAsync({ name: "storm" })) === undefined) {
    await matsCollections.storm.insertAsync({
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
    const currentParam = await matsCollections.storm.findOneAsync({ name: "storm" });
    if (!matsDataUtils.areObjectsEqual(stormsOptionsMap, currentParam.optionsMap)) {
      // have to reload storm data
      await matsCollections.storm.updateAsync(
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

  if ((await matsCollections.truth.findOneAsync({ name: "truth" })) === undefined) {
    await matsCollections.truth.insertAsync({
      name: "truth",
      type: matsTypes.InputTypes.select,
      optionsMap: sourceOptionsMap,
      options:
        sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][defaultYear],
      valuesMap: modelAcronymDecoder,
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
        sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
          defaultBasin
        ][defaultYear][0],
      controlButtonVisibility: "block",
      gapBelow: true,
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.truth.findOneAsync({ name: "truth" });
    if (!matsDataUtils.areObjectsEqual(sourceOptionsMap, currentParam.optionsMap)) {
      // have to reload truth data
      await matsCollections.truth.updateAsync(
        { name: "truth" },
        {
          $set: {
            optionsMap: sourceOptionsMap,
            options:
              sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][defaultYear],
            default:
              sourceOptionsMap[defaultDB][defaultModel][defaultPlotType][
                defaultStatType
              ][defaultBasin][defaultYear][0],
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

  if (
    (await matsCollections.variable.findOneAsync({ name: "variable" })) === undefined
  ) {
    await matsCollections.variable.insertAsync({
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
    const currentParam = await matsCollections.variable.findOneAsync({
      name: "variable",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, variableOptionsMap)) {
      // have to reload forecast length data
      await matsCollections.variable.updateAsync(
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

  if (
    (await matsCollections.threshold.findOneAsync({ name: "threshold" })) === undefined
  ) {
    await matsCollections.threshold.insertAsync({
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
    const currentParam = await matsCollections.threshold.findOneAsync({
      name: "threshold",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdOptionsMap)) {
      // have to reload forecast length data
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

  // these defaults are app-specific and not controlled by the user
  const fhrOptions =
    forecastLengthOptionsMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ][defaultYear];

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
      controlButtonText: "forecast lead time",
      gapAbove: true,
      displayOrder: 2,
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
      displayOrder: 3,
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
      displayOrder: 4,
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
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if ((await matsCollections.average.findOneAsync({ name: "average" })) === undefined) {
    const optionsMap = {
      None: ["m0.VALID"],
      "1hr": [`ceil(${3600}*floor(((m0.VALID)+${3600}/2)/${3600}))`],
      "3hr": [`ceil(${3600 * 3}*floor(((m0.VALID)+${3600 * 3}/2)/${3600 * 3}))`],
      "6hr": [`ceil(${3600 * 6}*floor(((m0.VALID)+${3600 * 6}/2)/${3600 * 6}))`],
      "12hr": [`ceil(${3600 * 12}*floor(((m0.VALID)+${3600 * 12}/2)/${3600 * 12}))`],
      "1D": [`ceil(${3600 * 24}*floor(((m0.VALID)+${3600 * 24}/2)/${3600 * 24}))`],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((m0.VALID)+${3600 * 24 * 3}/2)/${
          3600 * 24 * 3
        }))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((m0.VALID)+${3600 * 24 * 7}/2)/${
          3600 * 24 * 7
        }))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((m0.VALID)+${3600 * 24 * 30}/2)/${
          3600 * 24 * 30
        }))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((m0.VALID)+${3600 * 24 * 60}/2)/${
          3600 * 24 * 60
        }))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((m0.VALID)+${3600 * 24 * 90}/2)/${
          3600 * 24 * 90
        }))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((m0.VALID)+${3600 * 24 * 180}/2)/${
          3600 * 24 * 180
        }))`,
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

  if ((await matsCollections.level.findOneAsync({ name: "level" })) === undefined) {
    await matsCollections.level.insertAsync({
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
    const currentParam = await matsCollections.level.findOneAsync({ name: "level" });
    if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
      // have to reload level data
      await matsCollections.level.updateAsync(
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
              ][defaultBasin][defaultYear],
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
      defaultBasin
    ][defaultYear].minDate;
  maxDate =
    dbDateRangeMap[defaultDB][defaultModel][defaultPlotType][defaultStatType][
      defaultBasin
    ][defaultYear].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDatesTC(minDate, maxDate);
  minDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minDate).format("MM/DD/YYYY HH:mm")} - ${moment
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
    await matsCollections.CurveTextPatterns.insertAsync({
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
    await matsCollections.CurveTextPatterns.insertAsync({
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
    await matsCollections.CurveTextPatterns.insertAsync({
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
    await matsCollections.CurveTextPatterns.insertAsync({
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
      plotType: matsTypes.PlotTypes.yearToYear,
      graphFunction: "graphPlotly",
      dataFunction: "dataYearToYear",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
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

  // connect to the couchbase cluster
  const cbConnection = await matsCollections.Databases.findOneAsync(
    {
      role: matsTypes.DatabaseRoles.COUCHBASE,
      status: "active",
    },
    {
      host: 1,
      port: 1,
      bucket: 1,
      scope: 1,
      collection: 1,
      user: 1,
      password: 1,
    }
  );

  if (cbConnection) {
    global.cbPool = new matsCouchbaseUtils.CBUtilities(
      cbConnection.host,
      cbConnection.bucket,
      cbConnection.scope,
      cbConnection.collection,
      cbConnection.user,
      cbConnection.password
    );
  }
  allPools.push({ pool: "cbPool", role: matsTypes.DatabaseRoles.COUCHBASE });
  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord(
    "cbPool",
    `${cbConnection.bucket}:${cbConnection.scope}:${cbConnection.collection}`,
    ["MD:METexpressGui:met-cyclone:V01"]
  );
  try {
    matsMethods.resetApp({
      appPools: allPools,
      appMdr: mdr,
      appType: matsTypes.AppTypes.metexpress,
      dbType: matsTypes.DbTypes.couchbase,
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
