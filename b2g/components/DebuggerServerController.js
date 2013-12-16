/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this,
    "DebuggerServer",
    "resource://gre/modules/devtools/dbg-server.jsm");

XPCOMUtils.defineLazyServiceGetter(this,
    "Settings",
    "@mozilla.org/settingsService;1", "nsISettingsService");

XPCOMUtils.defineLazyServiceGetter(this,
    "Alerts",
    "@mozilla.org/alerts-service;1", "nsIAlertsService");

XPCOMUtils.defineLazyGetter(this,
    "l10n",
    () => Services.strings.createBundle("chrome://global/locale/devtools/debugger.properties"));

function DebuggerServerController() {
  Services.obs.addObserver(this, "mozsettings-changed", false);
  if (Services.appinfo.widgetToolkit == "gonk") {
    this.adbController = AdbController;
  }
}

DebuggerServerController.prototype = {
  classID: Components.ID('{9390f6ac-7914-46c6-b8d0-ccc7db550d8c}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDebuggerServerController, Ci.nsIObserver]),

  // nsIObserver

  observe: function observe(subject, topic, data) {
    if (topic != "mozsettings-changed") {
      return;
    }

    let setting = JSON.parse(data);

    if (this.adbController) {
      if (setting.key == "lockscreen.locked") {
        this.adbController.setLockscreenState(setting.value);
      }

      if (setting.key == "lockscreen.enabled") {
        this.adbController.setLockscreenEnabled(setting,value);
      }
    }

    if (setting.key == "devtools.debugger.remote-enabled") {
      Services.prefs.setBoolPref('devtools.debugger.remote-enabled', setting.value);
      Services.prefs.savePrefFile(null);
    }
  },

  // nsIDebuggerController

  start: function(portOrPath) {
    if (!DebuggerServer.initialized) {
      // Ask for remote connections.
      DebuggerServer.init(Prompt.prompt.bind(Prompt));
      DebuggerServer.chromeWindowType = "navigator:browser";
      DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/webbrowser.js");
      // Until we implement unix domain socket, we enable content actors
      // only on development devices
      if (Services.prefs.getBoolPref("devtools.debugger.enable-content-actors")) {
        DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/script.js");
        DebuggerServer.addGlobalActor(DebuggerServer.ChromeDebuggerActor, "chromeDebugger");
        DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/webconsole.js");
        DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/gcli.js");
        if ("nsIProfiler" in Ci) {
          DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/profiler.js");
        }
        DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/styleeditor.js");
        DebuggerServer.enableWebappsContentActor = true;
      }
      DebuggerServer.addActors('chrome://browser/content/dbg-browser-actors.js');
      DebuggerServer.addActors("resource://gre/modules/devtools/server/actors/webapps.js");
      DebuggerServer.registerModule("devtools/server/actors/device");
      DebuggerServer.registerModule("devtools/server/actors/inspector")

      if (this.adbController) {
        DebuggerServer.onConnectionChange = function(what) {
          this.adbController.updateState();
        }
      }
    }

    if (!portOrPath) {
      // If the "devtools.debugger.unix-domain-socket" pref is set, we use a unix socket.
      // If not, we use a regular TCP socket.
      try {
        portOrPath = Services.prefs.getCharPref("devtools.debugger.unix-domain-socket");
      } catch (e) {
        portOrPath = Services.prefs.getIntPref("devtools.debugger.remote-port");
      }
    }

    try {
      DebuggerServer.openListener(portOrPath);
      if (this.adbController) {
        this.adbController.setRemoteDebuggerState(true);
      }
    } catch (e) {
      dump('Unable to start debugger server (' + portOrPath + '): ' + e + '\n');
    }

  },

  stop: function() {
    if (!DebuggerServer.initialized) {
      return;
    }
    try {
      DebuggerServer.closeListener();
      if (this.adbController) {
        this.adbController.setRemoteDebuggerState(false);
      }
    } catch (e) {
      dump('Unable to stop debugger server: ' + e + '\n');
    }
  },

  onDebuggerStarted: function(portOrPath) {
    let title = l10n.GetStringFromName("debuggerStartedAlert.title");
    let port = Number(portOrPath);
    let detail;
    if (port) {
      detail = l10n.formatStringFromName("debuggerStartedAlert.detailPort", [portOrPath], 1);
    } else {
      detail = l10n.formatStringFromName("debuggerStartedAlert.detailPath", [portOrPath], 1);
    }
    Alerts.showAlertNotification(null, title, detail, false, "", function(){});
  },


  onDebuggerStopped: function() {
    let title = l10n.GetStringFromName("debuggerStopped.title");
    Alerts.showAlertNotification(null, title, null, false, "", function(){});
  },
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([DebuggerServerController]);

// =================== Prompt ====================

let Prompt = {
  _promptDone: false,
  _promptAnswer: false,
  _listenerAttached: false,

  getShell: function() {
    let browser = Services.wm.getMostRecentWindow("navigator:browser");
    if (!browser) {
      return null;
    }
    return browser.shell;
  },

  prompt: function () {
    let shell = this.getShell();

    if (!shell || !shell.contentBrowser || !shell.contentBrowser.contentWindow) {
      // shell not ready
      return false;
    }

    if (!this._listenerAttached) {
      shell.contentBrowser.contentWindow.addEventListener("mozContentEvent", this, false, true);
      this._listenerAttached = true;
    }

    this._promptDone = false;

    shell.sendChromeEvent({
      "type": "remote-debugger-prompt"
    });


    while(!this._promptDone) {
      Services.tm.currentThread.processNextEvent(true);
    }

    return this._promptAnswer;
  },

  // Content events listener

  handleEvent: function (event) {
    if (event.detail.type == "remote-debugger-prompt") {
      this._promptAnswer = event.detail.value;
      this._promptDone = true;
    }
  }
}

// =================== ADB ====================

let AdbController = {
  DEBUG: false,
  locked: undefined,
  remoteDebuggerEnabled: undefined,
  lockEnabled: undefined,
  disableAdbTimer: null,
  disableAdbTimeoutHours: 12,

  debug: function(str) {
    dump("AdbController: " + str + "\n");
  },

  setLockscreenEnabled: function(value) {
    this.lockEnabled = value;
    if (this.DEBUG) {
      this.debug("setLockscreenEnabled = " + this.lockEnabled);
    }
    this.updateState();
  },

  setLockscreenState: function(value) {
    this.locked = value;
    if (this.DEBUG) {
      this.debug("setLockscreenState = " + this.locked);
    }
    this.updateState();
  },

  setRemoteDebuggerState: function(value) {
    this.remoteDebuggerEnabled = value;
    if (this.DEBUG) {
      this.debug("setRemoteDebuggerState = " + this.remoteDebuggerEnabled);
    }
    this.updateState();
  },

  startDisableAdbTimer: function() {
    if (this.disableAdbTimer) {
      this.disableAdbTimer.cancel();
    } else {
      this.disableAdbTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      try {
        this.disableAdbTimeoutHours =
          Services.prefs.getIntPref("b2g.adb.timeout-hours");
      } catch (e) {
        // This happens if the pref doesn't exist, in which case
        // disableAdbTimeoutHours will still be set to the default.
      }
    }
    if (this.disableAdbTimeoutHours <= 0) {
      if (this.DEBUG) {
        this.debug("Timer to disable ADB not started due to zero timeout");
      }
      return;
    }

    if (this.DEBUG) {
      this.debug("Starting timer to disable ADB in " +
                 this.disableAdbTimeoutHours + " hours");
    }
    let timeoutMilliseconds = this.disableAdbTimeoutHours * 60 * 60 * 1000;
    this.disableAdbTimer.initWithCallback(this, timeoutMilliseconds,
                                          Ci.nsITimer.TYPE_ONE_SHOT);
  },

  stopDisableAdbTimer: function() {
    if (this.DEBUG) {
      this.debug("Stopping timer to disable ADB");
    }
    if (this.disableAdbTimer) {
      this.disableAdbTimer.cancel();
      this.disableAdbTimer = null;
    }
  },

  notify: function(aTimer) {
    if (aTimer == this.disableAdbTimer) {
      this.disableAdbTimer = null;
      // The following dump will be the last thing that shows up in logcat,
      // and will at least give the user a clue about why logcat was
      // disconnected, if the user happens to be using logcat.
      dump("AdbController: ADB timer expired - disabling ADB\n");
      DebuggerServer.stop();
    }
  },

  updateState: function() {
    if (this.remoteDebuggerEnabled === undefined ||
        this.lockEnabled === undefined ||
        this.locked === undefined) {
      // Part of initializing the settings database will cause the observers
      // to trigger. We want to wait until both have been initialized before
      // we start changing ther adb state. Without this then we can wind up
      // toggling adb off and back on again (or on and back off again).
      //
      // For completeness, one scenario which toggles adb is using the unagi.
      // The unagi has adb enabled by default (prior to b2g starting). If you
      // have the phone lock disabled and remote debugging enabled, then we'll
      // receive an unlock event and an rde event. However at the time we
      // receive the unlock event we haven't yet received the rde event, so
      // we turn adb off momentarily, which disconnects a logcat that might
      // be running. Changing the defaults (in AdbController) just moves the
      // problem to a different phone, which has adb disabled by default and
      // we wind up turning on adb for a short period when we shouldn't.
      //
      // By waiting until both values are properly initialized, we avoid
      // turning adb on or off accidentally.
      if (this.DEBUG) {
        this.debug("updateState: Waiting for all vars to be initialized");
      }
      return;
    }

    // Check if we have a remote debugging session going on. If so, we won't
    // disable adb even if the screen is locked.
    let isDebugging = DebuggerServer._connections &&
                      Object.keys(DebuggerServer._connections).length > 0;
    if (this.DEBUG) {
      this.debug("isDebugging=" + isDebugging);
    }

    let enableAdb = this.remoteDebuggerEnabled &&
      (!(this.lockEnabled && this.locked) || isDebugging);

    let useDisableAdbTimer = true;
    try {
      if (Services.prefs.getBoolPref("marionette.defaultPrefs.enabled")) {
        // Marionette is enabled. Marionette requires that adb be on (and also
        // requires that remote debugging be off). The fact that marionette
        // is enabled also implies that we're doing a non-production build, so
        // we want adb enabled all of the time.
        enableAdb = true;
        useDisableAdbTimer = false;
      }
    } catch (e) {
      // This means that the pref doesn't exist. Which is fine. We just leave
      // enableAdb alone.
    }
    if (this.DEBUG) {
      this.debug("updateState: enableAdb = " + enableAdb +
                 " remoteDebuggerEnabled = " + this.remoteDebuggerEnabled +
                 " lockEnabled = " + this.lockEnabled +
                 " locked = " + this.locked);
    }

    // Configure adb.
    let currentConfig = libcutils.property_get("persist.sys.usb.config");
    let configFuncs = currentConfig.split(",");
    let adbIndex = configFuncs.indexOf("adb");

    if (enableAdb) {
      // Add adb to the list of functions, if not already present
      if (adbIndex < 0) {
        configFuncs.push("adb");
      }
    } else {
      // Remove adb from the list of functions, if present
      if (adbIndex >= 0) {
        configFuncs.splice(adbIndex, 1);
      }
    }
    let newConfig = configFuncs.join(",");
    if (newConfig != currentConfig) {
      if (this.DEBUG) {
        this.debug("updateState: currentConfig = " + currentConfig);
        this.debug("updateState:     newConfig = " + newConfig);
      }
      try {
        libcutils.property_set("persist.sys.usb.config", newConfig);
      } catch(e) {
        dump("Error configuring adb: " + e);
      }
    }
    if (useDisableAdbTimer) {
      if (enableAdb && !isDebugging) {
        this.startDisableAdbTimer();
      } else {
        this.stopDisableAdbTimer();
      }
    }
  }
};
