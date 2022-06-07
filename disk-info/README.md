## Chia disks information

Includes a bash script to be run as a system service to log the result in json of `smartctl` from smartmontools from all connected disks to the server/pc.
A second service to be run as a system service but on behalf of your user reads the logs created choosing only those related to `chia` containing `plots` and gathering all disks information in an array.

The result is a JSON object that is then sent by POST'ing to a configured `API endpoint`.
Services templates are also included.
