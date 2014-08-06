/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {Ci, Cu} = require("chrome");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const protocol = require("devtools/server/protocol");
const {method, Arg, RetVal, types} = protocol;
const events = require("sdk/event/core");
const {setTimeout, clearTimeout} = require("sdk/timers");
const EventEmitter = require("devtools/toolkit/event-emitter");

exports.register = function(handle) {
  handle.addGlobalActor(TimelineActor, "timelineActor");
  handle.addTabActor(TimelineActor, "timelineActor");
};

exports.unregister = function(handle) {
  handle.removeGlobalActor(TimelineActor);
  handle.removeTabActor(TimelineActor);
};

let TimelineActor = protocol.ActorClass({
  typeName: "timeline",

  events: {
    "markers" : {
      type: "markers",
      markers: Arg(0, "array:json")
    }
  },

  initialize: function(conn, tabActor) {
    protocol.Actor.prototype.initialize.call(this, conn);
    this.docshell = tabActor.docShell;
  },

  destroy: function() {
    this.stop();
    this.docshell = null;
    protocol.Actor.prototype.destroy.call(this);
  },

  isRecording: method(function() {
    return this.docshell.recordTimelineMarkers;
  }, {
    request: {},
    response: {
      value: RetVal("boolean")
    }
  }),

  start: method(function() {
    if (!this.docshell.recordTimelineMarkers) {
      this.docshell.recordTimelineMarkers = true;
      this._pullTimelineData();
    }
  }, {oneway: true}),

  stop: method(function() {
    if (this.docshell.recordTimelineMarkers) {
      this.docshell.recordTimelineMarkers = false;
      clearTimeout(this._timeout);
    }
  }, {oneway: true}),

  _pullTimelineData: function() {
    let markers = this.docshell.flushTimelineMarkers();
    if (markers.length > 0) {
      markers = markers.filter(m => !!m);
      events.emit(this, "markers", markers);
    }
    this._timeout = setTimeout(() => this._pullTimelineData(), 100);
  },
});

exports.TimelineFront = protocol.FrontClass(TimelineActor, {
  initialize: function(client, {timelineActor}) {
    protocol.Front.prototype.initialize.call(this, client, {actor: timelineActor});
    this.manage(this);
  },

  destroy: function() {
    protocol.Front.prototype.destroy.call(this);
  },
});
