#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress Mode app. It parses the required fields from any
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


class MEMode(ParentMetadata):
    def __init__(self, options):
        options['name'] = __name__
        options['appSpecificWhereClause'] = ''
        options['statHeaderType'] = 'mode_header'           # all the important MODE metadata is in the header table,
        options['line_data_table'] = ["mode_obj_pair"]      # so only list one line type or we'll get redundancy
        options['metadata_table'] = "mode_metexpress_metadata"
        options['app_reference'] = "met-object"
        options['database_groups'] = "mode_database_groups"
        super().__init__(options)

    @staticmethod
    def get_app_reference():
        return "met-object"

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
        if elem[0:2] == '>=':
            try:
                return 10000 + int(float(elem[2:]) * 10000.)
            except ValueError:
                return 100000
        elif elem[0] == '>':
            try:
                return 10000 + int(float(elem[1:]) * 10000.)
            except ValueError:
                return 100000
        elif elem[0:2] == '<=':
            try:
                return 20000 + int(float(elem[2:]) * 10000.)
            except ValueError:
                return 200000
        elif elem[0] == '<':
            try:
                return 20000 + int(float(elem[1:]) * 10000.)
            except ValueError:
                return 200000
        elif elem[0] == '=':
            try:
                return 30000 + int(float(elem[1:]) * 10000.)
            except ValueError:
                return 300000
        else:
            try:
                return int(float(elem))
            except ValueError:
                return 0


if __name__ == '__main__':
    options = MEMode.get_options(sys.argv)
    start = str(datetime.now())
    print('MODE METEXPRESS METADATA START: ' + start)
    me_dbcreator = MEMode(options)
    me_dbcreator.main()
    print('MODE METEXPRESS METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)