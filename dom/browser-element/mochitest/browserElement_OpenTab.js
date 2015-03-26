/* Any copyright is dedicated to the public domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Bug 1144015 - test middle/ctrl/cmd-click on a link.

"use strict";
SimpleTest.waitForExplicitFinish();
browserElementTestHelpers.setEnabledPref(true);
browserElementTestHelpers.addPermission();

var iframe;
var popupFrame;
function runTest() {
  iframe = document.createElement('iframe');
  iframe.setAttribute('mozbrowser', 'true');

  iframe.addEventListener('mozbrowserloadend', function(e) {
    console.log(iframe);
  });

  iframe.addEventListener('mozbrowseropentab', function(e) {
    // FIXME
  });

  iframe.src = 'file_browserElement_OpenTab.html';
  document.body.appendChild(iframe);
}

addEventListener('testready', runTest);
