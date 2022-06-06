## Overview

This script is a simple to use bash file to start chia services and a service file to start it after boot up.

It's ready to adjust to your case and drop into `/etc/systemd/system` as system service but run on behalf of your user.

## Instalation

_Make sure you make adjustments to your needs by changing user, group and services intended to start._

1. Clone the repo
2. Copy `services/start-chia.service` to `/etc/systemd/system` using `sudo`
3. Edit the file `/etc/systemd/system/start-chia.service` and change your user and group as well as your home directory path.
4. Uncomment the `ExecStart` line that starts the services you want. By default is `farmer`.
5. Enable your service to get it working permanently (after reboot).

```
sudo systemctl enable start-chia.service
```

6. Start the service

```
sudo systemctl start start-chia.service
```

7. Check for any possible errors in `/var/log/syslog` or by typing:

```
sudo systemctl status start-chia.service
```

Have fun!
