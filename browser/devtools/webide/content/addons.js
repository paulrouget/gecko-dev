/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
Cu.import("resource:///modules/devtools/gDevTools.jsm");
const {require} = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;

const {GetAddonsJSON} = require("devtools/remote-resources");
const {WebIDEAddonManager} = require("devtools/webide-addons");
const {Simulator} = Cu.import("resource://gre/modules/devtools/Simulator.jsm");
const {Devices} = Cu.import("resource://gre/modules/devtools/Devices.jsm");
const {Services} = Cu.import("resource://gre/modules/Services.jsm");

const Strings = Services.strings.createBundle("chrome://webide/content/webide.properties");

let addonsJSON;
window.addEventListener("load", function onLoad() {
  window.removeEventListener("load", onLoad);
  document.querySelector("#aboutaddons").onclick = function() {
    window.parent.UI.openInBrowser("about:addons");
  }
  document.querySelector("#close").onclick = function() {
    window.parent.Cmds.hideAddons();
  }

  GetAddonsJSON().then(json => {
    addonsJSON = json;
    BuildUI();
    Simulator.on("unregister", BuildUI);
    Simulator.on("register", BuildUI);
    WebIDEAddonManager.on("update", BuildUI);
    WebIDEAddonManager.on("failure", showErrorAndBuildUI);
    WebIDEAddonManager.on("progress", onProgress);
    Devices.on("addon-status-updated", BuildUI);
  });
}, true);

window.addEventListener("unload", function onUnload() {
  window.removeEventListener("unload", onUnload);
  Simulator.off("unregister", BuildUI);
  Simulator.off("register", BuildUI);
  WebIDEAddonManager.off("update", BuildUI);
  WebIDEAddonManager.off("failure", showErrorAndBuildUI);
  WebIDEAddonManager.off("progress", onProgress);
  Devices.off("addon-status-updated", BuildUI);
}, true);

function BuildUI() {
  let ul = document.querySelector("ul");
  ul.innerHTML = "";
  BuildADBItem();
  BuildSimulatorList();
}

function BuildItem(label, isInstalled, target, onInstall, onUninstall) {
  let li = document.createElement("li");
  li.setAttribute("target", target);

  let name = document.createElement("span");
  name.className = "name";
  name.textContent = label;

  li.appendChild(name);

  let isInstalling = WebIDEAddonManager.status && WebIDEAddonManager.installTarget == target;

  let status = document.createElement("span");
  status.className = "status";

  if (!isInstalling) {
    if (isInstalled) {
      status.textContent = Strings.GetStringFromName("addons_status_installed");
      li.className = "installed";
    } else {
      status.textContent = Strings.GetStringFromName("addons_status_uninstalled");
      li.className = "uninstalled";
    }
    li.appendChild(status);

    let button = document.createElement("button");
    if (isInstalled) {
      button.textContent = Strings.GetStringFromName("addons_uninstall_button");
      button.onclick = () => onInstall(target);
    } else {
      button.textContent = Strings.GetStringFromName("addons_install_button");
      button.onclick = () => onUninstall(target);
    }

    if (WebIDEAddonManager.status) {
      button.setAttribute("disabled", "true");
    }
    li.appendChild(button);

  } else {
    let status = document.createElement("span");
    status.className = "status";
    status.textContent = Strings.GetStringFromName("addons_status_" + WebIDEAddonManager.status);
    li.className = WebIDEAddonManager.status;
    li.appendChild(status);
    let progress = document.createElement("progress");
    progress.value = 0;
    li.appendChild(progress);
  }
  return li;
}

function BuildSimulatorList() {
  let ul = document.querySelector("ul");
  for (let stability of ["stable", "unstable"]) {
    for (let version of addonsJSON[stability]) {
      let isInstalled = false;
      for (let installedVersion of Simulator.availableVersions()) {
        if (installedVersion == "Firefox OS " + version) {
          isInstalled = true;
          break;
        }
      }
      let stabilityLabel = Strings.GetStringFromName("addons_" + stability);
      let name = Strings.formatStringFromName("addons_simulator_label", [version, stabilityLabel], 2);
      let li = BuildItem(name, isInstalled, version, function onInstall(version) {
        WebIDEAddonManager.uninstallSimulator(version);
      }, function onUninstall(version) {
        WebIDEAddonManager.installSimulator(version);
      });
      ul.appendChild(li);
    }
  }
}

function BuildADBItem() {
  let ul = document.querySelector("ul");
  let isInstalled = Devices.helperAddonInstalled;
  let name = "ADB Addons Helper";
  let li = BuildItem(name, isInstalled, "adb", function onInstall() {
    WebIDEAddonManager.uninstallADB();
  }, function onUninstall() {
    WebIDEAddonManager.installADB();
  });
  if (!isInstalled) {
    let warning = document.createElement("p");
    warning.textContent = Strings.GetStringFromName("addons_adb_warning");
    warning.className = "warning";
    li.appendChild(warning);
  }
  ul.appendChild(li);
}

function onProgress(event, value) {
  let progress = document.querySelector("progress");
  if (progress) {
    if (value == -1) {
      progress.removeAttribute("value");
    } else {
      progress.value = value;
    }
  }
}


function showErrorAndBuildUI(event, error) {
  BuildUI();
  window.alert(error);
}
