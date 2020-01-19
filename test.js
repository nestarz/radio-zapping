import fs from "fs";
import AudioRecorder from "node-audiorecorder";

const recorder = new AudioRecorder(
  {
    program: process.platform === "win32" ? "sox" : "rec",
    silence: 0
  },
  console
);

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function play() {
  const file = fs.createWriteStream(`test.wav`, {
    encoding: "binary"
  });
  recorder
    .start()
    .stream()
    .pipe(file);
  timeout(1000).then(recorder.stop);
}

play();
