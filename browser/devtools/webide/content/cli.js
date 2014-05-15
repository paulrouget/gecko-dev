/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**

  $ firefox --webide 'COMMAND'

  Where COMMAND is a set of "key=value" pairs, separated by '&'.

  --webide 'actions=action1,action2,action3&param1=value1&param2=value2'

  'actions': executed in order. actionN will be executed only if actionN-1 doesn't fail

  actions:
    'addPackagedApp':     Import and select app ('location' parameter must be a directory);
    'connectToRuntime':   Connect to runtime (require 'runtimeType');
    'play':               Start or reload selected app on connected runtime;
    'debug':              Debug selected app or debug 'appID';

  parameters:
    'location':           packaged app directory or hosted app manifest URL;
    'runtimeType':        "usb" or "simulator";
    'runtimeID':          which runtime to use. By default, the most recent USB device or most recent simulator;
    'appID':              App on runtime;

  examples:

      $ firefox --webide "actions=addPackagedApp,connectToRuntime,play&location=/home/bob/Downloads/foobar/&runtimeType=usb"
      Select app located in /home/bob/Downloads/foobar, then
      Connect to USB device, then
      Install app

*/

window.addEventListener("load", function onLoad() {
  window.removeEventListener("load", onLoad);
  if (window.arguments.length > 0) {
    window.handleCommandline(window.arguments[0]);
  }
});

window.handleCommandline = function(cmdline) {
  console.log("External query", cmdline);
  let params = new Map();
  for (let token of cmdline.split("&")) {
    token = token.split("=");
    params.set(token[0], token[1]);
  }
  if (params.has("actions")) {
    return Task.spawn(function* () {
      let actions = params.get("actions").split(",");
      for (let action of actions) {
        if (action in CliActions) {
          console.log("External query - run action", action);
          yield CliActions[action].call(window, params);
        } else {
          console.log("External query - unknown action", action);
        }
      }
    });
  }
}

window.CliActions = {
  addPackagedApp: function(params) {
    return Task.spawn(function* () {
      let location = params.get("location");
      if (!location) {
        throw new Error("No location parameter");
      }

      yield AppProjects.load();

      // Normalize location
      let directory = new FileUtils.File(location);
      if (AppProjects.get(directory.path)) {
        // Already imported
        return;
      }

      yield Cmds.importPackagedApp(location);
    })
  },
  debug: function(params) {
    return Task.spawn(function* () {
      let appID = params.get("appID");
      if (appID) {
        let appToSelect;
        for (let i = 0; i < AppManager.webAppsStore.object.all.length; i++) {
          let app = AppManager.webAppsStore.object.all[i];
          if (app.manifestURL == appID) {
            appToSelect = app;
            break;
          }
        }
        if (!appToSelect) {
          throw new Error("App not found on device");
        }
        AppManager.selectedProject = {
          type: "runtimeApp",
          app: appToSelect,
          icon: appToSelect.iconURL,
          name: appToSelect.name
        };
      }

      if (!AppManager.selectedProject) {
        throw new Error("No project selected");
      }

      let target = yield AppManager.getTarget();
      return UI.showToolbox(target);
    });
  },
  connectToRuntime: function(params) {
    return Task.spawn(function* () {
      yield Cmds.disconnectRuntime();

      if (AppManager.runtimeList.usb.length == 0) {
        // FIXME: Wait 3 seconds
        let deferred = promise.defer();
        setTimeout(deferred.resolve,  3000);
        yield deferred.promise;
      }

      let runtime;
      let runtimeID = params.get("runtimeID");
      let type = params.get("runtimeType");
      switch (type) {
        case "usb":
        case "simulator":
          if (runtimeID) {
            for (let r of AppManager.runtimeList[type]) {
              if (r.getID() == runtimeID) {
                runtime = r;
                break;
              }
            }
          } else {
            let list = AppManager.runtimeList[type];
            runtime = list[list.length - 1];
          }
          if (runtime) {
            let deferred = promise.defer();
            function onListTabsResponse(event, what) {
              if (what == "list-tabs-response") {
                AppManager.off("app-manager-update", onListTabsResponse);
                deferred.resolve();
              }
            }
            AppManager.on("app-manager-update", onListTabsResponse);
            UI.connectToRuntime(runtime).then(() => {}, () => {
              deferred.reject();
            });
            return deferred.promise;
          } else {
            return promise.reject("Can't find any runtime to connect to");
          }
          break;
        default:
          return promise.reject("Unkown runtime");
      }
    })
  },
  play: function(params) {
    return Cmds.play();
  },
}
