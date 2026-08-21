/* Boundaries — theme switch.
   Loaded in <head> without defer so the stored theme is applied before first
   paint. A deferred load would show a flash of the light palette first. */
(function () {
  "use strict";
  var KEY = "boundaries-theme";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function resolve() {
    var s = stored();
    return (s === "dark" || s === "light") ? s : (systemPrefersDark() ? "dark" : "light");
  }
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "dark" ? "#14130f" : "#faf8f5");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      b.setAttribute("aria-label", theme === "dark" ? "Switch to light" : "Switch to dark");
      b.title = theme === "dark" ? "Switch to light" : "Switch to dark";
    });
  }

  apply(resolve());

  /* follow the system while the reader has expressed no preference */
  if (window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
        if (!stored()) apply(e.matches ? "dark" : "light");
      });
    } catch (e) {}
  }

  function wire() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-theme-toggle]");
      if (!b) return;
      e.preventDefault();
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch (err) {}
      apply(next);
    });
    apply(document.documentElement.getAttribute("data-theme") || resolve());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();

  /* state pages build their masthead after load, so re-sync then */
  window.addEventListener("load", function () {
    apply(document.documentElement.getAttribute("data-theme") || resolve());
  });

  window.BoundariesTheme = {
    buttonHTML: function () {
      return '<button data-theme-toggle="1" class="theme-toggle" type="button" aria-pressed="false">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path class="theme-toggle__sun" d="M8 3.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6zm0 1.4a3.4 3.4 0 110 6.8 3.4 3.4 0 010-6.8z"/>' +
        '<path class="theme-toggle__sun" d="M8 0h0v2h0zM8 14h0v2h0zM0 8v0h2v0zM14 8v0h2v0z"/>' +
        '<path class="theme-toggle__moon" d="M13.3 10.2A5.6 5.6 0 016.1 3a5.9 5.9 0 107.2 7.2z"/>' +
        '</svg></button>';
    }
  };
})();
