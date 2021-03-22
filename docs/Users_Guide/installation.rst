.. _installation:

METexpress System Requirements, Installation and Support
========================================================

**Repository:**  METexpress is a community software package
managed by the Developmental Testbed Center (DTC) and is available
through `Github <https://github.com/dtcenter/METexpress>`_.

This repository includes a README file at the top-level that
covers an overview and build instructions, with further links to
installation instructions.

**System requirements:**

* Hardware: METexpress runs on Docker.  It can successfully run on a
  system with four cores, 8 GB of memory and 10GB of free disk space.
  METexpress has been tested on Linux and MAC systems.  It may run on
  Windows but this has not been tested and the configuration and
  management scripts are written in bash.

* Software:  These packages must be installed: docker, docker-compose,
  httpaswd, and jq.  For a robust testing environment, install the
  certificate located in /etc/ssl/certs (see SSL certificates below).
  A simple testing system can be deployed on the localhost without
  certificates for testing by answering yes to the question "Are you
  setting up a simple test environment?" in the configure program.

* Python 3: There is a dependency on Python 3 which should be accessible
  in /usr/bin/python3, and requires a number of Python modules to be
  installed, including pymysql, abc.abstractmethod, urllib.request,
  traceback, ssl, getopt, and json.  These may need to be added to
  the Python environment with a package manager.

Meteor Framework: METexpress is built on the Meteor free and
open-source JavaScript web framework.
`Meteor <https://www.meteor.com/install>`_  must be installed in order
to build METexpress.  Meteor is not required to deploy METexpress containers.

**Database requirements:**  METexpress must have access to a METdatadb
database and must have read/write privileges. For further information
about installation of this database please see
https://dtcenter.github.io/METviewer/latest/Users_Guide/installation.html and
https://dtcenter.github.io/METviewer/latest/Users_Guide/database_loading.html.

**Configuration:** In order to install METexpress, a configuration script
needs to be run which will give a prompt to provide information specific
to the installation. Below is a list of information that usually needs
to be provided:

* Networking information: 

  * The domainName of the deployment server.  

    * METexpress uses this to configure its own proxy service that fronts the apps.

      | 
      
  * Fully qualified proxy hostname, defaulting to the domainName

    * The deployment might be behind a redirection proxy with
      redirection to a different path than what is actually on the host.
      For example, the METexpress server might be deployed on a
      server with an internal URL "https://something.subnet.esrl.noaa.gov"
      and have a landing page location of "/", while the public URL
      is a proxy redirect like "https://www.esrl.noaa.gov/gsd/mats". 

      * In this case the fully qualified proxy hostname is
	www.esrl.noaa.gov and the proxy_prefix_path needs to be set
	to "/gsd/mats".

	| 

  * Proxy redirection path

    * This allows a different path other than "/"

      | 

* Database credentials:
  Building on the architecture of MATS, METexpress has a
  construct for a database role.  Within METexpress the only role
  that is used is one named “sums_data”.  METexpress requires
  that a user exist in the MET database that has database read and
  write permissions.  Write permissions are needed to create metadata entries.
  During the installation, it will be necessary to provide the
  username and password for this user. The username and password for the
  sums_data role is required for each app.

* SSL certificates:
  An SSL certificate is required to run METexpress. This is usually
  an externally acquired certificate for the users domain, which users
  will need to place in a directory as instructed by the setup script.
  Alternatively, a no-cost certificate can be used provided by traefik
  using Let's Encrypt software from within METexpress containers.
  Instructions for this option are available in the
  `overview for traefik <https://doc.traefik.io/traefik/https/overview/>`_.
  Be aware, however, that this option requires modifications to the
  server’s firewall by someone with network administrative privileges.
  
**Building METexpress**:  It is only necessary to build METexpress
if a custom build is required. Otherwise, it is recommended that METexpress
be installed directly from the provided docker images.  See the
`overview and build README <https://github.com/dtcenter/METexpress/blob/master/README.md>`_.

**Installation**:  METexpress can only be installed from Docker
images.  The most recent images are maintained by METexpress
developers and are available in the
`dockerhub repository <https://hub.docker.com/r/dtcenter/metexpress-production>`_.

For guidance on the installation see the
`METexpress Deployment for Containers README <https://github.com/dtcenter/METexpress/blob/master/container_deployment/README-INSTALL.md>`_.

**Support**: For support for METexpress, please email mats.gsl@noaa.gov.
