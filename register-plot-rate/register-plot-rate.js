#! /usr/bin/env node
Tail = require("tail").Tail;
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const https = require("https");
// const qfgets = require("qfgets");
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

let tempList = [];

let plotList = require("./plot-list.json");

plotList.forEach((p) => {
  if (tempList.length > 10) {
    sendToServer();
  }

  getPlotRate(p).then((r) => {
    console.log(0, r);
  });
  tempList.push(p);
});

function sendToServer() {
  console.log(tempList);
}

function getPlotRate(p) {
  exec(
    "mmchia " +
      " plots check -g " +
      p.id +
      " > logs/retrieving_proofs.log 2>&1",
    (err, stdout, stderr) => {
      if (err) {
        let log = fs.createWriteStream("logs/plots_resumo_errors.log", {
          flags: "a",
        });
        log.write(" could not get proofs of " + plotToSend.id + "\n");
        // node couldn't execute the command
        return;
      }

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

function processRate() {
  if (proofsRate) {
    let rate = parseInt(proofsRate.split(" ")[17]) / 30;
    rate = Math.round(rate * 10000) / 10000;
    plotToSend.rate = rate;
    console.log("last plot rate: ", plotToSend.rate);

    return rate;
  }
}
