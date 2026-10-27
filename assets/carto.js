/* Boundaries — the cartographic layer.
   The page margins are drawn as a survey sheet: tick rulers, the sheet
   number on the left, the coordinates of what is being looked at on the
   right. The homepage and each state page also carry a ticker of retired
   constituencies, read from the live state records.
   Loaded on every page by theme.js; styles are in styles.css (v3). */
(function () {
  "use strict";
  if (window.__bdCartoLoaded) return;
  window.__bdCartoLoaded = true;

  /* approximate geographic centres, to one decimal place */
  var CENTRES = {
    "india":             [22.9, 79.6],
    "andhra-pradesh":    [15.9, 79.7],
    "arunachal-pradesh": [28.2, 94.7],
    "assam":             [26.2, 92.9],
    "bihar":             [25.6, 85.6],
    "chhattisgarh":      [21.3, 81.9],
    "delhi":             [28.6, 77.2],
    "goa":               [15.3, 74.1],
    "gujarat":           [22.3, 71.2],
    "haryana":           [29.1, 76.1],
    "himachal-pradesh":  [31.9, 77.2],
    "jammu-kashmir":     [33.7, 75.1],
    "jharkhand":         [23.6, 85.3],
    "karnataka":         [15.0, 75.7],
    "kerala":            [10.4, 76.4],
    "madhya-pradesh":    [23.5, 78.7],
    "maharashtra":       [19.4, 76.1],
    "manipur":           [24.7, 93.9],
    "meghalaya":         [25.5, 91.4],
    "mizoram":           [23.2, 92.8],
    "nagaland":          [26.1, 94.6],
    "odisha":            [20.5, 84.4],
    "puducherry":        [11.9, 79.8],
    "punjab":            [30.9, 75.4],
    "rajasthan":         [26.6, 73.8],
    "sikkim":            [27.5, 88.5],
    "tamil-nadu":        [11.1, 78.4],
    "telangana":         [17.9, 79.0],
    "tripura":           [23.8, 91.6],
    "uttar-pradesh":     [26.9, 80.9],
    "uttarakhand":       [30.1, 79.2],
    "west-bengal":       [23.0, 87.9]
  };

  var self = document.querySelector('script[src*="carto.js"]');
  var ASSETS = self ? self.getAttribute("src").replace(/carto\.js.*$/, "") : "assets/";
  var ROOT = ASSETS.replace(/assets\/$/, "");
  var SLUG = new URLSearchParams(location.search).get("state");
  /* set in start(): this script is injected dynamically, so it can run      before the body has been parsed */   var IS_HOME = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function coord(slug) {
    var c = CENTRES[slug] || CENTRES.india;
    return c[0].toFixed(1) + "° N · " + c[1].toFixed(1) + "° E";
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function getJSON(url) {
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  /* ---- favicon ----------------------------------------------------- */

  function favicon() {
    var l = document.querySelector('link[rel="icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
    l.type = "image/svg+xml";
    l.href = ASSETS + "logo-mark.svg";
  }

  /* ---- margins ------------------------------------------------------ */

  var right = null;

  function margins(sheetText, coordText) {
    ["l", "r"].forEach(function (s) {
      var r = document.createElement("div");
      r.className = "sheet-ruler sheet-ruler--" + s;
      r.setAttribute("aria-hidden", "true");
      document.body.appendChild(r);
    });
    var left = document.createElement("div");
    left.className = "sheet-margin sheet-margin--l";
    left.setAttribute("aria-hidden", "true");
    left.textContent = sheetText;
    document.body.appendChild(left);
    right = document.createElement("div");
    right.className = "sheet-margin sheet-margin--r";
    right.setAttribute("aria-hidden", "true");
    right.textContent = coordText;
    document.body.appendChild(right);
  }
  function setRight(t) { if (right) right.textContent = t; }

  /* ---- ticker ------------------------------------------------------- */

  function retired(data, slug, stateName) {
    var year = data.post_order_year || 2008;
    var newNames = {};
    (data.post2008_constituencies || []).forEach(function (n) { newNames[n.ac_no] = n.name; });
    var out = [];
    (data.constituencies || []).forEach(function (c) {
      var fate;
      if (c.status === "abolished") fate = "abolished " + year;
      else if (c.status === "renamed") {
        var to = (c.dest || []).map(function (n) { return newNames[n]; }).filter(Boolean)[0];
        fate = to ? "renamed " + to : "renamed " + year;
      } else return;
      out.push({ name: c.name, slug: slug, where: (stateName ? stateName + " · " : "") + "AC " + c.ac_no, fate: fate });
    });
    return out;
  }

  function ticker(items, mountAfter, label) {
    if (!items.length || !mountAfter || !mountAfter.parentNode) return;
    var one = items.map(function (it) {
      return '<span class="seat-ticker__item">' +
        '<a href="' + ROOT + "state.html?state=" + encodeURIComponent(it.slug) + '">' + esc(it.name) + "</a>" +
        "<span>" + esc(it.where) + "</span>" +
        '<span class="fate">' + esc(it.fate) + "</span>" +
        '</span><i class="seat-ticker__sep" aria-hidden="true"></i>';
    }).join("");
    var el = document.createElement("div");
    el.className = "seat-ticker";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", label);
    el.innerHTML =
      '<div class="seat-ticker__label">' + esc(label) + "</div>" +
      '<div class="seat-ticker__view"><div class="seat-ticker__track">' + one +
      '<span aria-hidden="true" style="display:contents">' + one + "</span></div></div>";
    el.style.setProperty("--ticker-dur", Math.max(40, items.length * 6) + "s");
    mountAfter.parentNode.insertBefore(el, mountAfter.nextSibling);
  }

  /* ---- pages -------------------------------------------------------- */

  function home(manifest) {
    var states = manifest.states || [];
    var live = states.filter(function (s) { return s.status === "live"; });
    margins("Index to " + states.length + " sheets · " + live.length + " published", coord("india"));

    /* coordinates follow the pointer over the India map */
    var wrap = document.getElementById("india-map-wrap");
    var legend = document.querySelector(".map-legend");
    var read = document.createElement("div");
    read.className = "coord-read";
    var names = {};
    states.forEach(function (s) { names[s.slug] = s.name; });
    function show(slug) {
      var t = coord(slug);
      read.innerHTML = "<b>" + esc(slug ? names[slug] || slug : "India") + "</b> · " + t;
      setRight(t + " · " + (slug ? names[slug] || slug : "India"));
    }
    if (legend) legend.parentNode.insertBefore(read, legend.nextSibling);
    show(null);
    if (wrap) {
      wrap.addEventListener("mouseover", function (e) {
        var s = e.target.closest && e.target.closest(".state");
        if (s && s.dataset.slug) show(s.dataset.slug);
      });
      wrap.addEventListener("mouseleave", function () { show(null); });
    }

    /* a few states' retired seats, mixed */
    var pick = shuffle(live.slice()).slice(0, 4);
    Promise.all(pick.map(function (s) {
      return getJSON(ROOT + "states/" + s.slug + "/data.json").then(function (d) {
        return d ? shuffle(retired(d, s.slug, s.name)).slice(0, 6) : [];
      });
    })).then(function (lists) {
      var items = shuffle([].concat.apply([], lists));
      var heroWrap = document.querySelector(".hero-grid");
      ticker(items, heroWrap && heroWrap.parentNode, "Retired seats");
    });
  }

  function statePage(manifest) {
    var states = manifest.states || [];
    var i = -1;
    states.forEach(function (s, k) { if (s.slug === SLUG) i = k; });
    if (i < 0) return;
    var entry = states[i];
    margins("Sheet " + pad2(i + 1) + " of " + states.length + " · " + entry.name,
            coord(SLUG) + " · " + entry.name);
    if (entry.status !== "live") return;

    getJSON(ROOT + "states/" + SLUG + "/data.json").then(function (d) {
      if (!d) return;
      var items = shuffle(retired(d, SLUG, null)).slice(0, 40);
      /* state.js renders the page after its own fetch; wait for the hero */
      var tries = 0;
      (function place() {
        var hero = document.querySelector(".state-hero");
        if (hero) ticker(items, hero, "Retired here");
        else if (tries++ < 60) setTimeout(place, 100);
      })();
    });
  }

  function otherPage() {
    var t = (document.title || "").split(/\s*[·|—-]\s*/)[0] || "Boundaries";
    margins("Boundaries · " + t, coord("india") + " · India");
  }

  function start() {     IS_HOME = !!document.getElementById("india-map-wrap");
    favicon();
    if (!IS_HOME && !SLUG) { otherPage(); return; }
    getJSON(ROOT + "states/manifest.json").then(function (m) {
      if (!m) return;
      if (IS_HOME) home(m); else statePage(m);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
