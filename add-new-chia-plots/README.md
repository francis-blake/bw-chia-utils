## Add New Chia Plots

### What is?

This nodejs script aims to register in a database through an API the plots while day are being created.

All you have to do is to redirect the plot output to a so called `plot.log` in your `home directory`.

This scripts reads the log created by `madmax` (not work with `bladebit`) and register the phases times, plot id, and all relevant information. During the process it makes api calls to post progress update. In the end it tests the `plot` retrieving the rate and sending the final json object of the plot to an API endpoint.

### Install

1. Clone this repository

2. Fill `temporary-devices.json` with path and name of all your used `tmp disks`

3. Fill your `.env` file based on `.env-sample`

4. Open a session using screen to leave this script running in background:

```
screen -S add-new-chia-plots

cd /home/<username>/bw-chia-utils/add-new-chia-plots
./add-new-chia-plots.js
```

Press `CTRL+D` to exit Screen session

5. Open another session with screen to start plot (if your session drops, session inside screen are kept alive):

```
screen -S plotting

cd /home/<username>/chia-blockchain
. ./activate
chia plotters madmax ... your configuration ... >~/plots.log 2>&1
```

Press `CTRL+D` to exit Screen session
_this `>~/plots.log 2>&1` outputs the plot log to a `plot.log` in your `home directory`_
