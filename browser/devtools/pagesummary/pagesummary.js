/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
const require = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools.require;

let summary;

window.start = function(front) {
  front.getSummary().then(aSummary => {
    summary = aSummary;

    let nodes = document.querySelectorAll("[require-presence]");
    for (let n of nodes) {
      requirePresence(n, n.getAttribute("require-presence"));
    }

    nodes = document.querySelectorAll("[require-true]");
    for (let n of nodes) {
      requireValue(n, n.getAttribute("require-true"), true);
    }

    nodes = document.querySelectorAll("[require-false]");
    for (let n of nodes) {
      requireValue(n, n.getAttribute("require-false"), false);
    }

    buildTimeline();

    preprocess();

    let store = {
      object: summary,
      on: function() {},
      off: function() {},
    };

    let template = new Template(document.body, store, function(){});
    template.start();

    // document.querySelector("#preSummary").textContent = "summary: " + JSON.stringify(summary, null, 2);
    document.body.classList.add("processed");

    setMood();
  });
}

/* preprocess */

function preprocess() {
  summary.messages = summary.messages.filter((aMessage) => {
    return aMessage.category != "css";
  });
  summary.messageCount = {
    error: summary.messages.filter(m => m.severity == "error").length,
    warning: summary.messages.filter(m => m.severity == "warning").length,
  }
  summary.security.isTrusted = summary.security.isUntrusted?"Untrusted":"Trusted";
}

/* set mood */

function setMood() {
  let div;


  div = document.querySelector("#plugins");
  if (summary.plugins.length > 0)
    div.classList.add("sad");
  else
    div.classList.add("happy");

  div = document.querySelector("#quirksmode");
  if (summary.quirksMode)
    div.classList.add("sad");
  else
    div.classList.add("happy");

  div = document.querySelector("#errors");
  if (summary.messageCount.error > 0)
    div.classList.add("sad");
  else
    div.classList.add("happy");

  div = document.querySelector("#warnings");
  if (summary.messageCount.warning > 0)
    div.classList.add("okayish");

  div = document.querySelector("#trustedcertificate");
  if (summary.isUntrusted)
    div.classList.add("sad");
  else
    div.classList.add("happy");

  div = document.querySelector("#mixedcontent");
  if (summary.hasMixedContent)
    div.classList.add("sad");
  else
    div.classList.add("happy");

}

/* requires */

// Kill nodes
function requirePresence(n, path) {
  let words = path.split(".");
  let obj = summary;
  for (let w of words) {
    if (w in obj) {
      obj = obj[w];
    } else {
      n.remove();
      return false;
    }
  }
  return true;
}

function requireValue(n, path, value) {
  console.log("requireValue: ", n, path, value);
  if (requirePresence(n, path)) {
    let words = path.split(".");
    let obj = summary;
    for (let w of words) {
      obj = obj[w];
    }
    if (obj != value) {
      n.remove();
      return true;
    }
  }
  return false;
}


/* Timeline */

function buildTimeline() {
  let t = summary.timing;

  // domainLookupStart - domainLookupEnd;
  let domainLookupStart = t.domainLookupStart - t.fetchStart;
  let domainLookupDuration = t.domainLookupEnd - t.domainLookupStart;

  // connectStart - connectEnd;
  let connectStart = t.connectStart - t.fetchStart;
  let connectDuration = t.connectEnd - t.connectStart;

  // secureConnectionStart;
  let secureConnectionStart = undefined;
  if (t.secureConnectionStart) {
    secureConnectionStart = t.secureConnectionStart - t.fetchStart;
  }

  // requestStart
  let requestStart = t.requestStart - t.fetchStart;

  // responseStart - responseEnd
  let responseStart = t.responseStart - t.fetchStart;
  let responseDuration = t.responseEnd - t.responseStart;

  /*
  domLoading;
  domInteractive;
  domContentLoadedEventStart - domContentLoadedEventEnd;
  domComplete;
  loadEventStart - loadEventEnd;
  */
}

