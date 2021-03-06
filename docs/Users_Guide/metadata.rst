.. _metadata:

METexpress Metadata
===================

What is metadata for METexpress?
________________________________

Generally, the term metadata refers to data about the data.  METexpress
stores metadata about each data set in the database to describe parameters
such as the model (or data source), regions, variables, levels, dates, etc
that are included in that data set. 

This metadata is then used to populate the selectors displayed on the
initial page of each METexpress app, so that only valid data combinations
are presented to the user for plotting.  For example, select a
data-source of GFSFV3. The selections that are listed for Regions will
only include regions actually produced and stored with the GFSFV3 data set.

Generating metadata for a MySQL database
________________________________________

**The metadata scripts must be run at least once before attempting to run
METexpress with a new database, or the apps will fail to start.**

The scripts can be run from any host (with UNIX) that has access to the MET
database, but must be run by a user with write permissions to that database.
This is because after generating the metadata required by each app, the
metadata scripts will create a new schema within the MySQL database called
mats_metadata, and store the metadata within it. The scripts will never
write to any other location. 

The metadata scripts are written in Python 3, and require a number of Python
modules, including pymysql, abc.abstractmethod, urllib.request, traceback,
ssl, getopt, and json, which may need to be added to the Python environment
with a package manager.

**To run the metadata scripts for the first time:**

* The scripts are located in the `METexpress repo <https://github.com/dtcenter/METexpress/tree/master/scripts/matsMetaDataForApps/createMetaData/mysql/metexpress>`_.
* After cloning this repo, link the contents of the
  scripts/matsMetaDataForApps/createMetaData/mysql directory to the
  preferred run directory (e.g., something like /home/metexpress/scripts). 
* A .my.cnf file with the login credentials will be needed for the mysql
  database. Remember, the credentials must be for a user with write
  permissions.
* Change directories to the run directory. Remember, the contents of
  this run directory should be identical to the contents of
  scripts/matsMetaDataForApps/createMetaData/mysql.  Please note that this
  is ONE LEVEL ABOVE the directory where the metadata scripts are actually
  located. For example:

  .. code-block:: none
		
    cd /home/metexpress/scripts

* Set the PYTHONPATH to the run directory. For example: 

  .. code-block:: none
		  
    export PYTHONPATH="/home/metexpress/scripts").

* Run the scripts from the command line. Pass in the path
  to the .my.cnf file and the URL where METexpress will be available as
  arguments. The URL <metexpress_url> is the actual access URL of the
  metexpress installation, e.g. **https://yourdomain/metexpress**. The URL is
  necessary so that the metadata scripts can inform METexpress that new
  metadata is available.  For example:

  .. code-block:: none
		    
    /home/metexpress/scripts/metexpress/MEmetadata_update.py 
        -c /home/metexpress/.my.cnf -u <metexpress_url>
    
* The scripts should generate the necessary metadata and store it in the
  database. 
* A METexpress instance that looks at this database can now be run.

Once the apps are up, any new MET data loaded into the database will not
appear in METexpress until the metadata scripts are run again. Because of
this, it is recommended to run the following steps from the write
access user's
crontab, either once a day or at another interval of the user's choosing.
The metadata scripts can also be run manually at any time.

**To run the metadata scripts subsequent times (such as from the crontab):**

* Set the PYTHONPATH to the run directory. For example: 

  .. code-block:: none
		    
    export PYTHONPATH="/home/metexpress/scripts"

* Run the scripts from the command line. Pass in the path
  to the .my.cnf file and the URL where METexpress is available as
  arguments. For example:

  .. code-block:: none
		    
    /home/metexpress/scripts/metexpress/MEmetadata_update.py -c /home/metexpress/.my.cnf -u <metexpress_url>

* The scripts should generate the necessary metadata and store it in the
  database. 
* The scripts will then briefly connect to each app at the provided URL,
  triggering a metadata update and causing the selectors to display the
  latest information.

**Having mv_load or METdbload trigger a metadata update:**

In addition to running the metadata scripts from the crontab at a given
interval, it is also possible to invoke the metadata script when any new
data is loaded into the database. To do this, insert a metadata
script invocation (using the steps given in the previous section) into
the end of the METviewer mv_load.sh script. Be sure to set the PYTHONPATH
in the script invocation.
