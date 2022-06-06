## Useful unix commands for CHIA

#### and not only...

### Format disks

```
sudo dd if=/dev/zero of=/dev/sdx bs=512 count=1 conv=notrunc

sudo parted /dev/sdx mklabel gpt
sudo parted /dev/sdx mkpart primary ext4 0% 100%
sudo parted /dev/sdx name 1 label
sudo mkfs.ext4 -m 0 -T largefile4 -L label /dev/sdx1
```

_make sure you replace `sdx` by your device letter and `label` with the name you want to attribute to your device._
