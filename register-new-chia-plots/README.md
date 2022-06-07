## Register New Chia Plots

This is a nodejs script that automatically reads your plotting log and register in a database your plots while they are being created. It creates a `JSON` object that is then `POST` to an API endpoint.

NOTES:

- This project does not include the API or the database.
- Only chia madmax output log is accepted
- Only wrote to unix based systems
- Only tested in ubuntu server

All you have to do is to redirect the plot output to a so called `plot.log` in your `home directory`.

This scripts reads the log created by `madmax` (not work with `bladebit`) and register the phases times, plot id, and all relevant information. During the process it makes api calls to post progress update. In the end it tests the `plot` retrieving the rate and sending the final json object of the plot to an API endpoint.

### Install

1. Clone this repository

2. Copy `temporary-devices-sample.json` to a new file `temporary-devices.json` and adjust it with path and name of all your used `tmp disks`

3. Fill your `.env` file based on `.env-sample`

4. Open a session using screen to leave this script running in background:

--type: NFT or OG

--harvester: The name as you know the harvester where final destination is

--disk: The name as you know the final destination disk

--notes: (optional) In this field you can add what you want. The number of threads will appear automatically here after any other note.

```
screen -S register-new-chia-plots

cd /home/<username>/bw-chia-utils/register-new-chia-plots
./register-new-chia-plots.js --type="<type>" --harvester="<harvester-name>" --disk="<final-disk-name>" --notes="<optional-notes>"
```

Press `CTRL+A D` to exit Screen session
_To return type `screen -r` and if multiple screens are running a list will appear and you may `screen -r <process number>`_

5. Open another session with screen to start plot (if your session drops, session inside screen are kept alive):

```
screen -S plotting

cd /home/<username>/chia-blockchain
. ./activate
chia plotters madmax ... your configuration ... >~/plots.log 2>&1
```

Press `CTRL+A D` to exit Screen session
_To return type `screen -r` and if multiple screens are running a list will appear and you may `screen -r <process number>`_

_this `>~/plots.log 2>&1` outputs the plot log to a `plot.log` in your `home directory`_

## In conclusion

When a plot is finished and placed in its final directory and API endpoint is called an `JSON` like this will be sent:

```json
{
  "id": "plot-k32-2022-02-07-13-54-fakef6quopm1oa6bye6f7ry9l25ws3ewcbxobkhrfu4jyc3ywyt1r9ntb5fm5e9q",
  "plot_creation_times": {
    "machine": "plotter",
    "tmp": "WD NVMe 1TB",
    "phase1": 1540.46,
    "phase2": 595.221,
    "phase3": 1106.36,
    "phase4": 105.72,
    "total_time": 3347,
    "copy_time": 207
  },
  "harvester": "Harvester 2",
  "disk": "Disk 17",
  "plot_type": "NFT",
  "notes": "-r 24 MM",
  "plot_size": "k32",
  "plotted_at": "2022-02-07 13:54",
  "plotting_progress": 1,
  "file_size": 108785969625,
  "rate": 1.3333
}
```
