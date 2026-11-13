/* "How Sharad Pawar redrew the map for his daughter": interactive plates.
   Every figure is drawn in ink from data and answers in a sentence (.say)
   when the reader touches it.
   Geometry: the archive's Maharashtra segments (pc-map.json: the 2008 seats
   and precomputed outlines; pune-seats.json: Pune district on both maps).
   Numbers: the essay's own figures and method notes. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* The sheet margins (carto.js draws the running title and the coordinates
     down the sides) crowd the cover, so hold them back until it is scrolled
     past. The body class also scopes those rules to this page. */
  (function () {
    function go() {
      var b = document.body; if (!b) return;
      b.classList.add("ess-page");
      var cover = document.querySelector(".cover");
      if (!cover) { b.classList.add("past-cover"); return; }
      function set() {
        var past = cover.getBoundingClientRect().bottom < 120;
        b.classList.toggle("past-cover", past);
      }
      set();
      addEventListener("scroll", set, { passive: true });
      addEventListener("resize", set);
    }
    if (document.body) go(); else addEventListener("DOMContentLoaded", go);
  })();
  var NS = "http://www.w3.org/2000/svg", BASE = "media/pawar/";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- small helpers ---------------------------------------------------- */
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function h(t, c, html, p) { var e = document.createElement(t); if (c) e.className = c; if (html != null) e.innerHTML = html; if (p) p.appendChild(e); return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function inr(n) { return Math.round(n).toLocaleString("en-IN"); }
  function N(n) { return '<span class="n">' + inr(n) + "</span>"; }
  var resizers = [], rt;
  function onResize(fn) { resizers.push(fn); }
  addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resizers.forEach(function (f) { f(); }); }, 160); });
  function tween(from, to, ms, step) {
    if (reduce) { step(to); return; }
    var t0 = performance.now(), done = false;
    /* a background tab never runs animation frames: land on the value anyway */
    setTimeout(function () { if (!done) { done = true; step(to); } }, ms + 400);
    (function f(t) { if (done) return; var u = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - u, 3); step(from + (to - from) * e); if (u < 1) requestAnimationFrame(f); else done = true; })(t0);
  }

  var PARTY = {
    NCP: ["the NCP", "--k-ncp", "NCP"], NCPSP: ["the NCP (Sharad Pawar)", "--k-ncpsp", "NCP (Sharad Pawar)"], SHS: ["the Shiv Sena", "--k-shs", "Shiv Sena"],
    INC: ["the Congress", "--k-inc", "Congress"], BJP: ["the BJP", "--k-bjp", "BJP"], IND: ["no party, as an independent", "--k-ind", "Independent"],
    "RPI(A)": ["the RPI (Athawale)", "--k-rpi", "RPI (Athawale)"], JSS: ["the Jan Surajya Shakti", "--k-jss", "Jan Surajya Shakti"],
    MNS: ["the MNS", "--k-mns", "MNS"], SWP: ["the Swabhimani Paksha", "--k-swp", "Swabhimani Paksha"]
  };
  function pcol(p) { return "var(" + (PARTY[p] ? PARTY[p][1] : "--k-ind") + ")"; }
  function pthe(p) { return PARTY[p] ? PARTY[p][0] : p; }
  function pshort(p) { return PARTY[p] ? PARTY[p][2] : p; }
  function keyOf(list) { return list.map(function (p) { return '<span><i style="--c:' + pcol(p) + '"></i>' + pshort(p) + "</span>"; }).join(""); }

  var SEATCOL = { Maval: "var(--s-maval)", Pune: "var(--s-pune)", Baramati: "var(--s-baramati)", Shirur: "var(--s-shirur)" };
  var WIN = {
    Maval: ["Gajanan Babar", "SHS", 80619], Shirur: ["Shivajirao Adhalrao Patil", "SHS", 178611], Pune: ["Suresh Kalmadi", "INC", 0],
    Baramati: ["Supriya Sule", "NCP", 336831], Madha: ["Sharad Pawar", "NCP", 314459], Satara: ["Udayanraje Bhosale", "NCP", 297515],
    Solapur: ["Sushilkumar Shinde", "INC", 0]
  };
  var BIG = { Baramati: 1, Madha: 1, Satara: 1 };
  /* the Commission's draft: the six segments that sat in another seat */
  var DRAFT = { 205: "Baramati", 210: "Baramati", 207: "Maval", 213: "Pune", 199: "Shirur", 200: "Shirur" };
  var SWAP = { 199: "Shirur", 213: "Baramati" };

  /* ---- text and plates settle in; nothing may stay invisible ---------- */
  var fade = document.querySelectorAll(".body > p, .body > h2, .plate");
  function reveal(n) { n.classList.add("in"); }
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    fade.forEach(function (n) { io.observe(n); });
    setTimeout(function () { fade.forEach(reveal); }, 4000);
  } else fade.forEach(reveal);

  /* ---- a figure: its body, its sentence, its tooltip ------------------- */
  /* what each figure asks the reader to do, in its own terms */
  var HINTS = {
    f1: "Touch any seat to see who won it, and by how much",
    f2: "Drag the handle across the map, or touch a seat",
    f3: "Choose a seat to see how far it stretches",
    f4: "Drag the handle, then choose an election",
    fw: "Deal the hundred again, or gather the nineteen",
    ft: "Touch an election to compare the two grounds",
    f5: "Touch a block, or a circle for one election",
    f6: "Switch between the line as drawn and the swap",
    f7: "Touch any point on the two lines",
    f8: "Touch a block, or a circle for one election",
    f9: "Touch a block, or a circle for one election",
    f10: "Switch the plan and watch the dots move",
    f11: "Touch a name to follow a career, or a dot for one contest",
    f12: "Touch a piece to follow one old seat"
  };

  function fig(id) {
    var r = document.getElementById(id); if (!r) return null;
    var tip = h("div", "tip", null, r), sayEl = r.querySelector(".say");
    if (HINTS[id]) {
      var b = r.querySelector(".ix__body");
      var hn = h("p", "hint hint--do", HINTS[id]);
      b.insertBefore(hn, b.firstChild);
    }
    return {
      root: r, body: r.querySelector(".ix__body"),
      say: function (t) { sayEl.innerHTML = t; },
      tip: function (html, e) {
        tip.innerHTML = html; tip.classList.add("on");
        var q = r.getBoundingClientRect(), x = e.clientX - q.left + 14, y = e.clientY - q.top + 16;
        if (x + 250 > q.width) x = Math.max(4, e.clientX - q.left - 250);
        tip.style.left = x + "px"; tip.style.top = y + "px";
      },
      untip: function () { tip.classList.remove("on"); }
    };
  }
  function chips(parent, labels, pick) {
    var box = h("div", "opts", null, parent);
    var bs = labels.map(function (l, i) { var b = h("button", "opt", l, box); b.type = "button"; b.addEventListener("click", function () { set(i); }); return b; });
    function set(i) { bs.forEach(function (b, j) { b.setAttribute("aria-pressed", j === i); }); pick(i); }
    return set;
  }

  /* ---- ink maps ---------------------------------------------------------- */
  var uid = 0;
  function hatch(svg, color, k) {
    svg._h = svg._h || {};
    if (svg._h[color]) return svg._h[color];
    var defs = svg.querySelector("defs") || el("defs", {}, svg), id = "hx" + (++uid), w = 3 * k;
    var p = el("pattern", { id: id, width: w, height: w, patternUnits: "userSpaceOnUse", patternTransform: "rotate(40)" }, defs);
    el("rect", { width: w, height: w, fill: color, opacity: .13 }, p);
    el("line", { x1: 0, y1: 0, x2: 0, y2: w, stroke: color, "stroke-width": 1 * k }, p);
    return (svg._h[color] = "url(#" + id + ")");
  }
  function dBox(d) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    (d.match(/-?[\d.]+[ ,]-?[\d.]+/g) || []).forEach(function (p) {
      var q = p.split(/[ ,]/), x = +q[0], y = +q[1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    });
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function boxOf(acs, list, pad) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (n) { var b = dBox(acs[n].d); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[0] + b[2]); y1 = Math.max(y1, b[1] + b[3]); });
    return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
  }
  /* o: vb, fill(n) -> colour | null, lines [[d, px, colour]], rings [n], km [a, b],
        labels [[x, y, text, px, style, weight, dy]], hover(n, e), leave() */
  function drawMap(svg, acs, o) {
    svg.textContent = ""; svg._h = null;
    svg.style.overflow = "hidden";   /* a map keeps to its frame */
    var vb = o.vb; svg.setAttribute("viewBox", vb.join(" "));
    var W = svg.getBoundingClientRect().width || o.px || 600, k = vb[2] / W, paths = {};
    var g = el("g", {}, svg);
    Object.keys(acs).forEach(function (n) {
      var c = o.fill ? o.fill(n) : null;
      var p = el("path", { d: acs[n].d, fill: c ? hatch(svg, c, k) : "transparent", stroke: "var(--ink-25)", "stroke-width": .7, "vector-effect": "non-scaling-stroke" }, g);
      p.style.transition = "opacity .25s";
      paths[n] = p;
      if (o.hover) {
        p.style.cursor = "pointer";
        p.addEventListener("mousemove", function (e) { o.hover(n, e); });
        p.addEventListener("click", function (e) { o.hover(n, e); });
        p.addEventListener("mouseleave", function () { if (o.leave) o.leave(n); });
      }
    });
    (o.lines || []).forEach(function (l) { el("path", { d: l[0], fill: "none", stroke: l[2] || "var(--ink)", "stroke-width": l[1], "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }, svg); });
    (o.rings || []).forEach(function (n) { el("path", { d: acs[n].d, fill: "none", stroke: "var(--amend)", "stroke-width": 2.2, "stroke-dasharray": "4 3", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }, svg); });
    if (o.km) {
      var a = o.km[0], b = o.km[1];
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "var(--ink)", "stroke-width": 1.6, "stroke-dasharray": "2 5", "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }, svg);
      [a, b].forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 3.6 * k, fill: "var(--ink)" }, svg); });
    }
    (o.labels || []).forEach(function (l) {
      var t = el("text", { x: l[0], y: l[1] + (l[6] || 0) * k, "text-anchor": "middle", "font-size": l[3] * k, "font-style": l[4] || "italic", "font-weight": l[5] || 400 }, svg);
      t.style.strokeWidth = l[3] * .26 * k + "px"; t.textContent = l[2];
    });
    return paths;
  }
  /* two maps on one frame, parted by a handle the reader drags */
  function compare(F, labL, labR) {
    var box = h("div", "cmp", null, F.body), a = h("div", "cmp__l", null, box), b = h("div", "cmp__l cmp__top", null, box);
    var sb = el("svg", { role: "img", "aria-label": labR.replace(/&\w+;/g, " ") }, a), st = el("svg", { role: "img", "aria-label": labL.replace(/&\w+;/g, " ") }, b);
    h("span", "cmp__lab cmp__lab--l", labL, box); h("span", "cmp__lab cmp__lab--r", labR, box);
    var hd = h("div", "cmp__h", '<button type="button" class="cmp__k" aria-label="Drag, or use the arrow keys, to compare the two maps">&#8596;</button>', box);
    var x = 50, drag = false, onMove = null;
    function set(v) { x = Math.max(3, Math.min(97, v)); box.style.setProperty("--x", x + "%"); if (onMove) onMove(x); }
    function to(px) { var r = box.getBoundingClientRect(); set((px - r.left) / r.width * 100); }
    box.addEventListener("pointerdown", function (e) { drag = true; to(e.clientX); });
    addEventListener("pointermove", function (e) { if (drag) to(e.clientX); });
    addEventListener("pointerup", function () { drag = false; });
    hd.firstChild.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); set(x + (e.key === "ArrowLeft" ? -5 : 5)); }
    });
    /* one slow sweep the first time it is seen, so it is plain that it moves */
    if (!reduce && "IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; seen.disconnect();
        var t0 = performance.now();
        (function f(t) { var u = Math.min(1, (t - t0) / 1800); if (!drag) set(50 + Math.sin(u * Math.PI * 2) * 20); if (u < 1 && !drag) requestAnimationFrame(f); })(t0);
      }, { threshold: .55 });
      seen.observe(box);
    }
    return { top: st, bottom: sb, moved: function (fn) { onMove = fn; } };
  }

  /* =======================================================================
     Figures that need the Lok Sabha geometry
     ======================================================================= */
  fetch(BASE + "pc-map.json").then(function (r) { return r.json(); }).then(function (G) {
    var puneVb = boxOf(G.acs, [].concat(G.pcs.Maval, G.pcs.Pune, G.pcs.Baramati, G.pcs.Shirur), 4);
    function seatLabel(p, px, dy) { var c = G.pcc[p], x = c[0], y = c[1]; if (p === "Pune") { x -= 15; y -= 11; } if (p === "Maval") x -= 4; return [x, y, p, px, "italic", 400, dy || 0]; }

    /* ---- Figure 1 ---- */
    (function () {
      var F = fig("f1"); if (!F) return;
      var svg = el("svg", { role: "img", "aria-label": "The seven Lok Sabha seats from the Raigad coast to Solapur, hatched by the party that won each in 2009" }, F.body);
      h("div", "key", keyOf(["NCP", "SHS", "INC"]), F.body);
      var NOTE = {
        Baramati: "<b>Baramati.</b> Supriya Sule won her first Lok Sabha election by " + N(336831) + ", the largest margin in Maharashtra.",
        Madha: "<b>Madha.</b> A seat that did not exist before 2009. Sharad Pawar won it by " + N(314459) + ".",
        Satara: "<b>Satara.</b> Held by " + N(3957) + " votes in 2004. Udayanraje Bhosale won the redrawn seat by " + N(297515) + ".",
        Shirur: "<b>Shirur.</b> Built from the abolished Khed. Shivajirao Adhalrao Patil of the Shiv Sena won it by " + N(178611) + ".",
        Maval: "<b>Maval.</b> A new seat from the coast to the plateau. Gajanan Babar of the Shiv Sena won it by " + N(80619) + ".",
        Pune: "<b>Pune.</b> The city seat, won in 2009 by Suresh Kalmadi of the Congress.",
        Solapur: "<b>Solapur.</b> Won in 2009 by Sushilkumar Shinde of the Congress."
      };
      var REST = "The three largest margins in Maharashtra in 2009 were Baramati, Madha and Satara, side by side.";
      function render() {
        var labels = [];
        Object.keys(WIN).forEach(function (p) {
          labels.push(seatLabel(p, BIG[p] ? 17 : 13.5));
          if (BIG[p]) { var l = seatLabel(p, 15, 19); l[2] = inr(WIN[p][2]); l[4] = "normal"; l[5] = 500; labels.push(l); }
        });
        var paths = drawMap(svg, G.acs, {
          vb: G.vb, labels: labels,
          fill: function (n) { var p = G.acs[n].pc; return p ? pcol(WIN[p][1]) : null; },
          lines: Object.keys(G.pcline).map(function (p) { return [G.pcline[p], BIG[p] ? 2.2 : 1.2]; }),
          hover: function (n) {
            var p = G.acs[n].pc; if (!p) return rest();
            Object.keys(paths).forEach(function (m) { paths[m].style.opacity = G.acs[m].pc === p ? 1 : .25; });
            F.say(NOTE[p]);
          },
          leave: rest
        });
        function rest() { Object.keys(paths).forEach(function (m) { paths[m].style.opacity = 1; }); F.say(REST); }
        rest();
      }
      render(); onResize(render);
    })();

    /* ---- Figure 3: how long is a seat ---- */
    (function () {
      var F = fig("f3"); if (!F) return;
      var svg = el("svg", { role: "img", "aria-label": "The chosen seat, with a line across its longest stretch" }, F.body);
      var OPT = [
        ["draftShirur", "The Commission's draft Shirur", 216, [195, 196, 197, 198, 199, 200], SEATCOL.Shirur, "The letters called this Shirur too long for one MP to cover: <b>216 km</b> from tip to tip."],
        ["Baramati", "The Baramati the letters proposed, and got", 203, G.pcs.Baramati, SEATCOL.Baramati, "The Baramati the same letters asked for runs <b>203 km</b>, one of the longest seats in the state. Nobody objected."],
        ["draftBaramati", "The Commission's own draft Baramati", 153, [201, 202, 203, 205, 210, 211], SEATCOL.Baramati, "The Baramati the Commission first drew was far more compact: <b>153 km</b>."],
        ["swapShirur", "Shirur, had it been given Daund", 169, [195, 196, 197, 198, 199, 207], SEATCOL.Shirur, "With Daund in place of Hadapsar, Shirur would run <b>169 km</b>, and stay in one piece."]
      ];
      var rules = h("div", "rules", null, F.body), cur = 0;
      var btns = OPT.map(function (o, i) {
        var b = h("button", "rule", '<span class="rule__n">' + o[1] + '</span><span class="rule__b"><i style="--c:' + o[4] + ";--w:" + (o[2] / 216 * 100) + '%"></i></span><span class="rule__k">' + o[2] + " km</span>", rules);
        b.type = "button"; b.addEventListener("click", function () { pick(i); }); return b;
      });
      function pick(i) {
        cur = i; var o = OPT[i], set = {}; o[3].forEach(function (n) { set[n] = 1; });
        btns.forEach(function (b, j) { b.setAttribute("aria-pressed", j === i); });
        var x = G.ext[o[0]], a = x.diam[0], b = x.diam[1];
        drawMap(svg, G.acs, {
          vb: puneVb, fill: function (n) { return set[n] ? o[4] : null; }, lines: [[x.d, 2]], km: [a, b],
          labels: [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, o[2] + " km", 24, "normal", 500, -12]],
          hover: function (n, e) { F.tip("<b>" + esc(G.acs[n].name) + "</b>" + (set[n] ? "<br>in this seat" : ""), e); }, leave: F.untip
        });
        F.say(o[5]);
      }
      pick(0); onResize(function () { pick(cur); });
    })();

    /* ---- Figure 4: the draft against the final, and Baramati's vote under each ---- */
    (function () {
      var F = fig("f4"); if (!F) return;
      var C = compare(F, "The draft &middot; 28 March 2006", "The final Order &middot; 31 July 2006");
      var changed = Object.keys(DRAFT);
      function draw(svg, asg, which) {
        var seatOf = function (n) { return asg[n] || G.acs[n].pc; };
        var labels = ["Maval", "Pune", "Baramati", "Shirur"].map(function (p) { var l = seatLabel(p, 16); if (p === "Shirur") l[1] -= 14; if (p === "Baramati") l[1] += 8; return l; });
        var small = svg.getBoundingClientRect().width < 520;
        changed.forEach(function (n) { var a = G.acs[n]; if (small && n != 199 && n != 200) return; labels.push([a.c[0], a.c[1], a.name, 12.5, "normal", 500]); });
        drawMap(svg, G.acs, {
          vb: puneVb, labels: labels, rings: changed,
          fill: function (n) { return SEATCOL[seatOf(n)] || null; },
          lines: ["Maval", "Pune", "Baramati", "Shirur"].map(function (p) { return [which === "d" ? G.ext["draft" + p].d : G.pcline[p], 2]; }),
          hover: function (n, e) {
            var d = DRAFT[n] || G.acs[n].pc, f = G.acs[n].pc; if (!f) return;
            F.tip("<b>" + esc(G.acs[n].name) + "</b><br>" + (d === f ? "in " + f + " in both" : "the draft: " + d + "<br>the final Order: " + f), e);
          }, leave: F.untip
        });
      }
      function both() { draw(C.top, DRAFT, "d"); draw(C.bottom, {}, "f"); }
      both(); onResize(both);
      h("div", "key", ["Maval", "Pune", "Baramati", "Shirur"].map(function (p) { return '<span><i style="--c:' + SEATCOL[p] + '"></i>' + p + "</span>"; }).join("") + '<span><i style="--c:var(--amend);background:none;border-style:dashed"></i>changed seat</span>', F.body);

      var YEARS = [["2004", 66.0, 72.0], ["2009", 62.8, 76.4], ["2014", 46.1, 53.6], ["2019", 45.7, 56.4], ["2024", 48.5, 56.0]];
      h("p", "hint", "How each Baramati would have voted, election by election", F.body).style.marginTop = "26px";
      var rows = [];
      var set = chips(F.body, YEARS.map(function (y) { return y[0]; }), function (i) {
        var y = YEARS[i];
        rows.forEach(function (r, j) { r[0].style.width = y[j + 1] + "%"; r[1].textContent = y[j + 1].toFixed(1) + "%"; });
        F.say("In " + y[0] + (i === 0 ? " (the last votes before the map)" : "") + ", the Baramati of the draft gives the Congress and NCP <b>" + y[1].toFixed(1) + "%</b>; the Baramati of the Order, <b>" + y[2].toFixed(1) + "%</b>." +
          (y[1] < 50 ? " The drafted seat falls below half." : ""));
      });
      var duel = h("div", "duel", null, F.body);
      [["as the draft drew it", "var(--ink-45)"], ["as the Order drew it", SEATCOL.Baramati]].forEach(function (d) {
        var r = h("div", "duel__r", "<span>" + d[0] + '</span><span class="duel__t"><i style="--c:' + d[1] + '"></i></span><span class="duel__v"></span>', duel);
        rows.push([r.querySelector("i"), r.querySelector(".duel__v")]);
      });
      h("div", "duel__ax", "<span></span><span>half the two alliances' votes</span><span></span>", duel);
      set(0);
    })();

    /* ---- Figures 5, 8, 9: a seat's recipe and record ---- */
    function seatFig(id, name, S) {
      var F = fig(id); if (!F) return;
      var grid = h("div", "seatix", null, F.body), left = h("div", "", null, grid), right = h("div", "", null, grid);
      var svg = el("svg", { role: "img", "aria-label": name + " and its six assembly segments" }, left);
      var REST = "The bigger the circle, the bigger the win.";
      var vb = boxOf(G.acs, G.pcs[name], 12), col = pcol(S.res[0][2]);
      function render() {
        drawMap(svg, G.acs, {
          vb: vb, px: 300, fill: function (n) { return G.acs[n].pc === name ? col : null; }, lines: [[G.pcline[name], 2]], rings: S.rings || [],
          labels: [[G.pcc[name][0], G.pcc[name][1], name, 17]],
          hover: function (n, e) { F.tip("<b>" + esc(G.acs[n].name) + "</b>" + (G.acs[n].pc === name ? "<br>one of " + name + "'s six segments" : ""), e); }, leave: F.untip
        });
      }
      render(); onResize(render);
      h("p", "lab", "Where its people came from", right);
      var rec = h("div", "recipe", null, right);
      S.parts.forEach(function (p, i) {
        var b = h("button", "", "<span>" + (p[1] >= 20 ? esc(p[0]) + " " : "") + p[1] + "%</span>", rec);
        b.type = "button"; b.style.flex = p[1] + " 1 0"; b.style.setProperty("--gap", (3 + i * 2.5) + "px");
        function on() { grid.querySelectorAll(".on").forEach(function (o) { o.classList.remove("on"); }); b.classList.add("on"); F.say("<b>" + p[1] + "%</b> of " + name + "'s people came from " + p[0] + ", which " + p[2] + "."); }
        b.addEventListener("mouseenter", on); b.addEventListener("focus", on); b.addEventListener("click", on);
      });
      h("p", "lab", "Who has won it since, and by how much", right);
      var row = h("div", "record", null, right);
      S.res.forEach(function (r) {
        var d = Math.round(16 + 46 * Math.sqrt(r[3] / 370000));
        var b = h("button", "", '<i style="--c:' + pcol(r[2]) + ";width:" + d + "px;height:" + d + 'px"></i>' + r[0], row);
        b.type = "button";
        function on() { grid.querySelectorAll(".on").forEach(function (o) { o.classList.remove("on"); }); b.classList.add("on"); F.say("<b>" + r[0] + ".</b> " + esc(r[1]) + " of " + pthe(r[2]) + " won " + name + " by " + N(r[3]) + "."); }
        b.addEventListener("mouseenter", on); b.addEventListener("focus", on); b.addEventListener("click", on);
      });
      grid.addEventListener("mouseleave", function () { F.say(REST); grid.querySelectorAll(".on").forEach(function (o) { o.classList.remove("on"); }); });
      F.say(REST);
    }
    seatFig("f5", "Shirur", {
      rings: [213],
      parts: [["old Khed", 45, "the Shiv Sena's Shivajirao Adhalrao Patil held in 2004 by 20,810"], ["old Baramati", 37, "Sharad Pawar won in 2004 by 4,22,975"], ["Pune", 18, "the Congress's Suresh Kalmadi won in 2004 by 73,176"]],
      res: [[2009, "Shivajirao Adhalrao Patil", "SHS", 178611], [2014, "Shivajirao Adhalrao Patil", "SHS", 301814], [2019, "Amol Kolhe", "NCP", 58483], [2024, "Amol Kolhe", "NCPSP", 140951]]
    });
    seatFig("f8", "Madha", {
      parts: [["old Pandharpur", 53, "Ramdas Athawale held in 2004 by 99,693, and which the Order abolished"], ["old Satara", 33, "the NCP's Laxmanrao Jadhav held in 2004 by 3,957"], ["old Osmanabad", 14, "the Shiv Sena's Kalpana Narhire won in 2004 by 1,649"]],
      res: [[2009, "Sharad Pawar", "NCP", 314459], [2014, "Vijaysinh Mohite-Patil", "NCP", 25344], [2019, "Ranjitsinha Naik-Nimbalkar", "BJP", 85764], [2024, "Dhairyasheel Mohite-Patil", "NCPSP", 120837]]
    });
    seatFig("f9", "Satara", {
      parts: [["old Satara", 53, "the NCP's Laxmanrao Jadhav held in 2004 by just 3,957"], ["old Karad", 47, "the NCP's Shriniwas Patil won in 2004 by 1,96,730, and which the Order abolished"]],
      res: [[2009, "Udayanraje Bhosale", "NCP", 297515], [2014, "Udayanraje Bhosale", "NCP", 366594], [2019, "Udayanraje Bhosale", "NCP", 126528], [2024, "Udayanraje Bhosale", "BJP", 32771]]
    });

    /* ---- Figure 6: the swap ---- */
    (function () {
      var F = fig("f6"); if (!F) return;
      var LEAD = [{ Baramati: 339272, Shirur: 39379 }, { Baramati: 279587, Shirur: 99064 }], shown = { Baramati: 339272, Shirur: 39379 }, mode = 0;
      var LATER = [["Lok Sabha 2009", [3.36, 2.97], [-1.78, -1.39]], ["Assembly 2009", [0.66, -0.39], [0.13, 1.18]], ["Lok Sabha 2014", [0.70, 0.27], [-3.38, -2.95]], ["Assembly 2014", [1.87, 1.09], [-1.94, -1.16]]];
      var set = chips(F.body, ["The line as drawn", "With Daund and Hadapsar swapped"], function (i) { mode = i; render(); });
      var svg = el("svg", { role: "img", "aria-label": "Pune district's four Lok Sabha seats" }, F.body);
      var leads = h("div", "leads", ["Baramati", "Shirur"].map(function (p) { return '<div><div class="leads__n" style="--c:' + SEATCOL[p] + '">' + p + '’s lead on the 2004 votes</div><div class="leads__v" data-p="' + p + '"></div></div>'; }).join(""), F.body);
      var tbl = h("table", "later", "<caption>Where the Congress and NCP would stand on these lines in later elections</caption><thead><tr><th></th><th>Baramati</th><th>Shirur</th></tr></thead><tbody></tbody>", F.body), tb = tbl.querySelector("tbody");
      function cell(v) { return '<td class="' + (v >= 0 ? "up" : "dn") + '">' + (v >= 0 ? "ahead by " : "behind by ") + Math.abs(v).toFixed(2) + " lakh</td>"; }
      function render() {
        var asg = mode ? SWAP : {}, seatOf = function (n) { return asg[n] || G.acs[n].pc; };
        var labels = ["Maval", "Pune", "Baramati", "Shirur"].map(function (p) { var l = seatLabel(p, 16); if (p === "Shirur") l[1] -= 14; if (p === "Baramati") l[1] += 8; return l; });
        [199, 213].forEach(function (n) { var a = G.acs[n]; labels.push([a.c[0], a.c[1], a.name, 13, "normal", 500, n === 213 ? 15 : 0]); });
        drawMap(svg, G.acs, {
          vb: puneVb, labels: labels, rings: [199, 213],
          fill: function (n) { var s = seatOf(n); return s === "Baramati" || s === "Shirur" ? SEATCOL[s] : null; },
          lines: ["Maval", "Pune", "Baramati", "Shirur"].map(function (p) {
            var d = G.pcline[p]; if (mode && p === "Baramati") d = G.ext.swapBaramati.d; if (mode && p === "Shirur") d = G.ext.swapShirur.d;
            return [d, p === "Baramati" || p === "Shirur" ? 2.2 : 1.1];
          }),
          hover: function (n, e) { var s = seatOf(n); if (s) F.tip("<b>" + esc(G.acs[n].name) + "</b><br>in " + s + (asg[n] ? " after the swap" : ""), e); }, leave: F.untip
        });
        ["Baramati", "Shirur"].forEach(function (p) {
          var node = leads.querySelector('[data-p="' + p + '"]');
          tween(shown[p], LEAD[mode][p], 700, function (v) { shown[p] = v; node.textContent = inr(v); });
        });
        tb.innerHTML = LATER.map(function (r) { return "<tr><td>" + r[0] + "</td>" + cell(r[1][mode]) + cell(r[2][mode]) + "</tr>"; }).join("");
        F.say(mode
          ? "The swap takes about <b>60,000</b> votes of cushion from the seat that could not lose and gives them to the seat that might. Shirur's lead more than doubles."
          : "As drawn, on the 2004 votes: Baramati leads by " + N(339272) + ", the largest lead in the state. Shirur, next door, by " + N(39379) + ".");
      }
      set(0); onResize(render);
    })();

    /* ---- seat names in the text open a small map ---- */
    (function () {
      var pop = h("div", "pop", null, document.body); pop.setAttribute("role", "tooltip");
      var open = null;
      function show(w) {
        var p = w.dataset.seat, win = WIN[p]; open = w; pop.innerHTML = "";
        var s = el("svg", { viewBox: G.vb.join(" ") }, pop);
        Object.keys(G.acs).forEach(function (n) { var a = G.acs[n]; el("path", { d: a.d, fill: a.pc === p ? "var(--teal)" : "none", "fill-opacity": .85, stroke: a.pc === p ? "var(--bg)" : "var(--ink-20)", "stroke-width": .5, "vector-effect": "non-scaling-stroke" }, s); });
        el("path", { d: G.pcline[p], fill: "none", stroke: "var(--ink)", "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" }, s);
        pop.insertAdjacentHTML("beforeend", "<b>" + esc(p) + "</b><span>2009: " + esc(win[0]) + ", " + pshort(win[1]) + (win[2] ? ", by " + inr(win[2]) : "") + "</span><i>Six assembly segments: " + G.pcs[p].map(function (n) { return esc(G.acs[n].name); }).join(", ") + "</i>");
        var r = w.getBoundingClientRect();
        pop.style.left = Math.max(8, Math.min(innerWidth - 278, r.left + r.width / 2 - 135)) + scrollX + "px";
        pop.style.top = r.bottom + scrollY + 10 + "px"; pop.classList.add("on");
      }
      function hide() { pop.classList.remove("on"); open = null; }
      document.querySelectorAll(".seat").forEach(function (w) {
        w.addEventListener("mouseenter", function () { show(w); }); w.addEventListener("mouseleave", hide);
        w.addEventListener("focus", function () { show(w); }); w.addEventListener("blur", hide);
        w.addEventListener("click", function (e) { e.stopPropagation(); if (open === w && !w.matches(":hover")) hide(); else show(w); });
      });
      document.addEventListener("click", hide);
      addEventListener("scroll", function () { if (open) hide(); }, { passive: true });
    })();
  });

  /* =======================================================================
     Figure 2: Pune district's assembly seats on both maps
     ======================================================================= */
  fetch(BASE + "pune-seats.json").then(function (r) { return r.json(); }).then(function (P) {
    var F = fig("f2"); if (!F) return;
    var zoom = false, ca = P.city.pre, cb = P.city.post;
    var cx0 = Math.min(ca[0], cb[0]) - 2, cw = Math.max(ca[0] + ca[2], cb[0] + cb[2]) + 2 - cx0, ch = cw * P.vb[3] / P.vb[2];
    var city = [cx0, (Math.min(ca[1], cb[1]) + Math.max(ca[1] + ca[3], cb[1] + cb[3])) / 2 - ch / 2, cw, ch];
    var REST = "Left of the handle, the <b>1976 map</b>. Right of it, the <b>2008 map</b>.";
    var C;
    function layer(svg, L, yr) {
      var acs = P[L], vb = zoom ? city : P.vb, labels = [];
      Object.keys(acs).forEach(function (n) { var b = dBox(acs[n].d); if (b[2] > vb[2] * .17) labels.push([acs[n].c[0], acs[n].c[1], acs[n].name, 12.5]); });
      drawMap(svg, acs, {
        vb: vb, labels: labels, fill: function (n) { return pcol(acs[n].party); },
        hover: function (n, e) { F.tip("<b>" + esc(acs[n].name) + "</b><br>" + yr + ": " + esc(acs[n].winner) + ", " + pshort(acs[n].party), e); }, leave: F.untip
      });
    }
    function both() { if (!C) return; layer(C.top, "pre", 2004); layer(C.bottom, "post", 2009); }
    var set = chips(F.body, ["The whole district", "Pune city, enlarged"], function (i) { zoom = i === 1; both(); });
    C = compare(F, "1976 map &middot; won in 2004", "2008 map &middot; won in 2009");
    var parties = {}; ["pre", "post"].forEach(function (L) { Object.keys(P[L]).forEach(function (n) { parties[P[L][n].party] = 1; }); });
    h("div", "key", keyOf(Object.keys(parties).sort()), F.body);
    C.moved(function (x) {
      F.say(x > 85 ? "Almost all of it is now the <b>1976 map</b>: 18 assembly seats, hatched by who won each in 2004."
        : x < 15 ? "Almost all of it is now the <b>2008 map</b>: 21 assembly seats, hatched by who won each in 2009." : REST);
    });
    set(0); onResize(both); F.say(REST);
  });

  /* =======================================================================
     Figures drawn from numbers alone
     ======================================================================= */

  /* ---- 26,154 ways: one hundred dots ---- */
  (function () {
    var F = fig("fw"); if (!F) return;
    var set = chips(F.body, ["Deal the hundred again", "Gather the nineteen"], function (i) { deal(i === 1); });
    var svg = el("svg", { viewBox: "0 0 400 104", role: "img", "aria-label": "One hundred dots, nineteen of them dark" }, F.body);
    svg.style.maxWidth = "440px"; svg.style.margin = "0 auto";
    var dots = [];
    for (var i = 0; i < 100; i++) dots.push(el("circle", { cx: 10 + (i % 20) * 20, cy: 12 + Math.floor(i / 20) * 20, r: 6.5, fill: "var(--ink-12)", stroke: "var(--ink-25)", "stroke-width": .8 }, svg));
    function deal(sorted) {
      var idx = dots.map(function (_, i) { return i; });
      if (!sorted) for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      dots.forEach(function (d) { d.setAttribute("fill", "var(--ink-12)"); d.setAttribute("stroke", "var(--ink-25)"); });
      idx.slice(0, 19).forEach(function (k, n) { setTimeout(function () { dots[k].setAttribute("fill", "var(--k-ncp)"); dots[k].setAttribute("stroke", "var(--k-ncp)"); }, reduce ? 0 : n * 45); });
    }
    set(0);
    F.say("About <b>19 in 100</b>: of the " + N(26154) + " ways to group the segments, only one in five is as generous to Baramati as the map that was drawn.");
  })();

  /* ---- the same votes on old and new lines ---- */
  (function () {
    var F = fig("ft"); if (!F) return;
    var D = [[2009, 76.4, 57.3], [2014, 53.6, 43.1], [2019, 56.4, 50.4], [2024, 56.1, 51.1]];
    var W = 620, H = 236, svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Baramati's Congress-NCP share on the 2008 lines and on old Baramati's ground, 2009 to 2024" }, F.body);
    var x = function (v) { return 70 + (v - 35) / 50 * 520; };
    [40, 50, 60, 70, 80].forEach(function (v) {
      el("line", { x1: x(v), x2: x(v), y1: 24, y2: 196, stroke: v === 50 ? "var(--ink-60)" : "var(--ink-12)", "stroke-dasharray": v === 50 ? "5 4" : "" }, svg);
      var t = el("text", { x: x(v), y: 216, "text-anchor": "middle", "font-size": 14, "font-style": "italic" }, svg); t.textContent = v + "%"; t.style.fill = "var(--ink-60)";
    });
    var half = el("text", { x: x(50) - 8, y: 16, "text-anchor": "end", "font-size": 14, "font-style": "italic" }, svg); half.textContent = "← the other side wins"; half.style.fill = "var(--ink-60)";
    var REST = "Each line is one election. The dark dot is Baramati as drawn; the open dot, the same votes on the old seat's ground.";
    D.forEach(function (r, i) {
      var y = 46 + i * 44, hot = r[2] < 50, g = el("g", {}, svg); g.style.cursor = "pointer";
      var yr = el("text", { x: 0, y: y + 5, "font-size": 17 }, g); yr.textContent = r[0];
      el("line", { x1: x(r[2]), x2: x(r[1]), y1: y, y2: y, stroke: hot ? "var(--amend)" : "var(--ink-35)", "stroke-width": 2 }, g);
      el("circle", { cx: x(r[2]), cy: y, r: 7.5, fill: "var(--bg)", stroke: hot ? "var(--amend)" : "var(--ink)", "stroke-width": 2 }, g);
      el("circle", { cx: x(r[1]), cy: y, r: 8, fill: "var(--k-ncp)" }, g);
      var a = el("text", { x: x(r[1]) + 14, y: y + 5, "font-size": 15, "font-weight": 500 }, g); a.textContent = r[1] + "%";
      var b = el("text", { x: x(r[2]) - 14, y: y + 5, "font-size": 15, "text-anchor": "end" }, g); b.textContent = r[2] + "%"; if (hot) b.style.fill = "var(--amend)";
      el("rect", { x: 0, y: y - 20, width: W, height: 40, fill: "transparent" }, g);
      function on() {
        F.say("<b>" + r[0] + ".</b> Inside the 2008 lines the Congress and NCP took " + r[1] + "%. On old Baramati's ground the same votes give " + r[2] + "%." + (hot ? " <b>The other side would have won. The lines alone decided the seat.</b>" : " They win either way."));
      }
      g.addEventListener("mouseenter", on); g.addEventListener("click", on);
    });
    svg.addEventListener("mouseleave", function () { F.say(REST); });
    F.say(REST);
  })();

  /* ---- Figure 7: margins, 2004 to 2024 ---- */
  (function () {
    var F = fig("f7"); if (!F) return;
    var YR = [2004, 2009, 2014, 2019, 2024];
    var S = {
      Baramati: [[422975, "Sharad Pawar", "NCP"], [336831, "Supriya Sule", "NCP"], [69719, "Supriya Sule", "NCP"], [155774, "Supriya Sule", "NCP"], [158333, "Supriya Sule", "NCPSP"]],
      Shirur: [[-20810, "Shivajirao Adhalrao Patil", "SHS"], [-178611, "Shivajirao Adhalrao Patil", "SHS"], [-301814, "Shivajirao Adhalrao Patil", "SHS"], [58483, "Amol Kolhe", "NCP"], [140951, "Amol Kolhe", "NCPSP"]]
    };
    var W = 620, H = 330, svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "The winner's margin in Baramati and Shirur, 2004 to 2024" }, F.body);
    var x = function (i) { return 66 + i * 118; }, y = function (v) { return 158 - v / 100000 * 31; };
    [-3, -2, -1, 1, 2, 3, 4].forEach(function (v) {
      el("line", { x1: 44, x2: 590, y1: y(v * 1e5), y2: y(v * 1e5), stroke: "var(--ink-08)" }, svg);
      var t = el("text", { x: 38, y: y(v * 1e5) + 4, "text-anchor": "end", "font-size": 13, "font-style": "italic" }, svg); t.textContent = Math.abs(v) + " lakh"; t.style.fill = "var(--ink-45)";
    });
    el("line", { x1: 44, x2: 590, y1: y(0), y2: y(0), stroke: "var(--ink-60)" }, svg);
    [["Congress–NCP won ↑", y(4.55e5)], ["BJP–Shiv Sena won ↓", y(-3.55e5)]].forEach(function (l) { var t = el("text", { x: 590, y: l[1], "text-anchor": "end", "font-size": 14, "font-style": "italic" }, svg); t.textContent = l[0]; t.style.fill = "var(--ink-60)"; });
    el("line", { x1: 125, x2: 125, y1: 14, y2: 280, stroke: "var(--amend)", "stroke-dasharray": "3 4" }, svg);
    var nm = el("text", { x: 131, y: 276, "font-size": 14, "font-style": "italic" }, svg); nm.textContent = "the new map"; nm.style.fill = "var(--amend)";
    YR.forEach(function (yr, i) { var t = el("text", { x: x(i), y: H - 10, "text-anchor": "middle", "font-size": 16 }, svg); t.textContent = yr; });
    var REST = "Baramati stays far above the line; Shirur, next door, spends three elections below it.";
    [["Baramati", SEATCOL.Baramati, ""], ["Shirur", SEATCOL.Shirur, "7 5"]].forEach(function (s) {
      var pts = S[s[0]];
      el("path", { d: pts.map(function (p, i) { return (i ? "L" : "M") + x(i) + " " + y(p[0]); }).join(""), fill: "none", stroke: s[1], "stroke-width": 2.4, "stroke-dasharray": s[2] }, svg);
      pts.forEach(function (p, i) {
        var c = el("circle", { cx: x(i), cy: y(p[0]), r: 5.5, fill: s[1] }, svg);
        var hit = el("circle", { cx: x(i), cy: y(p[0]), r: 18, fill: "transparent" }, svg); hit.style.cursor = "pointer";
        function on() { c.setAttribute("r", 8); F.say("<b>" + s[0] + (s[0] === "Shirur" && !i ? " (then Khed)" : "") + ", " + YR[i] + ".</b> " + p[1] + " of " + pthe(p[2]) + " won by " + N(Math.abs(p[0])) + "."); }
        hit.addEventListener("mouseenter", on); hit.addEventListener("click", on);
        hit.addEventListener("mouseleave", function () { c.setAttribute("r", 5.5); });
      });
      var t = el("text", { x: x(4) + 12, y: y(pts[4][0]) + (s[0] === "Baramati" ? -8 : 17), "font-size": 16, "font-style": "italic" }, svg); t.textContent = s[0]; t.style.fill = s[1];
    });
    svg.addEventListener("mouseleave", function () { F.say(REST); });
    F.say(REST);
  })();

  /* ---- Figure 10: Karad abolished, or kept ---- */
  (function () {
    var F = fig("f10"); if (!F) return;
    var W = 620, H = 150, x = function (v) { return 40 + (v - 40) / 30 * 540; };
    var PLAN = [
      [[["Satara", 60.4]], "As enacted, Karad is gone and its strength sits inside Satara: <b>60.4%</b> for the Congress and NCP. Comfortable."],
      [[["Satara", 55.3], ["Karad", 62.6]], "Under the Shiv Sena's plan Karad survives at <b>62.6%</b>, and Satara is left at <b>55.3%</b>: still ahead, but a contest."]
    ];
    var dots = {};
    var set = chips(F.body, ["As the Order drew it", "As the Shiv Sena proposed"], function (i) {
      var seen = {};
      PLAN[i][0].forEach(function (p) {
        seen[p[0]] = 1; var d = dots[p[0]];
        d.g.style.opacity = 1; tween(d.v, p[1], 700, function (v) { d.v = v; d.g.setAttribute("transform", "translate(" + x(v) + " 0)"); d.t.textContent = d.name + " " + v.toFixed(1) + "%"; });
      });
      Object.keys(dots).forEach(function (k) { if (!seen[k]) dots[k].g.style.opacity = 0; });
      F.say(PLAN[i][1]);
    });
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Congress-NCP share in Satara and Karad under each plan" }, F.body);
    el("line", { x1: x(40), x2: x(70), y1: 84, y2: 84, stroke: "var(--ink-25)" }, svg);
    [40, 50, 60, 70].forEach(function (v) {
      el("line", { x1: x(v), x2: x(v), y1: v === 50 ? 20 : 78, y2: v === 50 ? 112 : 90, stroke: v === 50 ? "var(--ink-60)" : "var(--ink-25)", "stroke-dasharray": v === 50 ? "5 4" : "" }, svg);
      var t = el("text", { x: x(v), y: 132, "text-anchor": "middle", "font-size": 14, "font-style": "italic" }, svg); t.textContent = v + "%"; t.style.fill = "var(--ink-60)";
    });
    var c = el("text", { x: x(50) + 8, y: 30, "font-size": 14, "font-style": "italic" }, svg); c.textContent = "a contest → safer"; c.style.fill = "var(--ink-60)";
    [["Satara", "var(--k-ncp)"], ["Karad", "var(--amend)"]].forEach(function (d, i) {
      var g = el("g", { transform: "translate(" + x(50) + " 0)" }, svg); g.style.transition = "opacity .4s";
      el("circle", { cx: 0, cy: 84, r: 10, fill: d[1] }, g);
      var t = el("text", { x: 0, y: i ? 116 : 62, "text-anchor": "middle", "font-size": 16, "font-weight": 500 }, g);
      dots[d[0]] = { g: g, t: t, v: 50, name: d[0] };
    });
    set(0);
  })();

  /* ---- Figure 11: who stood where ---- */
  (function () {
    var F = fig("f11"); if (!F) return;
    var YR = [2004, 2009, 2014, 2019, 2024];
    var LSB = "the Baramati Lok Sabha seat", VSB = "the Baramati assembly seat", VSA = "the Ambegaon assembly seat", VSM = "the Morshi assembly seat", LSS = "the Satara Lok Sabha seat", LSH = "the Shirur Lok Sabha seat", VSI = "the Indapur assembly seat";
    var R = [
      ["Sharad Pawar", [[LSB, "NCP", 1], ["the Madha Lok Sabha seat", "NCP", 1], 0, 0, 0]],
      ["Supriya Sule", [0, [LSB, "NCP", 1], [LSB, "NCP", 1], [LSB, "NCP", 1], [LSB, "NCPSP", 1]]],
      ["Ajit Pawar", [[VSB, "NCP", 1], [VSB, "NCP", 1], [VSB, "NCP", 1], [VSB, "NCP", 1], [VSB, "NCP", 1]]],
      ["Dilip Walse Patil", [[VSA, "NCP", 1], [VSA, "NCP", 1], [VSA, "NCP", 1], [VSA, "NCP", 1], [VSA, "NCP", 1]]],
      ["Shriniwas Patil", [["the Karad Lok Sabha seat", "NCP", 1], 0, 0, 0, 0]],
      ["Harshvardhan Deshmukh", [[VSM, "JSS", 1], [VSM, "NCP", 0], [VSM, "NCP", 0], 0, 0]],
      ["Ramdas Athawale", [["the Pandharpur Lok Sabha seat", "RPI(A)", 1], ["the Shirdi Lok Sabha seat", "RPI(A)", 0], 0, 0, 0]],
      ["Vijaysinh Mohite-Patil", [["the Malshiras assembly seat", "NCP", 1], ["the Pandharpur assembly seat", "NCP", 0], ["the Madha Lok Sabha seat", "NCP", 1], 0, 0]],
      ["Udayanraje Bhosale", [["the Satara assembly seat", "BJP", 0], [LSS, "NCP", 1], [LSS, "NCP", 1], [LSS, "NCP", 1], [LSS, "BJP", 1]]],
      ["Shivajirao Adhalrao Patil", [["the Khed Lok Sabha seat", "SHS", 1], [LSH, "SHS", 1], [LSH, "SHS", 1], [LSH, "SHS", 0], [LSH, "NCP", 0]]],
      ["Harshvardhan Patil", [[VSI, "IND", 1], [VSI, "INC", 1], [VSI, "INC", 0], [VSI, "BJP", 0], [VSI, "NCPSP", 0]]]
    ];
    var REST = "A filled dot is a win; a ring, a defeat.";
    var g = h("div", "people", null, F.body);
    h("div", "people__y", "", g); YR.forEach(function (y) { h("div", "people__y", y, g); });
    R.forEach(function (r) {
      var cells = [h("div", "people__n", esc(r[0]), g)], won = 0, stood = 0;
      function hl() { g.classList.add("hl"); [].forEach.call(g.children, function (x) { x.classList.toggle("on", cells.indexOf(x) >= 0); }); }
      r[1].forEach(function (c, i) {
        var d = h("div", "people__c", null, g); cells.push(d);
        if (!c) return;
        stood++; won += c[2];
        var b = h("button", c[2] ? "" : "lost", null, d); b.type = "button"; b.style.setProperty("--c", pcol(c[1]));
        b.setAttribute("aria-label", r[0] + ", " + YR[i] + ": " + (c[2] ? "won " : "lost ") + c[0]);
        function on(e) { if (e) e.stopPropagation(); hl(); F.say("<b>" + esc(r[0]) + ", " + YR[i] + ".</b> " + (c[2] ? "Won " : "Lost ") + c[0] + ", standing for " + pthe(c[1]) + "."); }
        b.addEventListener("mouseenter", on); b.addEventListener("focus", on); b.addEventListener("click", on);
      });
      function career() { hl(); F.say("<b>" + esc(r[0]) + "</b> appears in " + stood + " of these five rounds of elections, and won " + (won === stood ? (stood === 1 ? "it" : "every time") : won + " of them") + "."); }
      cells[0].addEventListener("mouseenter", career); cells[0].addEventListener("click", career);
    });
    g.addEventListener("mouseleave", function () { g.classList.remove("hl"); F.say(REST); });
    h("div", "key", keyOf(["NCP", "NCPSP", "SHS", "INC", "BJP", "RPI(A)", "JSS", "IND"]), F.body);
    F.say(REST);
  })();

  /* ---- Figure 12: where each new seat's votes were cast ---- */
  (function () {
    var F = fig("f12"); if (!F) return;
    var MP = { Pune: ["Suresh Kalmadi", "INC"], Solapur: ["Subhash Deshmukh", "BJP"], Ichalkaranji: ["Nivedita Mane", "NCP"], Baramati: ["Sharad Pawar", "NCP"], Satara: ["Laxmanrao Jadhav", "NCP"],
      Pandharpur: ["Ramdas Athawale", "RPI(A)"], Khed: ["Shivajirao Adhalrao Patil", "SHS"], Kolaba: ["A. R. Antulay", "INC"], Karad: ["Shriniwas Patil", "NCP"], Osmanabad: ["Kalpana Narhire", "SHS"], Sangli: ["Prakashbapu Patil", "INC"] };
    var ROWS = [["Baramati", [["Baramati", 60], ["Khed", 27], ["Pune", 12]]], ["Shirur", [["Khed", 48], ["Baramati", 36], ["Pune", 16]]], ["Maval", [["Kolaba", 47], ["Baramati", 32], ["Khed", 21]]],
      ["Pune", [["Pune", 89], ["Baramati", 11]]], ["Madha", [["Pandharpur", 53], ["Satara", 32], ["Osmanabad", 14]]], ["Satara", [["Satara", 55], ["Karad", 45]]],
      ["Solapur", [["Solapur", 77], ["Pandharpur", 23]]], ["Hatkanangle", [["Ichalkaranji", 64], ["Karad", 32], ["Sangli", 4]]]];
    var REST = "Each bar is one new seat, cut into the old seats its votes came from.";
    h("p", "hint", "New seat ↓ &nbsp; made of old seats →", F.body);
    var g = h("div", "flows", null, F.body);
    ROWS.forEach(function (r) {
      h("div", "flows__n", r[0], g);
      var bar = h("div", "flows__b", null, g);
      r[1].forEach(function (s) {
        var mp = MP[s[0]], b = h("button", "", s[1] >= 16 ? "<span>" + s[0] + " " + s[1] + "%</span>" : s[1] >= 9 ? "<span>" + s[1] + "%</span>" : "", bar);
        b.type = "button"; b.dataset.old = s[0]; b.style.flex = s[1] + " 1 0"; b.style.setProperty("--c", pcol(mp[1]));
        b.setAttribute("aria-label", s[1] + " per cent of the new " + r[0] + " was cast on old " + s[0] + "'s ground");
        function on() {
          g.classList.add("hl"); g.querySelectorAll("button").forEach(function (o) { o.classList.toggle("on", o.dataset.old === s[0]); });
          var n = g.querySelectorAll('button[data-old="' + s[0] + '"]').length;
          F.say("<b>" + s[1] + "%</b> of the new " + r[0] + "'s vote was cast on the ground of old " + s[0] + ", whose MP in 2004 was " + mp[0] + " of " + pthe(mp[1]) + "." + (n > 1 ? " Old " + s[0] + " was shared among " + n + " new seats." : ""));
        }
        b.addEventListener("mouseenter", on); b.addEventListener("focus", on); b.addEventListener("click", on);
      });
    });
    g.addEventListener("mouseleave", function () { g.classList.remove("hl"); F.say(REST); });
    h("div", "key", keyOf(["NCP", "SHS", "INC", "BJP", "RPI(A)"]) + "<span>hatched by the party of the old seat's 2004 MP</span>", F.body);
    F.say(REST);
  })();
})();
