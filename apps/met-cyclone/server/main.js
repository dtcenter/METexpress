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

    const modelAcronymDecoder = {
        "OFCL": "OFCL: Official NHC/CPHC Forecast",
        "OFCI": "OFCI: Official NHC/CPHC Forecast",
        "OFC2": "OFC2: Official NHC/CPHC Forecast",
        "OFCP": "OFCP: Provisional NHC/CPHC Forecast",
        "OFPI": "OFPI: Provisional NHC/CPHC Forecast",
        "OFP2": "OFP2: Provisional NHC/CPHC Forecast",
        "OHPC": "OHPC: Official WPC Forecast",
        "OOPC": "OOPC: Official OPC Forecast",
        "OMPC": "OMPC: Official MPC Forecast",
        "JTWC": "JTWC: Official JTWC Forecast",
        "JTWI": "JTWI: Official JTWC Forecast",
        "AVNO": "AVNO: GFS",
        "AVNI": "AVNI: GFS",
        "AVN2": "AVN2: GFS",
        "AHNI": "AHNI: GFS No Bias Correction",
        "GFSO": "GFSO: GFS",
        "GFSI": "GFSI: GFS",
        "GFS2": "GFS2: GFS",
        "AVXO": "AVXO: GFS 10-day Tracker",
        "AVXI": "AVXI: GFS 10-day Tracker",
        "AVX2": "AVX2: GFS 10-day Tracker",
        "AC00": "AC00: GFS Ensemble Control",
        "AEMN": "AEMN: GFS Ensemble Mean",
        "AEMI": "AEMI: GFS Ensemble Mean",
        "AEM2": "AEM2: GFS Ensemble Mean",
        "AMMN": "AMMN: GFS New Ensemble Mean",
        "CMC" : "CMC: Canadian Global Model",
        "CMCI": "CMCI: Canadian Global Model",
        "CMC2": "CMC2: Canadian Global Model",
        "CC00": "CC00: Canadian Ensemble Control",
        "CEMN": "CEMN: Canadian Ensemble Mean",
        "CEMI": "CEMI: Canadian Ensemble Mean",
        "CEM2": "CEM2: Canadian Ensemble Mean",
        "COTC": "COTC: US Navy COAMPS-TC",
        "COTI": "COTI: US Navy COAMPS-TC",
        "COT2": "COT2: US Navy COAMPS-TC",
        "CTMN": "CTMN: US Navy COAMPS-TC Ensemble Mean",
        "COAL": "COAL: US Navy COAMPS-TC, Atlantic Basin",
        "COAI": "COAI: US Navy COAMPS-TC, Atlantic Basin",
        "COA2": "COA2: US Navy COAMPS-TC, Atlantic Basin",
        "COCE": "COCE: US Navy COAMPS-TC, E Pacific Basin",
        "COEI": "COEI: US Navy COAMPS-TC, E Pacific Basin",
        "COE2": "COE2: US Navy COAMPS-TC, E Pacific Basin",
        "CTCX": "CTCX: Experimental US Navy COAMPS-TC",
        "CTCI": "CTCI: Experimental US Navy COAMPS-TC",
        "CTC2": "CTC2: Experimental US Navy COAMPS-TC",
        "EGRR": "EGRR: UKMET (GTS Tracker)",
        "EGRI": "EGRI: UKMET (GTS Tracker)",
        "EGR2": "EGR2: UKMET (GTS Tracker)",
        "UKX" : "UKX: UKMET (NCEP Tracker)",
        "UKXI": "UKXI: UKMET (NCEP Tracker)",
        "UKX2": "UKX2: UKMET (NCEP Tracker)",
        "UKM" : "UKM: UKMET (Automated Tracker)",
        "UKMI": "UKMI: UKMET (Automated Tracker)",
        "UKM2": "UKM2: UKMET (Automated Tracker)",
        "KEGR": "KEGR: UKMET (GTS Tracker; 2014)",
        "KEGI": "KEGI: UKMET (GTS Tracker; 2014)",
        "KEG2": "KEG2: UKMET (GTS Tracker; 2014)",
        "UE00": "UE00: UKMET MOGREPS Ensemble Control",
        "UEMN": "UEMN: UKMET MOGREPS Ensemble Mean",
        "UEMI": "UEMI: UKMET MOGREPS Ensemble Mean",
        "UEM2": "UEM2: UKMET MOGREPS Ensemble Mean",
        "ECM" : "ECM: ECMWF",
        "ECMI": "ECMI: ECMWF",
        "ECM2": "ECM2: ECMWF",
        "ECMO": "ECMO: ECMWF (GTS Tracker)",
        "ECOI": "ECOI: ECMWF (GTS Tracker)",
        "ECO2": "ECO2: ECMWF (GTS Tracker)",
        "EMX" : "EMX: ECMWF (NCEP Tracker)",
        "EMXI": "EMXI: ECMWF (NCEP Tracker)",
        "EMX2": "EMX2: ECMWF (NCEP Tracker)",
        "EHXI": "EHXI: ECMWF No Bias Correction (NCEP Tracker)",
        "ECMF": "ECMF: ECMWF",
        "ECME": "ECME: ECMWF EPS Ensemble Control (GTS Tracker)",
        "EC00": "EC00: ECMWF EPS Ensemble Control (NCEP Tracker)",
        "EEMN": "EEMN: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "EEMI": "EEMI: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "EMNI": "EMNI: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "EMN2": "EMN2: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "EMN3": "EMN3: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "EMN4": "EMN4: ECMWF EPS Ensemble Mean (NCEP Tracker)",
        "JGSM": "JGSM: Japanese Global Spectral Model",
        "JGSI": "JGSI: Japanese Global Spectral Model",
        "JGS2": "JGS2: Japanese Global Spectral Model",
        "NAM" : "NAM: North American Mesoscale Model",
        "NAMI": "NAMI: North American Mesoscale Model",
        "NAM2": "NAM2: North American Mesoscale Model",
        "NGPS": "NGPS: US Navy NOGAPS",
        "NGPI": "NGPI: US Navy NOGAPS",
        "NGP2": "NGP2: US Navy NOGAPS",
        "NGX" : "NGX: US Navy NOGAPS",
        "NGXI": "NGXI: US Navy NOGAPS",
        "NGX2": "NGX2: US Navy NOGAPS",
        "NVGM": "NVGM: US Navy NAVGEM",
        "NVGI": "NVGI: US Navy NAVGEM",
        "NVG2": "NVG2: US Navy NAVGEM",
        "HMON": "HMON: HMON Hurricane Model",
        "HMNI": "HMNI: HMON Hurricane Model",
        "HMN2": "HMN2: HMON Hurricane Model",
        "HMMN": "HMMN: HMON Ensemble Mean",
        "HWRF": "HWRF: HWRF Hurricane Model",
        "HWFI": "HWFI: HWRF Hurricane Model",
        "HWF2": "HWF2: HWRF Hurricane Model",
        "HWFE": "HWFE: HWRF Model (ECMWF Fields)",
        "HWEI": "HWEI: HWRF Model (ECMWF Fields)",
        "HWE2": "HWE2: HWRF Model (ECMWF Fields)",
        "HW3F": "HW3F: HWRF Model v2013",
        "HW3I": "HW3I: HWRF Model v2013",
        "HW32": "HW32: HWRF Model v2013",
        "HHFI": "HHFI: HWRF Model No Bias Correction",
        "HWMN": "HWMN: HWRF Ensemble Mean",
        "HWMI": "HWMI: HWRF Ensemble Mean",
        "HWM2": "HWM2: HWRF Ensemble Mean",
        "HHYC": "HHYC: HWRF with HYCOM Ocean Model",
        "HHYI": "HHYI: HWRF with HYCOM Ocean Model",
        "HHY2": "HHY2: HWRF with HYCOM Ocean Model",
        "HWFH": "HWFH: Experimental NOAA/HRD HWRF",
        "HWHI": "HWHI: Experimental NOAA/HRD HWRF",
        "HWH2": "HWH2: Experimental NOAA/HRD HWRF",
        "HAFS": "HAFS: Hurricane Analysis and Forecast System",
        "GFEX": "GFEX Consensus",
        "HCCA": "HCCA Consensus",
        "HCON": "HCON Consensus",
        "ICON": "ICON Consensus",
        "IVCN": "IVCN Consensus",
        "IVCR": "IVCR Consensus",
        "IVRI": "IVRI Consensus",
        "IV15": "IV15 Consensus",
        "INT4": "INT4 Consensus",
        "GUNA": "GUNA Consensus",
        "GUNS": "GUNS Consensus",
        "CGUN": "CGUN Consensus",
        "TCON": "TCON Consensus",
        "TCOE": "TCOE Consensus",
        "TCOA": "TCOA Consensus",
        "TCCN": "TCCN Consensus",
        "TVCN": "TVCN Consensus",
        "TVCE": "TVCE Consensus",
        "TVCA": "TVCA Consensus",
        "TVCC": "TVCC Consensus",
        "TVCP": "TVCP Consensus",
        "TVCX": "TVCX Consensus",
        "TVCY": "TVCY Consensus",
        "RYOC": "RYOC Consensus",
        "MYOC": "MYOC Consensus",
        "RVCN": "RVCN Consensus",
        "GENA": "GENA Consensus",
        "CONE": "CONE Consensus",
        "CONI": "CONI Consensus",
        "CONU": "CONU Consensus",
        "CCON": "CCON: Corrected CONU Consensus",
        "BAMD": "BAMD: Deep-Layer Beta and Advection Model",
        "TABD": "TABD: Deep-Layer Trajectory and Beta Model",
        "BAMM": "BAMM: Medium-Layer Beta and Advection Model",
        "TABM": "TABM: Medium-Layer Trajectory and Beta Model",
        "BAMS": "BAMS: Shallow-Layer Beta and Advection Model",
        "TABS": "TABS: Shallow-Layer Trajectory and Beta Model",
        "KBMD": "KBMD: Parallel Deep-Layer Beta and Advection Model",
        "KBMM": "KBMM: Parallel Medium-Layer Beta and Advection Model",
        "KBMS": "KBMS: Parallel Shallow-Layer Beta and Advection Model",
        "CLIP": "CLIP: 72-hr Climatology and Persistence",
        "CLP5": "CLP5: 120-hr Climatology and Persistence",
        "KCLP": "KCLP: Parallel 72-hr Climatology and Persistence",
        "KCL5": "KCL5: Parallel 120-hr Climatology and Persistence",
        "TCLP": "TCLP: 168-hr Trajectory Climatology and Persistence",
        "LBAR": "LBAR: Limited Area Barotropic Model",
        "KLBR": "KLBR: Parallel Limited Area Barotropic Model",
        "LGEM": "LGEM: Logistical Growth Error Model",
        "KLGM": "KLGM: Parallel Logistical Growth Error Model",
        "SHFR": "SHFR: 72-hr SHIFOR Model",
        "SHF5": "SHF5: 120-hr SHIFOR Model",
        "DSHF": "DSHF: 72-hr Decay SHIFOR Model",
        "DSF5": "DSF5: 120-hr Decay SHIFOR Model",
        "KOCD": "KOCD: Parallel CLP5/Decay-SHIFOR",
        "KSFR": "KSFR: Parallel 72-hr SHIFOR Model",
        "KSF5": "KSF5: Parallel 120-hr SHIFOR Model",
        "SHIP": "SHIP: SHIPS Model",
        "DSHP": "DSHP: Decay SHIPS Model",
        "SHNS": "SHNS: SHIPS Model No IR Profile Predictors",
        "DSNS": "DSNS: Decay SHIPS Model No IR Profile Predictors",
        "KSHP": "KSHP: Parallel SHIPS Model",
        "KDSP": "KDSP: Parallel Decay SHIPS Model",
        "OCD5": "OCD5: Operational CLP5 and DSHF Blended Model",
        "DRCL": "DRCL: DeMaria Climatology and Persistence Model",
        "DRCI": "DRCI: DeMaria Climatology and Persistence Model",
        "MRCL": "MRCL: McAdie Climatology and Persistence Model",
        "MRCI": "MRCI: McAdie Climatology and Persistence Model",
        "AHQI": "AHQI: NCAR Hurricane Regional Model",
        "HURN": "HURN: HURRAN Model",
        "APSU": "APSU: PSU WRF-ARW Model",
        "APSI": "APSI: PSU WRF-ARW Model",
        "APS2": "APS2: PSU WRF-ARW Model",
        "A4PS": "A4PS: PSU WRF-ARW Doppler 2011",
        "A4PI": "A4PI: PSU WRF-ARW Doppler 2011",
        "A4P2": "A4P2: PSU WRF-ARW Doppler 2011",
        "A1PS": "A1PS: PSU WRF-ARW 1 km (Tail Doppler Radar Assimilated)",
        "A1PI": "A1PI: PSU WRF-ARW 1 km (Tail Doppler Radar Assimilated)",
        "A1P2": "A1P2: PSU WRF-ARW 1 km (Tail Doppler Radar Assimilated)",
        "A4NR": "A4NR: PSU WRF-ARW 4.5 km (No Tail Doppler Radar Assimilated)",
        "A4NI": "A4NI: PSU WRF-ARW 4.5 km (No Tail Doppler Radar Assimilated)",
        "A4N2": "A4N2: PSU WRF-ARW 4.5 km (No Tail Doppler Radar Assimilated)",
        "A4QI": "A4QI: PSU WRF-ARW 4.5 km (Tail Doppler Radar Assimilated; GFDL Interpolator)",
        "A4Q2": "A4Q2: PSU WRF-ARW 4.5 km (Tail Doppler Radar Assimilated; GFDL Interpolator)",
        "ANPS": "ANPS: PSU WRF-ARW 3 km (No Tail Doppler Radar Assimilated)",
        "AHW4": "AHW4: SUNY Advanced Hurricane WRF",
        "AHWI": "AHWI: SUNY Advanced Hurricane WRF",
        "AHW2": "AHW2: SUNY Advanced Hurricane WRF",
        "FIM9": "FIM9: Finite-Volume Icosahedral Model (FIM9)",
        "FM9I": "FM9I: Finite-Volume Icosahedral Model (FIM9)",
        "FM92": "FM92: Finite-Volume Icosahedral Model (FIM9)",
        "FIMY": "FIMY: Finite-Volume Icosahedral Model (FIMY)",
        "FIMI": "FIMI: Finite-Volume Icosahedral Model (FIMY)",
        "FIM2": "FIM2: Finite-Volume Icosahedral Model (FIMY)",
        "H3GP": "H3GP: NCEP/AOML Hires 3-Nest HWRF",
        "H3GI": "H3GI: NCEP/AOML Hires 3-Nest HWRF",
        "H3G2": "H3G2: NCEP/AOML Hires 3-Nest HWRF",
        "GFDL": "GFDL: NWS/GFDL Model",
        "GFDI": "GFDI: NWS/GFDL Model",
        "GFD2": "GFD2: NWS/GFDL Model",
        "GHTI": "GHTI: NWS/GFDL Model No Bias Correction",
        "GHMI": "GHMI: NWS/GFDL Model Variable Intensity Offset",
        "GHM2": "GHM2: NWS/GFDL Model Variable Intensity Offset",
        "GFDT": "GFDT: NWS/GFDL Model (NCEP Tracker)",
        "GFTI": "GFTI: NWS/GFDL Model (NCEP Tracker)",
        "GFT2": "GFT2: NWS/GFDL Model (NCEP Tracker)",
        "GFDN": "GFDN: NWS/GFDL Model (Navy Version)",
        "GFNI": "GFNI: NWS/GFDL Model (Navy Version)",
        "GFN2": "GFN2: NWS/GFDL Model (Navy Version)",
        "GFDU": "GFDU: NWS/GFDL Model (UKMET Version)",
        "GFUI": "GFUI: NWS/GFDL Model (UKMET Version)",
        "GFU2": "GFU2: NWS/GFDL Model (UKMET Version)",
        "GFD5": "GFD5: NWS/GFDL Model Parallel",
        "GF5I": "GF5I: NWS/GFDL Model Parallel",
        "GF52": "GF52: NWS/GFDL Model Parallel",
        "GFDE": "GFDE: NWS/GFDL Model (ECMWF Fields)",
        "GFEI": "GFEI: NWS/GFDL Model (ECMWF Fields)",
        "GFE2": "GFE2: NWS/GFDL Model (ECMWF Fields)",
        "GFDC": "GFDC: NWS/GFDL Coupled Model",
        "GFCI": "GFCI: NWS/GFDL Coupled Model",
        "GFC2": "GFC2: NWS/GFDL Coupled Model",
        "GFDA": "GFDA: NWS/GFDL Model With Aviation PBL",
        "GP00": "GP00: GFDL Ensemble Control",
        "G00I": "G00I: GFDL Ensemble Control",
        "G002": "G002: GFDL Ensemble Control",
        "GPMN": "GPMN: GFDL Ensemble Mean",
        "GPMI": "GPMI: GFDL Ensemble Mean",
        "GPM2": "GPM2: GFDL Ensemble Mean",
        "UWN4": "UWN4: UW Madison NMS Model 4km",
        "UW4I": "UW4I: UW Madison NMS Model 4km",
        "UW42": "UW42: UW Madison NMS Model 4km",
        "UWN8": "UWN8: UW NMS Model 8km",
        "UWNI": "UWNI: UW Madison NMS Model 8km",
        "UWN2": "UWN2: UW Madison NMS Model 8km",
        "UWQI": "UWQI: UW Madison NMS Model (GFDL Interpolator)",
        "UWQ2": "UWQ2: UW Madison NMS Model (GFDL Interpolator)",
        "TV15": "TV15: HFIP Stream 1_5 Model Consensus",
        "FSSE": "FSSE: FSU Superensemble",
        "FSSI": "FSSI: FSU Superensemble",
        "MMSE": "MMSE: FSU Multimodel Superensemble",
        "SPC3": "SPC3: Statistical Prediction of Intensity",
        "CARQ": "CARQ: Combined ARQ Position",
        "XTRP": "XTRP: 12-hr Extrapolation",
        "KXTR": "KXTR: Parallel 12-hr Extrapolation",
        "90AE": "90AE: NHC-90 test",
        "90BE": "90BE: NHC-90 test",
        "A98E": "A98E: NHC-98 Statistical-Dynamical Model",
        "A67" : "A67: NHC-67 Statistical-Synoptic Model",
        "A72" : "A72: NHC-72 Statistical-Dynamical Model",
        "A73" : "A73: NHC-73 Statistic Model",
        "A83" : "A83: NHC-83 Statistical-Dynamical Model",
        "A90E": "A90E: NHC-90 (Early) Statistical-Dynamical Model",
        "A90L": "A90L: NHC-90 (Late) Statistical-Dynamical Model",
        "A9UK": "A9UK: NHC-98 (UKMET Version)",
        "AFW1": "AFW1: US Air Force MM5 Model",
        "AF1I": "AF1I: US Air Force MM5 Model",
        "AF12": "AF12: US Air Force MM5 Model",
        "MM36": "MM36: US Air Force MM5 Model",
        "M36I": "M36I: US Air Force MM5 Model",
        "M362": "M362: US Air Force MM5 Model",
        "BAMA": "BAMA: BAM test A",
        "BAMB": "BAMB: BAM test B",
        "BAMC": "BAMC: BAM test C",
        "ETA" : "ETA: ETA Model",
        "ETAI": "ETAI: ETA Model",
        "ETA2": "ETA2: ETA Model",
        "FV5" : "FV5: NASA fvGCM Model",
        "FVGI": "FVGI: NASA fvGCM Model",
        "FVG2": "FVG2: NASA fvGCM Model",
        "MFM" : "MFM: Medium Fine Mesh Model",
        "MRFO": "MRFO: Medium Range Forecast (MRF) Model",
        "NGM" : "NGM: Nested Grid Model",
        "NGMI": "NGMI: Nested Grid Model",
        "NGM2": "NGM2: Nested Grid Model",
        "PSS" : "PSS: EP Statistic-Synoptic Model",
        "PSDL": "PSDL: EP Statistic-Dynamic Model",
        "PSDE": "PSDL: EP (Early) Statistic-Dynamic Model",
        "P91L": "P91L: EP NHC-91 (Late) Statistic-Dynamic Model",
        "P91E": "P91E: EP NHC-91 (Early) Statistic-Dynamic Model",
        "P9UK": "P91E: EP NHC-91 (UKMET) Statistic-Dynamic Model",
        "QLM" : "QLM: Quasi-Lagrangian Model",
        "QLMI": "QLMI: Quasi-Lagrangian Model",
        "QLM2": "QLM2: Quasi-Lagrangian Model",
        "SBAR": "SBAR: SANBAR Barotropic Model",
        "VBAR": "VBAR: VICBAR Model",
        "VBRI": "VBRI: VICBAR Model",
        "VBR2": "VBR2: VICBAR Model",
        "DTOP": "DTOP: Deterministic to Probabilistic Statistical Model",
        "DTPE": "DTPE: Deterministic to Probabilistic Statistical Model (ECMWF Version)",
        "RIOB": "RIOB: Bayesian RI Model",
        "RIOD": "RIOD: Discriminant Analysis RI Model",
        "RIOL": "RIOL: Logistic Regression RI Model",
        "RIOC": "RIOC: Consensus of RIOB, RIOD, RIOL",
        "EIOB": "EIOB: Bayesian RI Model (ECMWF Version)",
        "EIOD": "EIOD: Discriminant Analysis RI Model (ECMWF Version)",
        "EIOL": "EIOL: Logistic Regression RI Model (ECMWF Version)",
        "EIOC": "EIOC: Consensus of EIOB, EIOD, EIOL",
        "GCP0": "GCP1: GFS-CAM Physics v0 (NOAA/GSL)",
        "GCP1": "GCP1: GFS-CAM Physics v1 (NOAA/GSL)",
        "GCP2": "GCP1: GFS-CAM Physics v2 (NOAA/GSL)",
        "BEST": "BEST: Best Track",
        "BCD5": "BCD5: Best Track Decay",
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select * from cyclone_database_groups order by db_group;");
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select distinct db from cyclone_mats_metadata;");
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

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate from cyclone_mats_metadata where db = '" + thisDB + "' group by model,display_text,line_data_table,basin,year,storms,truths,levels,descrs,fcst_orig,mindate,maxdate order by model,line_data_table,basin,year desc;");
            for (i = 0; i < rows.length; i++) {

                var model_value = rows[i].model.trim();
                var model;
                if (Object.keys(modelAcronymDecoder).includes(model_value)) {
                    model = modelAcronymDecoder[model_value];
                } else if (model_value.match(/AP\d\d/)) {
                    model = model_value + ": GFS Ensemble Member " + model_value.slice(-2);
                } else if (model_value.match(/AN\d\d/)) {
                    model = model_value + ": GFS Ensemble Member -" + model_value.slice(-2);
                } else if (model_value.match(/CP\d\d/)) {
                    model = model_value + ": Canadian Ensemble Member " + model_value.slice(-2);
                } else if (model_value.match(/UE\d\d/)) {
                    model = model_value + ": UKMET MOGREPS Ensemble Member " + model_value.slice(-2);
                } else if (model_value.match(/EE\d\d/)) {
                    model = model_value + ": ECMWF EPS Ensemble Member " + model_value.slice(-2) + " (GTS Tracker)";
                } else if (model_value.match(/EN\d\d/)) {
                    model = model_value + ": ECMWF EPS Ensemble Member " + model_value.slice(-2) + " (NCEP Tracker)";
                } else if (model_value.match(/EP\d\d/)) {
                    model = model_value + ": ECMWF EPS Ensemble Member " + (Number(model_value.slice(-2)) + 25).toString() + " (NCEP Tracker)";
                } else if (model_value.match(/RI\d\d/)) {
                    model = model_value + ": Rapid Intensification Aid " + model_value.slice(-2);
                } else if (model_value.match(/GP\d\d/)) {
                    model = model_value + ": GFDL Ensemble Member " + model_value.slice(-2);
                } else if (model_value.match(/G\d\dI/)) {
                    model = model_value + ": GFDL Ensemble Member " + model_value.slice(1,3);
                } else if (model_value.match(/G\d\d2/)) {
                    model = model_value + ": GFDL Ensemble Member " + model_value.slice(1,3);
                } else if (model_value.match(/HW\d\d/)) {
                    model = model_value + ": HWRF Ensemble Member " + model_value.slice(-2);
                } else {
                    model = model_value;
                }
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
                    if (Object.keys(modelAcronymDecoder).includes(sourceArr[j])) {
                        sourceArr[j] = modelAcronymDecoder[sourceArr[j]];
                    } else {
                        modelAcronymDecoder[sourceArr[j]] = sourceArr[j];
                    }

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

    var requestedGroup = matsCollections.Settings.findOne({}).appDefaultGroup;
    var defaultGroup = (Object.keys(dbGroupMap).indexOf(requestedGroup) !== -1) ? requestedGroup : Object.keys(dbGroupMap)[0];
    var requestedDB = matsCollections.Settings.findOne({}).appDefaultDB;
    var defaultDB = (dbGroupMap[defaultGroup].indexOf(requestedDB) !== -1) ? requestedDB : dbGroupMap[defaultGroup][0];
    var requestedModel = matsCollections.Settings.findOne({}).appDefaultModel;
    var defaultModel = (Object.keys(modelOptionsMap[defaultDB]).indexOf(requestedModel) !== -1) ? requestedModel : Object.keys(modelOptionsMap[defaultDB])[0];
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

    // display most recent year as default
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
                valuesMap: modelAcronymDecoder,
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
                ['', 'truth', ''],
                [', desc: ', 'description', '']
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
                ['desc: ', 'description', ', '],
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
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "forecast-length", "level", "description", "curve-dates"
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
                ['', 'statistic', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ''],
                [', desc: ', 'description', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "truth", "valid-time", "forecast-length", "level", "description"
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
                ['desc: ', 'description', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "basin", "statistic", "year", "storm", "truth", "valid-time", "forecast-length", "level", "description", "curve-dates"
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
            plotType: matsTypes.PlotTypes.yearToYear,
            graphFunction: "graphPlotly",
            dataFunction: "dataYearToYear",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.histogram,
            graphFunction: "graphPlotly",
            dataFunction: "dataHistogram",
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
    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "mats_metadata", ['cyclone_mats_metadata', 'cyclone_database_groups']);
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
