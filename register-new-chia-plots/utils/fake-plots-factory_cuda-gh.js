#! /usr/bin/env node
const fs = require("fs");
const args = require("minimist")(process.argv.slice(2));
const dotenv = require("dotenv");
const readline = require("readline");

dotenv.config();
const plot_log_folder = process.env.PLOT_LOG_FOLDER;

let fileToProcess = plot_log_folder + "/plots.log";
let i;

// ARGUMENTS
processArguments();

function processArguments() {
  args["file"]
    ? (fileToProcess = args["file"])
    : (fileToProcess = plot_log_folder + "/plots.log");
}

async function processLineByLine() {
  const fileStream = fs.createReadStream(fileToProcess);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    // log.write(element) + "\n";
    fs.appendFile(plot_log_folder + "/plots.log", `${line}\n`, function () { });
    // console.log(`Line from file: ${line}`);
    await sleep(800);
  }
}

processLineByLine();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
