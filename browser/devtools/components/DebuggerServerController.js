/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");


XPCOMUtils.defineLazyModuleGetter(this,
    "DebuggerServer",
    "resource://gre/modules/devtools/dbg-server.jsm");

XPCOMUtils.defineLazyServiceGetter(this,
    "Alerts",
    "@mozilla.org/alerts-service;1", "nsIAlertsService");

XPCOMUtils.defineLazyGetter(this,
    "l10n",
    () => Services.strings.createBundle("chrome://global/locale/devtools/debugger.properties"));

function DebuggerServerController() {

  // The remote-enabled pref used to mean that Firefox was allowed
  // to connect to a debugger server. In other products (b2g, thunderbird,
  // fennec, …) this pref had a different meaning: it runs a debugger
  // server. We want Firefox Desktop to follow the same rule.
  //
  // We don't want to surprise users with this new behavior. So we reset
  // the remote-enabled pref once.

  let prefRemoteEnabled = "devtools.debugger.remote-enabled";
  let prefMigrated = "devtools.debugger.remote-enabled-pref-migrated";

  if (!Services.prefs.getBoolPref(prefMigrated)) {
    Services.prefs.clearUserPref(prefRemoteEnabled);
    Services.prefs.setBoolPref(prefMigrated, true);
  }
}

DebuggerServerController.prototype = {
  classID: Components.ID('{f6e8e269-ae4a-4c4a-bf80-fb4164fb072d}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDebuggerServerController]),

  _isMetro: function() {
    return (Services.metro && Services.metro.immersive);
  },

  start: function(pathOrPort) {
    if (!DebuggerServer.initialized) {
      DebuggerServer.init();
      DebuggerServer.chromeWindowType = "navigator:browser";
      DebuggerServer.addBrowserActors();
      if (this._isMetro()) {
        DebuggerServer.addActors('chrome://browser/content/dbg-metro-actors.js');
      }
    }

    if (!pathOrPort) {
      // If the "devtools.debugger.unix-domain-socket" pref is set, we use a unix socket.
      // If not, we use a regular TCP socket.
      try {
        pathOrPort = Services.prefs.getCharPref("devtools.debugger.unix-domain-socket");
      } catch (e) {
        pathOrPort = Services.prefs.getIntPref("devtools.debugger.remote-port");
      }
    }

    try {
      DebuggerServer.openListener(pathOrPort);
    } catch (e) {
      dump('Unable to start debugger server (' + pathOrPort + '): ' + e + '\n');
    }
  },

  stop: function() {
    if (!DebuggerServer.initialized) {
      return;
    }

    try {
      DebuggerServer.closeListener();
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
