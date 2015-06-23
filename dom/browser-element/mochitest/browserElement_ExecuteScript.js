/* Any copyright is dedicated to the public domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Bug 1174733 - Browser API: iframe.executeScript

'use strict';

SimpleTest.waitForExplicitFinish();
browserElementTestHelpers.setEnabledPref(true);
browserElementTestHelpers.addPermission();
SpecialPowers.addPermission("browser:universalxss", true, window.document);

addEventListener('unload', function() {
  SpecialPowers.removePermission("browser:universalxss", window.document);
});

function runTest() {

  let iframe = document.createElement('iframe');
  iframe.setAttribute('mozbrowser', 'true');
  iframe.src = 'data:text/html,foo';

  // Test if all key=>value pairs in o1 are present in o2.
  const c = (o1, o2) => Object.keys(o1).every(k => o1[k] == o2[k]);

  let scriptId = 0;

  const bail = () => {
    ok(false, `scriptId: ${scriptId++}`);
  }

  iframe.addEventListener('mozbrowserloadend', function onload() {
    iframe.removeEventListener('mozbrowserloadend', onload);

    iframe.executeScript('4 + 4').then(rv => {
      is(rv, 8, `scriptId: ${scriptId++}`);
      return iframe.executeScript('(() => {return {a:42}})()')
    }, bail).then(rv => {
      ok(c(rv, {a:42}), `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
          new Promise((resolve, reject) => {
            resolve(document.body.textContent);
          });
      `)
    }, bail).then(rv => {
      is(rv, 'foo', `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
          new Promise((resolve, reject) => {
            resolve({a:43,b:34});
          });
      `)
    }, bail).then(rv => {
      ok(c(rv, {a:43,b:34}), `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
        … syntax error
      `);
    }, bail).then(bail, (error) => {
      is(error.name, 'SyntaxError: illegal character', `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
        window
      `);
    }).then(bail, (error) => {
      is(error.name, 'Script last expression must be a promise or a JSON object', `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
          new Promise((resolve, reject) => {
            reject('BOOM');
          });
      `);
    }).then(bail, (error) => {
      is(error.name, 'BOOM', `scriptId: ${scriptId++}`);
      return iframe.executeScript(`
          new Promise((resolve, reject) => {
            resolve(window);
          });
      `);
    }).then(bail, (error) => {
      is(error.name, 'Value returned (resolve) by promise is not a valid JSON object', `scriptId: ${scriptId++}`);
      return iframe.executeScript('42', { url: 'data:text/html,foo' });
    }).then(rv => {
      is(rv, 42, `scriptId: ${scriptId++}`);
      return iframe.executeScript('43', { url: 'http://foo.com' });
    }, bail).then(bail, (error) => {
      is(error.name, 'URL mismatches', `scriptId: ${scriptId++}`);
      return iframe.executeScript('43', { url: '_' });
    }, bail).then(bail, (error) => {
      is(error.name, 'Malformed URL', `scriptId: ${scriptId++}`);
      ok(scriptId, 10, 'all scripts ran');
      SimpleTest.finish();
    });
  });

  document.body.appendChild(iframe);
}

addEventListener('testready', runTest);
