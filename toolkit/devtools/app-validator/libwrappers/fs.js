'use strict';

const {Cu} = require("chrome");
Cu.import("resource://gre/modules/FileUtils.jsm");

module.exports = {
  stat: function(path, callback) {
    let f = new FileUtils.File(path);
    if (!f.isReadable()) {
      return callback("not readable");
    }
    if (!f.isFile()) {
      return callback("not a file");
    }
    callback(null, {size: f.fileSize});
  }
}
