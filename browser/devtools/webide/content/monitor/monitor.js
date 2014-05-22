/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
Cu.import("resource:///modules/devtools/gDevTools.jsm");
const {require} = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
const {AppManager} = require("devtools/app-manager");

let monitor = AppManager.monitorFront;

window.addEventListener("load", function onLoad() {
  monitor.on("update", newData);
  monitor.start();
}, true);

window.addEventListener("unload", function onUnload() {
  monitor.off("update", newData);
  monitor.stop();
}, true);

let knownGraphs = new Map();

function validateData(data) {
  if ("graphID" in data &&
      "dataID" in data &&
      "measure" in data) {
    return true;
  }
  return false;
}

function newData(allData) {
  let graphToRender = new Set();
  for (let data of allData) {
    let graph;
    if (!validateData(data)) {
      console.error("Invalid data", data);
      continue;
    }
    if (knownGraphs.has(data.graphID)) {
      graph = knownGraphs.get(data.graphID);
    } else {
      graph = new Graph(data.graphID);
      knownGraphs.set(data.graphID, graph);
    }
    graph.addMeasure(data.dataID, data.measure);
    graphToRender.add(graph);
  }
  for (let graph of graphToRender) {
    graph.render();
  }
}

function Graph(id) {
  this.id = id;
  this.buckets = new Map();
}
Graph.prototype = {
  render: function() {
    let graphNode = document.querySelector(".graph[graphID=" + this.id + "\"");
    if (!graphNode) {
      graphNode = document.createElement("div");
      graphNode.className = "graph";
      graphNode.setAttribute("graphID", this.id);
      let h2 = document.createElement("h2");
      h2.textContent = this.id;
      graphNode.appendChild(h2);
      document.body.appendChild(graphNode);
    }
    for (let [id,values] of this.buckets) {
      let bucketNode = graphNode.querySelector(".bucket[graphID=" + id + "\"");
      if (!bucketNode) {
        bucketNode = document.createElement("pre");
        bucketNode.className = "bucket";
        bucketNode.setAttribute("bucketID", this.id);
        let h3 = document.createElement("h3");
        h3.textContent = id;
        bucketNode.appendChild(h3);
        graphNode.appendChild(bucketNode);
      }
      let str = "";
      for (let data of values) {
        str += data.time + ": " + data.value + data.unit + ";\n";
      }
      pre.textContent = str;
    }
  },
  addMeasure: function(type, value) {
    let bucket;
    if (this.buckets.has(type)) {
      bucket = this.buckets.get(type);
    } else {
      bucket = [];
      this.buckets.add(type, bucket);
    }
    bucket.push(value);
  },
}
