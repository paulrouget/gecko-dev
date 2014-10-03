const Ci = Components.interfaces;
const gDeviceSizeWasPageSize = docShell.deviceSizeIsPageSize;
let gRequiresFloatingScrollbars;
const gFloatingScrollbarsStylesheet = Services.io.newURI("chrome://browser/skin/devtools/floating-scrollbars.css", null, null);

addMessageListener("ResponsiveMode:Start", startResponsiveMode);
addMessageListener("ResponsiveMode:Stop", stopResponsiveMode);
addMessageListener("ResponsiveMode:RequestScreenshot", screenshot);
addMessageListener("ResponsiveMode:NotifyOnResize", notifiyOnResize);
sendAsyncMessage("ResponsiveMode:Init");

function startResponsiveMode({data:data}) {
  removeMessageListener("ResponsiveMode:Start", startResponsiveMode);
  addEventListener("load", makeScrollbarsFloating);
  docShell.deviceSizeIsPageSize = true;
  gRequiresFloatingScrollbars = data.requiresFloatingScrollbars;
  if (docShell.contentViewer) {
    makeScrollbarsFloating();
  }
}

function notifiyOnResize() {
  content.addEventListener("resize", () => {
    sendAsyncMessage("ResponsiveMode:OnContentResize");
  }, false);
}

function stopResponsiveMode() {
  removeMessageListener("ResponsiveMode:Stop", stopResponsiveMode);
  removeMessageListener("ResponsiveMode:RequestScreenshot", screenshot);
  removeMessageListener("ResponsiveMode:NotifyOnResize", notifiyOnResize);
  removeEventListener("load", makeScrollbarsFloating);
  docShell.deviceSizeIsPageSize = gDeviceSizeWasPageSize;
  let allDocShells = [docShell];
  for (let i = 0; i < docShell.childCount; i++) {
    allDocShells.push(docShell.getChildAt(i).QueryInterface(Ci.nsIDocShell));
  }
  for (let d of allDocShells) {
    let win = d.contentViewer.DOMDocument.defaultView;
    let winUtils = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    try {
      winUtils.removeSheet(gFloatingScrollbarsStylesheet, win.AGENT_SHEET);
    } catch(e) { }
  }
  flushStyle();
}

function makeScrollbarsFloating() {
  if (!gRequiresFloatingScrollbars) {
    return;
  }
  let allDocShells = [docShell];
  for (let i = 0; i < docShell.childCount; i++) {
    let child = docShell.getChildAt(i).QueryInterface(Ci.nsIDocShell);
    allDocShells.push(child);
  }
  for (let d of allDocShells) {
    let win = d.contentViewer.DOMDocument.defaultView;
    let winUtils = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    try {
      winUtils.loadSheet(gFloatingScrollbarsStylesheet, win.AGENT_SHEET);
    } catch(e) { }
  }
  flushStyle();
}

function flushStyle() {
  // Force presContext destruction
  let isSticky = docShell.contentViewer.sticky;
  docShell.contentViewer.sticky = false;
  docShell.contentViewer.hide();
  docShell.contentViewer.show();
  docShell.contentViewer.sticky = isSticky;
}

function screenshot() {
  let canvas = content.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  let width = content.innerWidth;
  let height = content.innerHeight;
  canvas.mozOpaque = true;
  canvas.mozImageSmoothingEnabled = true;
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  ctx.drawWindow(content, content.scrollX, content.scrollY, width, height, "#fff");
  sendAsyncMessage("ResponsiveMode:Screenshot", canvas.toDataURL());
}


let WebProgressListener = {
  init: function() {
    let webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebProgress);
    webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_ALL);
  },
  onLocationChange: function onLocationChange() {
    makeScrollbarsFloating();
  },
  QueryInterface: function QueryInterface(aIID) {
    if (aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsISupports)) {
        return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};
WebProgressListener.init();
