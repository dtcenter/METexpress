# METexpress Deployment from Containers
This readme explains dependencies, and steps to deploy a set of METexpress apps from either the standard production Docker repository that has the latest pre-built official METexpress images, or from a custom repository that contains images that were custom built.  
## Dependencies:

You must have docker, docker-compose, httpaswd, and jq installed. You should have a certificate installed in /etc/ssl/certs, although you can deploy a simple system on localhost with out certificates for testing. A simple testing system can be deployed by answering yes to the question "Are you setting up a simple test environment?" in the configure program.
There is a dependency on python3 which should be accessible in /usr/bin/python3, and requires a number of python modules to be installed, including pymysql, abc.abstractmethod, urllib.request, traceback, ssl, getopt, and json. these may need to be added to your python environment with a package manager.


Configuration steps:
1. Install Docker, docker-compose, htpasswd (apache-utils), and jq.
1. Install a certificate in /etc/ssl/certs (unless you are deploying a simple test).
1. Copy the contents of this directory (container_deployment) to your install directory [INSTALL_DIR]. 
1. Change directory to the top-level of the [INSTALL_DIR] directory
1. Run the setup program ... `./bin/configure`
1. Answer the questions about domain, settings etc.
1. Bring the system up by running the up command `./bin/up metexpress`
1. Wait for a moment (let the containers get initialized) then test at `https://yourfullyqualifieddomain` or `http://localhost` (simple test deployment).

# Configuration details:
#### maintainer:
METexpress is a tool suite of applications that run under Docker.
For questions or bugs you can use the "contact" link in the header at the top of the landing page or
if you have NOAA credentials you can use the "bugs/issues" link at the top of each application.
Failing that contact Randy Pierce at randy.pierce@noaa.gov or Molly Smith at molly.b.smith@noaa.gov.
#### setup program
The setup program will help you configure your METexpress tool suite.
To do this you must have access to the internet in order to read the Dockerhub repository.

#### This setup program will ask "*Are you using a custom docker repository for this deployment*?". 
If you answer yes then it will ask for the repository name of a Dockerhub repository. 
#### It will also ask for the version of the apps that you wish to deploy. 
**The program will use the version
numbers in the file stableDeployment.json as defaults**. The stableDeployment.json that is provided from github already has the correct version for each app that is the latest in the production pre-built METexpress repository. If you have a custom repository, or if you are deploying older production versions, then the versions will be different. You need to know the versions in a custom repository. You can determine the versions by examining the image tags in the custom repository and taking the portion of the tag that follows the '-' after the app name. For example if a tag is `met-upperair-20204710` the version would be `20204710` The '-' is a seperator, not part of the version. The setup program will ask for the version of each app using the versions that are in the `stableDeployment.json` file as defaults. Editing this file ahead of time may make things easier.  
**The file `stableDeployment.json` also specifies which apps will be deployed**. You can choose which apps will be deployed by editing this file. For example, If custom apps with custom names have been built you will need to add them to this file. If you want to leave some apps undeployed then remove their entries from this file.
#### The program will prompt you for the database credentials for each database role required by each app. 
For METexpress this is the METdatadb database and the credentials will usually be the same for each app.
#### Database Role
METexpress uses a construct named role to store database credentials. The role is defined as "sums_data". This role is
configured in the stableDeployment.json file and should not be changed from what it is in the github code repository. If you 
add a custom app give it the role "sums_data" in that file as well.
#### Database Credentials
The credentials that you provide are stored in an `[INSTALL_DIR]/settings` directory 
with the directory structure `INSTALL_DIR/settings/appreference/settings.json` (where appreference is the
deployment service name of an app, like met-upperair).
If you are familiar with this directory and the settings.json files you can make changes with an editor and the setup program
will give you the option to use those existing values as defaults. Alternatively you can answer the setup questions and the program
will create these files for you.

#### Settings Directory
This is an example of a settings directory for metexpress..
* ./settings/met-upperair/settings.json
* ./settings/met-anomalycor/settings.json
* ./settings/met-surface/settings.json

#### Example Settings
This is an example of a settings.json file with dummy credentials.

    {
      "private": {
        "databases": [
          {
            "role": "sum_data",
            "status": "active",
            "host": "some_host",
            "port": "3306",
            "user": "some_user",
            "password": "some_password",
            "database": "some_database",
            "connectionLimit": 4
          },
          {
            "role": "metadata",
            "status": "active",
            "host": "some_host",
            "port": "3306",
            "user": "some_user",
            "password": "some_password",
            "database": "some_database",
            "connectionLimit": 1
          }
        ],
        "PYTHON_PATH": "/usr/bin/python3",
        "MAPBOX_KEY": "undefined"
      },
      "public": {}
    }
- **The "PYTHON_PATH" is the required location of a python3 interpreter**
- **The "MAPBOX_KEY" is a placeholder for a map function that is not yet deployed with METexpress. Leave it "undefined"**
#### Running the setup program
To run the program: cd into this directory (the top of the directory where you copied this bundle) and run
`bash bin/configure`
The configure script will run the setup program.
#### Setup artifacts
The setup program configures this deployment directory, creating a `./docker-compose.yml` configuration file,
and a `./traefik.toml` file. There are also the **settings directory** and a **logs directory** that will be created. If these directories exist from a previous setup they will be cleaned and the contents will be lost.

#### Setup Dependencies
You must have docker, docker-compose and jq installed, and you must be running this script from the top of your deployment directory (where you
cloned the repository).

You should be running this program as a user that can run docker - do not run this script as root, in fact do not run this as any authorized user.
Create an unauthorized user and add that user to the docker group and run the apps as that user.

#### Re-running setup
After once configuring an app you will have to confirm overwriting the old configuration if you run setup again.

#### Traefik credentials
The reverse proxy has a user/password pre-set to user "admin" and password "adminipassword", you should change this by following the instructions in the traefik.toml file.


You need to acquire an SSL cert for your domain and put the certificate in /etc/ssl/certs directory of this host. That docker-compose.yml file
will map the cert directory to the proxy app.

#### Letsencypt certificate
If you have authority over the DNS entry for
your server you can use LetsEncrypt for no cost certs. The instructions for doing this are at https://doc.traefik.io/traefik/https/overview/.
Notice that it will require special firewall rules for your server.
#### Reverse proxy interface
traefik has a reverse proxy interface that can give you statistics, configuration information etc.
- The reverse proxy interface has a user/password pre-set to user "**admin**" and password "**adminpassword**", you should change this by following the instructions in the traefik.toml file.
- See [dashboard](https://docs.traefik.io/operations/dashboard/) for usage.
### Using HTTP with no cert for testing
It is possible to get traefik to work if you do not have a cert.
There is an option in the configuration that allows you to specify a 
"**simple test environment**". This will require your server to resolve localhost, but it will not require
SSL or certificates. If you specify "**simple test environment**" the
tool suite entrypoints are
* https://localhost/proxy for the reverse proxy dashboard (look at comments in traefik.toml and docker-compose.yml to enable)
* https://localhost  for the top level landing page
* https://localhost/appref   for an individual app (replace appref with the actual app reference.)

Many of the remaining configurations are not applicable for the simple test environment and the configuration program will not ask about them.

##CERTS and SSL - IMPORTANT
There are two ways to handle ssl. You can let traefik use lets-encrypt to automatically generate and store certs.
These are requirements for traefik/lets-encrypt certs
1) You cannot have a firewall blocking outbound traffic  from your server and https://acme-v02.api.letsencrypt.org/directory
2) You have to follow the comments in the traefik.toml file and properly comment out the externally acquired cert sections
and uncomment the traefik/lets-encrypt sections.
Specifically - comment out these lines...
- [entryPoints.https.tls]
- [[entryPoints.https.tls.certificates]]
- certFile = "/etc/ssl/certs/${unqualifiedHostName}.crt"
- keyFile = "/etc/ssl/certs/${unqualifiedHostName}.key"

and uncomment this line in the entrypoints.https section..
- [entryPoints.https.tls]

and uncomment these lines...
- [acme]
- caServer = "https://acme-v02.api.letsencrypt.org/directory"
- email = ""
- storage = "acme.json"
- entryPoint = "https"
- [acme.tlsChallenge]
- [[acme.domains]]
-  main = "${domain}"

If you want to use externally acquired certs then you need to acquire an SSL cert for your domain and put the certificate in /etc/ssl/certs directory of this host. If you have authority over the DNS entry for
your server you can use LetsEncrypt for no cost certs. The instructions for doing this are at https://docs.traefik.io/configuration/acme/.
If you cannot acquire a certificate you can enable the apps temporarily by commenting out
- [[entryPoints.https.tls.certificates]]
- certFile = "/etc/ssl/certs/mats-meteor.crt"
- keyFile = "/etc/ssl/certs/mats-meteor.key"
in the traefik.toml file.
Follow the comments in the traefik.toml file to make sure you have commented or uncommented the appropriate sections.

#### Normal SSL Entrypoints
The tool suite entrypoints are
* https://yourfullyqualifieddomain/proxy for the reverse proxy dashboard (look at comments in traefik.toml and docker-compose.yml to enable)
* https://yourfullyqualifieddomain  for the top level landing page
* https://yourfullyqualifieddomain/appref   for an individual app (replace appref with the actual app reference.)

#### Created Directories
The configure program will create a settings directory, a logs directory, and a mongodata directory in the container_deployment directory, if they do not already exist.
#### starting the service
- After configuration you can start your tool suite with....
    `./bin/up metexpress`    
    
NOTE: if you get the error message 
    `Error response from daemon: This node is already part of a swarm. Use "docker swarm leave" to leave this swarm and join another one.`
It may mean that for some reason you already have your docker system running in a swarm.
You must leave that swarm with
`docker swarm leave` 
and then try again.

- You can stop your tool suite with..

	./bin/down metexpress
#### The "metexpress" as a parameter on bin/up or bin/down is defining a docker stack name. You must use this same stack name consistently with the commands in bin.

#### Uninstall
You can uninstall the docker images with bin/uninstall. This leaves the docker configuration in place so that a subsequent bin/up
will retrieve new images.

#### Utilities
* You can check for running containers with bin/ps. Since docker always lists containers with states that have already changed you can make this command list only running containers with `bin/ps | grep -i running`.

A sample ps output for a running system might look like this...
```
>> bin/ps metexpress | grep -i running
d01ns8hawtup        metexpress_traefik.1          traefik:1.7.16-alpine                          docker-desktop      Running             Running 24 hours ago                       
l75g4racxmxb        metexpress_met-precip.1       mycustomrepo/metexpress:met-precip-20204710       docker-desktop      Running             Running 24 hours ago                       
tqihzrp9frin        metexpress_met-ensemble.1     mycustomrepo/metexpress:met-ensemble-20204710     docker-desktop      Running             Running 24 hours ago                       
q9d79mmc1x1h        metexpress_met-surface.1      mycustomrepo/metexpress:met-surface-20204710      docker-desktop      Running             Running 24 hours ago                       
dr61qb38nu82        metexpress_mats-http.1        matsapps/production:mats-http                  docker-desktop      Running             Running 24 hours ago                       
meh141uyl68k        metexpress_mongo.1            mongo:4.2.0                                    docker-desktop      Running             Running 24 hours ago                       
lvwuccg2vk5d        metexpress_met-anomalycor.1   mycustomrepo/metexpress:met-anomalycor-20204710   docker-desktop      Running             Running 24 hours ago                       
u7hlggz84kjp        metexpress_met-airquality.1   mycustomrepo/metexpress:met-airquality-20204710   docker-desktop      Running             Running 24 hours ago                       
n7xrcq98xz6y        metexpress_met-upperair.1     mycustomrepo/metexpress:met-upperair-20204710     docker-desktop      Running             Running 24 hours ago         
```
Notice the rightmost column, which shows the state is 'Running'. 
When an app is coming up it might stay in 'Prepared' state for a short time.
Durring this time the app will be non-responsive.
* You can list the running container services with `bin/list`.
A properly deployed stack should give an output something like
```
>> bin/list
ID                  NAME                        MODE                REPLICAS            IMAGE                                            PORTS
tark5qmm7gkv        metexpress_mats-http        replicated          1/1                 matsapps/production:mats-http                    
p8kuchvbnmas        metexpress_met-airquality   replicated          1/1                 mycustomrepo/mats1:met-airquality-custom-2.6.1   
2soa0cg8g370        metexpress_met-anomalycor   replicated          1/1                 mycustomrepo/mats1:met-anomalycor-custom-2.6.1   
or4p21ueqmke        metexpress_met-ensemble     replicated          1/1                 mycustomrepo/mats1:met-ensemble-custom-2.6.1     
41truh9v4uyy        metexpress_met-precip       replicated          1/1                 mycustomrepo/mats1:met-precip-custom-2.6.1       
nl0338eppwcn        metexpress_met-surface      replicated          1/1                 mycustomrepo/mats1:met-surface-custom-2.6.1      
9db70v5aci9y        metexpress_met-upperair     replicated          1/1                 mycustomrepo/mats1:met-upperair-custom-2.6.1     
f47z1jttln6f        metexpress_mongo            replicated          1/1                 mongo:4.2.0                                      *:27017->27017/tcp
nt1uv5jhd5fy        metexpress_traefik          replicated          1/1                 traefik:1.7.16-alpine                            *:80->80/tcp, *:443->443/tcp
```
In this case the custom repository is "mycustomrepo".

* You can list just the service names with bin/listNames.
* You can show a containers log files with bin/showLog serviceName - where serviceName is one of the names from bin/listNames.
* You can tail a containers log files with bin/tailLog serviceName - where serviceName is one of the names from bin/listNames.
* You can inspect a running container with bin/inspect serviceName.
* You can restart a service (for example if you change settings for a single service) with bin/restartService serviceName.

#### Rerunning setup
you can rerun this setup with...
	
	>cd your_deployment_directory
	>bash bin/configure

You may want to occasionally rerun the setup to pick up bug fixes and newly released apps for your deployment. If you do
want to pick up the latest stable apps get the latest stableDeployment.json from the repo. It will have the latest stable app versions. 

#### Uninstall
You can uninstall with `bin/uninstall metexpress`

#### Debugging
You can increase the log level of traefik logging by editing the traefik.toml file
and uncommenting logLevel = "DEBUG" and commenting logLevel = "INFO". Other
logLevels are available. See traefik [documentation](https://docs.traefik.io/).
There will be an access.log and a traefik.log created in the logs directory. 
##### Debugging startup problems:
There should always be one traefik, one mongo, and one http container running along with any deployed app containers. First check with `bin/ps metexpress | grep -i running` to see if your containers are all running. 

You can tail the output of a single container with
	`bin/tailLog NAME`
where NAME is from the "docker service ls" output. 
We have seen occaisions where services cannot connect to the mongo database because the mongodata directory has become corrupted. 
This condition can be recognized by using the 
    
    `bin/showLog NAME`
command and looking for an error indicationg the inability to connect to the mongo server. 
You can also use the
    
    `bin/showLog metexpress_mongo`
command and look for an error indicating the inability to create collections.

You can inspect a single service with 
	
	docker service inspect NAME
and look for docker related problems.

You can use the 
    `bin/execShell NAME` e.g. `bin/execShell metexpress_met-upperair`

to exec into a running service and examine the container operating system and mounted directories.

### Metadata
Before any METexpress app can access a database properly you must run a script that will create metadata in the database. See the [METexpress/scripts/matsMetaDataForApps/createMetadata/README_METADATA.md](https://github.com/dtcenter/METexpress/blob/master/scripts/matsMetaDataForApps/README_METADATA.md) readme for an explanation.
