#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress ensemble app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Usage: ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]" "(u)=metexpress_base_url"]
        cnf_file = None

Author: Molly B Smith, heavily modified by Randy Pierce
"""

#  Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.


import sys
from datetime import datetime

from metexpress.MEmetadata import ParentMetadata


class MEEnsemble(ParentMetadata):
    def __init__(self, options):
        options['name'] = __name__
        options['appSpecificWhereClause'] = ''
        options['statHeaderType'] = 'stat_header'
        options['line_data_table'] = ["line_data_ecnt",     # used for most stats on timeseries/dieoff/validtime/hist
                                      "line_data_cnt",      # used for MAE and ACC on timeseries/dieoff/validtime/hist
                                      "line_data_pstd",     # used for brier scores on timeseries/dieoff/validtime/hist
                                      "line_data_nbrcnt",   # used for FSS on timeseries/dieoff/validtime/hist
                                      "line_data_pct",      # used for reliability and ROC plot types
                                      "line_data_rhist"]    # used for ensemble histogram plot types
        options['metadata_table'] = "ensemble_metexpress_metadata"
        options['app_reference'] = "met-ensemble"
        options['database_groups'] = "ensemble_database_groups"
        super().__init__(options)

    @staticmethod
    def get_app_reference():
        return "met-ensemble"

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['P', 'Z', 'H', 'L', 'A']:
            if '-' not in elem:
                try:
                    return int(elem[1:])
                except ValueError:
                    return 0
            else:
                hyphen_idx = elem.find('-')
                try:
                    return int(elem[1:hyphen_idx])
                except ValueError:
                    return 0
        else:
            try:
                return int(float(elem) + 10000)
            except ValueError:
                return 0

    def strip_trsh(self, elem):
        # helper function for sorting thresholds
        if elem[0] == '>':
            try:
                return 1000 + int(float(elem[1:])) * 10000
            except ValueError:
                try:
                    return 1000.0001 + int(float(elem[2:])) * 10000
                except ValueError:
                    return 3000
        elif elem[0] == '<':
            try:
                return 4000 + int(float(elem[1:])) * 10000
            except ValueError:
                try:
                    return 4000.0001 + int(float(elem[2:])) * 10000
                except ValueError:
                    return 6000
        elif elem[0] == '=':
            try:
                return 7000 + int(float(elem[1:])) * 10000
            except ValueError:
                try:
                    return 70000.0001 + int(float(elem[2:])) * 10000
                except ValueError:
                    return 90000
        else:
            try:
                return int(float(elem))
            except ValueError:
                return 0


if __name__ == '__main__':
    options = MEEnsemble.get_options(sys.argv)
    start = str(datetime.now())
    print('ENSEMBLE METEXPRESS METADATA START: ' + start)
    me_dbcreator = MEEnsemble(options)
    me_dbcreator.main()
    print('ENSEMBLE METEXPRESS METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)