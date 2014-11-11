/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests if the sidebar is properly updated when a marker is selected.
 */

let test = Task.async(function*() {
  let { target, panel } = yield initTimelinePanel(SIMPLE_URL);
  let { $, $$, EVENTS, TimelineController, TimelineView } = panel.panelWin;

  yield TimelineController.toggleRecording();
  ok(true, "Recording has started.");

  let updated = 0;
  panel.panelWin.on(EVENTS.OVERVIEW_UPDATED, () => updated++);

  yield waitUntil(() => {
    // Wait until we get 3 different markers.
    let markers = TimelineController.getMarkers();
    return markers.some(m => m.name == "Styles") &&
           markers.some(m => m.name == "Reflow") &&
           markers.some(m => m.name == "Paint");
  });

  yield TimelineController.toggleRecording();
  ok(true, "Recording has ended.");

  // Select everything
  TimelineView.overview.setSelection({start:0, end:panel.panelWin.innerWidth});


  let bars = $$(".timeline-marker-waterfall:not(spacer) > .timeline-marker-bar");
  let markers = TimelineController.getMarkers();

  ok(bars.length > 2, "got at least 3 markers");

  let sidebar = $("#timeline-waterfall-details");
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    bar.click();
    let m = markers[i];

    is($("#timeline-waterfall-details .marker-details-type").getAttribute("value"), m.name,
      "sidebar title matches markers name");

    let printedStartTime = $(".marker-details-start .marker-details-labelvalue").getAttribute("value");
    let printedEndTime = $(".marker-details-end .marker-details-labelvalue").getAttribute("value");
    let printedDuration= $(".marker-details-duration .marker-details-labelvalue").getAttribute("value");

    printedStartTime = parseFloat(printedStartTime);
    printedEndTime = parseFloat(printedEndTime);
    printedDuration = parseFloat(printedDuration);

    // Values are rounded. We don't use a strict equality.
    ok(Math.abs(printedStartTime - m.start) <= 0.01, "sidebar start time is valid");
    ok(Math.abs(printedEndTime - m.end) <= 0.01, "sidebar end time is valid");
    ok(Math.abs(printedDuration - (m.end - m.start)) <= 0.01, "sidebar duration is valid");
  }

  yield teardown(panel);
  finish();
});
