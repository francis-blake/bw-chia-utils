#!/bin/bash

DIR="$(pwd)/logs/disk-data";
cd $DIR;
if [ ! -d $DIR/dev ]; then
  mkdir -p $DIR/dev;
fi

truncate -s 0 "$DIR/mounted_disks.log"
smartctl --scan | awk '{print $1}' >> "$DIR/mounted_disks.log"

getArray ()
{
    i=0
    while read line # Read a line
    do
        array[i]=$line # Put it into the array
        i=$(($i + 1))
    done < $1
}

getArray "$DIR/mounted_disks.log"


for e in "${array[@]}"
do
    if [[ $e =~ /dev/sd* || $e =~ /dev/nvme* ]]
        then
            # echo "smartctl -i -A --json $e" >> "$DIR$e".json
            truncate -s 0 "$DIR$e".json
            smartctl -iA --json $e >> "$DIR$e".json # Run smartctl into all disks that the host have
    fi
done
