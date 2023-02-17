#! /usr/bin/env node

const args = require("minimist")(process.argv.slice(2));
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const qfgets = require("qfgets");
const https = require("https");
const fs = require("fs");
const readline = require("readline");
const { exec } = require("child_process");
const api_host = process.env.API_HOST;
const login_uri = process.env.API_LOGIN_URI;
const disk_info_uri = process.env.API_DISKS_URI;
let api_token = "";
let logged_in = 0;
const api_user = process.env.API_USER;
const api_password = process.env.API_PASSWORD;
const api_port = process.env.API_PORT;
const home_folder = process.env.HOME_FOLDER;
const this_folder = process.env.THIS_FOLDER;
const disk_data_folder = process.env.DISK_DATA_FOLDER;
const device_name = os.hostname();

let folders = [];
let devices = [];
let total_devices = 0;
let processed_devices = 0;
let df_json = {};

if (fs.existsSync(disk_data_folder + "/../df.json")) {
  df_json = require(disk_data_folder + "/../df.json");
}

check_plots_folders();

function check_plots_folders() {
  exec(
    "cd " +
      home_folder +
      "/chia-blockchain; . ./activate; chia plots show > " +
      this_folder +
      "/logs/output_check_plots_folders.log 2>&1; deactivate;",
    (err, stdout, stderr) => {
      if (err) {
        let log = fs.createWriteStream("logs/check_plots_folders_errors.log", {
          flags: "a",
        });
        log.write("Not Found\n");
        // node couldn't execute the command
        return;
      }

      getDiskSmartData(
        "logs/output_check_plots_folders.log",
        "/",
        processDevices
      );
    }
  );
}

function getDiskSmartData(filename, regexp, done) {
  var lineReader = require("readline").createInterface({
    input: require("fs").createReadStream(filename),
  });

  let i = 0;
  lineReader
    .on("line", function (line) {
      processLine(line, regexp);
      if (line.startsWith("/")) {
        i++;
      }
    })
    .on("close", function (line) {
      total_devices = i;
    });
}

function processLine(line, regexp) {
  if (line && line.match(regexp)) {
    exec("df -h " + line, async (err, stdout, stderr) => {
      if (stdout) {
        let devLine = stdout.split("\n")[1];
        let parts = devLine.split(" ");
        let label = parts.pop().split("/").pop();
        if (!label) label = "system";
        let data = await getDeviceData(parts[0], label);
      }
    });
  }
}

function grepFoldersWithFs(filename, regexp, done) {
  fp = new qfgets(filename, "r");
  function loop() {
    for (i = 0; i < 40; i++) {
      line = fp.fgets();
      // if (line && line.match(regexp)) folder = line;
      if (line && line.match(regexp)) {
        // folders.push(line);
        exec("df -h " + line, async (err, stdout, stderr) => {
          if (stdout) {
            let devLine = stdout.split("\n")[1];
            let parts = devLine.split(" ");
            let data = await getDeviceData(parts[0]);
          }
          if (err) {
            let log = fs.createWriteStream("logs/check_devices_errors.log", {
              flags: "a",
            });
            log.write("Not Found\n");
            // node couldn't execute the command
            return;
          }
        });
      }
    }
    if (!fp.feof()) setImmediate(loop);
    else done();
  }
  loop();
}

function processDevices() {
  // nao apagar
}

async function getDeviceData(d, m) {
  let p = d.split("/");
  let disk;
  let device;
  if (p[2].startsWith("sd")) {
    disk = p[2].substring(0, p[2].length - 1);
  } else if (p[2].startsWith("nvme")) {
    disk = p[2].substring(0, 5);
  }

  try {
    if (fs.existsSync(disk_data_folder + "/" + disk + ".json")) {
      let jsonData = require(disk_data_folder + "/" + disk + ".json");

      let sl;
      if (m == "system") {
        sl = "";
      } else {
        sl = m;
      }
      let dfInfo = df_json.find((item) => item.label === sl);
      if (IsJsonString(jsonData)) {
        device = {
          harvester: os.hostname(),
          name: jsonData.device.name,
          label: m,
          protocol: jsonData.device.protocol,
          model_name: jsonData.model_name,
          temperature: jsonData.temperature.current,
          power_on_time: jsonData.power_on_time.hours,
          rotation_rate: jsonData.rotation_rate,
          user_capacity: jsonData.user_capacity.bytes,
          model_family: jsonData.model_family,
          pct_used: parseFloat(dfInfo.pct.replace("%", "")) / 100,
          all_info: jsonData,
        };

        if (jsonData.device.protocol === "SCSI") {
          device = await getSCSIdata(disk, device);
        }

        devices.push(device);
        // console.log(device);
      } else {
        console.log("no json");
      }
    }
  } catch (err) {
    console.error("no file");
  }

  processed_devices++;

  //   console.log(d, m, processed_devices, total_devices);
  if (processed_devices === total_devices) {
    let body = JSON.stringify(devices);
    sendInfo(body);
  }
}

function IsJsonString(str) {
  try {
    return typeof str === "object";
  } catch (e) {
    return false;
  }
}

async function getSCSIdata(disk, dev) {
  if (fs.existsSync(disk_data_folder + "/" + disk + ".txt")) {
    return processLineByLine(dev, disk_data_folder + "/" + disk + ".txt");
  } else {
    return dev;
  }
}

async function processLineByLine(d, f) {
  const fileStream = fs.createReadStream(f);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    if (line.startsWith("Accumulated start-stop")) {
      d.power_cycle_count = parseInt(line.split(" ").pop());
    }
    if (line.startsWith("Accumulated load-unload")) {
      d.head_load_events = parseInt(line.split(" ").pop());
    }
    if (line.startsWith("Elements in grown defect list")) {
      d.reallocated_sectors = parseInt(line.split(" ").pop());
    }
    if (line.startsWith("Logical block size:")) {
      d.logical_block_size = parseInt(line.split(" ")[5]);
    }
    if (line.startsWith("read:")) {
      d.bytes_read = parseInt(
        line.replace(/\s\s+/g, " ").split(" ")[6] * 1000 * 1000 * 1000
      );
    }
    if (line.startsWith("write:")) {
      d.bytes_written = parseInt(
        line.replace(/\s\s+/g, " ").split(" ")[6] * 1000 * 1000 * 1000
      );
    }
  }

  return d;
}

function sendInfo(b) {
  // start sending
  let sending = setInterval(function () {
    if (logged_in < 2) {
      postRequest(disk_info_uri, b).then((d) => {
        let r = JSON.parse(d);
        if (r.success >= 0 || r.already >= 0) {
          logIt(r);
          clearInterval(sending);
          logged_in = 0;
        }
      });
    } else {
      clearInterval(sending);
    }
  }, 2500);
}

function login() {
  if (login.pending) return login.pending;
  const data = JSON.stringify({
    email: api_user,
    password: api_password,
    device_name: device_name,
  });

  login.pending = postRequest(login_uri, data).then((d) => {
    api_token = JSON.parse(d);
    logged_in = 1;
    delete login.pending;
  });
}

function postRequest(uri, body) {
  const options = {
    hostname: api_host,
    port: api_port,
    path: uri,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Authorization: "Bearer " + api_token,
    },
    method: "POST",
  };

  var resolve, reject, data;
  var promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  const req = https.request(options, (res) => {
    res.on("data", (d) => {
      data = d;
      logged_in = 2;
    });

    res.on("end", () => {
      if (res.statusCode == 401) {
        login();
      }
      resolve(data);
    });
  });
  //handling error
  req.on("error", (e) => {
    reject("problem with request: " + e.message);
  });

  req.write(body);
  req.end();

  return promise;
}

function logIt(result) {
  let log = fs.createWriteStream("logs/updated_disks.log", {
    flags: "a",
  });

  const ts = new Date().toISOString();
  log.write(ts);
  log.write("  >  ");
  log.write(result.success + " updated devices\n");
}
