#!/bin/bash

# Parameters
# $1 - chiadog absolute path

# start chiadog service after 60 seconds to garantee that all disks are mounted
sleep 60
cd $1
. ./venv/bin/activate
nohup python3 -u main.py --config config.yaml > output.log 2>&1 &
deactivate