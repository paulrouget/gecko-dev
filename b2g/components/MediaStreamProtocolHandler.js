/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

function MediaStreamProtocolHandler() {
}

MediaStreamProtocolHandler.prototype = {

  scheme: "mediastream",
  defaultPort: -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_NORELATIVE |
                 Ci.nsIProtocolHandler.URI_NOAUTH |
                 Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE |
                 Ci.nsIProtocolHandler.URI_DOES_NOT_RETURN_DATA,
  allowPort: function() false,

  newURI: function Proto_newURI(aSpec, aOriginCharset) {
    let uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    return uri;
  },

  newChannel2: function Proto_newChannel2(aURI, aLoadInfo) {
    let url = Services.io.newURI("chrome://b2g/content/MediaStreamDocument.xhtml", null, null);
    let channel = Services.io.newChannelFromURIWithLoadInfo(url, aLoadInfo);
    channel.originalURI = aURI;
    return channel;
  },

  newChannel: function Proto_newChannel(aURI) {
    return newChannel2(aURI, null);
  },

  classID: Components.ID("{2b8c4c14-0d6a-49fe-9d4b-db741a9d882a}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([MediaStreamProtocolHandler]);
