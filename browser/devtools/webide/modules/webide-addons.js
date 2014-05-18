/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Cu} = require("chrome");
const {AddonManager} = Cu.import("resource://gre/modules/AddonManager.jsm");
const {EventEmitter} = Cu.import("resource://gre/modules/devtools/event-emitter.js");
const {Services} = Cu.import("resource://gre/modules/Services.jsm");

let SIMULATOR_LINK = Services.prefs.getCharPref("devtools.webide.simulatorAddonsURL");
let ADB_LINK = Services.prefs.getCharPref("devtools.webide.adbAddonURL");
let SIMULATOR_ADDON_ID = Services.prefs.getCharPref("devtools.webide.simulatorAddonID");
let ADB_ADDON_ID = Services.prefs.getCharPref("devtools.webide.adbAddonID");

function GetConfiguration() {
  let platform = Services.appShell.hiddenDOMWindow.navigator.platform;
  let os = "";
  if (platform.indexOf("Win") != -1) {
    os = "win32";
  } else if (platform.indexOf("Mac") != -1) {
    os = "mac64";
  } else if (platform.indexOf("Linux") != -1) {
    if (platform.indexOf("x86_64") != -1) {
      os = "linux64";
    } else {
      os = "linux";
    }
  }
  return {os:os,platform:platform};
}


function GetSimulatorLink(v) {
  let {os,platform} = GetConfiguration();
  return SIMULATOR_LINK.replace(/#OS#/g, os)
                       .replace(/#VERSION#/g, v)
                       .replace(/#SLASHED_VERSION#/g, v.replace(/\./g, "_"));
}

function GetSimulatorAddonID(v) {
  return SIMULATOR_ADDON_ID.replace(/#SLASHED_VERSION#/g, v.replace(/\./g, "_"));
}

function GetADBLink() {
  let {os} = GetConfiguration();
  return ADB_LINK.replace(/#OS#/g, os);
}

AddonListener = {
  failureHandler: function(install, message) {
    WebIDEAddonManager.installTarget = null;
    WebIDEAddonManager.status = null;
    WebIDEAddonManager.emit("failure", message);
  },

  onDownloadStarted: function() {
    WebIDEAddonManager.status = "downloading";
    WebIDEAddonManager.emit("update");
  },

  onInstallStarted: function() {
    WebIDEAddonManager.status = "installing";
    WebIDEAddonManager.emit("update");
  },

  onDownloadProgress: function(install) {
    if (install.maxProgress == -1) {
      WebIDEAddonManager.emit("progress", -1);
    } else {
      WebIDEAddonManager.emit("progress", install.progress / install.maxProgress);
    }
  },

  onInstallEnded: function({addon}) {
    WebIDEAddonManager.status = null;
    WebIDEAddonManager.installTarget = null;
    WebIDEAddonManager.emit("update");
    addon.userDisabled = false;
  },

  onDownloadCancelled: function(install) {
    this.failureHandler(install, "Download cancelled");
  },
  onDownloadFailed: function(install) {
    this.failureHandler(install, "Download failed");
  },
  onInstallCancelled: function(install) {
    this.failureHandler(install, "Install cancelled");
  },
  onInstallFailed: function(install) {
    this.failureHandler(install, "Install failed");
  },
};

let WebIDEAddonManager = {
  status: null,
  installTarget: null,
  _installLink: function(url) {
    this.status = "preparing";
    this.emit("update");
    AddonManager.getInstallForURL(url, (install) => {
      install.addListener(AddonListener);
      install.install();
    }, "application/x-xpinstall");
  },

  installSimulator: function(name) {
    if (this.installTarget) {
      return;
    }
    this.installTarget = name;
    this._installLink(GetSimulatorLink(name));
  },

  installADB: function() {
    if (this.installTarget) {
      return;
    }
    this.installTarget = "adb";
    this._installLink(GetADBLink());
  },

  uninstallADB: function() {
    AddonManager.getAddonByID(ADB_ADDON_ID, function(aAddon) {
      aAddon.uninstall();
    });
  },
  uninstallSimulator: function(name) {
    let addonID = GetSimulatorAddonID(name);
    AddonManager.getAddonByID(addonID, function(aAddon) {
      aAddon.uninstall();
    });
  },
}

EventEmitter.decorate(WebIDEAddonManager);

exports.WebIDEAddonManager = WebIDEAddonManager;
