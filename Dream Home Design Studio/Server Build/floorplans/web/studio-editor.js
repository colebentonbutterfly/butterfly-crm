// Save indicator and Projects button for the editor page.
// studioStatus() is called by the editor's writingObserver (see patch-editor.sh).
(function () {
  "use strict";
  var state = "idle";
  var hideTimer = null;
  var lastInput = 0;

  function el() { return document.getElementById("studio-status"); }

  function show(text, problem, persist) {
    var status = el();
    if (!status) return;
    clearTimeout(hideTimer);
    status.textContent = text;
    status.classList.toggle("problem", !!problem);
    status.classList.add("visible");
    if (!persist) {
      hideTimer = setTimeout(function () { status.classList.remove("visible"); }, 1800);
    }
  }

  window.studioStatus = function (kind, errorStatus, errorText) {
    state = kind;
    switch (kind) {
      case "saving": show("Saving…", false, true); break;
      case "saved": show("Saved", false, false); break;
      case "failed":
        show("Not saved (" + (errorStatus || "error") + "). Changes are kept and will retry.", true, true);
        if (window.console) console.error("Save failed", errorStatus, errorText);
        break;
      case "offline": show("Offline. Changes will save when the connection is back.", true, true); break;
      case "online": show("Back online", false, false); break;
    }
  };

  // Remember recent drawing so the Projects button can let the pending
  // save (sent about a second after the last change) go out first.
  ["pointerup", "touchend", "keyup", "mouseup"].forEach(function (type) {
    window.addEventListener(type, function (event) {
      if (event.target.closest && event.target.closest("#studio-back")) return;
      lastInput = Date.now();
    }, true);
  });

  document.addEventListener("click", function (event) {
    var back = event.target.closest && event.target.closest("#studio-back");
    if (!back) return;
    event.preventDefault();
    var started = Date.now();
    show("Saving…", false, true);
    (function waitForSave() {
      var quietFor = Date.now() - lastInput;
      var waited = Date.now() - started;
      if ((state !== "saving" && quietFor > 1600) || waited > 8000) {
        location.href = back.getAttribute("href");
      } else {
        setTimeout(waitForSave, 200);
      }
    })();
  });
})();
