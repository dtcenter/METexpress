# METexpress

[METexpress](https://dtcenter.org/community-code/metexpress) is an easy-to-use interface that displays plots of statistical verification metrics for the data that a user defines interactively. The foundational metrics must first be generated from model output and “truth” data (usually observations or gridded model analyses) produced by the MET verification tool and the output files produced by MET must then be loaded into a MET database. It allows a model developer to explore metrics about their model runs quickly and flexibly without relying on someone else producing pre-generated plots. The developer can slice and dice data in the way that best gives them insight into how their model performed.

A METexpress app is a [Meteor](https://www.meteor.com/) app that is based on NOAA Global Systems Lab's "[MATS](https://www.github.com/NOAA-GSL/MATS)" Model Analysis Tool Suite application framework. The METexpress apps are specifically designed to be used to visualize [MET](https://dtcenter.org/community-code/model-evaluation-tools-met) data that has been loaded into a [METdatadb](https://dtcenter.org/metplus-practical-session-guide-feb-2019/session-5-trkintfeature-relative/metviewer) database.

The official NWS METexpress instance can be found at [metexpress.nws.noaa.gov](https://metexpress.nws.noaa.gov/).

For information about the support provided for releases, see our [Release Support Policy](https://metplus.readthedocs.io/en/develop/Release_Guide/index.html#release-support-policy).

## Installing & Running METexpress

### Runtime dependencies

- [Docker](https://www.docker.com/)
- [METdatadb DATABASE](https://github.com/dtcenter/METviewer)
    METexpress depends upon a [METdatadb database](https://github.com/dtcenter/METviewer).
    This database has a specific schema and specific load tools.
    It is required that you have an installed METviewer and that you
    have read/write credentials to the METdatadb database which you can provide
    for the METexpress setup and configuration.
- [METADATA](https://github.com/dtcenter/METexpress/blob/master/scripts/matsMetaDataForApps/README_METADATA.md)
    METexpress depends upon metadata that is derived from a
    [METdatadb](https://github.com/dtcenter/METviewer) database.
    Before using METexpress you must create this metadata.
    Please refer to this [document](https://github.com/dtcenter/METexpress/blob/master/scripts/matsMetaDataForApps/README_METADATA.md).
    The metadata scripts are in the scripts/matsMetaDataForApps/createMetaData/mysql/metexpress directory in this code tree.

### Running an official METexpress image

For installation and configuration refer to the [README-INSTALL.md](https://github.com/dtcenter/METexpress/blob/master/container_deployment/README-INSTALL.md) in the `container_deployment` directory.

The official METexpress images can be [found on Docker Hub](https://hub.docker.com/r/dtcenter/metexpress-production/tags)

## Development

### Building METexpress

METexpress apps are always built into and deployed as Docker images. The most recent, production ready docker images are in the [public docker repository](https://hub.docker.com/r/dtcenter/metexpress-production/tags). Unless you have a non standard reason for building, use the standard images. For that you can skip to the Installation section.

To build all the apps locally, you can use the provided `build.sh` script. However, it will take some time:

```console
$ ./build.sh
```

or, using `met-airquality` as an example - you can build an app individually with:

```console
$ APPNAME=met-airquality
$ docker build \
        --build-arg APPNAME="${APPNANME}" \
        --build-arg BUILDVER="dev" \
        --build-arg COMMITBRANCH="$(git branch --show-current)" \
        --build-arg COMMITSHA="$(git rev-parse HEAD)" \
        -t "${APPNAME}" \
        .
```

Note that this repo uses git submodules so to get started you will need to run `git submodule update --recursive` after you clone the repo. You will also need to create a settings file. If you're a GSL developer, you can clone the `mats-settings` repo. Otherwise, contact the METexpress team for a sample settings file.

To do further development you will want to install Meteor. Installation instructions can be found in [Meteor's documentation](https://docs.meteor.com/install.html).

Once installed, you can build and run a specific app with the following:

```console
$ cd ./apps/met-airquality
$ meteor npm install
$ env METEOR_PACKAGE_DIRS=../../MATScommon/meteor_packages/ \
    meteor run \
      --settings <path/to>/mats-settings/configurations/local/settings/met-airquality/settings.json
```

You should be able to access the app from localhost:3000

### Testing

The test suite for METexpress consists of cucumber-style acceptance tests powered by webdriver. You will most likely need to run them with the app hooked up to an internal GSL database.

The Webdriver tests rely on the XPath so you will most likely need to run MATS with the `--production` flag otherwise it will inject extra `<div>` tags like MeteorToys and some tests will fail. Running MATS with this flag will look something like the below. Your settings path will probably be different.

```console
$ cd apps/met-airquality && \
    env METEOR_PACKAGE_DIRS=../../MATScommon/meteor_packages/ \
    meteor run \
    --production \
    --settings ~/git/mats-settings/configurations/local/settings/met-airquality/settings.json
```

More on testing can be found in [the testing README](./tests/README.md)
