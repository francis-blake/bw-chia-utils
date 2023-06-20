const glob = require("glob");
const args = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const dotenv = require("dotenv");
var dateTime = require("node-datetime");
const os = require("os");
const https = require("https");
dotenv.config();
const api_host = process.env.API_HOST;
const login_uri = process.env.API_LOGIN_URI;
const plot_manager_update_uri = process.env.PLOT_MANAGER_UPDATE_URI;
let api_token = "";
let logged_in = 0;
const api_user = process.env.API_USER;
const api_password = process.env.API_PASSWORD;
const api_port = process.env.API_PORT;
const device_name = os.hostname();

let disks = [];
let pattern = "";
let minSize = 0;

// Mandatoy ARGS
if (!args["disks"]) {
  console.log("add disks arg --disks");
  return;
}

if (!args["pattern"]) {
  console.log("add pattern arg --pattern");
  return;
}

if (!args["min-size"]) {
  console.log("add min-size arg --min-size");
  return;
}

// ARGUMENTS
processArguments();

function processArguments() {
  args["disks"] ? (disks = args["disks"].split(",")) : (disks = []);

  args["pattern"]
    ? (pattern = args["pattern"].replace("#", "*"))
    : (pattern = "");

  args["min-size"] ? (minSize = args["min-size"]) : (minSize = 0);
}

analysePlots();

setInterval(function () {
  analysePlots();
}, 45000);

function analysePlots() {
  disks.forEach((d) => {
    processDisk(d);
  });
}

async function processDisk(d) {
  let files = await getFiles(d, "*.tmp");
  let allFiles = await getFiles(d, pattern);

  // console.log(d, files, files.length);
  if (files.length == 0) {
    let freeSpace;
    require("child_process").exec("df /media/joao/" + d, function (err, resp) {
      freeSpace = resp.split(" ")[28] * 1024;

      if (freeSpace < minSize) {
        if (allFiles.length > 0) {
          let pathOfFileToRemove = allFiles[0];
          try {
            fs.unlinkSync(pathOfFileToRemove);
            //   fs.unlinkSync("/media/joao/" + d + "/abc.tmp"); // for testing purposes
            console.error("Removed file " + pathOfFileToRemove);
          } catch (err) {
            console.error(err);
          }

          id = pathOfFileToRemove.split("/").pop().split(".")[0];
          // console.log(pathOfFileToRemove, id);

          var dt = dateTime.create();
          var deleted_date = dt.format("Y-m-d");
          removeFromServer({ id: id, deleted_date: deleted_date });
        } else {
          console.log("no more files with give pattern [" + pattern + "] in disk " + d);
        }
      }
    });
  }
}

async function getFiles(d, p) {
  return new Promise((resolve, reject) => {
    glob("/media/joao/" + d + "/plots/" + p, function (err, files) {
      if (err) {
        console.log(err);
      }

      resolve(files);
    });
  });
}

function removeFromServer(plot) {
  // start sending
  let sending = setInterval(function () {
    if (logged_in < 2) {
      postRequest(plot_manager_update_uri, JSON.stringify(plot)).then((d) => {
        let r = JSON.parse(d);
        if (r.success >= 0 || r.already >= 0) {
          // logIt(l.length, r);
          console.log("Deleted " + plot.id + " in Plot Manager");
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
