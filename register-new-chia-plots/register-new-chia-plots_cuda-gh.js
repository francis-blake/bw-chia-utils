#! /usr/bin/env node
Tail = require("tail").Tail;
const args = require("minimist")(process.argv.slice(2));
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const https = require("https");
const qfgets = require("qfgets");
const { exec } = require("child_process");
const api_host = process.env.API_HOST;
const login_uri = process.env.API_LOGIN_URI;
const plot_manager_uri = process.env.PLOT_MANAGER_URI;
const plot_manager_update_uri = process.env.PLOT_MANAGER_UPDATE_URI;
let api_token = "";
let logged_in = 0;
const api_user = process.env.API_USER;
const api_password = process.env.API_PASSWORD;
const api_port = process.env.API_PORT;
const plot_log_folder = process.env.PLOT_LOG_FOLDER;
const home_folder = process.env.HOME_FOLDER;
const chia_bin = process.env.CHIA_BIN;
const device_name = os.hostname();

let newPlot = {};
let notes;
let proofsRate;
let filesize;
let plotToSend;
let plotToSendPath;
let finalDirectory;
let tempDirectory;
let moveDelayed = 0;

setNewPlot();

// SETUP ALL Temporary Drives
const tmpDrives = require("./temporary-devices.json");

// Mandatoy ARGS
if (!args["harvester"]) {
  console.log("add harvester arg --harvester");
  return;
}
// if (!args["disk"]) {
//   console.log("add disk arg --disk");
//   return;
// }
if (!args["type"]) {
  console.log("add type arg --type");
  return;
}
if (!args["final-path"] && args["move-delayed"]) {
  console.log("add final path arg --final-path");
  return;
}

// ARGUMENTS
processArguments();

function processArguments() {
  device_name
    ? (newPlot.plot_creation_times.machine = device_name)
    : (newPlot.plot_creation_times.machine = "");
  args["harvester"]
    ? (newPlot.harvester = args["harvester"])
    : (newPlot.harvester = "");
  //   args["disk"] ? (newPlot.disk = args["disk"]) : (newPlot.disk = "");
  args["notes"] ? (notes = args["notes"]) : (notes = "");
  args["type"] ? (newPlot.plot_type = args["type"]) : (newPlot.plot_type = "");
  args["move-delayed"]
    ? (moveDelayed = args["move-delayed"])
    : (moveDelayed = 0);
  args["final-path"]
    ? (finalDirectory = args["final-path"])
    : (finalDirectory = "");
}

// START READING LOG
if (moveDelayed > 0) {
  console.log(
    "Finished plots will be moved with " +
      moveDelayed +
      "s delay to " +
      finalDirectory
  );
}
console.log(
  "Listening to " +
    plot_log_folder +
    "/plots.log and waiting for plotter to start logging..."
);
tail = new Tail(plot_log_folder + "/plots.log");

tail.on("line", function (data) {
  parseData(data);
});

// parseData("Phase 1 took 1315.98 sec");
function parseData(d) {
  if (d.startsWith("Plot Format:")) {
    newPlot.plotter = d.split(" ").pop();
  }

  if (d.startsWith("Number of Threads:")) {
    newPlot.notes = "-r " + d.split(" ").pop();
  }

  if (d.startsWith("No. Streams")) {
    newPlot.notes = "-S " + d.split(" ").pop();
  }

  if (d.startsWith("Working Directory:")) {
    const path = d.split(" ").pop();
    tempDirectory = path;
    const tmpName = tmpDrives.filter((obj) => {
      return obj.path === path;
    });
    newPlot.plot_creation_times.tmp = tmpName[0].name;
  }

  if (d.startsWith("Working Directory 2:")) {
    const path = d.split(" ").pop();
    const tmpName = tmpDrives.filter((obj) => {
      return obj.path === path;
    });
    if (tmpName[0].name !== newPlot.plot_creation_times.tmp) {
      newPlot.plot_creation_times.tmp += " / " + tmpName[0].name;
    }
  }

  if (d.startsWith("Plot Name:")) {
    const t = d.split(" ");
    const pid = t.pop();
    newPlot.id = pid;
    const pid_arr = pid.split("-");
    newPlot.plot_size = pid_arr[1];
    newPlot.plotted_at =
      pid_arr[3] +
      "-" +
      pid_arr[4] +
      "-" +
      pid_arr[5] +
      " " +
      pid_arr[6] +
      ":" +
      pid_arr[7];
    newPlot.plot_compression = pid_arr[2];

    console.log("id: ", newPlot.id);
    console.log("plot_size: ", newPlot.plot_size);
    console.log("compression: ", newPlot.plot_compression);
    console.log("plotted_at: ", newPlot.plotted_at);
  }

  if (d.startsWith("Phase 1 took")) {
    newPlot.plot_creation_times.phase1 = parseFloat(d.split(" ")[3]);

    console.log("phase 1 took: ", newPlot.plot_creation_times.phase1);
  }

  if (d.startsWith("Progress update:")) {
    const t = d.split(" ");
    const update = t.pop();

    // updatePlottingProgress(newPlot, update); ###
  }

  if (d.startsWith("Phase 2 took")) {
    newPlot.plot_creation_times.phase2 = parseFloat(d.split(" ")[3]);

    console.log("phase 2 took: ", newPlot.plot_creation_times.phase2);
  }

  if (d.startsWith("Phase 3 took")) {
    newPlot.plot_creation_times.phase3 = parseFloat(d.split(" ")[3]);

    console.log("phase 3 took: ", newPlot.plot_creation_times.phase3);
  }

  if (d.startsWith("Phase 4 took")) {
    let t = d.split(" ");
    newPlot.plot_creation_times.phase4 = parseFloat(t[3]);
    newPlot.file_size = parseInt(t[9]);

    console.log("phase 4 took: ", newPlot.plot_creation_times.phase4);
    console.log("file_size: ", newPlot.file_size);
  }

  if (d.startsWith("Total plot creation time")) {
    let t = d.split(" ");
    newPlot.plot_creation_times.total_time = parseInt(t[5]);

    // updatePlottingProgress(newPlot, 1);

    console.log("total_time: ", newPlot.plot_creation_times.total_time);

    // newPlot.plot_creation_times.copy_time = 0;
    newPlot.notes += " " + notes;

    // console.log("copy_time: ", newPlot.plot_creation_times.copy_time);
    console.log("notes: ", newPlot.notes);

    plotToSend = newPlot;
    // console.log(newPlot);
    setNewPlot();
  }

  // OR IS RENAMED BECAUSE TMP AND FINAL DIR ARE THE SAME
  if (d.startsWith("Started copy")) {
    let destPath = d.split(" ")[3];
    plotToSendPath = destPath;
    console.log("A: passou aqui");

    getPlotRate();
  }
}

function getDisk(path, id) {
  console.log("B: ", path, "plots/" + id);
  let newpath = path.replace("plots/" + id + ".plot", "");
  console.log("new: " + newpath);
  const destName = tmpDrives.filter((obj) => {
    return obj.path === newpath;
  });

  return destName[0].name;
}

function setNewPlot() {
  newPlot = {};
  newPlot.plot_creation_times = {};
  processArguments();
}

function getPlotRate() {
  //   plotToSend = p;
  console.log("a > ", plotToSend.id, tempDirectory);
  exec(
    "cd " +
      home_folder +
      "/bw-chia-utils/register-new-chia-plots; " +
      chia_bin +
      " plots check -g " +
      plotToSend.id +
      " > logs/retrieving_proofs.log 2>&1; ls -l " +
      tempDirectory +
      plotToSend.id +
      '.plot | cut -d " " -f5 > logs/retrieving_size.log 2>&1;',
    (err, stdout, stderr) => {
      if (err) {
        let log = fs.createWriteStream("logs/plots_resumo_errors.log", {
          flags: "a",
        });
        log.write(" could not get proofs of " + plotToSend.id + "\n");
        sendPlot(plotToSend);
        // node couldn't execute the command
        return;
      }

      grepWithFsSize("logs/retrieving_size.log", processSize);
      grepWithFs("logs/retrieving_proofs.log", "Proofs ", processRate);
    }
  );
}

function grepWithFs(filename, regexp, done) {
  fp = new qfgets(filename, "r");
  function loop() {
    for (i = 0; i < 40; i++) {
      line = fp.fgets();
      if (line && line.match(regexp)) proofsRate = line;
    }
    if (!fp.feof()) setImmediate(loop);
    else done();
  }
  loop();
}

function grepWithFsSize(filename, done) {
  fp2 = new qfgets(filename, "r");
  function loop() {
    for (i = 0; i < 40; i++) {
      line = fp2.fgets();
      if (line) filesize = line;
    }
    if (!fp2.feof()) setImmediate(loop);
    else done();
  }
  loop();
}

function processRate() {
  if (proofsRate) {
    let rate = parseInt(proofsRate.split(" ")[17]) / 30;
    rate = Math.round(rate * 10000) / 10000;
    plotToSend.rate = rate;
    console.log("last plot rate: ", plotToSend.rate);
  }

  plotToSend.disk = getDisk(plotToSendPath, plotToSend.id);
  console.log("aqui");
  sendPlot(plotToSend);
}

function processSize() {
  if (filesize) {
    let f_size = parseInt(filesize.split(" ")[0]);
    plotToSend.file_size = filesize;
    console.log("last plot size: ", plotToSend.file_size);
  }
}

function sendPlot(p) {
  // clears
  proofsRate = "";
  filesize = "";
  plotToSend = {};

  console.log(p);

  // start sending
  //   let sending = setInterval(function () {
  //     if (logged_in < 2) {
  //       postRequest(plot_manager_uri, JSON.stringify(p)).then((d) => {
  //         let r = JSON.parse(d);
  //         if (r.success >= 0 || r.already >= 0) {
  //           logIt(p, r);
  //           clearInterval(sending);
  //           logged_in = 0;
  //         }
  //       });
  //     } else {
  //       clearInterval(sending);
  //     }
  //   }, 2500);
}

function updatePlottingProgress(p, progress) {
  // clears
  p.plotting_progress = progress;
  proofsRate = "";

  // start sending
  let sending = setInterval(function () {
    if (logged_in < 2) {
      postRequest(plot_manager_update_uri, JSON.stringify(p)).then((d) => {
        let r = JSON.parse(d);
        if (r.success >= 0 || r.already >= 0) {
          // logIt(p, r);
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

function logIt(plot, result) {
  let log = fs.createWriteStream("./logs/processed_plots.log", {
    flags: "a",
  });
  log.write(JSON.stringify(plot));
  log.write(",\n");

  let log2 = fs.createWriteStream("./logs/processed_plots_status.log", {
    flags: "a",
  });

  const ts = new Date().toISOString();
  log2.write(ts);
  log2.write(" > ");
  log2.write(
    result.success +
      " plot successfully added / " +
      result.already +
      " plot already exists" +
      " - " +
      plot.id +
      "\n"
  );

  console.log(
    "DB insert " +
      plot.id +
      " >> success: " +
      result.success +
      " already there: " +
      result.already
  );
}

function moveToFinalDisk(id, time) {
  exec(
    "sleep " +
      time +
      "; rsync -avP --remove-source-files " +
      tempDirectory +
      "plots/*.plot " +
      finalDirectory,
    (err, stdout, stderr) => {
      if (err) {
        let log = fs.createWriteStream("logs/plots_moving_errors.log", {
          flags: "a",
        });
        log.write(" could not move plot " + id + "\n");

        // node couldn't execute the command
        return;
      }

      console.log("Successfuly moved plot " + id);
    }
  );
}
