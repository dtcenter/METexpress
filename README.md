# METexpress apps
This directory contains [METexpress](https://metexpress.nws.noaa.gov/) app source code. A METexpress app is a [Meteor](https://www.meteor.com/) app that is based on the [MATS](https://www.esrl.noaa.gov/gsd/mats/) model Analysis Tool Suite application framework.

These apps are specifically designed to be used to visualize [MET](https://dtcenter.org/community-code/model-evaluation-tools-met) data that has been loaded into a [METviewer](https://dtcenter.org/metplus-practical-session-guide-feb-2019/session-5-trkintfeature-relative/metviewer) database.

## Dependencies:
- It is expected that you are building and deploying these apps on a linux based system.
- It is expected that you do not build these tools as a priviledged user.
- The build user should have standard linux development tools installed - gcc make etc.
- [htpasswd](https://httpd.apache.org/docs/2.4/programs/htpasswd.html) (apache-utils) - the build user must have apache [htpasswd](https://httpd.apache.org/docs/2.4/programs/htpasswd.html) installed.
- [jq](https://stedolan.github.io/jq/) - the build user must have [jq](https://stedolan.github.io/jq/) version jq-1.6 or higher.
- [docker](https://www.docker.com/) - you must have Docker version 19.03.8 or higher.
- [docker-compose](https://docs.docker.com/compose/) - you must have docker-compose version 1.25.4.
- The build user should be in the [docker group](https://docs.docker.com/engine/install/linux-postinstall/) or you must be running docker in [Rootless mode](https://docs.docker.com/engine/security/rootless/) (curently unverified).
- #### [MATScommon](https://dtcenter/MATScommon): You must have cloned the dtcenter/MATScommon project into a local directory accessible by the build user.

- You must have set the environment variable METEOR_PACKAGE_DIRS to the [local directory where you cloned MATScommon]/meteor_packages
 
 `export METEOR_PACKAGE_DIRS=[MATScommon-dir]/meteor_packages`


## Build
### These apps are always built and deployed as Docker images. There are always the most recent standard docker images in the public docker repository [repository](https://dtcenter/repo/METexpress). Unless you have a non standard reason for building just use the standard images. For that you can skip to the Installation section.
To build these apps you use the included build script.
Be sure to set the environment varaiables listed in the dependencies section above.
### steps:
#### first either ....
- git clone dtcenter/METexpress [yourMETexpressDir] 
or if you have previously cloned the build directory...
- cd [yourMETexpressDir]; git pull
#### next
##### to build them all
[yourMetexpressDir]/scripts/common/buildMETexpress.sh -a 
##### or to build a single app
[yourMetexpressDir]/scripts/common/buildMETexpress.sh -r met-some_app_name 

This will build one or all of the apps, and issue errors if the apps fail to build.
### You must use a repository to install METexpress
METexpress can only be installed from Docker images. There are always the most recent images, maintained by the developers, at this [repository](https://dtcenter/repo/METexpress).
These instructions are to allow you to create your own private repository and to build the app images from scratch, and to push those apps to your own private repository.
### You cannot push to the standard repository without authorization.
#### To push the images to your docker repository you need to have an account on the repository and you must set the credentials for that account into a credentials file that is named ~builduser/.metexpress-repo-credentials.
The ~builduser/.metexpress-repo-credentials refers to a file named ~builduser/.metexpress-repo-credentials that is placed into the build user's home directory.
The ~builduser/.metexpress-repo-credentials file has the following contents.

`export matsapps_user='my_build_user'`
 
`export matsapps_password='my_build_user_dockerhub_password'`

`export matsapps_repo='repo_url'`

### Once you have demonstrated to yourself that the code builds without pushing, and once you have a repository set up and the credentials configured, you can push your images to your repository by doing a new build and including the [-i] parameter - which means [push images].

## Installation
For installation and configuration refer to the README.md in the `container_deployment` directory.


 

