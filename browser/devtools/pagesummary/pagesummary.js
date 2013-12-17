/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/devtools/Loader.jsm");
Cu.import("resource:///modules/devtools/SideMenuWidget.jsm");
Cu.import("resource:///modules/devtools/ViewHelpers.jsm");

const require = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools.require;
const promise = require("sdk/core/promise");
const EventEmitter = require("devtools/shared/event-emitter");
const {Tooltip} = require("devtools/shared/widgets/Tooltip");
const Editor = require("devtools/sourceeditor/editor");

let gToolbox, gTarget, gFront;

function start() {
  gFront.getSummary().then(summary => {
    document.querySelector("#preSummary").textContent = "summary: " + JSON.stringify(summary, null, 2);
  });

  gFront.getColorProfile().then(colors => {
    document.querySelector("#preColors").textContent = "colors: " + JSON.stringify(colors, null, 2);
    colors = colors.map(c => {
      let r = c.color >> 16;
      let g = c.color >> 8 & 0xff;
      let b = c.color & 0xff;
      c.color = {r: r, g: g, b: b};
      return c;
    });
    for (let c of colors) {
      let {r, g, b} = c.color;
      let colorSpan = document.createElement("span");
      document.querySelector("#colors").appendChild(colorSpan)
      colorSpan.className = "color";
      colorSpan.style.backgroundColor = "rgb(" + [r,g,b].join(",") + ")";
    }
  });
}
