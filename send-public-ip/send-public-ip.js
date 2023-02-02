#! /usr/bin/env node

const querystring = require("querystring");
const os = require("os");
const { Curl } = require("node-libcurl");

const dotenv = require("dotenv");
dotenv.config();
const https = require("https");
const api_host = process.env.API_HOST;
const login_uri = process.env.API_LOGIN_URI;
const api_info_uri = process.env.API_INFO_URI;
let api_token = "";
let logged_in = 0;
const api_user = process.env.API_USER;
const api_password = process.env.API_PASSWORD;
const api_port = process.env.API_PORT;
const device_name = os.hostname();

let ip_address;

const cc = new Curl();
const terminate = cc.close.bind(cc);

cc.setOpt(Curl.option.URL, "https://ipinfo.io/ip");

cc.on("end", function (statusCode, data, headers) {
  ip_address = data;
  sendIP();

  this.close();
});

cc.on("error", terminate);

cc.perform();

function sendIP() {
  const data = JSON.stringify({
    key: "public_ip",
    value: ip_address,
  });
  // start sending
  let sending = setInterval(function () {
    if (logged_in < 2) {
      postRequest(api_info_uri, data).then((d) => {
        let r = JSON.parse(d);
        if (r == 1) {
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
  let log = fs.createWriteStream("logs/sent_ip_data.log", {
    flags: "a",
  });

  const ts = new Date().toISOString();
  log.write(ts);
  log.write("  >  ");
  log.write(result.success + " updated IP.\n");
}
