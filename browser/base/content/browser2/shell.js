const Cu = Components.utils;
const Ci = Components.interfaces;
const Cc = Components.classes;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/Webapps.jsm");

const BROWSER_DOMAIN = "app://browser.gaiamobile.org/";

let AppsService = Cc["@mozilla.org/AppsService;1"].getService(Ci.nsIAppsService);

function main() {
  window.removeEventListener("DOMContentLoaded", main);
  let iframe = document.querySelector("iframe");
  iframe.focus();
  let manifest = AppsService.getAppByManifestURL(BROWSER_DOMAIN + "manifest.webapp");
  if (manifest) {
    LoadBrowserApp();
  } else {
    Services.obs.addObserver(LoadBrowserApp, "webapps-registry-ready", false);
  }
}
window.addEventListener("DOMContentLoaded", main);

function LoadBrowserApp() {
  let iframe = document.querySelector("iframe");
  let manifest = AppsService.getAppByManifestURL(BROWSER_DOMAIN + "manifest.webapp");
  let app = manifest.QueryInterface(Ci.mozIApplication);
  let docShell = iframe.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);
  docShell.setIsApp(app.localId);
  if (iframe.hasAttribute("src")) {
    iframe.contentWindow.location.reload();
  } else {
    iframe.setAttribute("flex", "1");
    let firstRunBox = document.querySelector("#firstRunBox");
    firstRunBox.setAttribute("hidden", "true");
    iframe.setAttribute("src", BROWSER_DOMAIN + "index.html");
  }
}

function appReload() {
  DOMApplicationRegistry.installFirefoxHTMLApp()
                        .then(LoadBrowserApp);
}
