/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Ci,Cu} = require("chrome");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const Services = require("Services");
const protocol = require("devtools/server/protocol");
const {method,Arg} = protocol;
const {setTimeout} = require("sdk/timers");
const events = require("sdk/event/core");

exports.register = function(handle) {
  handle.addGlobalActor(MonitorActor, "monitorActor");
};

exports.unregister = function(handle) {
};

let MonitorActor = protocol.ActorClass({

  // Base

  typeName: "monitor",

  initialize: function(conn, tabActor) {
    protocol.Actor.prototype.initialize.call(this, conn);
    // Custom CTOR
  },

  destroy: function() {
    this.stop();
    protocol.Actor.prototype.destroy.call(this);
    // Custom DTOR
  },

  // Updates

  _toSend: [],
  _timeout: null,
  _started: false,
  _scheduleUpdate: function() {
    if (this._started && !this._timeout) {
      this._timeout = setTimeout(() => {
        if (this._toSend.length > 0) {
          events.emit(this, "update", this._toSend);
          this._toSend = [];
        }
        this._timeout = null;
      }, 200);
    }
  },

  events: {
    "update" : {
      type: "update",
      time: Arg(0, "array:json")
    }
  },

  // Methods available from the front

  start: method(function() {
    if (!this._started) {
      this._started = true;
      Services.obs.addObserver(this, 'devtools-monitor-update', false);
    }
  }, {oneway: true}),

  stop: method(function() {
    if (this._started) {
      Services.obs.removeObserver(this, 'devtools-monitor-update');
      this._started = false;
    }
  }, {oneway: true}),

  // nsIObserver

  observe: function (subject, topic, data) {
    if (topic == "devtools-monitor-update") {
      data = JSON.parse(data);
      if (!Array.isArray(data)) {
        this._toSend.push(data);
      } else {
        this._toSend = this._toSend.concat(data);
      }
      this._scheduleUpdate();
    }
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
});

let MonitorFront = protocol.FrontClass(MonitorActor, {
  initialize: function(client, form) {
    protocol.Front.prototype.initialize.call(this, client);
    this.actorID = form.monitorActor;
    client.addActorPool(this);
    this.manage(this);
  },

  destroy: function() {
    protocol.Front.prototype.destroy.call(this);
  },
});

const _knownMonitorFronts = new WeakMap();

exports.getMonitorFront = function(client, form) {
  if (_knownMonitorFronts.has(client))
    return _knownMonitorFronts.get(client);

  let front = new MonitorFront(client, form);
  _knownMonitorFronts.set(client, front);
  return front;
}
