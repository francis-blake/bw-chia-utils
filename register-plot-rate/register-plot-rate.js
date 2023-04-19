#! /usr/bin/env node
Tail = require("tail").Tail;
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const https = require("https");
const qfgets = require("qfgets");
const { exec } = require("child_process");
const api_host = process.env.API_HOST;
const login_uri = process.env.API_LOGIN_URI;
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

let tempList = [];
let proofsRate;

let plotList = require("./plot-list.json");
const totalPlotList = plotList.length;
let processed = 0;

sendAllPlots();

async function sendAllPlots() {
  for (const pl of plotList) {
    let rate = await getPlotRate(pl);
    let newP = {
      id: pl,
      rate: rate,
    };
    processPlot(newP);
    return;
  }
}

function processPlot(p) {
  console.log("adding to temporary list:", p);
  tempList.push(p);
  const index = plotList.indexOf(p.id);
  const x = plotList.splice(index, 1);

  processTempList();
  processed++;
}

function processTempList() {
  if (tempList.length > 9 || totalPlotList == processed + 1) {
    const listToSend = tempList;
    tempList = [];

    console.log("Sending to server:", listToSend);
    sendToServer(listToSend);
  }
}

async function getPlotRate(p) {
  return new Promise((resolve, reject) => {
    exec(
      "cd " +
        home_folder +
        "/bw-chia-utils/register-plot-rate; " +
        chia_bin +
        " plots check -g " +
        p,
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          let log = fs.createWriteStream("logs/plots_resumo_errors.log", {
            flags: "a",
          });
          log.write(" could not get proofs of " + actualPlot.id + "\n");
          // node couldn't execute the command
          // actualPlot.rate = null;
          return;
        }
        resolve(processResult(stderr));
      }
    );
  });
}

var processResult = function (stdout) {
  let rate;
  var lines = stdout.toString().split("\n");
  var results = new Array();
  lines.forEach(function (line) {
    if (line && line.match("Proofs")) {
      rate = parseInt(line.split(" ")[17]) / 30;
      rate = Math.round(rate * 10000) / 10000;
    }
  });

  return rate;
};

function sendToServer(l) {
  // start sending
  let sending = setInterval(function () {
    if (logged_in < 2) {
      postRequest(plot_manager_update_uri, JSON.stringify(l)).then((d) => {
        let r = JSON.parse(d);
        if (r.success >= 0 || r.already >= 0) {
          // logIt(l.length, r);
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
