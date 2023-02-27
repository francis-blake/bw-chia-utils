#!/bin/bash

DIR="$(pwd)/logs/disk-data";
cd $(pwd);
if [ ! -d $DIR/dev ]; then
  mkdir -p $DIR/dev;
fi

truncate -s 0 "$DIR/mounted_disks.log"
smartctl --scan-open | awk '{print $1 " " $3}' >> "$DIR/mounted_disks.log"

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
            arr=($e)
            if [[ ${arr[1]} == sat || ${arr[1]} == nvme ]]; then
                    truncate -s 0 $DIR${arr[0]}.json
                    smartctl -iA -l devstat --json ${arr[0]} >> $DIR${arr[0]}.json # Run smartctl into all disks that the host have
            fi

            if [[ ${arr[1]} == scsi ]]; then
                    truncate -s 0 $DIR${arr[0]}.json
                    truncate -s 0 $DIR${arr[0]}.txt
                    smartctl -a --json ${arr[0]} >> $DIR${arr[0]}.json # Run smartctl into all disks that the host have
                    smartctl -a ${arr[0]} >> $DIR${arr[0]}.txt
            fi
    fi
done


i=0
while read line
do
    array[ $i ]="$line"
    (( i++ ))
done < <(df)

i=0
JSONARR="["
for e in "${array[@]}"
do
    if [[ $i>0 ]]; then
        JSONARR+=","
    fi
    arr=($e)
    arr2=${arr[5]##*/}
    LABEL=${arr2[${#arr2[@]}-1]}
    JSONARR+='{"label":"'$LABEL'","pct":"'${arr[4]}'"}'
    i=i+1
done
JSONARR+="]"

DIR="$(pwd)/logs/disk-data";
echo $JSONARR | tee $DIR/df.json