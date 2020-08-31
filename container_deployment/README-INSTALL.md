# Dependencies:

You must have docker, docker-compose, httpaswd, and jq installed. You should have a certificate installed in /etc/ssl/certs.
#### Certificate
You can run the apps without a certificate but it will require modifying the deployed traefik.yaml file.

Configuration steps:
1. install Docker, docker-compose, htpasswd (apache-utils), and jq.
1. Install a certificate in /etc/ssl/certs.
1. Copy the contents of this directory (container_deployment) to your install directory [INSTALL_DIR]. 
1. cd to the top level of the [INSTALL_DIR] directory
1. ./bin/configure
1. answer questions about domain, settings etc.
1. ./bin/up
1. wait for a moment then test at https://yourfullyqualifieddomain.

# Configuration details:
#### maintainer:
This is a tool suite of applications that run under Docker.
For questions or bugs you can use the "contact" link in the header at the top of the landing page or
if you have NOAA credentials you can use the "bugs/issues" link at the top of each application.
Failing that contact Randy Pierce at randy.pierce@noaa.gov 
#### setup program
The setup program will help you configure your tool suite.
To do this you must have access to the internet.

This setup program will ask for the repository name of a dockerhub repository. 
It will also ask for the version of the apps that you wish to deploy. **The program will use the version
numbers in the file stableDeployment.json as defaults**. The stableDeployment.json that is provided here already has the correct version 
for each app that is the latest in the standard pre-built METexpress repository. If you
have a custom repository then the versions will be different. 
Editing this file ahead of time may make things easier. **The file
stableDeployment.json also specifies which apps will be deployed**. If custom apps have been built you will need to add them to this file.
It will then prompt you for the database credentials for each
database role required by each app. For METexpress this is the METviewer database and the credentials will likely be the same for each app.
#### Database Roles
Database roles are usually some combination of 
* meta_data - the database that contains app metadata,
* sums_data - the database that contains an apps statistical partial sum data, 
* model_data - a database that contains metadata about data sources, 
* and sites_data - which contains non standard domain data.
#### Database Credentials
The credentials that you provide are stored in an `[INSTALL_DIR]/settings` directory 
with the structure `INSTALL_DIR/settings/appreference/settings.json` (where appreference is the
deployment service name of an app, like met-upperair).
If you are familiar with this directory and the settings.json files you can make changes with an editor and the setup program
will give you the option to use the existing values as defaults. Alternatively you can answer the setup questions and the program
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
        "MAPBOX_KEY": "your mapbox key"
      },
      "public": {}
    }

#### Running the setup program
To run the program: cd into this directory (the top of the directory where you copied this bundle) and run
`bash bin/configure`
The configure script will run the setup program.
#### Setup artifacts
The setup program configures this deployment directory, creating a `./docker-compose.yml` configuration file,
and a `./traefik.toml` file.

#### Setup Dependencies
You must have docker, docker-compose and jq installed, and you must be running this script from the top of your deployment directory (where you
un-tarred the bundle).

You should be running this program as a user that can run docker - do not run this script as root, in fact do not run this as any authorized user.
Create an unauthorized user and add that user to the docker group and run the apps as that user.

#### Re-running setup
After once configuring an app you will have to confirm overwriting the old configuration if you run setup again.

#### Traefik credentials
The reverse proxy has a user/password pre-set to user "admin" and password "adminipassword", you should change this by following the instructions in the traefik.toml file.
This program will create a settings directory here in this directory and a mongodata directory in the $HOME of the deployment user, if they do not already exist.

You need to acquire an SSL cert for your domain and put the certificate in /etc/ssl/certs directory of this host. That docker-compose.yml file
will map the cert directory to the proxy app.

#### Letsencypt certificate
If you have authority over the DNS entry for
your server you can use LetsEncrypt for no cost certs. The instructions for doing this are at https://docs.traefik.io/configuration/acme/.

### Reverse proxy interface
traefik has a reverse proxy interface that can give you statistics, configuration information etc.
- The reverse proxy interface has a user/password pre-set to user "**admin**" and password "**adminpassword**", you should change this by following the instructions in the traefik.toml file.

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
There are two ways to handle ssl. You can let traefik use lets-encrypt automatically to generate and store certs.
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
* You can check for running containers with bin/ps.
* You can list the running container services with bin/list.
* You can list just the service names with bin/listNames.
* You can show a containers log files with bin/showLog serviceName - where serviceName is one of the names from bin/listNames.
* You can inspect a running container with bin/inspect serviceName.
* You can restart a service (for example if you change settings for a single service) with bin/restartService serviceName.

you can rerun this setup with...
	
	>cd your_deployment_directory
	>bash bin/configure

You may want to occasionally rerun the setup to pick up bug fixes and newly released apps for your deployment. This URL

	https://www.esrl.noaa.gov/gsd/mats/appProductionStatus/versions 

shows the latest versions of the apps available for all the deployments.
By comparing those versions to the versions in your running apps you can determine if an update is necessary. You
can tell the version of a running app by looking at the comments in the docker-compose.yml file. This file is recreated when
you run the setup, with the current version for each app.

#### Debugging
You can increase the log level of traefik logging by editing the traefik.toml file
and uncommenting logLevel = "DEBUG" and commenting logLevel = "INFO". Other
logLevels are available. See traefik [documentation](https://docs.traefik.io/).
Debugging startup problems:
You can list services with 

	`bin/listNames`
and you can view a service log with
	
	`bin/showLog NAME` 
where NAME is from the "docker service ls" output.
You can inspect a single service with 
	
	docker service inspect NAME


