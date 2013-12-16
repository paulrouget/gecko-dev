/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this,
    "DebuggerServer",
    "resource://gre/modules/devtools/dbg-server.jsm");

function DevToolsAppStartup() {
  try {
    this.dbgPortOrPath = Services.prefs.getCharPref("devtools.debugger.unix-domain-socket");
  } catch(e) {
    try {
      this.dbgPortOrPath = Services.prefs.getIntPref("devtools.debugger.remote-port");
    } catch(e) {}
  }
}

DevToolsAppStartup.prototype = {
  classID: Components.ID("{9ba9bbe7-5866-46f1-bea6-3299066b7933}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler, Ci.nsIObserver]),

  // nsICommandLineHandler

  get helpInfo() {
    let str = "";

    // Starting the debugger is handled on the app side (not in /toolkit/).
    // If the app didn't expose a debugger controller component, we don't
    // support the -start-debugger-server option.

    if (DebuggerServer.controller) {
      str += "  -start-debugger-server [<port or unix domain socket path>]";
      if (this.dbgPortOrPath) {
        str += " (default: " + this.dbgPortOrPath + ")\n";
      } else {
        str += "\n";
      }
    }

    return str;
  },

  handle: function(cmdLine) {
    if (!DebuggerServer.controller) {
      // This app doesn't expose a debugger controller.
      // We can't handle the -start-debugger-server option
      // or the remote-enable pref.
      return;
    }

    let startDebuggerServerBecauseCmdLine = false;

    try {
      // Returns null if the argument was not specified. Throws
      // NS_ERROR_INVALID_ARG if there is no parameter specified (because
      // it was the last argument or the next argument starts with '-').
      // However, someone could still explicitly pass an empty argument.
      let param = cmdLine.handleFlagWithParam("start-debugger-server", false);
      if (param) {
        startDebuggerServerBecauseCmdLine = true;
        this.dbgPortOrPath = param;
      }
    } catch(e) {
      startDebuggerServerBecauseCmdLine = true;
    }

    // App has started and we handled the command line options (if any).
    // Time to start the debugger if needed and observer the remote-enable
    // pref.

    if (startDebuggerServerBecauseCmdLine ||
        Services.prefs.getBoolPref('devtools.debugger.remote-enabled')) {
      if (this.dbgPortOrPath) {
        DebuggerServer.controller.start(this.dbgPortOrPath);
      } else {
        dump("Can't start debugger: no port or path specified\n");
      }
    }

    Services.prefs.addObserver("devtools.debugger.remote-enabled", this, false);
  },

  // nsIObserver

  observe: function (subject, topic, data) {
    if (topic == "nsPref:changed" &&
        data == "devtools.debugger.remote-enabled") {
      if (Services.prefs.getBoolPref(data)) {
        DebuggerServer.controller.start(this.dbgPortOrPath);
      } else {
        DebuggerServer.controller.stop();
      }
    }
  },
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([DevToolsAppStartup]);
