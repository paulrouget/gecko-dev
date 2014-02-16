/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
const require = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools.require;

let summary, panel;

window.start = function(front, toolboxPanel) {
  panel = toolboxPanel;
  front.getSummary().then(aSummary => {
    summary = aSummary;

    buildTimeline();

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
  let mood;

  function addClass(selector, className) {
    for (let e of document.querySelectorAll(selector)) {
      e.classList.add(className);
    }
  }

  mood = summary.plugins.length > 0 ? "sad" : "happy";
  addClass(".plugins", mood);

  mood = summary.quirksMode ? "sad" : "happy";
  addClass(".quirksmode", mood);

  mood = summary.messageCount.error > 0 ? "sad" : "happy";
  addClass(".errors", mood);

  if (summary.messageCount.warning == 0)
    addClass(".warnings", "happy");

  if (summary.security.ssl) {
    mood = summary.security.isUntrusted ? "sad" : "happy";
    addClass(".sslStatus, .sslTrusted", mood);
  }

  if (summary.security.isDomainMismatch)
    addClass(".isDomainMismatch", "sad");

  if (summary.security.isNotValidAtThisTime)
    addClass("isNotValidAtThisTime", "sad");

  mood = summary.hasMixedContent ? "sad" : "happy";
  addClass(".hasMixedContent", mood);

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
  let blocks = [];

  let start = t.navigationStart;

  if (t.unloadEventStart != 0) {
    blocks.push({
      name: "unload",
      className: "tl-unload",
      duration: t.unloadEventEnd - t.unloadEventStart,
      start: t.unloadEventStart - start
    });
  }

  if (t.redirectStart != 0) {
    blocks.push({
      name: "redirect",
      className: "tl-redirect",
      duration: t.redirectEnd - t.redirectStart,
      start: t.redirectStart - start
    });
  }

  blocks.push({
    name: "fetchStart",
    className: "tl-fetchStart",
    start: t.fetchStart - start
  });

  blocks.push({
    name: "domainLookup",
    className: "tl-domainLookup",
    duration: t.domainLookupEnd - t.domainLookupStart,
    start: t.domainLookupStart - start
  });

  blocks.push({
    name: "connect",
    className: "tl-connect",
    duration: t.connectEnd - t.connectStart,
    start: t.connectStart - start
  });

  blocks.push({
    name: "request",
    className: "tl-request",
    duration: t.responseStart - t.requestStart,
    start: t.requestStart - start
  });

  blocks.push({
    name: "response",
    className: "tl-response",
    duration: t.responseEnd - t.responseStart,
    start: t.responseStart - start
  });

  blocks.push({
    name: "DOM loading",
    className: "tl-domloading",
    duration: t.domInteractive - t.domLoading,
    start: t.domLoading - start
  });

  blocks.push({
    name: "DOM interactive",
    className: "tl-dominteractive",
    duration: t.domContentLoadedEventStart - t.domInteractive,
    start: t.domInteractive - start
  });

  blocks.push({
    name: "DOM content loaded event",
    className: "tl-domcontentloaded",
    duration: t.domContentLoadedEventEnd - t.domContentLoadedEventStart,
    start: t.domContentLoadedEventStart - start
  });

  blocks.push({
    name: "DOM complete",
    className: "tl-domcomplete",
    duration: t.domComplete - t.domContentLoadedEventEnd,
    start: t.domContentLoadedEventEnd - start,
  });

  let totalDuration;

  if (t.loadEventStart) {
    blocks.push({
      name: "DOM load event",
      className: "tl-domloadevent",
      duration: t.loadEventEnd - t.loadEventStart,
      start: t.loadEventStart - start
    });
    totalDuration = t.loadEventEnd - t.navigationStart;
  } else {
    totalDuration = t.domComplete - t.navigationStart;
  }

  summary.totalDuration = totalDuration;

  let fragment = document.createDocumentFragment();

  let labels = document.createElement("div");
  labels.className = "labels";
  fragment.appendChild(labels);

  let bars = document.createElement("div");
  bars.className = "bars";
  fragment.appendChild(bars);

  for (let b of blocks) {
    let start_r = (100 * b.start / totalDuration) + "%";
    if ("duration" in b) {
      let label = document.createElement("label");
      label.textContent = b.name + " (" + b.duration + "ms)";
      labels.appendChild(label);

      let duration_r = (100 * b.duration / totalDuration) + "%";
      let div = document.createElement("div");
      div.className = "bar " + b.className;
      div.setAttribute("style","width:" + duration_r + ";margin-left:" + start_r);
      bars.appendChild(div);
    } else {
      let label = document.createElement("label");
      label.textContent = b.name + " (at " + b.start + "ms)";
      labels.appendChild(label);

      let div = document.createElement("div");
      div.className = "point " + b.className;
      div.setAttribute("style","margin-left:" + start_r);
      bars.appendChild(div);
    }
  }

  document.querySelector("#timeline").appendChild(fragment);
}


function showTooltip(e) {
  let a = e.target.parentNode;
  let details = a.dataset.details;
  panel.tooltip.setVariableContent(null, summary[details], {onlyEnumVisible:true});
  panel.tooltip.show(a);
}
