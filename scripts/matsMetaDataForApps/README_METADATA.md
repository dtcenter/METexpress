# Generating metadata for a mysql database


MET data loaded into a database will not appear in METexpress until metadata has been generated for it. This metadata will populate the selectors displayed on the home page of each METexpress app, so that only valid data combinations are presented to the user for plotting. 

### You must run the metadata scripts at least once before attempting to run METexpress with a new database, or the apps will fail to start.


The scripts can be run from any host (with unix) that has access to your MET database, but must be run by a user with write permissions to that database. This is because after generating the metadata required by each app, the metadata scripts will create a new schema within the mysql database called mats_metadata, and store the metadata within it. The scripts will never write to any other location.


The metadata scripts are written in python3, and require a number of python modules, including pymysql, abc.abstractmethod, urllib.request, traceback, ssl, getopt, and json, which may need to be added to your python environment with a package manager.


## To run the metadata scripts for the first time:


- The scripts are located in the METexpress repo [here](https://github.com/dtcenter/METexpress/tree/master/scripts/matsMetaDataForApps/createMetaData/mysql/metexpress). After cloning this repo, link the contents of the `scripts/matsMetaDataForApps/createMetaData/mysql` directory to your preferred run directory (e.g. something like `/home/metexpress/scripts`).
- You will need a .my.cnf file with the login credentials for your mysql database. Remember, the credentials must be for a user with write permissions.
- cd to your run directory (e.g. `cd /home/metexpress/scripts`). Remember, the contents of this run directory should be identical to the contents of `scripts/matsMetaDataForApps/createMetaData/mysql`.
- Set the python path to your run directory (e.g.    `export PYTHONPATH="/home/metexpress/scripts"`).
- Run the scripts from the command line. You will need to pass in the path to your .my.cnf file and the URL where METexpress will be available as arguments. (e.g. `/home/metexpress/scripts/metexpress/MEmetadata_update.py -c /home/metexpress/.my.cnf -u <metexpress_url>`) The URL <metexpress_url> is the actual access url of your metexpress installation, e.g. `https://yourdomain/metexpress`. The url is necessary so that the metadata scripts can inform METexpress that new metadata is available.
- The scripts should generate the necessary metadata and store it in the database. Ignore any errors that you get at the end of the workflow about not being able to curl the URL that was passed in. These are to be expected, as METexpress will not yet be running there.
- You should now be able to run a METexpress instance that looks at this database.

Once the apps are up, any new MET data loaded into the database will not appear in METexpress until the metadata scripts are run again. Because of this, we recommend running the following steps from the write access user’s crontab, either once daily or at another interval that you prefer. The metadata scripts can also be run manually at any time.


## To run the metadata scripts subsequent times (such as from the crontab):


- Set the python path to your run directory (e.g. `export PYTHONPATH="/home/metexpress/scripts"`).
- Run the scripts from the command line. You will need to pass in the path to your .my.cnf file and the URL where METexpress is available as arguments. (e.g. `/home/metexpress/scripts/metexpress/MEmetadata_update.py -c /home/metexpress/.my.cnf -u <metexpress_url>`).
- The scripts should generate the necessary metadata and store it in the database. This time, you should not receive any errors at the end of the workflow about not being able to `curl` the URL that was passed in. The script should be able to `curl` each app at that URL, triggering a metadata update and causing the selectors to display the latest information.

## Having mv_load or METdbload trigger a metadata update.


In addition to running the metadata scripts from the crontab at a given interval, it is also possible to invoke the metadata script when any new data is loaded into the database. To do this you can insert a metadata script invocation (the steps given in the previous section) into the end of the METviewer mv_load.sh script. Be sure to set the PYTHONPATH in your script invocation.





