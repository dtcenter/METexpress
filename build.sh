#!/bin/bash

set -euo pipefail

apps=(
    "met-airquality"
    "met-anomalycor"
    "met-cyclone"
    "met-ensemble"
    "met-precip"
    "met-surface"
    "met-upperair"
)
branch=$(git branch --show-current)
commit=$(git rev-parse HEAD)
version=$(git describe --exact-match --tags HEAD) # Store the git tag if it points to current sha

# For each app, build the container
for app in "${apps[@]}"; do
    echo "Info - Currently building: ${app}"
    docker build \
        --build-arg APPNAME="${app}" \
        --build-arg BUILDVER="${version:-"dev"}" \
        --build-arg COMMITBRANCH="${branch}" \
        --build-arg COMMITSHA="${commit}" \
        -t mats-meteor-base:"${app}" \
        .
    echo "Info - Built: ${app}"
done
