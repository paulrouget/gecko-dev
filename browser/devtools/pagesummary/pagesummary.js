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

    //buildTimeline();

    preprocess();

    let store = {
      object: summary,
      on: function() {},
      off: function() {},
    };

    let template = new Template(document.body, store, function(){});
    template.start();

    //document.querySelector("#preSummary").textContent = "summary: " + JSON.stringify(summary, null, 2);
    document.body.classList.add("processed");

    hideThings();
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

function hideThings() {
  if (summary.security.ssl) {
    document.querySelector(".securityNoSSL").setAttribute("hidden", "true");
  } else {
    document.querySelector(".securityHasSSL").setAttribute("hidden", "true");
  }
}

/* set mood */

function setMood() {
  let li;

  li = document.querySelector(".plugins");
  if (summary.plugins.length > 0)
    li.classList.add("sad");
  else
    li.classList.add("happy");

  li = document.querySelector(".quirksmode");
  if (summary.quirksMode)
    li.classList.add("sad");
  else
    li.classList.add("happy");

  li = document.querySelector(".errors");
  if (summary.messageCount.error > 0)
    li.classList.add("sad");
  else
    li.classList.add("happy");

  li = document.querySelector(".warnings");
  if (summary.messageCount.warning == 0)
    li.classList.add("happy");

  if (summary.security.ssl) {
    if (summary.security.isUntrusted) {
      document.querySelector(".sslStatus").classList.add("sad");
      document.querySelector(".sslTrusted").classList.add("sad");
    } else {
      document.querySelector(".sslStatus").classList.add("happy");
      document.querySelector(".sslTrusted").classList.add("happy");
    }
  }

  li = document.querySelector(".isDomainMismatch");
  if (summary.security.isDomainMismatch)
    li.classList.add("sad");

  li = document.querySelector(".isNotValidAtThisTime");
  if (summary.security.isNotValidAtThisTime)
    li.classList.add("sad");


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

