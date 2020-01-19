import fs from "fs";
import path from "path";
import log from "log-to-file";
import puppeteer from "puppeteer-core";
import { PuppeteerBlocker } from "@cliqz/adblocker-puppeteer";
import fetch from "cross-fetch";
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

const formatter = (...args) => args.map(n => String(n).padStart(2, "0"));
async function play(page, radio, year, month, day, n, duration, outputDir) {
  await page.goto(radio.entrypoint(year, month, day), {
    waitUntil: "networkidle2"
  });
  const programmes = await page.$$eval(radio.anchors, a => {
    return a.map(anchor => anchor.href);
  });
  const programme = programmes[Math.floor(Math.random() * programmes.length)];
  await page.goto(programme, { waitUntil: "networkidle2" });

  const clickBtn = async wait => {
    await timeout(wait);
    await page.$eval(radio.playbtn, button => {
      button.click();
    });
  };

  try {
    await clickBtn(500);
  } catch (error) {
    try {
      await clickBtn(1000);
    } catch (error) {
      try {
        await clickBtn(5000);
      } catch (error) {
        await clickBtn(8000);
      }
    }
  }

  const playAudio = async wait => {
    await timeout(wait);
    console.log("will try to find audio now...");
    const startTime = await page.$eval(
      "audio",
      async audio =>
        await new Promise((resolve, reject) => {
          console.log("audio found!");
          function setup() {
            const startTime = Math.random() * audio.duration;
            audio.currentTime = startTime;
            resolve(startTime);
          }
          try {
            setup();
          } catch (error) {
            audio.addEventListener("loadeddata", setup, false);
            console.log(error);
            console.log("trying to listen to loadeddata after error.");
          }
          setTimeout(10000, reject);
        })
    );
    return startTime;
  };

  let startTime;
  try {
    startTime = await playAudio(500);
  } catch (error) {
    try {
      startTime = await playAudio(1000);
    } catch (error) {
      startTime = await playAudio(9000);
    }
  }

  const [YYYY, MM, DD] = formatter(year, month, day);
  // Recording 20sec of audio
  const file = fs.createWriteStream(
    path.join(outputDir, `./${YYYY}_${MM}_${DD}_${n}.wav`),
    {
      encoding: "binary"
    }
  );
  recorder
    .start()
    .stream()
    .pipe(file);
  await timeout(duration);
  recorder.stop();

  // Log a successful record
  log(
    `${YYYY}_${MM}_${DD}_${n}.wav; ${radio.name}; ${programme}; ${startTime}`,
    path.join(outputDir, "records.log")
  );
}

async function playloop(records, executablePath, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const args = [
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36"'
  ];

  for (const record of records) {
    const { year, month, day, n, duration, radio } = record;
    for (let index = 0; index < n; index++) {
      const browser = await puppeteer.launch({
        args,
        headless: false,
        defaultViewport: null,
        executablePath
      });
      const page = await browser.newPage();
      const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
      await blocker.enableBlockingInPage(page);
      await play(
        page,
        radio,
        year,
        month,
        day,
        index,
        duration,
        outputDir
      ).catch(err => {
        console.error(err);
        console.log("Retrying...", radio, month, day, index);
        index--;
      });
      await browser.close();
    }
  }
}

export default playloop;
