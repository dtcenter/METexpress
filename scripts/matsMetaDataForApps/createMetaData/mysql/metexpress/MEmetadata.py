
import ast
import getopt
import json
import ssl
import sys
import time as tm
import traceback
import urllib.request
from abc import abstractmethod
from datetime import datetime, timezone

import pymysql

#  Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
# set to False to limit print output
debug = False


# debug = False
class ParentMetadata:
    def __init__(self, options, data_table_stat_header_id_limit=10000000000):
        # self.script_name = os.path.basename(sys.argv[0]).replace('.py', '')
        self.utc_start = str(datetime.utcnow())
        self.refresh_url = options['metexpress_base_url'] + "/" + options['app_reference'] + "/refreshMetadata"
        self.metadata_database = options['metadata_database']
        self.cnf_file = options['cnf_file']
        self.data_table_stat_header_id_limit = data_table_stat_header_id_limit
        if options['mvdb'] is None:
            self.mvdb = "all"
        else:
            self.mvdb = options['mvdb']
        self.script_name = options['name']
        self.line_data_table = options['line_data_table']
        self.metadata_table = options['metadata_table']
        self.app_reference = options['app_reference']
        self.database_groups = options['database_groups']
        self.appSpecificWhereClause = options['appSpecificWhereClause']
        self.dbs_too_large = {}

    def _create_run_stats_table(self):
        self.cursor.execute("""create table run_stats
        (
          script_name   varchar(50) null,
          run_start_time  datetime    null,
          run_finish_time datetime    null,
          database_name   varchar(50) null,
          status          varchar(30)
        ) comment 'keep track of matadata_upate stats - status one of started|waiting|succeeded|failed';""")
        self.cnx.commit()

    def _create_metadata_script_info_table(self):
        self.cursor.execute("""create table metadata_script_info
               (
                 app_reference          varchar(50)  null,
                 running                BOOLEAN        
               ) comment 'keep track of update metadata run status';""")
        self.cnx.commit()

    def set_running(self, state):
        # use its own cursor because the cursor may have been closed
        runningCnx = pymysql.connect(read_default_file=self.cnf_file)
        runningCnx.autocommit = True
        runningCursor = runningCnx.cursor(pymysql.cursors.DictCursor)
        runningCursor.execute("use  " + self.metadata_database + ";")

        runningCursor.execute(
            "select app_reference from metadata_script_info where app_reference = '" + self.get_app_reference() + "'")
        if runningCursor.rowcount == 0:
            # insert
            insert_cmd = 'insert into metadata_script_info (app_reference,  running) values ("' + self.get_app_reference() + '", "' + str(
                int(state)) + '");'
            runningCursor.execute(insert_cmd)
            runningCnx.commit()
        else:
            # update
            update_cmd = 'update metadata_script_info set running = "' + str(
                int(state)) + '" where app_reference = "' + self.get_app_reference() + '";'
            runningCursor.execute(update_cmd)
            runningCnx.commit()
        runningCursor.close
        runningCnx.close()

    def update_status(self, status, utc_start, utc_end):
        assert status == "started" or status == "waiting" or status == "succeeded" or status == "failed", "Attempt to update run_stats where status is not one of started | waiting | succeeded | failed: " + status
        self.cursor.execute("select database_name from run_stats where database_name = '" + self.mvdb + "'")
        if self.cursor.rowcount == 0:
            # insert
            insert_cmd = 'INSERT INTO run_stats (script_name, run_start_time, run_finish_time, database_name, status) VALUES ("' + self.script_name + '", "' + utc_start + '","' + utc_end + '","' + self.mvdb + '", "' + status + '");'
            self.cursor.execute(insert_cmd)
            self.cnx.commit()
        else:
            # update
            qd = [utc_start, utc_end, status]
            update_cmd = 'update run_stats set run_start_time=%s, run_finish_time=%s, status=%s where database_name = "' + self.mvdb + '" and script_name = "' + self.script_name + '";'
            self.cursor.execute(update_cmd, qd)
            self.cnx.commit()

    def get_app_reference(self):
        return self.app_reference

    def get_data_table_pattern_list(self):
        return self.line_data_table

    def mysql_prep_tables(self):
        try:
            self.cnx = pymysql.connect(read_default_file=self.cnf_file,
                                       cursorclass=pymysql.cursors.DictCursor)
            self.cnx.autocommit = True
            self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)
            self.cursor.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            self.cursor.execute('set session sql_mode="NO_AUTO_CREATE_USER";')

        except pymysql.Error as e:
            print(self.script_name + "- Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # see if the metadata database already exists - create it if it does not
        print(self.script_name + " - Checking for " + self.metadata_database)
        self.cursor.execute('show databases like "' + self.metadata_database + '";')
        if self.cursor.rowcount == 0:
            create_db_query = 'create database ' + self.metadata_database + ';'
            self.cursor.execute(create_db_query)
            self.cnx.commit()

        self.cursor.execute("use  " + self.metadata_database + ";")

        # see if the metadata tables already exist - create them if they do not
        print(self.script_name + " - Checking for metadata tables")
        self.cursor.execute('show tables like "{}_dev";'.format(self.metadata_table))
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Metadata dev table does not exist--creating it")
            create_table_query = 'create table {}_dev (db varchar(255), model varchar(255), display_text varchar(255), line_data_table varchar(255), variable varchar(255), regions varchar(4095), levels varchar(4095), fcst_lens varchar(4095), trshs varchar(4095), gridpoints varchar(4095), truths varchar(4095), descrs varchar(4095), fcst_orig varchar(4095), mindate int(11), maxdate int(11), numrecs int(11), updated int(11));'.format(self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute('show tables like "{}";'.format(self.metadata_table))
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Metadata prod table does not exist--creating it")
            create_table_query = 'create table {} like {}_dev;'.format(self.metadata_table, self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute("delete from {}_dev;".format(self.metadata_table))
        self.cnx.commit()

        # see if the metadata group tables already exist - create them if they do not
        self.cursor.execute('show tables like "{}_dev";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            create_table_query = 'create table {}_dev (db_group varchar(255), dbs varchar(32767));'.format(
                self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()
        self.cursor.execute('show tables like "{}";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            create_table_query = 'create table {} like {}_dev;'.format(self.database_groups, self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute("delete from {}_dev;".format(self.database_groups))
        self.cnx.commit()

        # see if the metadata_script_info tables already exist
        self.cursor.execute('show tables like "metadata_script_info";')
        if self.cursor.rowcount == 0:
            self._create_metadata_script_info_table()
        # run stats is used by MEupdate_update.py - because it has to wait for completion
        self.cursor.execute('show tables like "run_stats";')
        if self.cursor.rowcount == 0:
            self._create_run_stats_table()

    def reconcile_groups(self, groups_table):
        gd = {'database_groups': groups_table, 'database_groups_dev': groups_table + "_dev"}
        # if this is an "all" databases run clear out the groups table to remove possible
        # double entries in the event that a database had no groups and was changed
        # to have a group
        if self.mvdb == "all":
            self.cursor.execute("delete from {database_groups};".format(**gd))
            self.cnx.commit()
        # get the new groups
        self.cursor.execute("select db_group, dbs from {database_groups_dev};".format(**gd))
        dev_groups = list(self.cursor.fetchall())
        # get the old groups
        self.cursor.execute("select db_group, dbs from {database_groups};".format(**gd))
        existing_groups = list(self.cursor.fetchall())
        existing_group_names = set()
        # get the existing group db names
        for eg in existing_groups:
            # get the group
            existing_group_names.add(eg['db_group'])
        for dg in dev_groups:
            # get the group
            dev_group_name = dg['db_group']
            # get a list of the dbs for this group
            dev_dbs = set(ast.literal_eval(dg['dbs']))
            # does this group exist in the old groups....
            gd.update({"group": dev_group_name})
            if dev_group_name in existing_group_names:
                # do a union and an update
                # get the existing group db names
                for eg in existing_groups:
                    existing_dbs = []
                    if eg['db_group'] == dev_group_name:
                        existing_dbs = set(ast.literal_eval(eg['dbs']))
                        break
                # union the existing and new ones
                new_dbs = list(existing_dbs | dev_dbs)
                gd.update({"new_dbs": new_dbs})
                self.cursor.execute(
                    "update {database_groups} set dbs = \"{new_dbs}\" where db_group = \"{group}\";".format(**gd))
                self.cnx.commit()
            else:
                # do an insert
                self.cursor.execute(
                    "insert into {database_groups} select * from {database_groups_dev} where db_group = \"{group}\";".format(
                        **gd))
                self.cnx.commit()

    def deploy_dev_table_and_close_cnx(self):
        groups_table = self.database_groups
        metadata_table = self.metadata_table
        metadata_table_tmp = metadata_table + "_tmp"
        tmp_metadata_table = "tmp_" + metadata_table
        metadata_table_dev = metadata_table + "_dev"

        print(self.script_name + " - Publishing metadata")
        self.cursor.execute("use  " + self.metadata_database + ";")

        devcnx = pymysql.connect(read_default_file=self.cnf_file)
        devcnx.autocommit = True
        devcursor = devcnx.cursor(pymysql.cursors.DictCursor)
        devcursor.execute("use  " + self.metadata_database + ";")

        # use a tmp table to hold the new metadata then do a rename of the tmop metadata to the metadata
        # have to do all this extra checking to avoid warnings from mysql
        # apparently if exists doesn't quite work right
        d = {'mdt': metadata_table, 'mdt_tmp': metadata_table_tmp, 'mdt_dev': metadata_table_dev,
             'tmp_mdt': tmp_metadata_table}
        self.cursor.execute("show tables like '{tmp_mdt}';".format(**d))
        if self.cursor.rowcount > 0:
            self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
            self.cnx.commit()
        self.cursor.execute("show tables like '{mdt_tmp}';".format(**d))
        if self.cursor.rowcount > 0:
            self.cursor.execute("drop table if exists {mdt_tmp};".format(**d))
            self.cnx.commit()
        self.cursor.execute("create table {mdt_tmp} like {mdt_dev};".format(**d))
        self.cnx.commit()
        # since we processed the entire database we assume that what is in the dev metadata table is correct.
        # copy the metadata data to the tmp_metadata table
        self.cursor.execute("insert into {mdt_tmp} select * from {mdt};".format(**d))
        self.cnx.commit()
        # iterate the db model pairs in the metadata_dev table
        self.cursor.execute("select * from {mdt_dev};".format(**d))
        dev_rows = self.cursor.fetchall()
        for dev_row in dev_rows:
            d['db'] = dev_row['db']
            d['model'] = dev_row['model']
            self.cursor.execute('select * from {mdt_tmp} where db = "{db}" and model = "{model}";'.format(**d))
            # does it exist in the tmp_metadata table?
            if self.cursor.rowcount > 0:
                # yes - then delete the entry from tmp_metadata table
                self.cursor.execute('delete from {mdt_tmp} where db = "{db}" and model = "{model}";'.format(**d))
                self.cnx.commit()
            # insert the dev data into the tmp_metadata table
            self.cursor.execute(
                'insert into {mdt_tmp} select * from {mdt_dev} where db = "{db}" and model = "{model}";'.format(**d))
            d['db'] = ""
            d['model'] = ""
        self.cursor.execute("rename table {mdt} to {tmp_mdt}, {mdt_tmp} to {mdt};".format(**d))
        self.cnx.commit()
        self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
        self.cnx.commit()
        # finally reconcile the groups
        self.reconcile_groups(groups_table)

    @abstractmethod
    def strip_level(self, elem):
        pass

    @abstractmethod
    def strip_trsh(self, elem):
        pass

    def build_stats_object(self):
        print(self.script_name + " - Compiling metadata")
        self.dbs_too_large = {}
        # Open two additional connections to the database
        try:
            cnx2 = pymysql.connect(read_default_file=self.cnf_file)
            cnx2.autocommit = True
            cursor2 = cnx2.cursor(pymysql.cursors.DictCursor)
            cursor2.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            cursor2.execute('set session sql_mode="NO_AUTO_CREATE_USER";')
        except pymysql.Error as e:
            print(self.script_name + " - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)
        try:
            cnx3 = pymysql.connect(read_default_file=self.cnf_file)
            cnx3.autocommit = True
            cursor3 = cnx3.cursor(pymysql.cursors.DictCursor)
            cursor3.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            cursor3.execute('set session sql_mode="NO_AUTO_CREATE_USER";')
        except pymysql.Error as e:
            print(self.script_name + " - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # Get list of databases here
        # if a database name was supplied AND that database exists it will be the only mvdb in the list
        # if there were no database name supplied all of the existing ones will be added
        mvdbs = []
        show_mvdbs = 'show databases like "mv_%";'
        self.cursor.execute(show_mvdbs)
        rows = self.cursor.fetchall()
        for row in rows:
            if self.mvdb == "all":
                mvdbs.append(list(row.values())[0])
            else:
                if self.mvdb == list(row.values())[0]:
                    mvdbs.append(self.mvdb)
        # Find the metadata for each database
        per_mvdb = {}
        db_groups = {}
        for mvdb in mvdbs:
            per_mvdb[mvdb] = {}
            db_has_valid_data = False
            use_db = "use " + mvdb
            self.cursor.execute(use_db)
            cursor2.execute(use_db)
            cursor3.execute(use_db)
            print("\n\n" + self.script_name + "- Using db " + mvdb)

            if self.appSpecificWhereClause:
                end_query = ' and ' + self.appSpecificWhereClause + ';'
                where_query = ' where ' + self.appSpecificWhereClause
            else:
                end_query = ';'
                where_query = ''

            result1 = cursor3.fetchall()
            get_val_lists = 'select model, fcst_var, group_concat(distinct vx_mask) as regions, ' \
                            'group_concat(distinct fcst_lev) as levels, ' \
                            'group_concat(distinct fcst_thresh) as trshs, ' \
                            'group_concat(distinct interp_pnts) as gridpoints, ' \
                            'group_concat(distinct obtype) as truths, ' \
                            'group_concat(distinct descr) as descrs from stat_header' \
                            + where_query + ' group by model, fcst_var;'
            cursor3.execute(get_val_lists)
            result2 = cursor3.fetchall()

            for line_data_table in self.line_data_table:
                for model_var_line in result2:
                    model = model_var_line['model']
                    per_mvdb[mvdb][model] = {}
                    per_mvdb[mvdb][model][line_data_table] = {}
                    fvar = model_var_line['fcst_var']
                    per_mvdb[mvdb][model][line_data_table][fvar] = {}
                    per_mvdb[mvdb][model][line_data_table][fvar]['regions'] = \
                        sorted(model_var_line['regions'].split(','))
                    per_mvdb[mvdb][model][line_data_table][fvar]['levels'] = \
                        sorted(model_var_line['levels'].split(','), key=self.strip_level)
                    per_mvdb[mvdb][model][line_data_table][fvar]['trshs'] = \
                        sorted(model_var_line['trshs'].split(','), key=self.strip_trsh)
                    per_mvdb[mvdb][model][line_data_table][fvar]['gridpoints'] = \
                        sorted(model_var_line['gridpoints'].split(','))
                    per_mvdb[mvdb][model][line_data_table][fvar]['truths'] = \
                        sorted(model_var_line['truths'].split(','))
                    per_mvdb[mvdb][model][line_data_table][fvar]['descrs'] = \
                        model_var_line['descrs'].split(',')

                    # get the line_date-specific fields
                    temp_fcsts = set()
                    temp_fcsts_orig = set()
                    per_mvdb[mvdb][model][line_data_table][fvar]['fcsts'] = []
                    per_mvdb[mvdb][model][line_data_table][fvar]['fcst_orig'] = []
                    num_recs = 0
                    mindate = datetime.max
                    maxdate = datetime.min  # earliest epoch?
                    app_specific_clause = end_query[:-1]

                    # select the minimum length set of stat_header_ids from the line_data_table that are unique with respect to model, variable, and vx_mask.
                    # these will be used to qualify the distinct set of fcst_leads from the line data table.
                    get_stat_header_ids = "select stat_header_id from " + \
                                          "(select group_concat(stat_header_id) as stat_header_id from stat_header where stat_header_id in (select distinct stat_header_id from " + \
                                          line_data_table + \
                                          " where model = '" + model + \
                                          "' and fcst_var = '" + fvar + \
                                          "' order by stat_header_id)" + \
                                          app_specific_clause + \
                                          " group by model, fcst_var, vx_mask) as stat_header_id order by length(stat_header_id) limit 1;"
                    if debug:
                        print(self.script_name + " - Getting get_stat_header_ids lens for model " + model + " and variable " + fvar + " sql: " + get_stat_header_ids)
                    try:
                        cursor3.execute(get_stat_header_ids)
                        stat_header_id_values = cursor3.fetchall()
                        print(stat_header_id_values)
                        stat_header_id_list = [d['stat_header_id'] for d in stat_header_id_values if
                                               'stat_header_id' in d]
                    except pymysql.Error as e:
                        continue

                    if stat_header_id_list:
                        get_fcsts = "select distinct fcst_lead from " + line_data_table + " where stat_header_id in (" + ','.join(
                            stat_header_id_list) + ");"
                        print(self.script_name + " - Getting forecast lengths for model " + model + " and variable " + fvar)
                        if debug:
                            print(self.script_name + " - fcst_lead sql query: " + get_fcsts)
                        try:
                            cursor3.execute(get_fcsts)
                            for line3 in cursor3:
                                fcst = int(list(line3.values())[0])
                                temp_fcsts_orig.add(fcst)
                                if fcst % 10000 == 0:
                                    fcst = int(fcst / 10000)
                                temp_fcsts.add(fcst)
                        except pymysql.Error as e:
                            continue
                        get_stats = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate, count(fcst_valid_beg) as numrecs from ' + line_data_table + " where stat_header_id in (" + ','.join(
                            stat_header_id_list) + ");"
                        print(self.script_name + " - Getting stats for model " + model + " and variable " + fvar)
                        if debug:
                            print(self.script_name + " - stats sql query: " + get_stats)
                        try:
                            cursor3.execute(get_stats)
                            data = cursor3.fetchone()
                            if data is not None:
                                mindate = mindate if data['mindate'] is None or mindate < data['mindate'] else data[
                                    'mindate']
                                maxdate = maxdate if data['maxdate'] is None or maxdate > data['maxdate'] else data[
                                    'maxdate']
                                num_recs = num_recs + data['numrecs']
                        except pymysql.Error as e:
                            continue
                    per_mvdb[mvdb][model][line_data_table][fvar]['fcsts'] = list(map(str, sorted(temp_fcsts)))
                    per_mvdb[mvdb][model][line_data_table][fvar]['fcst_orig'] = list(map(str, sorted(temp_fcsts_orig)))
                    if mindate is None or mindate is datetime.max:
                        mindate = datetime.utcnow()
                    if maxdate is None is maxdate is datetime.min:
                        maxdate = datetime.utcnow()
                    per_mvdb[mvdb][model][line_data_table][fvar]['mindate'] = int(mindate.replace(tzinfo=timezone.utc).timestamp())
                    per_mvdb[mvdb][model][line_data_table][fvar]['maxdate'] = int(maxdate.replace(tzinfo=timezone.utc).timestamp())
                    per_mvdb[mvdb][model][line_data_table][fvar]['numrecs'] = num_recs
                    if int(num_recs) > 0:
                        db_has_valid_data = True
                        print("\n" + self.script_name + " - Storing metadata for model " + model + ", variable " + fvar + ", and line_type " + line_data_table)
                        self.add_model_to_metadata_table(cnx3, cursor3, mvdb, model, line_data_table, fvar, per_mvdb[mvdb][model][line_data_table][fvar])
                    else:
                        print("\n" + self.script_name + " - No valid metadata for model " + model + ", variable " + fvar + ", and line_type " + line_data_table)

            # Get the group(s) this db is in
            if db_has_valid_data:
                get_groups = 'select category from metadata'
                self.cursor.execute(get_groups)
                if self.cursor.rowcount > 0:
                    for line in self.cursor:
                        group = list(line.values())[0]
                        if group in db_groups:
                            db_groups[group].append(mvdb)
                        else:
                            db_groups[group] = [mvdb]
                else:
                    group = "NO GROUP"
                    if group in db_groups:
                        db_groups[group].append(mvdb)
                    else:
                        db_groups[group] = [mvdb]

        # save db group information
        if debug:
            print(db_groups)
        self.populate_db_group_tables(db_groups)

        # Print full metadata object
        if debug:
            print(json.dumps(per_mvdb, sort_keys=True, indent=4))

        try:
            cursor2.close()
            cnx2.close()
        except pymysql.Error as e:
            print(self.script_name + " - Error closing 2nd cursor: " + str(e))
            traceback.print_stack()
        try:
            cursor3.close()
            cnx3.close()
        except pymysql.Error as e:
            print(self.script_name + " - Error closing 3rd cursor: " + str(e))
            traceback.print_stack()

    def add_model_to_metadata_table(self, cnx_tmp, cursor_tmp, mvdb, model, line_data_table, variable, raw_metadata):
        # Add a row for each model/db combo
        cursor_tmp.execute("use  " + self.metadata_database + ";")
        #
        if len(raw_metadata['regions']) > 0 and len(raw_metadata['levels']) > 0 \
                and len(raw_metadata['fcsts']) > 0 and len(raw_metadata['trshs']) > 0 \
                and len(raw_metadata['gridpoints']) > 0 and len(raw_metadata['truths']) > 0:
            qd = []
            updated_utc = datetime.utcnow().strftime('%s')
            mindate = raw_metadata['mindate']
            maxdate = raw_metadata['maxdate']
            display_text = model.replace('.', '_')
            insert_row = "insert into {}_dev (db, model, display_text, line_data_table, variable, regions, levels, fcst_lens, trshs, gridpoints, truths, descrs, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)".format(self.metadata_table)
            qd.append(mvdb)
            qd.append(model)
            qd.append(display_text)
            qd.append(line_data_table)
            qd.append(variable)
            qd.append(str(raw_metadata['regions']))
            qd.append(str(raw_metadata['levels']))
            qd.append(str(raw_metadata['fcsts']))
            qd.append(str(raw_metadata['trshs']))
            qd.append(str(raw_metadata['gridpoints']))
            qd.append(str(raw_metadata['truths']))
            qd.append(str(raw_metadata['descrs']))
            qd.append(str(raw_metadata['fcst_orig']))
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(raw_metadata['numrecs'])
            qd.append(updated_utc)
            cursor_tmp.execute(insert_row, qd)
            cnx_tmp.commit()
        # put the cursor back to the db it was using
        cursor_tmp.execute("use  " + mvdb + ";")

    def populate_db_group_tables(self, db_groups):
        self.cursor.execute("use  " + self.metadata_database + ";")
        groups_table = self.database_groups + "_dev"
        for group in db_groups:
            gd = {"groups_table": groups_table}
            qd = []
            insert_row = "insert into {groups_table} (db_group, dbs) values(%s, %s)".format(**gd)
            qd.append(group)
            qd.append(str(db_groups[group]))
            self.cursor.execute(insert_row, qd)
            self.cnx.commit()

    def wait_on_other_updates(self, timeout, period=1):
        if debug:
            print(self.script_name + " waiting on other process")
        mustend = tm.time() + timeout
        self.cursor.execute("select * from metadata_script_info")
        if self.cursor.rowcount == 0:
            return False
        waiting = True
        while tm.time() < mustend and not waiting:
            # some sort of check for running updates
            self.cursor.execute("select app_reference from metadata_script_info where running != 0")
            if self.cursor.rowcount > 0:
                tm.sleep(period)
            else:
                if debug:
                    print(self.script_name + " clear to go")
                waiting = False
                break

        return False

    @classmethod
    def validate_options(self, options):
        assert True, options['cnf_file'] is not None and options['metadata_database'] is not None

    @classmethod
    # process 'c' style options - using getopt - usage describes options
    # cnf_file - mysql cnf file, db - prescribed db to process, metexpress_base_url - metexpress address
    # (m)ats_metadata_database_name] allows to override the default metadata databasename (mats_metadata) with something
    # db is a prescribed database to process (selective mode) used by mv_load, if it is missing then all databases will be processed
    # (D)ata_table_stat_header_id_limit, (d)atabase name, (u)=metexpress_base_url are all optional for selective mode

    def get_options(self, args):
        usage = ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]", "(u)=metexpress_base_url"]
        cnf_file = None
        db = None
        metexpress_base_url = None
        metadata_database = "mats_metadata"
        data_table_stat_header_id_limit = None
        try:
            opts, args = getopt.getopt(args[1:], "c:d:u:m:D:u:", usage)
        except getopt.GetoptError as err:
            # print help information and exit:
            print(str(err))  # will print something like "option -a not recognized"
            print(usage)  # print usage from last param to getopt
            traceback.print_stack()
            sys.exit(2)
        for o, a in opts:
            if o == "-?":
                print(usage)
                sys.exit(2)
            if o == "-c":
                cnf_file = a
            elif o == "-D":
                data_table_stat_header_id_limit = a
            elif o == "-d":
                db = a
            elif o == "-m":
                metadata_database = a
            elif o == "-u":
                metexpress_base_url = a
            else:
                assert False, "unhandled option"
        # make sure none were left out...
        assert cnf_file is not None and metadata_database is not None and metexpress_base_url is not None
        options = {'cnf_file': cnf_file, "metadata_database": metadata_database,
                   "metexpress_base_url": metexpress_base_url, "mvdb": db}
        if data_table_stat_header_id_limit is not None:
            options['data_table_stat_header_id_limit'] = data_table_stat_header_id_limit
        return options

    def main(self):
        self.mysql_prep_tables()
        self.set_running(True)
        self.utc_start = str(datetime.utcnow())
        self.update_status("waiting", self.utc_start, str(datetime.utcnow()))
        self.wait_on_other_updates(2 * 3600, 5)  # max three hours?
        self.update_status("started", self.utc_start, str(datetime.utcnow()))
        try:
            self.build_stats_object()
            self.deploy_dev_table_and_close_cnx()
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            urllib.request.urlopen(self.refresh_url, data=None, cafile=None, capath=None, cadefault=False, context=ctx)
        except Exception as ex:
            if "urlopen error [Errno 61] Connection refused" in str(ex):
                print("The METexpress web server is currently unreachable. "
                      "Its metadata will be refreshed when it next starts.")
                self.update_status("succeeded", self.utc_start, str(datetime.utcnow()))
            else:
                print(self.script_name + ": Exception: " + str(ex))
                traceback.print_stack()
                self.update_status("failed", self.utc_start, str(datetime.utcnow()))
        finally:
            self.set_running(False)
            self.update_status("succeeded", self.utc_start, str(datetime.utcnow()))
        return self.dbs_too_large
