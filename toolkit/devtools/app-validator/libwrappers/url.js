'use strict';

let urls = require("sdk/url");
module.exports = {
  parse: function(source) {
    return urls.URL(source);
  },
}
