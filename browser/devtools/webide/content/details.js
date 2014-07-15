/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
Cu.import("resource:///modules/devtools/gDevTools.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
const {Services} = Cu.import("resource://gre/modules/Services.jsm");
const {require} = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
const {AppProjects} = require("devtools/app-manager/app-projects");
const {AppValidator} = require("devtools/app-manager/app-validator");
const {AppManager} = require("devtools/webide/app-manager");

window.addEventListener("load", function onLoad() {
  window.removeEventListener("load", onLoad);
  document.addEventListener("visibilitychange", updateUI, true);
  AppManager.on("app-manager-update", onAppManagerUpdate);
  updateUI();
}, true);

window.addEventListener("unload", function onUnload() {
  window.removeEventListener("unload", onUnload);
  AppManager.off("app-manager-update", onAppManagerUpdate);
}, true);

function onAppManagerUpdate(event, what, details) {
  if (what == "project" ||
      what == "project-validated") {
    updateUI();
  }
}

function resetUI() {
  document.querySelector("#toolbar").classList.add("hidden");
  document.querySelector("#type").classList.add("hidden");
  document.querySelector("#descriptionHeader").classList.add("hidden");
  document.querySelector("#manifestURLHeader").classList.add("hidden");
  document.querySelector("#locationHeader").classList.add("hidden");

  document.body.className = "";
  document.querySelector("#icon").src = "";
  document.querySelector("h1").textContent = "";
  document.querySelector("#description").textContent = "";
  document.querySelector("#type").textContent = "";
  document.querySelector("#manifestURL").textContent = "";
  document.querySelector("#location").textContent = "";

  document.querySelector("#errorslist").innerHTML = "";
  document.querySelector("#warningslist").innerHTML = "";

}

function updateUI() {
  resetUI();

  RunValidation();

  let project = AppManager.selectedProject;
  if (!project) {
    return;
  }

  if (project.type != "runtimeApp" && project.type != "mainProcess") {
    document.querySelector("#toolbar").classList.remove("hidden");
    document.querySelector("#locationHeader").classList.remove("hidden");
    document.querySelector("#location").textContent = project.location;
  }

  document.body.className = project.validationStatus;
  document.querySelector("#icon").src = project.icon;
  document.querySelector("h1").textContent = project.name;

  let manifest;
  if (project.type == "runtimeApp") {
    manifest = project.app.manifest;
  } else {
    manifest = project.manifest;
  }

  if (manifest) {
    if (manifest.description) {
      document.querySelector("#descriptionHeader").classList.remove("hidden");
      document.querySelector("#description").textContent = manifest.description;
    }

    document.querySelector("#type").classList.remove("hidden");

    if (project.type == "runtimeApp") {
      let manifestURL = AppManager.getProjectManifestURL(project);
      document.querySelector("#type").textContent = manifest.type || "web";
      document.querySelector("#manifestURLHeader").classList.remove("hidden");
      document.querySelector("#manifestURL").textContent = manifestURL;
    } else if (project.type == "mainProcess") {
      document.querySelector("#type").textContent = project.name;
    } else {
      document.querySelector("#type").textContent = project.type + " " + (manifest.type || "web");
    }

    if (project.type == "packaged") {
      let manifestURL = AppManager.getProjectManifestURL(project);
      if (manifestURL) {
        document.querySelector("#manifestURLHeader").classList.remove("hidden");
        document.querySelector("#manifestURL").textContent = manifestURL;
      }
    }
  }

  let errorsNode = document.querySelector("#errorslist");
  let warningsNode = document.querySelector("#warningslist");

  if (project.errors) {
    for (let e of project.errors) {
      let li = document.createElement("li");
      li.textContent = e;
      errorsNode.appendChild(li);
    }
  }

  if (project.warnings) {
    for (let w of project.warnings) {
      let li = document.createElement("li");
      li.textContent = w;
      warningsNode.appendChild(li);
    }
  }
}

function removeProject() {
  AppManager.removeSelectedProject();
}

let ValidatorManifest = require("devtools/app-validator/manifest/index");
let ValidatorIcon = require("devtools/app-validator/icons/index");

function RunValidation() {
  let project = AppManager.selectedProject;
  let pre = document.querySelector("#validation > pre");
  pre.textContent = "";
  if (!project) {
    pre.textContent = "No project";
  } else if (project.type != "packaged") {
    pre.textContent = "Not packaged app";
  } else {
    let manifest = project.manifest;
    let validator = new ValidatorManifest();
    let validationResult = validator.validate(manifest, {packaged:true,listed:true});
    pre.textContent = JSON.stringify(validationResult,null,2);

    let location = FileUtils.File(project.location);
    if (!location.exists()) {
      // FIXME
    }
    if (!location.isDirectory()) {
      // FIXME
    }

    for (let key in manifest.icons) {
      let size = key;
      let path = manifest.icons[size];
      // FIXME: check that path starts with '/'
      let file = FileUtils.File(project.location);
      file.appendRelativePath(path.substr(1));
      ValidatorIcon(file.path, {}, (res) => {
        pre.textContent += `\nIcon validation ${path} [${size}]: `;
        pre.textContent += JSON.stringify(res);
      });
    }
  }
}
