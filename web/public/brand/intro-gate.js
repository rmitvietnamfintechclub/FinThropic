// Decides, before the first paint, whether the logo intro plays on this visit.
// Loaded as a blocking script in <head> (src/app/layout.tsx) so the page never flashes before the intro
// and a reload never flashes the white overlay. Sets <html data-intro="play"> or "skip"; CSS shows the
// overlay only for "play". Any error means "skip".
(function () {
  var root = document.documentElement;
  try {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || window.sessionStorage.getItem("finthropic:intro-seen") === "1") {
      root.setAttribute("data-intro", "skip");
      return;
    }
    window.sessionStorage.setItem("finthropic:intro-seen", "1");
    root.setAttribute("data-intro", "play");
  } catch {
    root.setAttribute("data-intro", "skip");
  }
})();
