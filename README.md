## CHIA (XCH) Utils

### disk-info

Includes a bash script to be run as a system service to log the result in json of `smartctl` from smartmontools from all connected disks to the server/pc.
A second service to be run as a system service but on behalf of your user reads the logs created choosing only those related to `chia` containing `plots` and gathering all disks information in an array.

The result is a JSON object that is then sent by POST'ing to a configured `API endpoint`.
Services templates are also included.

### register-new-chia-plots

Not all people register their plots in a database or excel, but I do that. It's easier to debug or check for a given plot, or chose a plot by file size to drop in a small leftover space in a disk... anything.

That can be exhausting if done manually but using this script all I have to do is plot and a watching new plots automatically registered in a database or in my case in a front-end interface.

This script is called with 3 parameters (harvester name, disk name, and notes) to join to the rest of the gathered information. It reads the plotting `stdout` of the plotting process (only for `madmax`) and registers ID, tmp device, plot time, phases time, copy time, file size and in the end it uses `chia plots check` to register also the plot rate.
During the process an API endpoint is called to give progress % of plot creation, and in the end the `JSON` object of the plot is sent in a `POST` to another endpoint.

In my case I use the progress to update a front-end interface with a progress-bar.

Only tested in ubuntu server, only reads madmax logs.

### start-chia

A simple bash script to start chia after a reeboot. Includes system service files to configure to suit your needs.

### start-chiadog

Like start chia this one is also a simple bash script to start chiadog after a reeboot. Includes system service files to configure to suit your needs.

### utils

Some unix commands to help in the chia farming process.
