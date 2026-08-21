/* Boundaries — state page (four-plate edition).
   Plates I–IV, side-by-side comparison, schematic tile grid.
   All content read from states/<slug>/data.json. */
(async function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const CE = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  /* correction reports — declared early: sourcesHTML() runs before the helper block below */
  const REPORT_TO = "boundaries.sog@gmail.com";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  /* ---- Party colours ---- */
  const PARTY = {
    SAD:   { full: "Shiromani Akali Dal",            c: "oklch(0.5 0.14 265)" },
    BJP:   { full: "Bharatiya Janata Party",          c: "oklch(0.72 0.16 55)"  },
    INC:   { full: "Indian National Congress",        c: "oklch(0.66 0.11 230)" },
    BSP:   { full: "Bahujan Samaj Party",             c: "oklch(0.55 0.17 290)" },
    CPI:   { full: "Communist Party of India",        c: "oklch(0.58 0.18 25)"  },
    CPM:   { full: "Communist Party of India (M)",    c: "oklch(0.55 0.19 25)"  },
    "CPI(M)": { full: "Communist Party of India (M)", c: "oklch(0.55 0.19 25)" },
    IND:   { full: "Independent",                     c: "oklch(0.62 0.02 60)"  },
    NCP:   { full: "Nationalist Congress Party",      c: "oklch(0.62 0.14 240)" },
    SP:    { full: "Samajwadi Party",                 c: "oklch(0.6  0.14 160)" },
    JD:    { full: "Janata Dal",                      c: "oklch(0.65 0.12 90)"  },
    JDU:   { full: "Janata Dal (United)",             c: "oklch(0.65 0.12 90)"  },
    BLD:   { full: "Bharatiya Lok Dal",               c: "oklch(0.68 0.10 100)" },
    AGP:   { full: "Asom Gana Parishad",              c: "oklch(0.65 0.12 130)" },
    AIUDF: { full: "All India United Democratic Front", c: "oklch(0.55 0.14 260)" },
    BPF:   { full: "Bodoland People's Front",         c: "oklch(0.58 0.12 180)" },
    UPPL:  { full: "United People's Party Liberal",   c: "oklch(0.62 0.13 210)" },
    AIFB:  { full: "All India Forward Bloc",          c: "oklch(0.5 0.18 25)"   },
    AITC:  { full: "All India Trinamool Congress",    c: "oklch(0.6 0.14 220)"  },
    RSP:   { full: "Revolutionary Socialist Party",   c: "oklch(0.52 0.15 30)"  },
    GNLF:  { full: "Gorkha National Liberation Front", c: "oklch(0.58 0.10 90)" },
  };
  function partyOf(code) {
    if (!code) return null;
    const k = String(code).toUpperCase().trim();
    const p = PARTY[k] || { full: k, c: "oklch(0.62 0.02 60)" };
    return { code: k, full: p.full, c: p.c };
  }
  function partyLine(p) {
    if (p.code === "IND") return "Independent (IND)";
    return p.full === p.code ? p.code : p.full + " (" + p.code + ")";
  }
  function partyDotStyle(p) {
    return "width:11px;height:11px;border-radius:2px;background:" + p.c + ";border:1px solid var(--ink-45);flex:none;display:inline-block";
  }
  function devLine(v, all) {
    if (!all.length) return "";
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    const d = (v - mean) / mean * 100;
    return (d >= 0 ? "+" : "\u2212") + Math.abs(d).toFixed(1) + "% vs state mean";
  }
  function fmtElectors(n) {
    return n.toLocaleString("en-IN");
  }

  const T_COL = {
    continuing: { bg: "var(--surface)",  bc: "var(--ink-25)" },
    renamed:    { bg: "var(--teal-lt)",  bc: "var(--teal)"   },
    "new":      { bg: "var(--ink)",      bc: "var(--ink)"    },
    abolished:  { bg: "var(--bg)",       bc: "var(--ink-60)" },
    merged:     { bg: "var(--bg)",       bc: "var(--ink-60)" },
    split:      { bg: "var(--bg)",       bc: "var(--ink-60)" },
    replaced:   { bg: "var(--bg)",       bc: "var(--ink-60)" },
    carved:     { bg: "var(--ink)",      bc: "var(--ink)"    },
    replaces:   { bg: "var(--teal-lt)",  bc: "var(--teal)"   },
  };

  const root = $("state-root");
  const params = new URLSearchParams(location.search);
  const slug = params.get("state") || "";

  let manifest;
  try { manifest = await (await fetch("states/manifest.json")).json(); }
  catch (e) { root.innerHTML = errHTML("The state manifest could not be loaded. Serve over HTTP, not file://."); return; }

  const entry = (manifest.states || []).find(s => s.slug === slug);
  if (!entry) {
    document.title = "Not in the register \u00b7 Boundaries";
    root.innerHTML = shell("<header class=\"hero wrap\"><div class=\"hero__eyebrow\">Boundaries</div><h1>Not in the register</h1><p class=\"hero__lede\">No assembly with the reference \u201c" + esc(slug) + "\u201d is listed in the manifest. <a href=\"index.html\">Return to the archive index</a>.</p></header>");
    return;
  }
  if (entry.status !== "live") {
    document.title = entry.name + " \u00b7 coming soon \u00b7 Boundaries";
    root.innerHTML = shell("<header class=\"hero wrap\"><div class=\"hero__eyebrow\">Delimitation \u00b7 " + esc(entry.name) + "</div><h1>" + esc(entry.name) + "</h1><p class=\"hero__lede\">The pre-delimitation record for this assembly has not been published yet. The archive is updated state by state.</p>" + (entry.note ? "<p class=\"notice\">" + esc(entry.note) + "</p>" : "") + "<p style=\"margin-top:22px\"><a href=\"index.html\">Return to the archive index</a></p></header>");
    return;
  }

  const base = "states/" + entry.slug + "/";
  let data = null;
  try { data = await (await fetch(base + "data.json")).json(); }
  catch (e) { root.innerHTML = errHTML("The data module for " + entry.name + " could not be loaded."); return; }

  document.title = data.title + " \u00b7 Boundaries";

  /* ---- Resolve order years from data (with 2008/1976 fallbacks) ---- */
  const PRE_YEAR  = data.pre_order_year  || 1976;
  const POST_YEAR = data.post_order_year || 2008;
  const PRE_LABEL  = data.pre_order_label  || (PRE_YEAR + " order");
  const POST_LABEL = data.post_order_label || (POST_YEAR + " order");
  const PRE_ELEC   = data.pre_election_year  || (POST_YEAR === 2023 ? 2021 : 2007);
  const POST_ELEC  = data.post_election_year || (POST_YEAR === 2023 ? 2026 : 2012);

  const olds = data.constituencies || [];
  const news = data.post2008_constituencies || [];
  const oldByN = {}; olds.forEach(c => oldByN[c.ac_no] = c);
  const newByN = {}; news.forEach(c => newByN[c.ac_no] = c);

  /* ---- pre-compute elector arrays for malapportionment band ---- */
  const electors07 = olds.map(c => c.electors_07).filter(Boolean);
  const electors12 = news.map(c => c.electors_12).filter(Boolean);

  /* ---- pre-compute flipped/held sets ---- */
  let flipOldSet = new Set(), heldOldSet = new Set(), flipNewSet = new Set(), heldNewSet = new Set();
  (function() {
    const norm = s => (s || "").toLowerCase().replace(/[^a-z]/g, "");
    const oldByName = {};
    olds.forEach(o => { oldByName[norm(o.name)] = o; });
    news.forEach(s => {
      if (s.status !== "continuing" && s.status !== "renamed") return;
      let o = oldByName[norm(s.name)];
      if (!o) {
        const parents = olds.filter(x => (x.dest || []).indexOf(s.ac_no) !== -1);
        if (parents.length === 1) o = parents[0];
      }
      if (!o || !o.party07 || !s.party12) return;
      if (o.party07 === s.party12) { heldOldSet.add(o.ac_no); heldNewSet.add(s.ac_no); }
      else { flipOldSet.add(o.ac_no); flipNewSet.add(s.ac_no); }
    });
  })();

  /* ---- Party overlay (Assam-style: per-party seat counts) ---- */
  const partyOverlay = data.party_overlay || null;
  let cPartyMode = "none"; // "none" | "flipped" | "held" | party-code

  const maps = data.maps || {};

  root.innerHTML = shell(
    heroHTML() +
    "<main id=\"main\" class=\"wrap\">" +
    figuresHTML() +
    plate1HTML() +
    plate2HTML() +
    plate3HTML() +
    plate4HTML() +
    sourcesHTML() +
    "</main>"
  );

  /* ---- Fetch & inject SVGs ---- */
  const svgs = {};
  async function fetchSVG(key, path) {
    if (!path) return;
    try {
      const r = await fetch(base + path);
      if (!r.ok) return;
      const text = await r.text();
      document.querySelectorAll("[data-svg-slot=\"" + key + "\"]").forEach(h => {
        h.innerHTML = text;
        const svg = h.querySelector("svg");
        if (svg) {
          svgs[key] = svgs[key] || [];
          svgs[key].push({ svg, holder: h });
          wireSVG(svg, key);
          ensureHatchDefs(); tagReservations(svg, key);
          if (key === "pre") {
            const vb = (svg.getAttribute("viewBox") || "0 0 860 1120").split(/\s+/);
            const stage = h.closest(".map-stage");
            if (stage) stage.style.aspectRatio = vb[2] + " / " + vb[3];
          }
        }
      });
    } catch (e) {}
  }

  await Promise.all([fetchSVG("pre", maps.pre2008), fetchSVG("post", maps.post2008)]);

  /* ---- State ---- */
  const seatParam  = parseInt(params.get("seat"), 10);
  const orderParam = params.get("order");
  let view1 = (orderParam === "new") ? "post" : "pre";
  let selOld = (orderParam === "old" && seatParam) ? seatParam : null;
  let selNew = (orderParam === "new" && seatParam) ? seatParam : null;
  let filter = "all";
  let cFlipMode = "none";
  let tsel = null;
  let searchQ = "";

  /* ---- Wire SVG events ---- */
  function wireSVG(svg, key) {
    const tip = svg.closest(".map-stage") && svg.closest(".map-stage").querySelector(".map-tip");
    svg.addEventListener("pointerover", e => {
      const p = e.target.closest("path.ac"); if (!p || !tip) return;
      const no = +p.dataset.ac;
      const c = key === "post" ? newByN[no] : oldByN[no];
      if (!c) return;
      tip.innerHTML = tipHTML(c, key);
      tip.style.display = "block";
    });
    svg.addEventListener("pointermove", e => {
      if (!tip || tip.style.display !== "block") return;
      const r = tip.parentElement.getBoundingClientRect();
      let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
      if (x + 250 > r.width) x = e.clientX - r.left - 254;
      tip.style.left = Math.max(4, x) + "px"; tip.style.top = y + "px";
    });
    svg.addEventListener("pointerout", () => { if (tip) tip.style.display = "none"; });
    svg.addEventListener("click", e => {
      const p = e.target.closest("path.ac"); if (!p) return;
      const no = +p.dataset.ac;
      if (key === "pre") { selOld = no; selNew = null; }
      else { selNew = no; selOld = null; }
      update();
    });
  }

  function tipHTML(c, key) {
    const isOld = key === "pre";
    const party = partyOf(isOld ? c.party07 : c.party12);
    const orderLabel = isOld ? (PRE_YEAR + " order") : (POST_YEAR + " order");
    return "<div class=\"n\">AC " + c.ac_no + " \u00b7 " + orderLabel + "</div>" +
      "<strong>" + esc(c.name) + "</strong>" +
      (c.type === "SC" ? " <span style=\"font-size:9px;background:var(--ink);color:var(--bg);padding:0 3px;border-radius:2px\">SC</span>" : "") +
      (c.type === "ST" ? " <span style=\"font-size:9px;background:var(--ink);color:var(--bg);padding:0 3px;border-radius:2px\">ST</span>" : "") +
      "<div class=\"r\">" + esc(c.district) + " district</div>" +
      (party ? "<div class=\"r\" style=\"display:flex;align-items:center;gap:5px\"><span style=\"" + partyDotStyle(party) + "\"></span><span>" + esc(partyLine(party)) + "</span></div>" : "");
  }

  /* ---- Master update ---- */
  function update() {
    updatePlate1();
    updatePlate2();
    updatePlate3();
    updatePlate4();
    updatePanel();
    updateIndexHighlight();
    renderSearch();
  }

  function updateIndexHighlight() {
    document.querySelectorAll("button[data-idx-side].is-selected").forEach(b => b.classList.remove("is-selected"));
    if (selOld !== null) {
      const b = document.querySelector("button[data-idx-side=\"old\"][data-ac=\"" + selOld + "\"]");
      if (b) b.classList.add("is-selected");
    }
    if (selNew !== null) {
      const b = document.querySelector("button[data-idx-side=\"new\"][data-ac=\"" + selNew + "\"]");
      if (b) b.classList.add("is-selected");
    }
  }

  /* ==== PLATE I ==== */
  function updatePlate1() {
    document.querySelectorAll(".p1-tbtn").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.val === view1 ? "true" : "false");
    });
    const preSlot = document.querySelector("#p1-stage [data-svg-slot=\"pre\"]");
    const postSlot = document.querySelector("#p1-stage [data-svg-slot=\"post\"]");
    if (preSlot) preSlot.style.display = view1 === "post" ? "none" : "block";
    if (postSlot) {
      postSlot.style.display = view1 === "pre" ? "none" : "block";
      const svg = postSlot.querySelector("svg");
      if (svg) svg.classList.toggle("as-outline", view1 === "overlay");
    }
    const orderLine = $("p1-order-line");
    if (orderLine) orderLine.textContent =
      view1 === "post" ? "Assembly constituencies \u00b7 Delimitation Order, " + POST_YEAR :
      "Assembly constituencies \u00b7 Delimitation Order, " + PRE_YEAR;
    const caption = $("p1-caption");
    if (caption) caption.textContent =
      view1 === "post" ? (POST_YEAR + " order \u00b7 in force from " + POST_YEAR) :
      view1 === "overlay" ? ("In force " + PRE_YEAR + "\u2013" + (POST_YEAR-1) + " \u00b7 " + POST_YEAR + " boundaries overlaid") :
      "Actual pre-" + POST_YEAR + " boundaries, digitised \u00b7 " + olds.length + " seats";
    document.querySelectorAll("#p1-stage [data-svg-slot=\"pre\"] path.ac").forEach(p => {
      p.classList.toggle("is-selected", selOld !== null && +p.dataset.ac === selOld);
    });
    document.querySelectorAll("#p1-stage [data-svg-slot=\"post\"] path.ac").forEach(p => {
      p.classList.toggle("is-selected", selNew !== null && +p.dataset.ac === selNew);
    });
  }

  /* ==== PLATE II ==== */
  function updatePlate2() {
    document.querySelectorAll("#p2-stage [data-svg-slot=\"post2\"] path.ac").forEach(p => {
      p.classList.toggle("is-selected", selNew !== null && +p.dataset.ac === selNew);
      const isLinked = selOld !== null && (oldByN[selOld] || {}).dest && (oldByN[selOld].dest || []).indexOf(+p.dataset.ac) !== -1;
      p.classList.toggle("is-linked", isLinked);
    });
    renderDistrictLedger();
    renderMalapportionmentBand();
  }

  function renderDistrictLedger() {
    const el = $("district-ledger");
    if (!el) return;
    const distNew = data.district_grid_new || [];
    const oc = {}, nc = {};
    olds.forEach(o => { oc[o.district] = (oc[o.district] || 0) + 1; });
    news.forEach(s => { nc[s.district] = (nc[s.district] || 0) + 1; });
    let nGain = 0, nLoss = 0, nNew = 0;
    const rows = distNew.map(d => {
      const cNow = nc[d.name] || 0;
      const isNew = !(d.name in oc);
      const diff = isNew ? 0 : cNow - oc[d.name];
      if (isNew) nNew++; else if (diff > 0) nGain++; else if (diff < 0) nLoss++;
      const deltaCol = diff === 0 && !isNew ? "var(--ink-35)" : "var(--ink)";
      return "<div style=\"display:flex;align-items:baseline;gap:8px;border-bottom:1px dotted var(--ink-25);padding:3px 0 4px\">" +
        "<span style=\"font-family:var(--sans);font-size:13px;font-weight:600;letter-spacing:0.04em;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + esc(d.name.toUpperCase()) + "</span>" +
        (isNew ? "<span style=\"font-family:var(--sans);font-size:9.5px;font-weight:700;letter-spacing:0.1em;background:var(--ink);color:var(--bg);padding:0 5px 1px;border-radius:2px;flex:none\">NEW</span>" : "") +
        "<span style=\"font-family:var(--mono);font-size:11px;color:var(--ink-70);flex:none\">" + (isNew ? "\u2014" : oc[d.name]) + " \u2192 " + cNow + "</span>" +
        "<span style=\"font-family:var(--mono);font-size:11px;font-weight:700;flex:none;width:28px;text-align:right;color:" + deltaCol + "\">" + (isNew ? "" : diff > 0 ? "+" + diff : diff < 0 ? "\u2212" + (-diff) : "\u00b10") + "</span>" +
        "</div>";
    });
    const summary = distNew.length + " districts \u00b7 " + nNew + " new \u00b7 " + nLoss + " shed seats \u00b7 " + nGain + " gained";
    el.innerHTML =
      "<div style=\"display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--ink-45);padding-bottom:8px;margin-bottom:12px\">" +
      "<span style=\"font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase\">District ledger \u00b7 seats per district, " + PRE_YEAR + " order \u2192 " + POST_YEAR + " order</span>" +
      "<span style=\"margin-left:auto;font-family:var(--mono);font-size:10.5px;letter-spacing:0.06em;color:var(--ink-70)\">" + esc(summary) + "</span>" +
      "</div>" +
      "<div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:3px 26px\">" + rows.join("") + "</div>" +
      "<p style=\"margin:12px 0 0;font-size:11.5px;font-style:italic;line-height:1.5;color:var(--ink-70);max-width:880px\">Districts marked NEW were carved out between the two orders. The state total stayed fixed at " + olds.length + " seats.</p>";
  }

  function renderMalapportionmentBand() {
    const el = $("mal-band");
    if (!el || !electors07.length || !electors12.length) return;
    function stats(arr) {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const lo = Math.min(...arr), hi = Math.max(...arr);
      const ratio = hi / lo;
      const meanDev = arr.reduce((a, b) => a + Math.abs(b - mean), 0) / arr.length / mean * 100;
      const over25 = arr.filter(x => Math.abs(x - mean) / mean > 0.25).length;
      return { lo, hi, ratio, meanDev, over25 };
    }
    function fmt(v) {
      return v >= 100000 ? (v / 100000).toFixed(2).replace(/\.?0+$/, "") + "\u00a0L" : Math.round(v / 1000) + "k";
    }
    const ma = stats(electors07), mb = stats(electors12);
    const rows = [
      { label: "Smallest seat",           v07: fmt(ma.lo),                      v12: fmt(mb.lo),                      note: "electors on the rolls" },
      { label: "Largest seat",            v07: fmt(ma.hi),                      v12: fmt(mb.hi),                      note: "electors on the rolls" },
      { label: "Largest \u00f7 smallest", v07: ma.ratio.toFixed(1) + "\u00d7",  v12: mb.ratio.toFixed(1) + "\u00d7",  note: "spread between extremes" },
      { label: "Mean deviation",          v07: ma.meanDev.toFixed(0) + "%",     v12: mb.meanDev.toFixed(0) + "%",     note: "avg distance from state mean" },
      { label: "Seats >25% off mean",     v07: ma.over25 + " of " + olds.length, v12: mb.over25 + " of " + news.length, note: "over- or under-populated" },
    ];
    el.innerHTML =
      "<div style=\"display:flex;align-items:baseline;gap:16px;border-bottom:1px solid var(--ink-45);padding-bottom:8px;margin-bottom:14px\">" +
      "<span style=\"font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase\">What the redraw fixed \u00b7 electors per seat, " +
      PRE_ELEC + " vs " + POST_ELEC + "</span></div>" +
      "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px 28px\">" +
      rows.map(r =>
        "<div style=\"border-left:2px solid var(--ink);padding-left:12px\">" +
        "<div style=\"font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);margin-bottom:2px\">" + esc(r.label) + "</div>" +
        "<div style=\"font-family:var(--mono);font-size:17px;font-weight:500;line-height:1.3\">" + esc(r.v07) + " <span style=\"font-size:12px;color:var(--ink-45)\">\u2192</span> " + esc(r.v12) + "</div>" +
        "<div style=\"font-family:var(--sans);font-size:12px;color:var(--ink-70);margin-top:1px\">" + esc(r.note) + "</div>" +
        "</div>"
      ).join("") +
      "</div>" +
      "<p style=\"margin:12px 0 0;font-size:11.5px;font-style:italic;line-height:1.5;color:var(--ink-70);max-width:880px\">" +
      "Electors on the rolls at the " + PRE_ELEC + " election (" + PRE_YEAR + " map) and the " + POST_ELEC + " election (" + POST_YEAR + " map). Deviation figures compare each seat to the state mean of its year.</p>";
  }

  /* ==== PLATE III ==== */
  /* Two-colour ink system: the interface uses one ink and one accent.
     Hue survives only where it carries data, on the party overlay. */
  const REL_FILL = "var(--teal-lt)", REL_STROKE = "var(--teal)", SEL_FILL = "var(--ink-18)";
  const FLIP_FILL = "var(--teal-mid)", HELD_FILL = "var(--ink-12)";

  function partyFillFor(acNo, side) {
    if (cPartyMode === "none") return null;
    if (cPartyMode === "flipped") {
      const inFlip = (side === "old" ? flipOldSet : flipNewSet).has(acNo);
      const inHeld = (side === "old" ? heldOldSet : heldNewSet).has(acNo);
      return inFlip ? FLIP_FILL : (inHeld ? "var(--bg)" : "var(--ink-06)");
    }
    if (cPartyMode === "held") {
      const inHeld = (side === "old" ? heldOldSet : heldNewSet).has(acNo);
      const inFlip = (side === "old" ? flipOldSet : flipNewSet).has(acNo);
      return inHeld ? HELD_FILL : (inFlip ? "var(--bg)" : "var(--ink-06)");
    }
    /* party-code mode */
    const c = side === "old" ? oldByN[acNo] : newByN[acNo];
    if (!c) return "var(--ink-06)";
    const won = (side === "old" ? c.party07 : c.party12);
    if (!won) return "var(--ink-06)";
    const p = partyOf(won);
    return (p && p.code === cPartyMode) ? (p.c || FLIP_FILL) : "var(--ink-06)";
  }

  function updatePlate3() {
    const selOldSet = selOld !== null ? new Set((oldByN[selOld] || {}).dest || []) : new Set();
    const selNewSrcs = selNew !== null ? new Set((newByN[selNew] || {}).src || []) : new Set();

    document.querySelectorAll("[data-svg-slot='pre3'] path.ac").forEach(p => {
      const no = +p.dataset.ac;
      const isSel = selOld !== null && no === selOld;
      const isLinked = selNew !== null && selNewSrcs.has(no);
      const ff = partyFillFor(no, "old");
      p.style.fill = isSel ? SEL_FILL : isLinked ? REL_FILL : (ff || "");
      p.style.stroke = isSel ? "var(--ink)" : isLinked ? REL_STROKE : "";
      p.style.strokeWidth = isSel ? "2.4" : isLinked ? "1.8" : "";
    });

    document.querySelectorAll("[data-svg-slot='post3'] path.ac").forEach(p => {
      const no = +p.dataset.ac;
      const isSel = selNew !== null && no === selNew;
      const isLinked = selOld !== null && selOldSet.has(no);
      const ff = partyFillFor(no, "new");
      p.style.fill = isSel ? SEL_FILL : isLinked ? REL_FILL : (ff || "");
      p.style.stroke = isSel ? "var(--ink)" : isLinked ? REL_STROKE : "";
      p.style.strokeWidth = isSel ? "2.4" : isLinked ? "1.8" : "";
    });

    /* update chip states */
    document.querySelectorAll(".p3-flip-chip").forEach(b => {
      const active = b.dataset.mode === cPartyMode;
      b.style.border = "1px solid " + (active ? "var(--ink)" : "var(--ink-45)");
      b.style.background = active ? "var(--ink)" : "var(--surface)";
      b.style.color = active ? "var(--bg)" : "var(--ink)";
    });

    const flipNote = $("p3-flip-note");
    if (flipNote) {
      if (cPartyMode === "none") {
        flipNote.style.display = "none";
      } else if (cPartyMode === "flipped" || cPartyMode === "held") {
        flipNote.style.display = "inline-flex";
        const sw = flipNote.querySelector(".p3-flip-swatch");
        if (sw) sw.style.background = cPartyMode === "flipped" ? FLIP_FILL : HELD_FILL;
        const txt = flipNote.querySelector(".p3-flip-text");
        if (txt) txt.textContent = cPartyMode === "flipped" ? "seats won by different parties in both elections" : "seats won by the same party in both elections";
      } else {
        /* party mode */
        const p = partyOf(cPartyMode);
        flipNote.style.display = "inline-flex";
        const sw = flipNote.querySelector(".p3-flip-swatch");
        if (sw) { sw.style.background = p ? p.c : FLIP_FILL; }
        const txt = flipNote.querySelector(".p3-flip-text");
        const oldCount = olds.filter(c => c.party07 === cPartyMode).length;
        const newCount = news.filter(c => c.party12 === cPartyMode).length;
        if (txt) txt.textContent = (p ? partyLine(p) : cPartyMode) + " \u00b7 " + oldCount + " seats (" + PRE_ELEC + ") \u2192 " + newCount + " seats (" + POST_ELEC + ")";
      }
    }

    renderPlate3Panel();
  }

  function renderPlate3Panel() {
    const panel = $("p3-panel");
    if (!panel) return;
    if (selOld === null && selNew === null) {
      panel.innerHTML =
        "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">Reading the comparison</div>" +
        "<p style=\"margin:14px 0 12px;font-size:14px;line-height:1.55\">Plates I and II drawn on one projection, at one scale. Click a constituency on either map: it is outlined and its counterpart territory on the opposite map fills <span style=\"background:var(--teal-lt);border:1px solid var(--teal);padding:0 6px;border-radius:2px\">blue</span>.</p>" +
        "<p style=\"margin:0;font-size:14px;line-height:1.55\">For an old seat, that is where its territory went; for a new seat, the pre-" + POST_YEAR + " seats it was built from.</p>";
      return;
    }
    const isOld = selOld !== null;
    const c = isOld ? oldByN[selOld] : newByN[selNew];
    if (!c) return;
    panel.innerHTML = seatPanelHTML(c, isOld ? "old" : "new", "p3");
  }

  /* ==== PLATE IV ==== */
  function updatePlate4() {
    document.querySelectorAll(".chip").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.filter === filter ? "true" : "false");
    });
    const relNew = new Set(), relOld = new Set();
    if (tsel && tsel.kind === "seat") {
      if (tsel.side === "old") ((oldByN[tsel.n] || {}).dest || []).forEach(d => relNew.add(d));
      else olds.forEach(o => { if ((o.dest || []).indexOf(tsel.n) !== -1) relOld.add(o.ac_no); });
    }
    document.querySelectorAll(".t4tile").forEach(tile => {
      const no = +tile.dataset.ac, side = tile.dataset.side;
      const c = side === "old" ? oldByN[no] : newByN[no];
      if (!c) return;
      let show = true;
      if (filter === "sc") show = c.type === "SC" || !!(c.sc_note);
      else if (filter === "st") show = c.type === "ST";
      else if (filter === "flipped") show = (side === "old" ? flipOldSet : flipNewSet).has(no);
      else if (filter === "held") show = (side === "old" ? heldOldSet : heldNewSet).has(no);
      else if (filter !== "all") show = c.status === filter;
      tile.style.opacity = show ? "1" : "0.15";
      const isSel = tsel && tsel.kind === "seat" && tsel.side === side && tsel.n === no;
      const isRel = side === "old" ? relOld.has(no) : relNew.has(no);
      const col = T_COL[c.status] || T_COL.continuing;
      if (isSel)      { tile.style.background = "var(--ink-18)"; tile.style.borderColor = "var(--ink)"; tile.style.boxShadow = "0 0 0 2px var(--ink)"; }
      else if (isRel) { tile.style.background = "var(--teal-lt)"; tile.style.borderColor = "var(--teal)"; tile.style.boxShadow = "0 0 0 1.5px var(--teal)"; }
      else            { tile.style.background = col.bg; tile.style.borderColor = col.bc; tile.style.boxShadow = ""; }
    });
    document.querySelectorAll(".t4dist-btn").forEach(btn => {
      const isSel = tsel && tsel.kind === "dist" && tsel.side === btn.dataset.side && tsel.name === btn.dataset.name;
      const block = btn.closest(".t4dist");
      if (block) { block.style.background = isSel ? "var(--surface2)" : "var(--surface)"; block.style.borderColor = isSel ? "var(--ink)" : "var(--ink-25)"; }
    });
    renderPlate4Panel();
  }

  function renderPlate4Panel() {
    const panel = $("p4-panel");
    if (!panel) return;
    if (!tsel) { panel.innerHTML = renderStatsTable(); return; }
    if (tsel.kind === "dist") {
      const list = tsel.side === "old" ? olds : news;
      const cnt = list.filter(c => c.district === tsel.name).length;
      panel.innerHTML =
        "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:10px\">" +
        "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">" + esc(tsel.side === "old" ? "Before " + POST_YEAR + " \u00b7 district" : "After " + POST_YEAR + " \u00b7 district") + "</div>" +
        "<button data-t4-clear=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted var(--ink-45)\">\u00d7 clear</button></div>" +
        "<h3 style=\"margin:8px 0 4px;font-size:25px;font-weight:600\">" + esc(tsel.name) + "</h3>" +
        "<div style=\"font-family:var(--mono);font-size:11px;color:var(--ink-60);margin-bottom:12px\">" + cnt + " constituencies</div>" +
        "<p style=\"font-size:14px;line-height:1.55\">Click any constituency in this district for its individual record.</p>";
      return;
    }
    const isOld = tsel.side === "old";
    const c = isOld ? oldByN[tsel.n] : newByN[tsel.n];
    if (!c) return;
    panel.innerHTML = "<button data-t4-clear=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted var(--ink-45);float:right\">\u00d7 clear</button>" +
      seatPanelHTML(c, isOld ? "old" : "new", "t4");
  }

  /* ---- Shared seat panel HTML ---- */
  function seatPanelHTML(c, side, prefix) {
    const isOld = side === "old";
    const STATUS_LABELS = {
      continuing: "Name continued",
      abolished:  "Name abolished",
      renamed:    "Renamed",
      "new":      "Created " + POST_YEAR,
      merged:     "Merged " + POST_YEAR,
      split:      "Split " + POST_YEAR,
      replaced:   "Replaced " + POST_YEAR,
      carved:     "Created " + POST_YEAR,
      replaces:   "Renamed " + POST_YEAR,
    };
    const STATUS_PILL = {
      continuing: { bg: "var(--surface)",  bc: "var(--ink-25)" },
      abolished:  { bg: "var(--bg)",       bc: "var(--ink-60)" },
      merged:     { bg: "var(--bg)",       bc: "var(--ink-60)" },
      split:      { bg: "var(--bg)",       bc: "var(--ink-60)" },
      replaced:   { bg: "var(--bg)",       bc: "var(--ink-60)" },
      renamed:    { bg: "var(--teal-lt)",  bc: "var(--teal)"   },
      replaces:   { bg: "var(--teal-lt)",  bc: "var(--teal)"   },
      "new":      { bg: "var(--ink)",      bc: "var(--ink)"    },
      carved:     { bg: "var(--ink)",      bc: "var(--ink)"    },
    };
    const col = STATUS_PILL[c.status] || STATUS_PILL.continuing;
    const statusLabel = STATUS_LABELS[c.status] || c.status || "";
    const shareOf = n => (c.shares || {})[String(n)] || null;
    const links = isOld
      ? (c.dest || []).map(n => { const s = newByN[n]; return s ? { label: String(n).padStart(2,"0") + " \u00b7 " + s.name + (s.type==="SC"?" (SC)":s.type==="ST"?" (ST)":""), n, side:"new", pfx:prefix, sh: shareOf(n) } : null; }).filter(Boolean)
      : (c.src  || []).map(n => { const s = oldByN[n]; return s ? { label: String(n).padStart(2,"0") + " \u00b7 " + s.name + (s.type==="SC"?" (SC)":s.type==="ST"?" (ST)":""), n, side:"old", pfx:prefix, sh: shareOf(n) } : null; }).filter(Boolean);
    links.sort((a,b) => ((b.sh && b.sh.pct) || 0) - ((a.sh && a.sh.pct) || 0));
    const linksLabel = isOld
      ? "Territory went to (" + POST_YEAR + " seats) \u00b7 share of this seat"
      : "Built from (pre-" + POST_YEAR + " seats) \u00b7 share of this seat";
    const partyCode  = isOld ? c.party07 : c.party12;
    const winnerName = isOld ? c.winner_07 : c.winner_12;
    const electors   = isOld ? c.electors_07 : c.electors_12;
    const electorArr = isOld ? electors07 : electors12;
    const electionLabel = isOld
      ? "Won in " + PRE_ELEC + " \u2014 last election on this map"
      : "Won in " + POST_ELEC + " \u2014 first election on this map";
    const electorLabel = isOld
      ? "Electorate \u00b7 " + (data.pre_election_label || PRE_ELEC + " election")
      : "Electorate \u00b7 " + (data.post_election_label || POST_ELEC + " election");
    const party = partyOf(partyCode);

    let html =
      "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:10px\">" +
      "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">" +
      esc((isOld ? "Before " + POST_YEAR : "After " + POST_YEAR) + " \u00b7 " + c.district + " district \u00b7 No. " + c.ac_no) + "</div>" +
      "</div>" +
      "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 4px\">" +
      "<h3 style=\"margin:0;font-size:25px;font-weight:600;line-height:1.1\">" + esc(c.name) + "</h3>" +
      (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:0.06em;background:var(--ink);color:var(--bg);padding:1px 6px;border-radius:2px\">SC</span>" : "") +
      (c.type === "ST" ? "<span style=\"font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:0.06em;background:var(--ink);color:var(--bg);padding:1px 6px;border-radius:2px\">ST</span>" : "") +
      "</div>" +
      "<div style=\"margin-bottom:12px\"><span style=\"display:inline-block;padding:2px 10px;border-radius:3px;font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:0.06em;background:" + col.bg + ";border:1px solid " + col.bc + "\">" + esc(statusLabel) + "</span></div>";

    if (c.note) html += "<p style=\"margin:0 0 12px;font-size:14.5px;line-height:1.55\">" + esc(c.note) + "</p>";
    if (c.sc_note) html += "<p style=\"margin:0 0 12px;font-size:13.5px;line-height:1.5;font-style:italic;border-top:1px dotted var(--ink-45);padding-top:8px\">Reservation: " + esc(c.sc_note) + "</p>";

    if (party) {
      const fullLine = (winnerName ? winnerName + " \u00b7 " : "") + partyLine(party);
      html +=
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:4px;margin-bottom:8px\">" + esc(electionLabel) + "</div>" +
        "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">" +
        "<span style=\"" + partyDotStyle(party) + "\"></span>" +
        "<span style=\"font-family:var(--sans);font-size:13.5px;font-weight:600\">" + esc(fullLine) + "</span>" +
        "</div>";
    }

    if (electors) {
      html +=
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:4px;margin-bottom:8px\">" + esc(electorLabel) + "</div>" +
        "<p style=\"margin:0 0 12px;font-family:var(--sans);font-size:13.5px;line-height:1.5\">" +
        "<span style=\"font-family:var(--mono);font-weight:500\">" + fmtElectors(electors) + "</span> electors on the rolls " +
        "<span style=\"color:var(--ink-60)\">\u00b7 " + esc(devLine(electors, electorArr)) + "</span>" +
        "</p>";
    }

    if (c.extent || c.extent_1976) {
      html +=
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:4px;margin-bottom:8px\">Extent of area, as delimited</div>" +
        "<p style=\"margin:0 0 16px;font-family:var(--sans);font-size:13px;line-height:1.5;color:var(--ink-85)\">" + esc(c.extent || c.extent_1976 || "") + "</p>";
    }

    if (links.length) {
      html +=
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:4px;margin-bottom:8px\">" + esc(linksLabel) + "</div>" +
        "<div style=\"display:flex;flex-wrap:wrap;gap:6px\">" +
        links.map(lk => {
          const attr = prefix === "p3" ? "data-p3-link-side=\"" + lk.side + "\" data-p3-link-n=\"" + lk.n + "\""
                                       : "data-t4-link-side=\"" + lk.side + "\" data-t4-link-n=\"" + lk.n + "\"";
          var pctHTML = "";
          if (lk.sh && typeof lk.sh.pct === "number") {
            var soft = lk.sh.basis === "approx";
            var txt  = (soft ? "~" : "") + (lk.sh.pct >= 10 ? Math.round(lk.sh.pct) : lk.sh.pct.toFixed(1)) + "%";
            pctHTML = "<span style=\"margin-left:6px;font-family:var(--mono);font-size:11px;" +
                      (soft ? "color:var(--ink-45);font-style:italic" : "color:var(--ink-70)") +
                      "\" title=\"" + (soft ? "Approximate: one of these seats is defined by municipal wards, which the two orders number differently" : "Measured from the mapped boundaries of both orders") + "\">" + txt + "</span>";
          }
          return "<button " + attr + " style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid var(--ink-45);background:#fff;padding:3px 9px;border-radius:99px;display:inline-flex;align-items:baseline\">" + esc(lk.label) + pctHTML + " <span style=\"margin-left:5px\">\u2192</span></button>";
        }).join("") + "</div>";
    }

    html +=
      "<div style=\"border-top:1px dotted var(--ink-45);margin-top:16px;padding-top:10px\">" +
      "<a href=\"" + reportHref(c, isOld) + "\" style=\"font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted var(--ink-45);text-decoration:none\">" +
      "Report an error in this record</a></div>";

    return html;
  }

  function renderStatsTable() {
    const delimLabel = data.post_order_year ? data.post_order_year + " delimitation" : "2008 delimitation";
    return "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60);margin-bottom:12px\">The " + delimLabel + " at a glance</div>" +
      "<table style=\"border-collapse:collapse;width:100%\">" +
      (data.stats || []).map(s =>
        "<tr><td style=\"font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-60);padding:6px 10px 6px 0;border-bottom:1px dashed var(--ink-20)\">" + esc(s.k) + "</td>" +
        "<td style=\"font-family:var(--mono);font-size:14px;padding:6px 0 6px 6px;border-bottom:1px dashed var(--ink-20)\">" + esc(s.v) + "</td></tr>"
      ).join("") + "</table>" +
      "<p style=\"margin-top:16px;font-size:13px;color:var(--ink-60);font-style:italic\">Click any tile or district name for its full record.</p>";
  }

  /* ==== PANEL (Plates I & II sticky side panel) ==== */
  function updatePanel() {
    const p1 = $("detail-panel"), p2 = $("p2-panel");
    if (!p1 && !p2) return;
    if (selOld === null && selNew === null) {
      if (p1) p1.innerHTML = renderInlinePanelDefault("old");
      if (p2) p2.innerHTML = renderInlinePanelDefault("new");
      return;
    }
    const clearBtn = "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--ink-20)\">" +
      "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-60)\">Seat record</div>" +
      "<button data-clear-sel=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted var(--ink-45)\">\u00d7 back to index</button></div>";
    const isOld = selOld !== null;
    const c = isOld ? oldByN[selOld] : newByN[selNew];
    if (!c) return;
    const html = clearBtn + seatPanelHTML(c, isOld ? "old" : "new", "panel");
    if (p1) p1.innerHTML = html;
    if (p2) p2.innerHTML = html;
  }

  /* ---- Search ---- */
  function renderSearch() {
    const inp = $("search-input");
    if (!inp) return;
    inp.value = searchQ;
    const drop = $("search-drop");
    if (!drop) return;
    const q = searchQ.trim().toLowerCase();
    const open = q.length >= 2 || /^\d+$/.test(q);
    drop.style.display = open ? "block" : "none";
    if (!open) return;
    const smatch = (c) => {
      const n = c.ac_no !== undefined ? c.ac_no : c.n;
      const name = (c.name || "").toLowerCase();
      const dist = (c.district || c.dist || "").toLowerCase();
      return name.includes(q) || String(n) === q || dist.includes(q);
    };
    const tagBase = "font-family:var(--mono);font-size:9px;letter-spacing:0.08em;flex:none;padding:1px 4px;border-radius:2px;";
    const rows = [];
    olds.filter(c => smatch(c)).slice(0,8).forEach(c => {
      rows.push("<button data-search-old=\"" + c.ac_no + "\" style=\"all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:baseline;gap:8px;padding:6px 10px;border-bottom:1px dotted var(--ink-25)\">" +
        "<span style=\"" + tagBase + "border:1px solid var(--ink-60)\">" + PRE_YEAR + "</span>" +
        "<span style=\"font-family:var(--mono);font-size:10px;color:var(--ink-60);flex:none\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
        "<span style=\"font-family:var(--sans);font-size:13px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + esc(c.name) + (c.type==="SC"?" (SC)":c.type==="ST"?" (ST)":"") + "</span>" +
        "<span style=\"font-family:var(--sans);font-size:11px;color:var(--ink-60);flex:none\">" + esc(c.district) + "</span>" +
        "</button>");
    });
    news.filter(c => smatch(c)).slice(0,8).forEach(c => {
      rows.push("<button data-search-new=\"" + c.ac_no + "\" style=\"all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:baseline;gap:8px;padding:6px 10px;border-bottom:1px dotted var(--ink-25)\">" +
        "<span style=\"" + tagBase + "background:var(--ink);color:var(--bg);border:1px solid var(--ink)\">" + POST_YEAR + "</span>" +
        "<span style=\"font-family:var(--mono);font-size:10px;color:var(--ink-60);flex:none\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
        "<span style=\"font-family:var(--sans);font-size:13px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + esc(c.name) + (c.type==="SC"?" (SC)":c.type==="ST"?" (ST)":"") + "</span>" +
        "<span style=\"font-family:var(--sans);font-size:11px;color:var(--ink-60);flex:none\">" + esc(c.district) + "</span>" +
        "</button>");
    });
    drop.innerHTML = rows.length ? rows.slice(0,14).join("") :
      "<div style=\"font-family:var(--sans);font-size:12.5px;font-style:italic;color:var(--ink-60);padding:8px 10px\">No seat or district matches</div>";
  }

  /* ==== PLATE FURNITURE ==== */

  function ensureHatchDefs() {
    if (document.getElementById("plate-hatch-defs")) return;
    var d = document.createElement("div");
    d.id = "plate-hatch-defs";
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    d.innerHTML =
      "<svg xmlns=\"http://www.w3.org/2000/svg\"><defs>" +
      "<pattern id=\"pf-sc\" width=\"6\" height=\"6\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">" +
      "<rect width=\"6\" height=\"6\" fill=\"var(--bg)\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"6\" stroke=\"var(--ink-45)\" stroke-width=\"1.3\"/></pattern>" +
      "<pattern id=\"pf-st\" width=\"6\" height=\"6\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(135)\">" +
      "<rect width=\"6\" height=\"6\" fill=\"var(--bg)\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"6\" stroke=\"var(--ink-60)\" stroke-width=\"1.3\"/></pattern>" +
      "</defs></svg>";
    document.body.appendChild(d);
  }

  function tagReservations(svg, key) {
    var lookup = (key === "post" || key === "post2" || key === "post3") ? newByN : oldByN;
    svg.querySelectorAll("path.ac").forEach(function (p) {
      var c = lookup[+p.dataset.ac];
      if (!c) return;
      p.classList.remove("is-sc", "is-st");
      if (c.type === "SC") p.classList.add("is-sc");
      else if (c.type === "ST") p.classList.add("is-st");
    });
  }

  function northArrowHTML() {
    return "<svg class=\"plate-north\" viewBox=\"0 0 24 40\" aria-label=\"North\" role=\"img\">" +
      "<polygon points=\"12,2 18,20 12,15 6,20\" fill=\"var(--ink)\"/>" +
      "<text x=\"12\" y=\"34\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"600\" fill=\"var(--ink)\">N</text>" +
      "</svg>";
  }

  function reservationKeyHTML(side) {
    var list = side === "new" ? news : olds;
    var sc = list.filter(function (c) { return c.type === "SC"; }).length;
    var st = list.filter(function (c) { return c.type === "ST"; }).length;
    if (!sc && !st) return "";
    var item = function (cls, label, n) {
      return "<span class=\"plate-key__item\"><span class=\"plate-key__sw " + cls + "\"></span>" +
             label + " <span class=\"mono\">" + n + "</span></span>";
    };
    return "<div class=\"plate-key\">" +
      "<span class=\"plate-key__t\">Reservation</span>" +
      (sc ? item("is-sc", "Scheduled Castes", sc) : "") +
      (st ? item("is-st", "Scheduled Tribes", st) : "") +
      "<span class=\"plate-key__item\"><span class=\"plate-key__sw\"></span>General</span>" +
      "</div>";
  }

  /* ==== CITATION, DOWNLOAD, ERROR REPORT ==== */

  function siteOrigin() {
    return (location.protocol === "http:" || location.protocol === "https:")
      ? location.origin : "https://boundaries.in";
  }
  function stateURL() {
    return siteOrigin() + "/state.html?state=" + entry.slug;
  }
  function accessedToday() {
    try {
      return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return new Date().toDateString(); }
  }
  function citationText() {
    const revised = data.last_updated || entry.last_updated || "";
    return "Boundaries. " + data.name + " Legislative Assembly: constituencies under the " +
      PRE_YEAR + " and " + POST_YEAR + " delimitation orders. " +
      (revised ? "Revised " + revised + ". " : "") +
      stateURL() + ". Accessed " + accessedToday() + ".";
  }

  function reportHref(c, isOld) {
    const orderLbl = (isOld ? PRE_YEAR : POST_YEAR) + " order";
    const subject = "Boundaries correction \u00b7 " + data.name + " \u00b7 AC " + c.ac_no + " " + c.name + " (" + orderLbl + ")";
    const body =
      "State: " + data.name + "\n" +
      "Seat: " + c.ac_no + " " + c.name + "\n" +
      "Order: " + orderLbl + "\n" +
      "Page: " + stateURL() + "\n\n" +
      "What appears to be wrong:\n\n\n" +
      "Source for the correction, if you have one:\n\n";
    return "mailto:" + REPORT_TO +
      "?subject=" + encodeURIComponent(subject) +
      "&amp;body=" + encodeURIComponent(body);
  }

  /* ---- CSV / JSON export ---- */

  function csvCell(v) {
    const s = (v === null || v === undefined) ? "" : String(v).replace(/\s+/g, " ").trim();
    return /[",\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
  }
  function linkList(nums, lookup) {
    return (nums || []).map(function (n) {
      const s = lookup[n];
      return s ? (n + " " + s.name) : String(n);
    }).join("; ");
  }
  function buildCSV() {
    const cols = ["order", "ac_no", "name", "district", "reservation", "status",
      "predecessor_seats", "successor_seats", "election_year", "winner", "party",
      "electors", "note", "reservation_note", "extent"];
    const lines = [cols.join(",")];
    olds.forEach(function (c) {
      lines.push([PRE_YEAR, c.ac_no, c.name, c.district, c.type || "GEN", c.status || "",
        "", linkList(c.dest, newByN), PRE_ELEC, c.winner_07 || "", c.party07 || "",
        c.electors_07 || "", c.note || "", c.sc_note || "", c.extent || c.extent_1976 || ""
      ].map(csvCell).join(","));
    });
    news.forEach(function (c) {
      lines.push([POST_YEAR, c.ac_no, c.name, c.district, c.type || "GEN", c.status || "",
        linkList(c.src, oldByN), "", POST_ELEC, c.winner_12 || "", c.party12 || "",
        c.electors_12 || "", c.note || "", c.sc_note || "", c.extent || ""
      ].map(csvCell).join(","));
    });
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }
  function download(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime + ";charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    } catch (err) {}
  }

  /* ==== EVENT DELEGATION ==== */
  document.addEventListener("click", e => {
    const sOld = e.target.closest("[data-search-old]");
    const sNew = e.target.closest("[data-search-new]");
    if (sOld) { selOld = +sOld.dataset.searchOld; selNew = null; searchQ = ""; update(); const d = $("search-drop"); if(d) d.style.display="none"; return; }
    if (sNew) { selNew = +sNew.dataset.searchNew; selOld = null; searchQ = ""; update(); const d = $("search-drop"); if(d) d.style.display="none"; return; }

    if (e.target.closest("[data-cite-copy]")) {
      const btn = e.target.closest("[data-cite-copy]");
      const txt = citationText();
      const done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy citation"; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
      return;
    }
    if (e.target.closest("[data-dl-csv]")) {
      download("boundaries-" + entry.slug + "-" + PRE_YEAR + "-" + POST_YEAR + ".csv", buildCSV(), "text/csv");
      return;
    }
    if (e.target.closest("[data-dl-json]")) {
      download("boundaries-" + entry.slug + ".json", JSON.stringify(data, null, 2), "application/json");
      return;
    }

    const gn = e.target.closest("[data-goto-new]");
    const go = e.target.closest("[data-goto-old]");
    if (gn) { e.preventDefault(); selNew = +gn.dataset.gotoNew; selOld = null; update(); }
    if (go) { e.preventDefault(); selOld = +go.dataset.gotoOld; selNew = null; update(); }

    if (e.target.closest("[data-clear-sel]")) { selOld = null; selNew = null; update(); }
    if (e.target.closest("[data-p3-clear]"))  { selOld = null; selNew = null; update(); }

    const pl = e.target.closest("[data-p3-link-side]");
    if (pl) {
      e.preventDefault();
      if (pl.dataset.p3LinkSide === "new") { selNew = +pl.dataset.p3LinkN; selOld = null; }
      else { selOld = +pl.dataset.p3LinkN; selNew = null; }
      update();
    }

    const pc = e.target.closest(".p3-flip-chip");
    if (pc) { cPartyMode = pc.dataset.mode; updatePlate3(); return; }

    const t4t = e.target.closest(".t4tile");
    if (t4t) { tsel = { kind:"seat", side:t4t.dataset.side, n:+t4t.dataset.ac }; updatePlate4(); }
    const t4d = e.target.closest(".t4dist-btn");
    if (t4d) { tsel = { kind:"dist", side:t4d.dataset.side, name:t4d.dataset.name }; updatePlate4(); }
    if (e.target.closest("[data-t4-clear]")) { tsel = null; updatePlate4(); }
    const t4l = e.target.closest("[data-t4-link-side]");
    if (t4l) { e.preventDefault(); tsel = { kind:"seat", side:t4l.dataset.t4LinkSide, n:+t4l.dataset.t4LinkN }; updatePlate4(); }

    const b = e.target.closest("button[data-idx-side]");
    if (b) {
      const no = +b.dataset.ac;
      if (b.dataset.idxSide === "old") { selOld = no; selNew = null; }
      else { selNew = no; selOld = null; }
      update();
      const target = $(b.dataset.idxSide === "old" ? "p1" : "p2");
      if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    }
  });

  document.addEventListener("input", e => {
    if (e.target.id === "search-input") { searchQ = e.target.value; renderSearch(); }
  });

  const p1ctrl = $("p1-controls");
  if (p1ctrl) p1ctrl.addEventListener("click", e => { const b = e.target.closest(".p1-tbtn"); if (!b) return; view1 = b.dataset.val; update(); });

  document.addEventListener("click", e => { const chip = e.target.closest(".chip[data-filter]"); if (!chip) return; filter = chip.dataset.filter; updatePlate4(); });

  /* Clone SVG slots */
  const SLOT_CLONE = { "post2": "post", "pre3": "pre", "post3": "post" };
  Object.entries(SLOT_CLONE).forEach(([cloneKey, srcKey]) => {
    const srcHolder = document.querySelector("[data-svg-slot=\"" + srcKey + "\"]");
    if (!srcHolder) return;
    document.querySelectorAll("[data-svg-slot=\"" + cloneKey + "\"]").forEach(holder => {
      holder.innerHTML = srcHolder.innerHTML;
      const svg = holder.querySelector("svg");
      if (svg) {
        wireSVG(svg, srcKey);
        ensureHatchDefs(); tagReservations(svg, cloneKey);
        const vb = (svg.getAttribute("viewBox") || "0 0 860 1120").split(/\s+/);
        const stage = holder.closest(".map-stage");
        if (stage) stage.style.aspectRatio = vb[2] + " / " + vb[3];
      }
    });
  });

  /* Hero map */
  (function() {
    const slot = document.querySelector("[data-svg-slot=\"hero-pre\"]");
    const tip = $("hero-tip");
    if (!slot || !tip) return;
    const src = document.querySelector("[data-svg-slot=\"pre\"]");
    if (!src || !src.innerHTML) return;
    slot.innerHTML = src.innerHTML;
    const svg = slot.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("width", "100%");
    svg.style.height = "auto";
    svg.querySelectorAll("path.ac").forEach(p => {
      const c = oldByN[+p.dataset.ac];
      if (c && c.region) {
        const REGION_COLS = { Majha: "var(--teal-lt)", Doaba: "var(--surface2)", Malwa: "var(--surface)" };
        if (REGION_COLS[c.region]) p.style.fill = REGION_COLS[c.region];
      }
    });
    svg.addEventListener("pointerover", e => { const p = e.target.closest("path.ac"); if (!p || !tip) return; const ac = oldByN[+p.dataset.ac]; if (!ac) return; tip.innerHTML = "<strong>" + ac.name + "</strong><small>AC " + ac.ac_no + "</small>"; tip.style.display = "block"; });
    svg.addEventListener("pointermove", e => { if (tip.style.display !== "block") return; const r = slot.getBoundingClientRect(); let x = e.clientX-r.left+10, y = e.clientY-r.top-44; if (x+160>r.width) x = e.clientX-r.left-165; if (y<0) y = e.clientY-r.top+10; tip.style.left = x+"px"; tip.style.top = y+"px"; });
    svg.addEventListener("pointerout", () => { tip.style.display = "none"; });
    svg.addEventListener("click", e => { const p = e.target.closest("path.ac"); if (!p) return; selOld = +p.dataset.ac; selNew = null; update(); const t = $("p1"); if (t) t.scrollIntoView({ behavior:"smooth", block:"start" }); });
  })();

  update();
  if (selOld !== null || selNew !== null) {
    const t = document.getElementById(selNew !== null ? "p2" : "p1");
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ========================= HTML BUILDERS ========================= */

  function heroHTML() {
    const preLabel = data.pre_order_year ? "PRE-" + data.pre_order_year : "PRE-" + POST_YEAR;
    return "<header class=\"state-hero wrap\">" +
      "<div class=\"state-hero__text\">" +
      "<div class=\"hero__eyebrow\">" + esc(data.assembly) + " \u00b7 A Cartographic Record</div>" +
      "<h1 class=\"state-hero__h1\">" + esc(data.intro && data.intro[1] ? data.intro[1] : data.title) + "</h1>" +
      "<p class=\"hero__lede\">" + esc((data.intro && data.intro[0]) || "") + "</p>" +
      "<div class=\"hero__meta\">" + esc(data.assembly) + " \u00b7 " + olds.length + " constituencies \u00b7 in force " + esc(data.in_force) + "</div>" +
      "<nav class=\"plate-nav\" aria-label=\"Plates\">" +
      ["Plate I \u00b7 Pre-" + POST_YEAR + " map","Plate II \u00b7 Post-" + POST_YEAR + " map","Plate III \u00b7 Side by side","Plate IV \u00b7 Seat by seat","Sources"].map(function(t,i){
        return "<a href=\"#" + ["p1","p2","p3","p4","sources"][i] + "\">" + esc(t) + "</a>";
      }).join("") + "</nav>" +
      "</div>" +
      "<div class=\"state-hero__map\" id=\"hero-map-slot\">" +
      "<div class=\"state-hero__map-inner\">" +
      "<div class=\"hero-map-tip\" id=\"hero-tip\"></div>" +
      "<div class=\"hero-map-sheet\"><div class=\"hero-map-label\">" +
      "<span class=\"mono\" style=\"font-size:9px;letter-spacing:0.08em;color:var(--ink-45)\">" + preLabel + " \u00b7 " + esc(data.name).toUpperCase() + " \u00b7 " + olds.length + " SEATS</span>" +
      "</div>" +
      "<img src=\"" + (data.maps && data.maps.hero ? base + data.maps.hero : "assets/hero-illustration.jpg") + "\" style=\"width:100%;height:auto;display:block;border-radius:4px\" alt=\"\">" +
      "</div>" +
      "<div class=\"hero-stat-pills\">" +
      (data.figures || []).slice(0,2).map(function(f) {
        return "<div class=\"hero-pill\"><span class=\"hero-pill__v\">" + esc(f.v) + "</span><span class=\"hero-pill__k\">" + esc(f.k) + "</span></div>";
      }).join("") +
      "</div>" +
      "</div></div>" +
      "</header>";
  }

  function figuresHTML() {
    return "<div class=\"figures\">" + (data.figures || []).map(f =>
      "<div><div class=\"v\">" + esc(f.v) + "</div><div class=\"k\">" + esc(f.k) + "</div></div>"
    ).join("") + "</div>";
  }

  function searchBarHTML() {
    return "<div style=\"position:relative;flex:0 1 280px;min-width:210px\">" +
      "<input id=\"search-input\" type=\"text\" placeholder=\"Search a seat, either order\u2026\" autocomplete=\"off\" style=\"all:unset;box-sizing:border-box;width:100%;font-family:var(--sans);font-size:13px;padding:4px 10px 5px;background:var(--bg);border:1px solid var(--ink-60);border-radius:2px\">" +
      "<div id=\"search-drop\" style=\"display:none;position:absolute;top:calc(100% + 5px);left:0;right:0;background:var(--bg);border:1px solid var(--ink);box-shadow:3px 3px 0 var(--ink-18);z-index:60;max-height:360px;overflow-y:auto\"></div>" +
      "</div>";
  }

  function plate1HTML() {
    const hasPost = !!maps.post2008;
    return "<section class=\"section\" id=\"p1\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate I \u00b7 " + PRE_YEAR + "\u2013" + POST_YEAR + "</span>" +
      "<h2>The state as delimited in " + PRE_YEAR + "</h2></div>" +
      "<p>" + esc((data.intro && data.intro[0]) || "") + "</p>" +
      "<div class=\"map-grid\">" +
      "<div class=\"sheet\">" +
      "<div class=\"sheet__title\">" +
      "<div class=\"t1\">" + esc((data.name || "").toUpperCase()) + "</div>" +
      "<div class=\"t2\" id=\"p1-order-line\">Assembly constituencies \u00b7 Delimitation Order, " + PRE_YEAR + "</div>" +
      "<div class=\"t3\" id=\"p1-caption\">Actual pre-" + POST_YEAR + " boundaries, digitised \u00b7 " + olds.length + " seats</div></div>" +
      "<div class=\"map-stage\" id=\"p1-stage\">" +
      northArrowHTML() +
      "<div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"pre\" class=\"layer-base\"></div>" +
      (hasPost ? "<div data-svg-slot=\"post\" class=\"layer-post\" style=\"display:none\"></div>" : "") +
      "</div>" + reservationKeyHTML("old") + "</div>" +
      "<aside class=\"panel\" id=\"detail-panel\" aria-live=\"polite\">" +
      renderInlinePanelDefault("old") +
      "</aside></div>" +
      "</section>";
  }

  function renderInlinePanelDefault(side) {
    const distMeta = side === "old" ? (data.district_grid_old || []) : (data.district_grid_new || []);
    const seatList = side === "old" ? olds : news;
    const byDist = {};
    seatList.forEach(c => { (byDist[c.district] = byDist[c.district] || []).push(c); });
    const label = side === "old"
      ? "Index of seats \u00b7 by district of " + PRE_YEAR
      : "Index of seats \u00b7 by district of " + POST_YEAR;
    return "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-60);margin-bottom:12px\">" + esc(label) + "</div>" +
      distMeta.filter(d => byDist[d.name] && byDist[d.name].length).map(d => {
        const seats = byDist[d.name];
        return "<div style=\"margin-bottom:14px\">" +
          "<div style=\"font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;border-bottom:1px solid var(--ink-45);padding-bottom:3px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:baseline\">" +
          "<span>" + esc(d.name) + "</span>" +
          "<span style=\"font-family:var(--mono);font-size:10px;font-weight:400;color:var(--ink-60)\">" + seats.length + "</span></div>" +
          "<div style=\"display:flex;flex-direction:column\">" +
          seats.map(c =>
            "<button type=\"button\" data-idx-side=\"" + side + "\" data-ac=\"" + c.ac_no + "\" style=\"all:unset;cursor:pointer;display:flex;align-items:baseline;gap:6px;padding:2px 4px;width:100%;box-sizing:border-box\">" +
            "<span style=\"font-family:var(--mono);font-size:10.5px;color:var(--ink-60);width:22px;flex:none\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
            "<span style=\"flex:1;font-family:var(--serif);font-size:14px\">" + esc(c.name) + "</span>" +
            (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:0.05em;border:1px solid var(--ink-60);padding:0 4px;border-radius:2px;flex:none\">SC</span>" : "") +
            (c.type === "ST" ? "<span style=\"font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:0.05em;border:1px solid var(--ink);color:var(--ink);padding:0 4px;border-radius:2px;flex:none\">ST</span>" : "") +
            (c.approx ? "<span style=\"font-family:var(--sans);font-size:10.5px;font-style:italic;color:var(--ink-60);flex:none\">approx.</span>" : "") +
            "</button>"
          ).join("") + "</div></div>";
      }).join("");
  }

  function plate2HTML() {
    if (!maps.post2008) return "";
    return "<section class=\"section\" id=\"p2\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate II \u00b7 " + POST_YEAR + "\u2013present</span>" +
      "<h2>The state as re-delimited in " + POST_YEAR + "</h2></div>" +
      "<p>The " + news.length + " constituencies in force today. First fought at the " + (data.post_election_label || "first post-" + POST_YEAR + " election") + ". Each seat\u2019s panel lists the pre-" + POST_YEAR + " seats it was built from, the winner and electorate of that first election.</p>" +
      "<div id=\"district-ledger\" style=\"border:1px solid var(--ink-45);background:var(--bg);padding:16px 20px 18px;box-sizing:border-box;margin-bottom:24px\"></div>" +
      "<div class=\"map-grid\">" +
      "<div class=\"sheet\">" +
      "<div class=\"sheet__title\">" +
      "<div class=\"t1\">" + esc((data.name || "").toUpperCase()) + "</div>" +
      "<div class=\"t2\">Assembly constituencies \u00b7 Delimitation Order, " + POST_YEAR + "</div>" +
      "<div class=\"t3\">" + news.length + " seats \u00b7 in force since " + POST_YEAR + "</div></div>" +
      "<div class=\"map-stage\" id=\"p2-stage\">" +
      northArrowHTML() +
      "<div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"post2\" class=\"layer-base\"></div>" +
      "</div>" + reservationKeyHTML("new") + "</div>" +
      "<aside class=\"panel\" id=\"p2-panel\" aria-live=\"polite\">" +
      renderInlinePanelDefault("new") +
      "</aside></div>" +
      "</section>";
  }

  function plate3HTML() {
    if (!maps.post2008) return "";

    /* Party overlay chips — Assam gets per-party chips; others get flipped/held */
    let chipRowHTML;
    if (partyOverlay && partyOverlay.parties && partyOverlay.parties.length) {
      const stdChips = ["none","flipped","held"].map((m,i) => {
        const labels = ["Off", "Flipped " + PRE_ELEC + "\u2192" + POST_ELEC, "Held by same party"];
        return "<button class=\"p3-flip-chip\" data-mode=\"" + m + "\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid var(--ink-45);background:var(--surface);color:var(--ink);padding:3px 10px;border-radius:99px\">" + labels[i] + "</button>";
      }).join("");
      const partyChips = partyOverlay.parties.map(code => {
        const p = partyOf(code);
        const oldCount = (partyOverlay.old || {})[code] || 0;
        const newCount = (partyOverlay.new || {})[code] || 0;
        return "<button class=\"p3-flip-chip\" data-mode=\"" + esc(code) + "\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid var(--ink-45);background:var(--surface);color:var(--ink);padding:3px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:6px\">" +
          "<span style=\"display:inline-block;width:9px;height:9px;border-radius:2px;background:" + (p ? p.c : "#888") + ";border:1px solid var(--ink-25)\"></span>" +
          esc(code) + " <span style=\"font-family:var(--mono);font-size:10.5px;opacity:0.65\">" + oldCount + "\u2192" + newCount + "</span>" +
          "</button>";
      }).join("");
      chipRowHTML = stdChips + partyChips;
    } else {
      chipRowHTML = ["none","flipped","held"].map((m,i) => {
        const labels = ["Off", "Flipped " + PRE_ELEC + "\u2192" + POST_ELEC, "Held by same party"];
        return "<button class=\"p3-flip-chip\" data-mode=\"" + m + "\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid var(--ink-45);background:var(--surface);color:var(--ink);padding:3px 10px;border-radius:99px\">" + labels[i] + "</button>";
      }).join("");
    }

    return "<section class=\"section\" id=\"p3\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate III</span>" +
      "<h2>The two orders, side by side</h2>" +
      "<span class=\"aside\">One projection, both maps \u00b7 click a seat on either side to trace it on the other</span></div>" +
      "<p>The maps of Plates I and II drawn to the same projection for direct comparison. Click any seat: on the " + PRE_YEAR + " side, the " + POST_YEAR + " seats its territory went to light up opposite; on the " + POST_YEAR + " side, the pre-" + POST_YEAR + " seats it was built from.</p>" +
      "<div id=\"mal-band\" style=\"border:1px solid var(--ink-45);background:var(--bg);padding:16px 20px 18px;box-sizing:border-box;margin-bottom:24px\"></div>" +
      "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px\">" +
      "<span style=\"font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-70);margin-right:4px\">Party overlay</span>" +
      chipRowHTML +
      "<span id=\"p3-flip-note\" style=\"display:none;align-items:center;gap:7px;font-family:var(--sans);font-size:12px;color:var(--ink-70);margin-left:10px;padding-left:12px;border-left:1px solid var(--ink-35)\">" +
      "<span class=\"p3-flip-swatch\" style=\"display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid var(--ink-45)\"></span>" +
      "<span class=\"p3-flip-text\"></span>" +
      "</span>" +
      "</div>" +
      "<div class=\"p3-grid\">" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--ink-35);padding-bottom:6px;margin-bottom:10px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">Before <em style=\"font-weight:400\">\u2014 " + PRE_YEAR + " order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">" + olds.length + " seats</span></div>" +
      "<div class=\"map-stage\" id=\"p3-pre-stage\" style=\"min-height:600px\"><div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"pre3\" class=\"layer-base\"></div></div></div>" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--ink-35);padding-bottom:6px;margin-bottom:10px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">After <em style=\"font-weight:400\">\u2014 " + POST_YEAR + " order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">" + news.length + " seats</span></div>" +
      "<div class=\"map-stage\" id=\"p3-post-stage\" style=\"min-height:600px\"><div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"post3\" class=\"layer-base\"></div></div></div>" +
      "<aside id=\"p3-panel\" class=\"panel\" style=\"position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto\" aria-live=\"polite\">" +
      "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">Reading the comparison</div>" +
      "<p style=\"margin:14px 0 12px;font-size:14px;line-height:1.55\">Plates I and II drawn on one projection, at one scale. Click a constituency on either map: it is outlined and its counterpart territory on the opposite map fills <span style=\"background:var(--teal-lt);border:1px solid var(--teal);padding:0 6px;border-radius:2px\">blue</span>.</p>" +
      "<p style=\"margin:0;font-size:14px;line-height:1.55\">For an old seat, that is where its territory went in " + POST_YEAR + "; for a new seat, the pre-" + POST_YEAR + " seats it was built from.</p>" +
      "</aside></div>" +
      "</section>";
  }

  function plate4HTML() {
    const distOld = data.district_grid_old || [];
    const distNew = data.district_grid_new || [];
    const byDistOld = {}, byDistNew = {};
    olds.forEach(c => { (byDistOld[c.district] = byDistOld[c.district] || []).push(c); });
    news.forEach(c => { (byDistNew[c.district] = byDistNew[c.district] || []).push(c); });

    function makeGrid(distList, byDist, side) {
      return "<div style=\"display:flex;flex-direction:column;gap:8px\">" +
        distList.map(d => {
          const seats = byDist[d.name] || [];
          if (!seats.length) return "";
          return "<div class=\"t4dist\" style=\"border:1px solid var(--ink-25);background:var(--surface);border-radius:3px;padding:6px;display:flex;flex-direction:column;gap:5px\">" +
            "<button class=\"t4dist-btn\" data-side=\"" + side + "\" data-name=\"" + esc(d.name) + "\" style=\"all:unset;cursor:pointer;display:flex;align-items:baseline;justify-content:space-between;gap:6px;font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--ink-85);border-bottom:1px dotted var(--ink-35);padding-bottom:3px\">" +
            "<span>" + esc(d.name.toUpperCase()) + "</span>" +
            "<span style=\"font-family:var(--mono);font-size:9.5px;font-weight:400;opacity:0.6\">" + seats.length + "</span></button>" +
            "<div style=\"display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start\">" +
            seats.map(c => {
              const col = T_COL[c.status] || T_COL.continuing;
              return "<button class=\"t4tile\" data-ac=\"" + c.ac_no + "\" data-side=\"" + side + "\" style=\"all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:3px 6px 4px;border:1px solid " + col.bc + ";background:" + col.bg + ";border-radius:2px;min-width:52px;box-sizing:border-box\">" +
              "<span style=\"display:flex;align-items:center;gap:3px\">" +
              "<span style=\"font-family:var(--mono);font-size:8.5px;opacity:0.55\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
              (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:8px;font-weight:700;background:var(--ink);color:var(--bg);padding:0 3px;border-radius:2px;line-height:1.5\">SC</span>" : "") +
              (c.type === "ST" ? "<span style=\"font-family:var(--sans);font-size:8px;font-weight:700;background:var(--ink);color:var(--bg);padding:0 3px;border-radius:2px;line-height:1.5\">ST</span>" : "") +
              "</span>" +
              "<span style=\"font-family:var(--sans);font-size:10.5px;font-weight:500;line-height:1.15\">" + esc(c.name) + "</span>" +
              "</button>";
            }).join("") +
            "</div></div>";
        }).join("") + "</div>";
    }

    const hasScOld = olds.some(c => c.type === "SC");
    const hasStOld = olds.some(c => c.type === "ST");
    const chipDefs = [
      { key:"all",        label:"All seats",          count: olds.length+"+"+news.length, sw:null },
      { key:"continuing", label:"Name continued",     count: olds.filter(c=>c.status==="continuing").length*2, sw:T_COL.continuing },
      { key:"new",        label:"New in " + POST_YEAR, count: news.filter(c=>c.status==="new"||c.status==="renamed"||c.status==="carved").length, sw:T_COL["new"] },
      { key:"abolished",  label:"No successor",       count: olds.filter(c=>c.status==="abolished").length, sw:T_COL.abolished },
      { key:"flipped",    label:"Flipped \u2192" + POST_YEAR, count: flipOldSet.size+"+"+flipNewSet.size, sw:{ bg:"var(--teal-mid)", bc:"var(--teal)" } },
      { key:"held",       label:"Held by same party", count: heldOldSet.size+"+"+heldNewSet.size, sw:{ bg:"var(--ink-12)", bc:"var(--ink-45)" } },
    ];
    if (hasScOld) chipDefs.push({ key:"sc", label:"SC-reserved", count: olds.filter(c=>c.type==="SC").length+"+"+news.filter(c=>c.type==="SC"||c.sc_note).length, sw:{ bg:"var(--ink)", bc:"var(--ink)" } });
    if (hasStOld) chipDefs.push({ key:"st", label:"ST-reserved", count: olds.filter(c=>c.type==="ST").length+"+"+news.filter(c=>c.type==="ST").length, sw:{ bg:"var(--ink)", bc:"var(--ink)" } });

    const chipsHTML = chipDefs.map(c =>
      "<button class=\"chip\" data-filter=\"" + c.key + "\" aria-pressed=\"" + (c.key==="all"?"true":"false") + "\" style=\"display:inline-flex;align-items:center;gap:6px\">" +
      (c.sw ? "<span style=\"width:10px;height:10px;border-radius:2px;background:" + c.sw.bg + ";border:1px solid " + c.sw.bc + ";flex:none\"></span>" : "") +
      "<span>" + esc(c.label) + "</span>" +
      "<span style=\"font-family:var(--mono);font-size:10.5px;opacity:0.65\">" + c.count + "</span>" +
      "</button>"
    ).join("");

    return "<section class=\"section\" id=\"p4\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate IV</span>" +
      "<h2>The same change, seat by seat</h2>" +
      "<span class=\"aside\">Schematic tiles, grouped by district in rough geographic position</span></div>" +
      "<p>Every constituency before and after the " + POST_YEAR + " order, one tile per seat. Click any seat for its delimited extent, results and where its territory went; click a district name for its pattern of change.</p>" +
      "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px\">" +
      "<span style=\"font-family:var(--sans);font-size:12.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-60);margin-right:4px\">Highlight</span>" +
      chipsHTML + "</div>" +
      "<div class=\"p4-grid\">" +
      "<div><div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--ink-35);padding-bottom:6px;margin-bottom:12px\"><h3 style=\"margin:0;font-size:21px;font-weight:600\">Before <em style=\"font-weight:400\">\u2014 " + PRE_YEAR + " order</em></h3><span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">" + olds.length + " seats</span></div>" +
      makeGrid(distOld, byDistOld, "old") + "</div>" +
      "<div><div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--ink-35);padding-bottom:6px;margin-bottom:12px\"><h3 style=\"margin:0;font-size:21px;font-weight:600\">After <em style=\"font-weight:400\">\u2014 " + POST_YEAR + " order</em></h3><span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">" + news.length + " seats</span></div>" +
      makeGrid(distNew, byDistNew, "new") + "</div>" +
      "<aside id=\"p4-panel\" class=\"panel\" style=\"position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto\" aria-live=\"polite\">" +
      renderStatsTable() +
      "</aside></div>" +
      "</section>";
  }

  function sourcesHTML() {
    function listBlock(title, items) {
      if (!items || !items.length) return "";
      return "<h3 class=\"label\" style=\"margin:18px 0 8px\">" + esc(title) + "</h3>" +
        "<ul class=\"ruled-list\">" + items.map(t => "<li><span>" + esc(t) + "</span></li>").join("") + "</ul>";
    }
    return "<section class=\"section\" id=\"sources\">" +
      "<div class=\"section__head\"><span class=\"plate\">Record</span><h2>Sources, method and caveats</h2></div>" +
      listBlock("Sources", data.sources) +
      listBlock("Map caveats", data.map_caveats) +
      listBlock("Data flags", data.data_flags) +
      listBlock("District framework", data.footnotes) +
      sharesNoteHTML() +
      citeBlockHTML() +
      "</section>";
  }

  function sharesNoteHTML() {
    var anySoft = false, anyShare = false;
    (olds.concat(news)).forEach(function (c) {
      var sh = c.shares || {};
      Object.keys(sh).forEach(function (k) {
        anyShare = true;
        if (sh[k].basis === "approx") anySoft = true;
      });
    });
    if (!anyShare) return "";
    return "<h3 class=\"label\" style=\"margin:18px 0 8px\">How the shares are measured</h3>" +
      "<ul class=\"ruled-list\">" +
      "<li><span>Each seat record gives the percentage of territory a link accounts for. On a pre-" + POST_YEAR +
      " seat the figure is the share of that seat which went to each successor. On a " + POST_YEAR +
      " seat it is the share of that seat drawn from each predecessor. The two directions are not the same number.</span></li>" +
      "<li><span>Shares are computed by intersecting the mapped boundaries of both orders, which are drawn on one projection. They are areal, not population-weighted: a successor taking 40 per cent of the area may take a very different proportion of the electors, because density varies sharply between urban and rural tracts.</span></li>" +
      (anySoft ? "<li><span>A figure shown as ~40% is approximate. It involves at least one seat defined by municipal wards, and the two orders number wards differently, so the boundary cannot be matched mechanically. Treat these as indicative of scale rather than exact.</span></li>" : "") +
      "<li><span>Percentages will not sum to 100. Slivers below one per cent are omitted, and links the curated record does not list are not shown here.</span></li>" +
      "</ul>" +
      "<p style=\"margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--ink-60)\">" +
      "The <a href=\"limitations.html\">limitations page</a> sets out where this record is firm, where it is soft, and where it is silent.</p>";
  }

  function citeBlockHTML() {
    const revised = data.last_updated || entry.last_updated || "";
    const stamp = revised
      ? "<div style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.06em;color:var(--ink-45);margin-top:10px\">Record last revised " + esc(revised) + "</div>"
      : "";
    return "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-top:32px\">" +

      "<div style=\"border:1px solid var(--ink-45);background:var(--bg);padding:16px 18px 18px\">" +
      "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:5px;margin-bottom:10px\">Cite this page</div>" +
      "<div id=\"cite-text\" style=\"font-family:var(--mono);font-size:12px;line-height:1.65;background:var(--bg);border:1px solid var(--ink-25);border-radius:3px;padding:10px 12px;word-break:break-word\">" + esc(citationText()) + "</div>" +
      "<button data-cite-copy=\"1\" style=\"all:unset;cursor:pointer;display:inline-block;margin-top:10px;font-family:var(--sans);font-size:12px;font-weight:500;border:1px solid var(--ink-60);padding:4px 12px;border-radius:99px\">Copy citation</button>" +
      "<p style=\"margin:10px 0 0;font-size:11.5px;font-style:italic;line-height:1.5;color:var(--ink-60)\">The access date is filled in from your own clock. Adjust the style to suit your publication.</p>" +
      stamp +
      "</div>" +

      "<div style=\"border:1px solid var(--ink-45);background:var(--bg);padding:16px 18px 18px\">" +
      "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid var(--ink-25);padding-bottom:5px;margin-bottom:10px\">Download the record</div>" +
      "<p style=\"margin:0 0 12px;font-size:13.5px;line-height:1.6\">Every seat under both orders in one file: " + olds.length + " constituencies of the " + PRE_YEAR + " order and " + news.length + " of the " + POST_YEAR + " order, with district, reservation, status, lineage, winner, party and electorate.</p>" +
      "<div style=\"display:flex;gap:8px;flex-wrap:wrap\">" +
      "<button data-dl-csv=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;font-weight:500;border:1px solid var(--ink-60);padding:4px 12px;border-radius:99px\">CSV</button>" +
      "<button data-dl-json=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;font-weight:500;border:1px solid var(--ink-60);padding:4px 12px;border-radius:99px\">JSON</button>" +
      "</div>" +
      "<p style=\"margin:12px 0 0;font-size:11.5px;font-style:italic;line-height:1.5;color:var(--ink-60)\">Lineage between the two orders is traced by name and by the delimitation order text. Urban seats defined by municipal wards cannot be matched mechanically, because the two orders use incompatible ward schemes; treat those links as indicative.</p>" +
      "<p style=\"margin:10px 0 0;font-size:11.5px;line-height:1.5;color:var(--ink-60)\">Corrections to <a href=\"mailto:" + REPORT_TO + "\">" + REPORT_TO + "</a>.</p>" +
      "</div>" +

      "</div>";
  }

  function shell(inner) {
    return "<a class=\"skip\" href=\"#main\">Skip to content</a>" +
      "<nav class=\"masthead\"><div class=\"wrap\" style=\"display:flex;align-items:center;gap:16px;flex-wrap:wrap\">" +
      "<a href=\"index.html\" class=\"masthead__mark\"><span class=\"logo-b\" style=\"font-size:18px;font-family:Georgia,serif\">B</span><span style=\"letter-spacing:-0.01em\">Boundaries</span></a>" +
      searchBarHTML() +
      "<span class=\"masthead__links\">" +
      "<a href=\"#p1\">Plate I</a><a href=\"#p2\">Plate II</a><a href=\"#p3\">Plate III</a><a href=\"#p4\">Plate IV</a><a href=\"#sources\">Sources</a><a href=\"limitations.html\">Limitations</a>" +
      "</span></div></nav>" + inner +
      "<footer class=\"colophon\"><div class=\"wrap\">" +
      "<span>Boundaries</span><span>" + esc((data && data.assembly) || "") + " \u00b7 A Cartographic Record</span>" +
      "</div></footer>";
  }

  function errHTML(msg) {
    return "<div class=\"wrap\"><p class=\"notice\" style=\"margin-top:40px\">" + esc(msg) + "</p></div>";
  }

})();
