#!/usr/bin/env bash
# example invocation...
#./run_headless_tests.sh --maxinstances 5 --spec ~/METexpress/tests/src/features/met-anomalycor
/bin/bash: :n: command not found
    echo "No wdio.conf.js file found - not in a testing directory?"
    exit 1
fi
rm -rf logs/*
clear
export NODE_OPTIONS=--max-old-space-size=16384
npx wdio run wdio.conf.js "$@" 2> >(grep -v 'TIS/TSM')
