#!/usr/bin/env bash
# This script builds one or more METexpress apps, optionally takes the bundle that is built and adds a dockerfile
# and then builds the image from an appropriate node image that corresponds to the node verwsion of the app.
#
usage="USAGE $0 -a | -r appReferences (if more than one put them in \"\") [-v version] [-i] [-l (local images only - do not push)] \n\
	where -v version is a version string or number that will be given to each image. -a is force build all apps, -b branch lets you override the assigned branch (feature build)\n\
	appReference is build only requested appReferences (like \"met-airquality\" \"met-anomalycor\"), \n\
	and i is build images - images will be pushed to the repo in your credentials file"

isGitRepo=$( git config --get remote.origin.url)
rootOfRepo=$(git rev-parse --show-toplevel)
BUILD_DIRECTORY=$(pwd)
if [[ ${isGitRepo} != "https://github.com/dtcenter/METexpress.git" ]]; then
  echo "you are not in a local repo cloned from https://github.com/dtcenter/METexpress.git"
  echo "I cannot go on.... exiting"
  echo $usage
  exit 1
fi

if [[ ${BUILD_DIRECTORY} != ${rootOfRepo} ]]; then
  echo "you do not appear to be in the top of the repo"
  echo "I cannot go on.... exiting"
  echo $usage
  exit 1
  fi

# source the credentials for the matsapps account
if [ ! -f ~/.metexpress-repo-credentials ]; then
    echo "~/.metexpress-repo-credentials file not found!"
    echo "you must create a ~/.metexpress-repo-credentials file with the following entries.."
    echo "export repo_user='repo user'"
    echo "export repo_password='repo user password'"
    echo "export repo='repo'"
    exit 1
fi
. ~/.metexpress-repo-credentials
if [ -z ${repo_user+x} ]; then
  echo -e "${RED} your repo_user is not exported in your ~/.metexpress-repo-credentials file ${NC}"
  echo "I can't go on..."
  echo exit 1
fi
if [ -z ${repo_password+x} ]; then
  echo -e "${RED} your repo_password is not exported in your ~/.metexpress-repo-credentials file ${NC}"
  echo "I can't go on..."
  echo exit 1
fi
if [ -z ${repo+x} ]; then
  echo -e "${RED} your repo is not exported in your ~/.metexpress-repo-credentials file ${NC}"
  echo "I can't go on..."
  echo exit 1
fi

# This "function can tell you if the docker daemon is a swarm manager - copied from app_production_utilities.source
function isSwarmNode(){
     if [ "$(docker info 2> /dev/null | grep Swarm | sed 's/Swarm: //g')" == "inactive" ]; then
              echo false
     else
              echo true;
     fi
}

# assign all the top level environment values from the build configuration to shell variables
# set up logging
logDir="./logs"
mkdir -p logs
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

requestedApp=""
requestedTag=""
requestedBranch=""
pushImage="yes"
build_images="no"
parallel="no"
customVersion="$(date +%Y%M%d)"
while getopts "ailr:v:p" o; do
    case "${o}" in
        a)
        #all apps
            requestedApp="all"
        ;;
        i)
        # build images also
            build_images="yes"
            ;;
        l)
            build_images="yes"
            pushImage="no"
        ;;
        r)
            requestedApp=(${OPTARG})
            echo -e "requsted apps ${requestedApp[@]}"
        ;;
        v)
          customVersion=(${OPTARG})
          ;;
        p)
        # secret parallel build mode
        parallel="yes"
        ;;
        *)
            echo -e "${RED} bad option? ${NC} \n$usage"
            exit 1
        ;;
    esac
done
shift $((OPTIND - 1))
echo "Building METexpress apps - requestedApps: ${requestedApp[@]}  date: $(/bin/date +%F_%T)"
echo -e "using version ${customVersion}"

# find buildable apps from apps directory
buildableApps=( $(find apps -depth 1 -exec basename {} \;) )
#build all of the apps
unset apps
if [ "X${requestedApp}" != "X" ]; then
   # something was requested. Either a few apps or all
    if [ "${requestedApp}" == "all" ]; then
        apps=( ${buildableApps[@]} )
        echo -e all apps requested - must build all buildable apps
    else
        # not all so find requested apps that are also buildable
        echo -e specific apps requested - must build requested buildable apps
        l2=" ${requestedApp[*]} "
        for a in ${buildableApps[*]}; do
            if [[ $l2 =~ " $a " ]]; then
                apps+=( $a )
            fi
        done
    fi
else
  echo -e "${RED} you did not request any buildable apps - exiting ${NC}"
  exit 1
fi
echo -e "${GRN}Resolved apps to build - building these apps ${apps[*]}${NC}"

echo -e "$0 ${GRN} clean and remove existing images ${NC}"
if [ "${build_images}" == "yes" ]; then
    # clean up and remove existing images images
    #wait for stacks to drain
    if [[ isSwarmNode == "true" ]];then
        docker stack ls | grep -v NAME | awk '{print $1}' | while read stack
        do
                echo $stack
                docker stack rm ${stack}
                docker network rm web
                limit=20
                until [ -z "$(docker service ls --filter label=com.docker.stack.namespace=${stack} -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
                limit=20
                until [ -z "$(docker network ls --filter label=com.docker.stack.namespace=web -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
                limit=20
                until [ -z "$(docker stack ps ${stack} -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
        done
    fi
    docker stop $(docker ps -a -q)
    docker rm $(docker ps -a -q)
    docker system prune -af
fi

APP_DIRECTORY="$(pwd)/apps"
cd ${APP_DIRECTORY}
echo -e "$0 building these apps ${GRN}${apps[*]}${NC}"
BUNDLE_DIRECTORY=${BUILD_DIRECTORY}/bundles
buildApp() {
  echo "repo is $repo"
  echo "repo user is $repo_user"
  echo "repo password is is $repo_password"

    local myApp=$1
    cd ${APP_DIRECTORY}/${myApp}
    echo -e "$0:${myApp}: - building app ${GRN}${myApp}${NC}"
    rm -rf ./bundle
    /usr/local/bin/meteor reset
    BUNDLE_DIRECTORY=${BUILD_DIRECTORY}/bundles/${myApp}
    if [ ! -d "${BUNDLE_DIRECTORY}" ]; then
        mkdir -p ${BUNDLE_DIRECTORY}
    else
        rm -rf ${BUNDLE_DIRECTORY}/*
    fi
    # do not know why I have to do these explicitly, but I do.
    /usr/local/bin/meteor npm install --save @babel/runtime
#    /usr/local/bin/meteor npm install --save bootstrap
#    /usr/local/bin/meteor npm audit fix

    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "$0:${myApp}: ${RED} ${failed} to meteor build - must skip app ${myApp} ${NC}"
        continue
    fi

    cd ${BUNDLE_DIRECTORY}
    (cd bundle/programs/server && /usr/local/bin/meteor npm install && /usr/local/bin/meteor npm audit fix)

    if [[ "${build_images}" == "yes" ]]; then
        echo -e "$0:${myApp}: Building image for ${myApp}"
        buildVer="${customVersion}"
        # build container....
        export METEORD_DIR=/opt/meteord
        export MONGO_URL="mongodb://mongo"
        export MONGO_PORT=27017
        export MONGO_DB=${myApp}
        export APPNAME=${myApp}
        export TAG="${myApp}-${buildVer}"
        echo "$0:${myApp}: building container in ${BUNDLE_DIRECTORY}"
        # remove the container if it exists - force in case it is running
        docker rm -f ${repo}:${TAG}
        # Create the Dockerfile
        echo "$0:${myApp}: => Creating Dockerfile..."
        # save and export the meteor node version for the build_app script
        export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
        export METEOR_NPM_VERSION=$(meteor npm -v)
        cp ../../scripts/common/docker_scripts/run_app.sh  .
        chmod +x run_app.sh
        # remove the node_modules to force rebuild in container
        rm -rf bundle/programs/server/node_modules
        #NOTE do not change the tabs to spaces in the here doc - it screws up the indentation

        cat <<-%EOFdockerfile > Dockerfile
# have to mount meteor settings as usr/app/settings/${APPNAME} - so that settings.json can get picked up by run_app.sh
# the corresponding usr/app/settings/${APPNAME}/settings-mysql.cnf file needs to be referenced by
# "MYSQL_CONF_PATH": "/usr/app/settings/${APPNAME}/settings-mysql.cnf" in the settings.json file
# and the MYSQL_CONF_PATH entry in the settings.json
# Pull base image.
FROM node:14.8-alpine3.12
# Create app directory
ENV METEOR_NODE_VERSION=8.11.4 APPNAME="${APPNAME}" METEORD_DIR="/opt/meteord"
WORKDIR /usr/app
ADD bundle /usr/app
COPY run_app.sh /usr/app
RUN apk --update --no-cache add mongodb-tools make gcc g++ python3 python3-dev mariadb-dev bash && \\
    npm cache clean -f && \\
    npm install -g n && \\
    npm install -g node-gyp && \\
    node-gyp install && \\
    python3 -m ensurepip && \\
    pip3 install --upgrade pip setuptools && \\
    pip3 install numpy && \\
    pip3 install pymysql && \\
    chmod +x /usr/app/run_app.sh && \\
    cd /usr/app/programs/server && npm install && npm audit fix && \\
    apk del --purge  make gcc g++ bash python3-dev && npm uninstall -g node-gyp && \\
    rm -rf /usr/mysql-test /usr/lib/libmysqld.a /opt/meteord/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* /usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp rm -r /root/.cache
ENV APPNAME=${APPNAME}
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV ROOT_URL=http://localhost:80/
EXPOSE 80
ENTRYPOINT ["/usr/app/run_app.sh"]
LABEL version="${buildVer}"
    # build container
        #docker build --no-cache --rm -t ${TAG} .
        #docker tag ${repo}:${TAG} ${repo}:${TAG}
        #docker push ${repo}:${TAG}
%EOFdockerfile
        echo "$0:${myApp}: docker build --no-cache --rm -t ${repo}:${TAG} ."
        docker build --no-cache --rm -t ${repo}:${TAG} .
        echo "$0:${myApp}: docker tag ${repo}:${TAG} ${repo}:${TAG}"
        docker tag ${repo}:${TAG} ${repo}:${TAG}
        if [ "${pushImage}" == "yes" ]; then
            echo ${docker_password} | docker login -u ${docker_user} --password-stdin
            echo "$0:${myApp}: pushing image ${repo}:${TAG}"
            docker push ${repo}:${TAG}
            ret=$?
            if [ $ret -ne 0 ]; then
                # retry
                echo -e "${RED} Error pushing image - need to retry${NC}"
                docker push ${repo}:${TAG}
                ret=$?
            fi
            if [ $ret -eq 0 ]; then
              # remove the docker image - conserve space for build
              echo "${GRN} pushed the image! ${NC}"
              docker rmi ${repo}:${TAG}
            else
              echo "${RED} Failed to push the image! ${NC}"
            fi
        else
            echo "$0:${myApp}: NOT pushing image ${repo}:${TAG}"
        fi
    fi
    rm -rf ${BUNDLE_DIRECTORY}/*
}

# build all the apps
i=0
for app in ${apps[*]}; do
  if [[ ${parallel} = "yes" ]]; then
    (buildApp ${app})&
    pids[${i}]=$!
    i=$((i+1))
    sleep 10
  else
    (buildApp ${app})
  fi
done

# wait for all pids
for pid in ${pids[*]}; do
    wait $pid
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"
exit 0
