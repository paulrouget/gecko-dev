/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {interfaces:Ci,utils:Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");

function webideCli() {
}

webideCli.prototype = {
  handle: function(cmdLine) {
    let flagFound = false;
    let param = "";

    try {
      param = cmdLine.handleFlagWithParam("webide", false);
      if (!param) {
        return;
      }
    } catch(e) {
      cmdLine.handleFlag("webide", false);
    }

    cmdLine.preventDefault = true;

    let win = Services.wm.getMostRecentWindow("devtools:webide");
    if (win) {
      win.focus();
      win.handleCommandline(param);
      return;
    }

    let win = Services.ww.openWindow(null, "chrome://webide/content/", "webide", "chrome,centerscreen,resizable,dialog=no", null);

    if (param) {
      win.arguments = [param];
    }

    if (cmdLine.state == Ci.nsICommandLine.STATE_INITIAL_LAUNCH) {
      Services.obs.notifyObservers(null, "sessionstore-windows-restored", "");
    }
  },


  helpInfo : "",

  classID: Components.ID("{79b7b44e-de5e-4e4c-b7a2-044003c615d9}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([webideCli]);
