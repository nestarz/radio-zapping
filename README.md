# Radio Zapping

## Requirements
- Chromium
- https://github.com/RedKenrok/node-audiorecorder#dependencies

## Installation

```
yarn install
```

## Usage

```javascript
import path from "path";
import radioZapping from "./main.js";

const f00 = (...args) => args.map(n => String(n).padStart(2, "0"));

const radios = [
  {
    name: "franceculture",
    entrypoint: (year, month, day) =>
      `https://www.franceculture.fr/archives/${year}/${f00(month)}/${f00(day)}`,
    anchors: ".archives-by-day-list-element a",
    playbtn: "button.replay-button"
  },
  {
    name: "franceinter",
    entrypoint: (year, month, day) =>
      `https://www.franceinter.fr/archives/${year}/${f00(month)}-${f00(day)}`,
    anchors: ".simple-list-element a",
    playbtn:
      ".cover-emission-actions-buttons-wrapper button.replay-button.playable"
  },
  {
    name: "francemusique",
    entrypoint: (year, month, day) =>
      `https://www.francemusique.fr/programmes/${year}-${f00(month)}-${f00(day)}`,
    anchors: "a.step-list-element-content-editorial",
    playbtn: ".cover-diffusion button.replay-button.playable"
  }
];

const randomArr = arr =>
  arr[Math.floor(Math.random() * Object.keys(arr).length)];

radioZapping(
  [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29].map(day => ({
    year: 2019,
    month: 8,
    day,
    n: 3,
    duration: 20 * 1000 + 5000 * Math.random(),
    radio: randomArr(radios)
  })),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(__dirname, "output2")
);
```
