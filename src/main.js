import fs from "fs";
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

const radios = {
  franceculture: {
    entrypoint: (MM, DD) =>
      `https://www.franceculture.fr/archives/2019/${MM}/${DD}`,
    anchors: ".archives-by-day-list-element a",
    playbtn: "button.replay-button"
  },
  franceinter: {
    entrypoint: (MM, DD) =>
      `https://www.franceinter.fr/archives/2019/${MM}-${DD}`,
    anchors: ".simple-list-element a",
    playbtn:
      ".cover-emission-actions-buttons-wrapper button.replay-button.playable"
  },
  francemusique: {
    entrypoint: (MM, DD) =>
      `https://www.francemusique.fr/programmes/2019-${MM}-${DD}`,
    anchors: "a.step-list-element-content-editorial",
    playbtn: ".cover-diffusion button.replay-button.playable"
  }
};

const formatter = (...args) => args.map(n => String(n).padStart(2, "0"));

async function play(page, name, month, day, INDEX) {
  const [MM, DD] = formatter(month, day);
  const radio = radios[name];
  await page.goto(radio.entrypoint(MM, DD), { waitUntil: "networkidle2" });
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

  // Recording 20sec of audio
  const file = fs.createWriteStream(`2019_${MM}_${DD}_${INDEX}.wav`, {
    encoding: "binary"
  });
  recorder
    .start()
    .stream()
    .pipe(file);
  await timeout(20000 + Math.random() * 5000);
  recorder.stop();

  // Log a successful record
  log(`2019_${MM}_${DD}_${INDEX}.wav; ${name}; ${programme}; ${startTime}`);
}

async function playloop() {
  const args = [
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36"'
  ];

  for (let index = 15; index < 29; index++) {
    for (let index2 = 0; index2 < 3; index2++) {
      const browser = await puppeteer.launch({
        args,
        headless: false,
        defaultViewport: null,
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      });
      const page = await browser.newPage();
      const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
      await blocker.enableBlockingInPage(page);
      const radio = Object.keys(radios)[
        Math.floor(Math.random() * Object.keys(radios).length)
      ];
      console.log(radio);
      await play(page, radio, 8, index, index2).catch(err => {
        console.log(err);
        index2--;
      });
      await browser.close();
    }
  }
}

playloop();
