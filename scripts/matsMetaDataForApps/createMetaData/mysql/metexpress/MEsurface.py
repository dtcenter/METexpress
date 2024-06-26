#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress surface app. It parses the required fields from any
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


class MESurface(ParentMetadata):
    def __init__(self, options):
        options['name'] = __name__
        options['appSpecificWhereClause'] = 'fcst_lev in ("MSL", "SFC", "SFC=", "Z0", "Z2", "Z10", "H0", "H2", "H10", "L0") and fcst_var not regexp "PCP|PRECIP|precip|pcp"'
        options['statHeaderType'] = 'stat_header'
        options['line_data_table'] = ["line_data_sl1l2",    # used for scalar stats on all plot types
                                      "line_data_vl1l2",    # used for vector stats on all plot types
                                      "line_data_ctc"]      # used for ctc stats on all plot types
        options['metadata_table'] = "surface_metexpress_metadata"
        options['app_reference'] = "met-surface"
        options['database_groups'] = "surface_database_groups"
        super().__init__(options)

    @staticmethod
    def get_app_reference():
        return "met-surface"

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['Z', 'H', 'L', 'A']:
            try:
                return int(elem[1:])
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
    options = MESurface.get_options(sys.argv)
    start = str(datetime.now())
    print('SURFACE METEXPRESS METADATA START: ' + start)
    me_dbcreator = MESurface(options)
    me_dbcreator.main()
    print('SURFACE METEXPRESS METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)