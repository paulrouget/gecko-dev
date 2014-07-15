'use strict';

const {Cu} = require("chrome");
const {Services} = Cu.import("resource://gre/modules/Services.jsm");
let window = Services.appShell.hiddenDOMWindow;

module.exports = function(path, callback) {
  let img = new window.Image();
  img.onload = () => {
    callback(null, {width: img.width, height: img.height});
  };
  img.src = "file://" + path;
}
