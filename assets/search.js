/* Boundaries — global seat search.
   Reads live states/<slug>/data.json on first use, caches for the session.
   No build step: adding a state to the manifest is enough. */
(function () {
  "use strict";

  var index = null;        // null = not loaded, [] = loading finished
  var loading = false;
  var q = "";
  var manifestStates = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }

  /* ---- markup ------------------------------------------------- */

  function barHTML() {
    return '' +
      '<div class="gsearch">' +
      '  <input id="gsearch-input" type="text" autocomplete="off" spellcheck="false"' +
      '         placeholder="Search any seat, any state\u2026"' +
      '         aria-label="Search constituencies across all published states">' +
      '  <div id="gsearch-drop" class="gsearch__drop" role="listbox"></div>' +
      '</div>';
  }

  function mount() {
    var links = document.querySelector(".masthead__links");
    if (!links) return null;
    var holder = document.createElement("span");
    holder.className = "gsearch-holder";
    holder.innerHTML = barHTML();
    links.parentNode.insertBefore(holder, links);
    return holder;
  }

  /* ---- index -------------------------------------------------- */

  async function buildIndex() {
    if (loading || index) return;
    loading = true;
    render();

    var live = manifestStates.filter(function (s) { return s.status === "live"; });

    var results = await Promise.all(live.map(async function (s) {
      try {
        var d = await (await fetch("states/" + s.slug + "/data.json")).json();
        var out = [];
        var preY  = d.pre_order_year  || 1976;
        var postY = d.post_order_year || 2008;

        (d.constituencies || []).forEach(function (c) {
          out.push({
            name: c.name, no: c.ac_no, dist: c.district, type: c.type,
            slug: s.slug, state: s.name, year: preY, side: "old"
          });
        });
        (d.post2008_constituencies || []).forEach(function (c) {
          out.push({
            name: c.name, no: c.ac_no, dist: c.district, type: c.type,
            slug: s.slug, state: s.name, year: postY, side: "new"
          });
        });
        return out;
      } catch (e) { return []; }
    }));

    index = [].concat.apply([], results);
    loading = false;
    render();
  }

  /* ---- matching ----------------------------------------------- */

  function score(row, needle) {
    var n = row.name.toLowerCase();
    if (n === needle) return 0;
    if (n.indexOf(needle) === 0) return 1;
    if (n.indexOf(needle) !== -1) return 2;
    if ((row.dist || "").toLowerCase().indexOf(needle) !== -1) return 3;
    if ((row.state || "").toLowerCase().indexOf(needle) !== -1) return 4;
    return -1;
  }

  function search(needle) {
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var sc = score(index[i], needle);
      if (sc !== -1) hits.push({ r: index[i], s: sc });
    }
    hits.sort(function (a, b) {
      if (a.s !== b.s) return a.s - b.s;
      if (a.r.state !== b.r.state) return a.r.state < b.r.state ? -1 : 1;
      return a.r.year - b.r.year;
    });
    return hits.slice(0, 40).map(function (h) { return h.r; });
  }

  /* ---- render ------------------------------------------------- */

  function render() {
    var drop = document.getElementById("gsearch-drop");
    if (!drop) return;

    var needle = q.trim().toLowerCase();
    if (needle.length < 2) { drop.classList.remove("is-open"); return; }
    drop.classList.add("is-open");

    if (loading || !index) {
      drop.innerHTML = '<div class="gsearch__msg">Reading the register\u2026</div>';
      return;
    }

    var rows = search(needle);
    if (!rows.length) {
      drop.innerHTML = '<div class="gsearch__msg">No seat, district or state matches \u201c' +
        esc(q.trim()) + '\u201d</div>';
      return;
    }

    drop.innerHTML = rows.map(function (r) {
      var href = "state.html?state=" + encodeURIComponent(r.slug) +
                 "&seat=" + r.no + "&order=" + r.side;
      return '<a class="gsearch__row" href="' + href + '" role="option">' +
        '<span class="gsearch__yr' + (r.side === "new" ? " is-new" : "") + '">' + r.year + '</span>' +
        '<span class="gsearch__no">' + String(r.no).padStart(3, "0") + '</span>' +
        '<span class="gsearch__nm">' + esc(r.name) +
          (r.type === "SC" ? ' <span class="gsearch__tag">SC</span>' : "") +
          (r.type === "ST" ? ' <span class="gsearch__tag is-st">ST</span>' : "") +
        '</span>' +
        '<span class="gsearch__meta">' + esc(r.dist) + '</span>' +
        '<span class="gsearch__st">' + esc(r.state) + '</span>' +
        '</a>';
    }).join("");
  }

  /* ---- wire --------------------------------------------------- */

  async function init() {
    var m;
    try { m = await (await fetch("states/manifest.json")).json(); }
    catch (e) { return; }
    manifestStates = m.states || [];

    var holder = mount();
    if (!holder) return;

    var input = document.getElementById("gsearch-input");
    var drop = document.getElementById("gsearch-drop");

    input.addEventListener("focus", buildIndex);
    input.addEventListener("input", function () { q = input.value; buildIndex(); render(); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; q = ""; render(); input.blur(); }
      if (e.key === "Enter") {
        var first = drop.querySelector(".gsearch__row");
        if (first) window.location.href = first.getAttribute("href");
      }
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".gsearch")) drop.classList.remove("is-open");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault(); input.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
