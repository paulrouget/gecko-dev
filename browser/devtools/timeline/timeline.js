/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {utils: Cu} = Components;
const promise = Cu.import("resource://gre/modules/Promise.jsm", {}).Promise;

let gToolbox, gTarget, gFront;
let gInfo;
let gTimeDelta;

function startupTimeline() {
  gInfo = document.querySelector("#info");
  gFront.on("markers", onMarkers);
  gFront.start();
  return promise.resolve();
}

function shutdownTimeline() {
  gFront.off("markers", onMarkers);
  gFront.stop();
  return promise.resolve();
}

let fullViewCanvas, fullViewCtx;

window.onload = function() {
  fullViewCanvas = document.querySelector("#fullview");
  fullViewCtx = fullViewCanvas.getContext("2d");
  drawFullView();
};

let gMarkers = [];
function onMarkers(markers) {
  if (markers.length == 0) {
    return;
  }
  if (!gTimeDelta) {
    gTimeDelta = markers[markers.length - 1].end - Date.now();
  }
  gMarkers = gMarkers.concat(markers);
}

let tMin, tMax, ratio;
function drawFullView() {
  window.requestAnimationFrame(drawFullView);
  if (!gTimeDelta) {
    return;
  }

  tMax = Date.now() + gTimeDelta;

  if (!tMin) {
    tMin = gMarkers.reduce(function(p,m) {
      return m.start < p ? m.start : p;
    }, Number.MAX_VALUE);
  }

  let w = window.innerWidth;
  if (w != fullViewCanvas.width) {
    fullViewCanvas.width = w;
    ratio = (tMax - tMin) / w;
  }

  ratio = (tMax - tMin) / fullViewCanvas.width;

  gInfo.setAttribute("value", "time: " + Math.round(tMax / 1000) + "s. Events: " + gMarkers.length);

  fullViewCtx.clearRect(0,0,fullViewCanvas.width,fullViewCanvas.height);

  let restyles = collapse(gMarkers.filter(m => m.name == "Styles"));

  fullViewCtx.fillStyle = "#D31996"; // Purple
  fullViewCtx.strokeStyle = "#BD1687";
  fullViewCtx.beginPath();
  for (let m of restyles) {
    drawMarkerInFullView(m, 1);
  }
  fullViewCtx.fill();
  fullViewCtx.stroke();

  let reflows = collapse(gMarkers.filter(m => m.name == "Reflow"));

  fullViewCtx.fillStyle = "#19DD89"; // Green
  fullViewCtx.strokeStyle = "#16C67B";
  fullViewCtx.beginPath();
  for (let m of reflows) {
    drawMarkerInFullView(m, 13);
  }
  fullViewCtx.fill();
  fullViewCtx.stroke();

  let paint = collapse(gMarkers.filter(m => m.name == "DisplayList"));

  fullViewCtx.fillStyle = "#E7F78B"; // Yellow
  fullViewCtx.strokeStyle = "#CFDE7D";
  fullViewCtx.beginPath();
  for (let m of paint) {
    drawMarkerInFullView(m, 25);
  }
  fullViewCtx.fill();
  fullViewCtx.stroke();
}

let MIN_WIDTH = 4;

function drawMarkerInFullView(m, y) {
  let delta = m.end - m.start;
  let x = (m.start - tMin) / ratio;
  let width = delta / ratio;
  width = Math.max(width, MIN_WIDTH);
  fullViewCtx.rect(x, y, width, 10);
}

function collapse(markers) {
  return markers.reduce(function(collapsed, marker) {
    if (collapsed.length == 0) {
      return [marker];
    }
    let lastElt = collapsed[collapsed.length - 1];
    let delta = lastElt.end - lastElt.start;
    let width = delta / ratio;
    width = Math.max(width, MIN_WIDTH);
    width *= ratio;
    let d = marker.start - (lastElt.start + width);
    if (d < ratio * MIN_WIDTH) {
      lastElt.end = marker.end;
    } else {
      collapsed.push(marker);
    }
    return collapsed;
  }, []);
}
