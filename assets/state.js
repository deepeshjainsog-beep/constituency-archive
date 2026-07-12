/* Boundaries — state page (four-plate edition).
   Plates I–IV, side-by-side comparison, schematic tile grid.
   All content read from states/<slug>/data.json. */
(async function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const CE = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  const COL = {
    continuing: { bg: "#e8e0ce", bc: "#8a8070" },
    renamed:    { bg: "#d6cfc0", bc: "#6a6358" },
    abolished:  { bg: "#c8bfaf", bc: "#5a544c" },
    "new":      { bg: "#b8b0a0", bc: "#4a4438" },
    sc:         { bg: "#29241b", bc: "#29241b" },
  };

  const root = $("state-root");

  /* ---- resolve slug ---- */
  const params = new URLSearchParams(location.search);
  const slug = params.get("state") || "";

  /* ---- load manifest ---- */
  let manifest;
  try { manifest = await (await fetch("states/manifest.json")).json(); }
  catch (e) { root.innerHTML = errHTML("The state manifest could not be loaded. Serve over HTTP, not file://."); return; }

  const entry = (manifest.states || []).find(s => s.slug === slug);
  if (!entry) {
    document.title = "Not in the register · Boundaries";
    root.innerHTML = shell("<header class=\"hero wrap\"><div class=\"hero__eyebrow\">Boundaries</div><h1>Not in the register</h1><p class=\"hero__lede\">No assembly with the reference 201c" + esc(slug) + "201d is listed in the manifest. <a href=\"index.html\">Return to the archive index</a>.</p></header>");
    return;
  }
  if (entry.status !== "live") {
    document.title = entry.name + " · coming soon · Boundaries";
    root.innerHTML = shell("<header class=\"hero wrap\"><div class=\"hero__eyebrow\">Delimitation · " + esc(entry.name) + "</div><h1>" + esc(entry.name) + "</h1><p class=\"hero__lede\">The pre-2008 record for this assembly has not been published yet. The archive is updated state by state.</p>" + (entry.note ? "<p class=\"notice\">" + esc(entry.note) + "</p>" : "") + "<p style=\"margin-top:22px\"><a href=\"index.html\">Return to the archive index</a></p></header>");
    return;
  }

  /* ---- load state data ---- */
  const base = "states/" + entry.slug + "/";
  let data;
  try { data = await (await fetch(base + "data.json")).json(); }
  catch (e) { root.innerHTML = errHTML("The data module for " + entry.name + " could not be loaded."); return; }

  document.title = data.title + " · Boundaries";

  const olds = data.constituencies || [];
  const news = data.post2008_constituencies || [];
  const oldByN = {}; olds.forEach(c => oldByN[c.ac_no] = c);
  const newByN = {}; news.forEach(c => newByN[c.ac_no] = c);

  /* ---- load SVG maps ---- */
  const maps = data.maps || {};

  // Tile colour constants — used by both plate4HTML (render time) and updatePlate4 (update time)
  const T_COL_INIT = {
    continuing: { bg: "#f8f4eb", bc: "rgba(41,36,27,0.4)" },
    renamed:    { bg: "oklch(0.93 0.06 85)",  bc: "oklch(0.6 0.1 85)" },
    "new":      { bg: "oklch(0.93 0.055 155)", bc: "oklch(0.55 0.09 155)" },
    abolished:  { bg: "oklch(0.94 0.05 30)",  bc: "oklch(0.6 0.12 30)" },
  };

  /* ---- render shell ---- */
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
  const svgs = {};
  async function fetchSVG(key, path) {
    if (!path) return;
    try {
      const r = await fetch(base + path);
      if (!r.ok) return;
      const text = await r.text();
      const holders = document.querySelectorAll("[data-svg-slot=\"" + key + "\"]");
      holders.forEach(h => {
        h.innerHTML = text;
        const svg = h.querySelector("svg");
        if (svg) {
          svgs[key] = svgs[key] || [];
          svgs[key].push({ svg, holder: h });
          wireSVG(svg, key);
          if (key === "pre") {
            const vb = (svg.getAttribute("viewBox") || "0 0 860 1120").split(/\s+/);
            const stage = h.closest(".map-stage");
            if (stage) stage.style.aspectRatio = vb[2] + " / " + vb[3];
          }
        }
      });
    } catch (e) {}
  }

  await Promise.all([
    fetchSVG("pre", maps.pre2008),
    fetchSVG("post", maps.post2008),
  ]);

  /* ---- state ---- */
  let view1 = "pre";   // Plate I toggle
  let selOld = null;   // selected old AC no
  let selNew = null;   // selected new AC no
  let filter = "all";  // Plate IV filter

  /* ---- wire SVG events ---- */
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
    const a = isOld ? c.after_2008 : null;
    return "<div class=\"n\">AC " + c.ac_no + " · " + (isOld ? "pre-2008" : "2008 order") + "</div>" +
      "<strong>" + esc(c.name) + "</strong>" + (c.type === "SC" ? " (SC)" : "") +
      "<div class=\"r\">" + esc(c.district) + " district</div>" +
      (isOld && c.status ? "<div class=\"r\">2008: " + esc(c.status) + "</div>" : "");
  }

  /* ---- master update ---- */
  function update() {
    updatePlate1();
    updatePlate2();
    updatePlate3();
    updatePlate4();
    updatePanel();
    updateIndexHighlight();
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
    // view toggle buttons
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
      view1 === "post" ? "Assembly constituencies \u00b7 Delimitation Order, 2008" :
      "Assembly constituencies \u00b7 Delimitation Order, 1976";

    const caption = $("p1-caption");
    if (caption) caption.textContent =
      view1 === "post" ? "2008 order \u00b7 in force from 2012" :
      view1 === "overlay" ? "In force 1977\u20132007 \u00b7 2008 boundaries overlaid" :
      "Actual pre-2008 boundaries, digitised \u00b7 " + olds.length + " seats";

    // colour selected on pre SVG
    const preSVGs = document.querySelectorAll("#p1-stage [data-svg-slot=\"pre\"] path.ac");
    preSVGs.forEach(p => {
      p.classList.toggle("is-selected", selOld !== null && +p.dataset.ac === selOld);
    });
    const postSVGs = document.querySelectorAll("#p1-stage [data-svg-slot=\"post\"] path.ac");
    postSVGs.forEach(p => {
      p.classList.toggle("is-selected", selNew !== null && +p.dataset.ac === selNew);
    });
  }

  /* ==== PLATE II ==== */
  function updatePlate2() {
    const postSVGs = document.querySelectorAll("#p2-stage [data-svg-slot=\"post2\"] path.ac");
    postSVGs.forEach(p => {
      p.classList.toggle("is-selected", selNew !== null && +p.dataset.ac === selNew);
      // highlight predecessors of selOld
      const isLinked = selOld !== null && (oldByN[selOld] || {}).dest && (oldByN[selOld].dest || []).indexOf(+p.dataset.ac) !== -1;
      p.classList.toggle("is-linked", isLinked);
    });
  }

  /* ==== PLATE III ==== */
  const REL_FILL = '#c4d8ec';
  const REL_STROKE = '#4a7ba6';
  const SEL_FILL = 'rgba(41,36,27,0.18)';

  function updatePlate3() {
    const selOldSet = selOld !== null ? new Set((oldByN[selOld] || {}).dest || []) : new Set();
    const selNewSrcs = selNew !== null ? new Set((newByN[selNew] || {}).src || []) : new Set();

    // Pre-2008 side
    document.querySelectorAll("[data-svg-slot='pre3'] path.ac").forEach(p => {
      const no = +p.dataset.ac;
      const isSel = selOld !== null && no === selOld;
      const isLinked = selNew !== null && selNewSrcs.has(no);
      p.style.fill = isSel ? SEL_FILL : isLinked ? REL_FILL : '';
      p.style.stroke = isSel ? '#29241b' : isLinked ? REL_STROKE : '';
      p.style.strokeWidth = isSel ? '2.4' : isLinked ? '1.8' : '';
      p.style.zIndex = '';
    });

    // Post-2008 side
    document.querySelectorAll("[data-svg-slot='post3'] path.ac").forEach(p => {
      const no = +p.dataset.ac;
      const isSel = selNew !== null && no === selNew;
      const isLinked = selOld !== null && selOldSet.has(no);
      p.style.fill = isSel ? SEL_FILL : isLinked ? REL_FILL : '';
      p.style.stroke = isSel ? '#29241b' : isLinked ? REL_STROKE : '';
      p.style.strokeWidth = isSel ? '2.4' : isLinked ? '1.8' : '';
    });

    // Panel
    renderPlate3Panel();
  }

  function renderPlate3Panel() {
    const panel = document.getElementById('p3-panel');
    if (!panel) return;

    if (selOld === null && selNew === null) {
      panel.innerHTML =
        '<div class="eyebrow" style="font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)">Reading the comparison</div>' +
        '<p style="margin:14px 0 12px;font-size:14px;line-height:1.55">Plates I and II drawn on one projection, at one scale. Click a constituency on either map: it is outlined and its counterpart territory on the opposite map fills <span style="background:#c4d8ec;border:1px solid #4a7ba6;padding:0 6px;border-radius:2px">blue</span>.</p>' +
        '<p style="margin:0;font-size:14px;line-height:1.55">For an old seat, that is where its territory went in 2008; for a new seat, the pre-2008 seats it was built from.</p>';
      return;
    }

    const isOld = selOld !== null;
    const c = isOld ? oldByN[selOld] : newByN[selNew];
    if (!c) return;

    const STATUS_LABELS = { continuing: 'Name continued', abolished: 'Name abolished', renamed: 'Renamed', 'new': 'Created 2008' };
    const STATUS_COLS = {
      continuing: { bg: '#f0ede4', bc: 'rgba(41,36,27,0.4)' },
      abolished: { bg: '#f5e8e0', bc: '#c0603a' },
      renamed: { bg: '#e8f0e8', bc: '#4a7a4a' },
      'new': { bg: '#e0ede0', bc: '#4a7a4a' },
    };
    const col = STATUS_COLS[c.status] || STATUS_COLS.continuing;
    const statusLabel = STATUS_LABELS[c.status] || c.status || '';

    const links = isOld
      ? (c.dest || []).map(n => { const s = newByN[n]; return s ? { label: n + ' · ' + s.name + (s.type==='SC'?' (SC)':''), n, side:'new' } : null; }).filter(Boolean)
      : (c.src || []).map(n => { const s = oldByN[n]; return s ? { label: n + ' · ' + s.name + (s.type==='SC'?' (SC)':''), n, side:'old' } : null; }).filter(Boolean);
    const linksLabel = isOld ? 'Territory went to (2008 seats)' : 'Built from (pre-2008 seats)';

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
      '<div class="eyebrow" style="font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)">' +
      (isOld ? 'Before 2008' : 'After 2008') + ' · ' + esc(c.district) + ' district · No. ' + c.ac_no + '</div>' +
      '<button data-p3-clear="1" style="all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted rgba(41,36,27,0.5);">× clear</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 4px">' +
      '<h3 style="margin:0;font-size:25px;font-weight:600;line-height:1.1">' + esc(c.name) + '</h3>' +
      (c.type === 'SC' ? '<span style="font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:0.06em;background:#29241b;color:#f2ecdf;padding:1px 6px;border-radius:2px">SC</span>' : '') +
      '</div>' +
      '<div style="margin-bottom:12px"><span style="display:inline-block;padding:2px 10px;border-radius:3px;font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:0.06em;background:' + col.bg + ';border:1px solid ' + col.bc + '">' + esc(statusLabel) + '</span></div>' +
      (c.note ? '<p style="margin:0 0 12px;font-size:14.5px;line-height:1.55">' + esc(c.note) + '</p>' : '') +
      (c.sc_note ? '<p style="margin:0 0 12px;font-size:13.5px;line-height:1.5;font-style:italic;border-top:1px dotted rgba(41,36,27,0.4);padding-top:8px">Reservation: ' + esc(c.sc_note) + '</p>' : '') +
      (c.extent || c.extent_1976 ? '<div style="font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid rgba(41,36,27,0.3);padding-bottom:4px;margin-bottom:8px">Extent of area, as delimited</div>' +
      '<p style="margin:0 0 16px;font-family:var(--sans);font-size:13px;line-height:1.5;color:rgba(41,36,27,0.92)">' + esc(c.extent || c.extent_1976 || '') + '</p>' : '') +
      (links.length ? '<div style="font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid rgba(41,36,27,0.3);padding-bottom:4px;margin-bottom:8px">' + esc(linksLabel) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
      links.map(lk =>
        '<button data-p3-link-side="' + lk.side + '" data-p3-link-n="' + lk.n + '" style="all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid rgba(41,36,27,0.5);background:#fff;padding:3px 9px;border-radius:99px">' + esc(lk.label) + ' →</button>'
      ).join('') + '</div>' : '');
  }

  /* ==== PLATE IV ==== */
  let tsel = null; // { kind:"seat"|"dist", side:"old"|"new", n?, name? }

  function updatePlate4() {
    document.querySelectorAll(".chip").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.filter === filter ? "true" : "false");
    });

    const relNew = new Set(), relOld = new Set();
    if (tsel && tsel.kind === "seat") {
      if (tsel.side === "old") {
        ((oldByN[tsel.n] || {}).dest || []).forEach(d => relNew.add(d));
      } else {
        olds.forEach(o => { if ((o.dest || []).indexOf(tsel.n) !== -1) relOld.add(o.ac_no); });
      }
    }

    document.querySelectorAll(".t4tile").forEach(tile => {
      const no = +tile.dataset.ac;
      const side = tile.dataset.side;
      const c = side === "old" ? oldByN[no] : newByN[no];
      if (!c) return;

      let show = true;
      if (filter === "sc") show = c.type === "SC" || !!(c.sc_note);
      else if (filter !== "all") show = c.status === filter;
      tile.style.opacity = show ? "1" : "0.15";

      const isSel = tsel && tsel.kind === "seat" && tsel.side === side && tsel.n === no;
      const isRel = side === "old" ? relOld.has(no) : relNew.has(no);
      const col = T_COL_INIT[c.status] || T_COL_INIT.continuing;

      if (isSel) {
        tile.style.background = "rgba(41,36,27,0.18)";
        tile.style.borderColor = "#29241b";
        tile.style.boxShadow = "0 0 0 2px #29241b";
      } else if (isRel) {
        tile.style.background = "#c4d8ec";
        tile.style.borderColor = "#4a7ba6";
        tile.style.boxShadow = "0 0 0 1.5px #4a7ba6";
      } else {
        tile.style.background = col.bg;
        tile.style.borderColor = col.bc;
        tile.style.boxShadow = "";
      }
    });

    document.querySelectorAll(".t4dist-btn").forEach(btn => {
      const isSel = tsel && tsel.kind === "dist" && tsel.side === btn.dataset.side && tsel.name === btn.dataset.name;
      const block = btn.closest(".t4dist");
      if (block) {
        block.style.background = isSel ? "#f1e9d6" : "rgba(255,255,255,0.38)";
        block.style.borderColor = isSel ? "#29241b" : "rgba(41,36,27,0.3)";
      }
    });

    renderPlate4Panel();
  }

  function renderPlate4Panel() {
    const panel = document.getElementById("p4-panel");
    if (!panel) return;

    if (!tsel) { panel.innerHTML = renderStatsTable(); return; }

    const STATUS_LABELS = { continuing: "Name continued", abolished: "Name abolished", renamed: "Renamed", "new": "Created 2008" };
    const STATUS_PILL = {
      continuing: { bg: "#f0ede4", bc: "rgba(41,36,27,0.4)" },
      abolished:  { bg: "#f5e8e0", bc: "#c0603a" },
      renamed:    { bg: "oklch(0.93 0.06 85)", bc: "oklch(0.6 0.1 85)" },
      "new":      { bg: "oklch(0.93 0.055 155)", bc: "oklch(0.55 0.09 155)" },
    };

    if (tsel.kind === "dist") {
      const list = tsel.side === "old" ? olds : news;
      const cnt = list.filter(c => c.district === tsel.name).length;
      panel.innerHTML =
        "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:10px\">" +
        "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">" +
        esc(tsel.side === "old" ? "Before 2008 · district" : "After 2008 · district") + "</div>" +
        "<button data-t4-clear=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted rgba(41,36,27,0.5)\">× clear</button></div>" +
        "<h3 style=\"margin:8px 0 4px;font-size:25px;font-weight:600\">" + esc(tsel.name) + "</h3>" +
        "<div style=\"font-family:var(--mono);font-size:11px;color:var(--ink-60);margin-bottom:12px\">" + cnt + " constituencies</div>" +
        "<p style=\"font-size:14px;line-height:1.55\">Click any constituency in this district for its individual record.</p>";
      return;
    }

    const isOld = tsel.side === "old";
    const c = isOld ? oldByN[tsel.n] : newByN[tsel.n];
    if (!c) return;

    const st = c.status;
    const col = STATUS_PILL[st] || STATUS_PILL.continuing;
    const statusLabel = STATUS_LABELS[st] || st || "";
    const links = isOld
      ? (c.dest || []).map(n => { const s = newByN[n]; return s ? { label: String(n).padStart(2,"0") + " · " + s.name + (s.type==="SC"?" (SC)":""), n, side:"new" } : null; }).filter(Boolean)
      : (c.src || []).map(n => { const s = oldByN[n]; return s ? { label: String(n).padStart(2,"0") + " · " + s.name + (s.type==="SC"?" (SC)":""), n, side:"old" } : null; }).filter(Boolean);
    const linksLabel = isOld ? "Territory went to (2008 seats)" : "Built from (pre-2008 seats)";

    panel.innerHTML =
      "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:10px\">" +
      "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">" +
      esc((isOld ? "Before 2008" : "After 2008") + " · " + c.district + " district · No. " + c.ac_no) + "</div>" +
      "<button data-t4-clear=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted rgba(41,36,27,0.5)\">× clear</button></div>" +
      "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 4px\">" +
      "<h3 style=\"margin:0;font-size:25px;font-weight:600;line-height:1.1\">" + esc(c.name) + "</h3>" +
      (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:11px;font-weight:700;background:#29241b;color:#f2ecdf;padding:1px 6px;border-radius:2px\">SC</span>" : "") +
      "</div>" +
      "<div style=\"margin-bottom:12px\"><span style=\"display:inline-block;padding:2px 10px;border-radius:3px;font-family:var(--sans);font-size:12px;font-weight:600;background:" + col.bg + ";border:1px solid " + col.bc + "\">" + esc(statusLabel) + "</span></div>" +
      (c.note ? "<p style=\"margin:0 0 12px;font-size:14.5px;line-height:1.55\">" + esc(c.note) + "</p>" : "") +
      (c.sc_note ? "<p style=\"margin:0 0 12px;font-size:13.5px;font-style:italic;border-top:1px dotted rgba(41,36,27,0.4);padding-top:8px\">Reservation: " + esc(c.sc_note) + "</p>" : "") +
      ((c.extent || c.extent_1976) ?
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid rgba(41,36,27,0.3);padding-bottom:4px;margin-bottom:8px\">Extent of area, as delimited</div>" +
        "<p style=\"margin:0 0 16px;font-family:var(--sans);font-size:13px;line-height:1.5;color:rgba(41,36,27,0.92)\">" + esc(c.extent || c.extent_1976 || "") + "</p>" : "") +
      (links.length ?
        "<div style=\"font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-60);border-bottom:1px solid rgba(41,36,27,0.3);padding-bottom:4px;margin-bottom:8px\">" + esc(linksLabel) + "</div>" +
        "<div style=\"display:flex;flex-wrap:wrap;gap:6px\">" +
        links.map(lk => "<button data-t4-link-side=\"" + lk.side + "\" data-t4-link-n=\"" + lk.n + "\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:500;border:1px solid rgba(41,36,27,0.5);background:#fff;padding:3px 9px;border-radius:99px\">" + esc(lk.label) + " →</button>").join("") +
        "</div>" : "");
  }

  function renderStatsTable() {
    return "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60);margin-bottom:12px\">The 2008 delimitation at a glance</div>" +
      "<table style=\"border-collapse:collapse;width:100%\">" +
      (data.stats || []).map(s =>
        "<tr><td style=\"font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-60);padding:6px 10px 6px 0;border-bottom:1px dashed var(--ink-20)\">" + esc(s.k) + "</td><td style=\"font-family:var(--mono);font-size:14px;padding:6px 0 6px 6px;border-bottom:1px dashed var(--ink-20)\">" + esc(s.v) + "</td></tr>"
      ).join("") + "</table>" +
      "<p style=\"margin-top:16px;font-size:13px;color:var(--ink-60);font-style:italic\">Click any tile or district name for its full record.</p>";
  }
  /* ==== PANEL ==== */
  function updatePanel() {
    const panels = [$("detail-panel"), $("p2-panel")].filter(Boolean);
    if (!panels.length) return;
    let html;
    if (selOld === null && selNew === null) {
      // Each panel shows its own index by default
      const p1 = document.getElementById("detail-panel");
      const p2 = document.getElementById("p2-panel");
      if (p1) p1.innerHTML = renderInlinePanelDefault("old");
      if (p2) p2.innerHTML = renderInlinePanelDefault("new");
      return;
    } else if (selOld !== null) {
      const c = oldByN[selOld];
      if (!c) return;
      const destLinks = (c.dest || []).map(n => {
        const s = newByN[n];
        return "<a href=\"#\" data-goto-new=\"" + n + "\">" + n + " " + esc(s ? s.name : "") + "</a>";
      }).join(" ");
      html =
        "<div class=\"eyebrow\">AC " + c.ac_no + " · pre-2008 · " + esc(c.district) + "</div>" +
        "<h3>" + esc(c.name) + (c.type === "SC" ? "<span class=\"badge\">SC</span>" : "") + (c.approx ? "<span class=\"badge\" style=\"margin-left:6px\">approx.</span>" : "") + "</h3>" +
        "<div class=\"sub\">" + esc(c.district) + " district · status: " + esc(c.status) + "</div>" +
        "<dl>" +
        (c.extent ? "<dt>Extent (1976 order)</dt><dd style=\"font-size:13px\">" + esc(c.extent) + "</dd>" : "") +
        "<dt>Under the 2008 order</dt><dd>" + esc(c.status) +
        (destLinks ? "<div class=\"succ\" style=\"margin-top:5px\">→ " + destLinks + "</div>" : "") + "</dd>" +
        (c.note ? "<dt>Note</dt><dd>" + esc(c.note) + "</dd>" : "") +
        "</dl>";
    } else {
      const c = newByN[selNew];
      if (!c) return;
      const srcLinks = (c.src || []).map(n => {
        const s = oldByN[n];
        return "<a href=\"#\" data-goto-old=\"" + n + "\">" + n + " " + esc(s ? s.name : "") + "</a>";
      }).join(" ");
      html =
        "<div class=\"eyebrow\">AC " + c.ac_no + " · 2008 order · " + esc(c.district) + "</div>" +
        "<h3>" + esc(c.name) + (c.type === "SC" ? "<span class=\"badge\">SC</span>" : "") + "</h3>" +
        "<div class=\"sub\">" + esc(c.district) + " district · " + esc(c.status) + "</div>" +
        "<dl>" +
        (c.extent ? "<dt>Extent (2008 order)</dt><dd style=\"font-size:13px\">" + esc(c.extent) + "</dd>" : "") +
        "<dt>Built from (pre-2008)</dt><dd>" +
        (srcLinks ? "<div class=\"succ\">" + srcLinks + "</div>" : "<span class=\"empty\">not recorded</span>") + "</dd>" +
        (c.sc_note ? "<dt>Reservation</dt><dd>" + esc(c.sc_note) + "</dd>" : "") +
        (c.note ? "<dt>Note</dt><dd>" + esc(c.note) + "</dd>" : "") +
        "</dl>";
    }
    panels.forEach(p => {
      const clearBtn = "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--ink-20)\">" +
        "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-60)\">Seat record</div>" +
        "<button data-clear-sel=\"1\" style=\"all:unset;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ink-60);border-bottom:1px dotted rgba(41,36,27,0.5)\">\u00d7 back to index</button></div>";
      p.innerHTML = clearBtn + html;
    });
  }

  /* ---- global click delegation for cross-links ---- */
  document.addEventListener("click", e => {
    const gn = e.target.closest("[data-goto-new]");
    const go = e.target.closest("[data-goto-old]");
    const gi = e.target.closest("[data-goto-idx-old]");
    const gj = e.target.closest("[data-goto-idx-new]");
    if (gn) { e.preventDefault(); selNew = +gn.dataset.gotoNew; selOld = null; update(); }
    if (go) { e.preventDefault(); selOld = +go.dataset.gotoOld; selNew = null; update(); }
    if (gi) { e.preventDefault(); selOld = +gi.dataset.gotoIdxOld; selNew = null; update(); }
    if (gj) { e.preventDefault(); selNew = +gj.dataset.gotoIdxNew; selOld = null; update(); }

    // Panel clear — back to index
    if (e.target.closest("[data-clear-sel]")) {
      selOld = null; selNew = null; update();
    }

    // Plate III panel — clear button
    if (e.target.closest("[data-p3-clear]")) {
      selOld = null; selNew = null; update();
    }
    // Plate III panel — jump-to link buttons
    const pl = e.target.closest("[data-p3-link-side]");
    if (pl) {
      e.preventDefault();
      if (pl.dataset.p3LinkSide === "new") { selNew = +pl.dataset.p3LinkN; selOld = null; }
      else { selOld = +pl.dataset.p3LinkN; selNew = null; }
      update();
    }

    // Plate IV — tile clicks
    const t4t = e.target.closest(".t4tile");
    if (t4t) {
      tsel = { kind: "seat", side: t4t.dataset.side, n: +t4t.dataset.ac };
      updatePlate4();
    }
    // Plate IV — district name clicks
    const t4d = e.target.closest(".t4dist-btn");
    if (t4d) {
      tsel = { kind: "dist", side: t4d.dataset.side, name: t4d.dataset.name };
      updatePlate4();
    }
    // Plate IV panel — clear
    if (e.target.closest("[data-t4-clear]")) {
      tsel = null; updatePlate4();
    }
    // Plate IV panel — link buttons
    const t4l = e.target.closest("[data-t4-link-side]");
    if (t4l) {
      e.preventDefault();
      tsel = { kind: "seat", side: t4l.dataset.t4LinkSide, n: +t4l.dataset.t4LinkN };
      updatePlate4();
    }
  });

  /* ---- Plate I controls ---- */
  const p1ctrl = $("p1-controls");
  if (p1ctrl) {
    p1ctrl.addEventListener("click", e => {
      const b = e.target.closest(".p1-tbtn");
      if (!b) return;
      view1 = b.dataset.val;
      update();
    });
  }

  /* ---- Plate IV chips — delegated, chips are now inline in plate HTML ---- */
  document.addEventListener("click", e => {
    const chip = e.target.closest(".chip[data-filter]");
    if (!chip) return;
    filter = chip.dataset.filter;
    updatePlate4();
  });

  /* ---- Populate cloned slots (Plate II post2, Plate III pre3/post3) ---- */
  const SLOT_CLONE = { "post2": "post", "pre3": "pre", "post3": "post" };
  Object.entries(SLOT_CLONE).forEach(([cloneKey, srcKey]) => {
    const srcHolder = document.querySelector("[data-svg-slot=\"" + srcKey + "\"]");
    if (!srcHolder) return;
    document.querySelectorAll("[data-svg-slot=\"" + cloneKey + "\"]").forEach(holder => {
      holder.innerHTML = srcHolder.innerHTML;
      const svg = holder.querySelector("svg");
      if (svg) {
        wireSVG(svg, srcKey);
        if (cloneKey === "post2" || cloneKey === "pre3" || cloneKey === "post3") {
          const vb = (svg.getAttribute("viewBox") || "0 0 860 1120").split(/\s+/);
          const stage = holder.closest(".map-stage");
          if (stage) stage.style.aspectRatio = vb[2] + " / " + vb[3];
        }
      }
    });
  });

  /* ---- index clicks (delegated, works for both p1 and p2 indexes) ---- */
  document.addEventListener("click", e => {
    const b = e.target.closest("button[data-idx-side]");
    if (!b) return;
    const no = +b.dataset.ac;
    if (b.dataset.idxSide === "old") { selOld = no; selNew = null; }
    else { selNew = no; selOld = null; }
    update();
    const target = $(b.dataset.idxSide === "old" ? "p1" : "p2");
    if (target && typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- wire hero map ----
  (function() {
    const slot = document.querySelector('[data-svg-slot="hero-pre"]');
    const tip = document.getElementById('hero-tip');
    if (!slot || !tip) return;
    const src = document.querySelector('[data-svg-slot="pre"]');
    if (!src || !src.innerHTML) return;
    slot.innerHTML = src.innerHTML;
    const svg = slot.querySelector('svg');
    if (!svg) return;
    // scale to fill container
    svg.setAttribute('width', '100%');
    svg.style.height = 'auto';
    // subtle fill by region
    const REGION_COLS = { Majha: '#e8f4f0', Doaba: '#e4eef8', Malwa: '#f0ede4' };
    svg.querySelectorAll('path.ac').forEach(function(p) {
      const c = oldByN[+p.dataset.ac];
      if (c && REGION_COLS[c.region]) p.style.fill = REGION_COLS[c.region];
    });
    svg.addEventListener('pointerover', function(e) {
      const p = e.target.closest('path.ac');
      if (!p || !tip) return;
      const ac = oldByN[+p.dataset.ac];
      if (!ac) return;
      tip.innerHTML = '<strong>' + ac.name + '</strong><small>AC ' + ac.ac_no + ' · ' + ac.region + '</small>';
      tip.style.display = 'block';
    });
    svg.addEventListener('pointermove', function(e) {
      if (tip.style.display !== 'block') return;
      const r = slot.getBoundingClientRect();
      let x = e.clientX - r.left + 10, y = e.clientY - r.top - 44;
      if (x + 160 > r.width) x = e.clientX - r.left - 165;
      if (y < 0) y = e.clientY - r.top + 10;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    svg.addEventListener('pointerout', function() { tip.style.display = 'none'; });
    svg.addEventListener('click', function(e) {
      const p = e.target.closest('path.ac');
      if (!p) return;
      selOld = +p.dataset.ac; selNew = null;
      update();
      const t = document.getElementById('p1');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  })();

  update();

  /* ========================= HTML BUILDERS ========================= */

  function heroHTML() {
    return "<header class=\"state-hero wrap\">" +
      "<div class=\"state-hero__text\">" +
      "<div class=\"hero__eyebrow\">" + esc(data.assembly) + " \u00b7 A Cartographic Record</div>" +
      "<h1 class=\"state-hero__h1\">" + esc(data.intro && data.intro[1] ? data.intro[1] : data.title) + "</h1>" +
      "<p class=\"hero__lede\">" + esc((data.intro && data.intro[0]) || "") + "</p>" +
      "<div class=\"hero__meta\">" + esc(data.assembly) + " \u00b7 " + acs.length + " constituencies \u00b7 in force " + esc(data.in_force) + "</div>" +
      "<nav class=\"plate-nav\" aria-label=\"Plates\">" +
      ["Plate I \u00b7 Pre-2008 map","Plate II \u00b7 Post-2008 map","Plate III \u00b7 Side by side","Plate IV \u00b7 Seat by seat","Sources"].map(function(t,i){
        return "<a href=\"#" + ["p1","p2","p3","p4","sources"][i] + "\">" + esc(t) + "</a>";
      }).join("") + "</nav>" +
      "</div>" +
      "<div class=\"state-hero__map\" id=\"hero-map-slot\">" +
      "<div class=\"state-hero__map-inner\">" +
      "<div class=\"hero-map-tip\" id=\"hero-tip\"></div>" +
      "<div class=\"hero-map-sheet\"><div class=\"hero-map-label\">" +
      "<span class=\"mono\" style=\"font-size:9px;letter-spacing:0.08em;color:var(--ink-45)\">PRE-2008 · " + esc(data.name).toUpperCase() + " · " + acs.length + " SEATS</span>" +
      "</div>" +
      "<div data-svg-slot=\"hero-pre\" class=\"hero-pre-map\"></div>" +
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
    const figs = data.figures || [];
    return "<div class=\"figures\">" + figs.map(f =>
      "<div><div class=\"v\">" + esc(f.v) + "</div><div class=\"k\">" + esc(f.k) + "</div></div>"
    ).join("") + "</div>";
  }

  function plate1HTML() {
    const hasPost = !!maps.post2008;
    return "<section class=\"section\" id=\"p1\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate I · 1976–2008</span>" +
      "<h2>The state as delimited in 1976</h2></div>" +
      "<p>" + esc((data.intro && data.intro[0]) || "") + "</p>" +
      "<div class=\"map-grid\">" +
      "<div class=\"sheet\">" +
      "<div class=\"sheet__title\">" +
      "<div class=\"t1\">PUNJAB</div>" +
      "<div class=\"t2\" id=\"p1-order-line\">Assembly constituencies · Delimitation Order, 1976</div>" +
      "<div class=\"t3\" id=\"p1-caption\">Actual pre-2008 boundaries, digitised · 117 seats</div></div>" +
      "<div class=\"map-stage\" id=\"p1-stage\">" +
      "<div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"pre\" class=\"layer-base\"></div>" +
      (hasPost ? "<div data-svg-slot=\"post\" class=\"layer-post\" style=\"display:none\"></div>" : "") +
      "</div></div>" +
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
      ? "Index of seats · by district of 1976"
      : "Index of seats · by district of 2008";
    return "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-60);margin-bottom:12px\">" + esc(label) + "</div>" +
      distMeta.filter(d => byDist[d.name] && byDist[d.name].length).map(d => {
        const seats = byDist[d.name];
        return "<div style=\"margin-bottom:14px\">" +
          "<div style=\"font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;border-bottom:1px solid rgba(41,36,27,0.45);padding-bottom:3px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:baseline\">" +
          "<span>" + esc(d.name) + "</span>" +
          "<span style=\"font-family:var(--mono);font-size:10px;font-weight:400;color:var(--ink-60)\">" + seats.length + "</span></div>" +
          "<div style=\"display:flex;flex-direction:column\">" +
          seats.map(c =>
            "<button type=\"button\" data-idx-side=\"" + side + "\" data-ac=\"" + c.ac_no + "\" style=\"all:unset;cursor:pointer;display:flex;align-items:baseline;gap:6px;padding:2px 4px;width:100%;box-sizing:border-box\">" +
            "<span style=\"font-family:var(--mono);font-size:10.5px;color:var(--ink-60);width:22px;flex:none\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
            "<span style=\"flex:1;font-family:var(--serif);font-size:14px\">" + esc(c.name) + "</span>" +
            (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:0.05em;border:1px solid rgba(41,36,27,0.6);padding:0 4px;border-radius:2px;flex:none\">SC</span>" : "") +
            (c.approx ? "<span style=\"font-family:var(--sans);font-size:10.5px;font-style:italic;color:var(--ink-60);flex:none\">approx.</span>" : "") +
            "</button>"
          ).join("") + "</div></div>";
      }).join("");
  }


  function indexHTML(seatList, gridMeta, idPrefix, side) {
    const byDist = {};
    seatList.forEach(c => { (byDist[c.district] = byDist[c.district] || []).push(c); });
    const distOrder = (gridMeta || []).map(d => d.name);
    const html = "<div class=\"idx\" id=\"" + idPrefix + "-index\">" +
      distOrder.filter(d => byDist[d]).map(d => {
        const list = byDist[d];
        return "<div><h3>" + esc(d) + "<span class=\"count\">" + list.length + "</span></h3><ul>" +
          list.map(c =>
            "<li><button type=\"button\" data-idx-side=\"" + side + "\" data-ac=\"" + c.ac_no + "\">" +
            "<span class=\"no\">" + c.ac_no + "</span><span>" + esc(c.name) + "</span>" +
            (c.type === "SC" ? "<span class=\"sc\">SC</span>" : "") +
            (c.approx ? "<span class=\"sc\" style=\"border-color:var(--ink-40)\">~</span>" : "") +
            "</button></li>"
          ).join("") + "</ul></div>";
      }).join("") + "</div>";
    return html;
  }

  function plate2HTML() {
    if (!maps.post2008) return "";
    return "<section class=\"section\" id=\"p2\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate II · 2008–present</span>" +
      "<h2>The state as re-delimited in 2008</h2></div>" +
      "<p>The 117 constituencies in force today, drawn from the Election Commission’s published polygons across the 20 districts of the new order. First fought at the 2012 Vidhan Sabha election. Each seat’s panel lists the pre-2008 seats it was built from.</p>" +
      "<div class=\"map-grid\">" +
      "<div class=\"sheet\">" +
      "<div class=\"sheet__title\">" +
      "<div class=\"t1\">PUNJAB</div>" +
      "<div class=\"t2\">Assembly constituencies · Delimitation Order, 2008</div>" +
      "<div class=\"t3\">117 seats · in force since 2008</div></div>" +
      "<div class=\"map-stage\" id=\"p2-stage\">" +
      "<div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"post2\" class=\"layer-base\"></div>" +
      "</div></div>" +
      "<aside class=\"panel\" id=\"p2-panel\" aria-live=\"polite\">" +
      renderInlinePanelDefault("new") +
      "</aside></div>" +
      "</section>";
  }


  function plate3HTML() {
    if (!maps.post2008) return "";
    return "<section class=\"section\" id=\"p3\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate III</span>" +
      "<h2>The two orders, side by side</h2>" +
      "<span class=\"aside\">One projection, both maps · click a seat on either side to trace it on the other</span></div>" +
      "<p>The maps of Plates I and II drawn to the same projection for direct comparison. Click any seat: on the 1976 side, the 2008 seats its territory went to light up opposite; on the 2008 side, the pre-2008 seats it was built from.</p>" +
      "<div class=\"p3-grid\">" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid rgba(41,36,27,0.35);padding-bottom:6px;margin-bottom:10px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">Before <em style=\"font-weight:400\">— 1976 order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">117 seats · 12 districts</span></div>" +
      "<div class=\"map-stage\" id=\"p3-pre-stage\"><div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"pre3\" class=\"layer-base\"></div></div>" +
      "<p style=\"margin:8px 0 0;font-size:12px;font-style:italic;color:var(--ink-60);line-height:1.45\">As Plate I. Dashed: Dakala (73), approximate boundary.</p></div>" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid rgba(41,36,27,0.35);padding-bottom:6px;margin-bottom:10px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">After <em style=\"font-weight:400\">— 2008 order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">117 seats · 20 districts</span></div>" +
      "<div class=\"map-stage\" id=\"p3-post-stage\"><div class=\"map-tip\"></div>" +
      "<div data-svg-slot=\"post3\" class=\"layer-base\"></div></div>" +
      "<p style=\"margin:8px 0 0;font-size:12px;font-style:italic;color:var(--ink-60);line-height:1.45\">As Plate II. ECI constituency polygons, 2008 delimitation.</p></div>" +
      "<aside id=\"p3-panel\" class=\"panel\" style=\"position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto\" aria-live=\"polite\">" +
      "<div class=\"eyebrow\" style=\"font-family:var(--mono);font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-60)\">Reading the comparison</div>" +
      "<p style=\"margin:14px 0 12px;font-size:14px;line-height:1.55\">Plates I and II drawn on one projection, at one scale. Click a constituency on either map: it is outlined and its counterpart territory on the opposite map fills <span style=\"background:#c4d8ec;border:1px solid #4a7ba6;padding:0 6px;border-radius:2px\">blue</span>.</p>" +
      "<p style=\"margin:0;font-size:14px;line-height:1.55\">For an old seat, that is where its territory went in 2008; for a new seat, the pre-2008 seats it was built from.</p>" +
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
          return "<div class=\"t4dist\" style=\"border:1px solid rgba(41,36,27,0.3);background:rgba(255,255,255,0.38);border-radius:3px;padding:6px;display:flex;flex-direction:column;gap:5px\">" +
            "<button class=\"t4dist-btn\" data-side=\"" + side + "\" data-name=\"" + esc(d.name) + "\" style=\"all:unset;cursor:pointer;display:flex;align-items:baseline;justify-content:space-between;gap:6px;font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:rgba(41,36,27,0.85);border-bottom:1px dotted rgba(41,36,27,0.35);padding-bottom:3px\">" +
            "<span>" + esc(d.name.toUpperCase()) + "</span>" +
            "<span style=\"font-family:var(--mono);font-size:9.5px;font-weight:400;opacity:0.6\">" + seats.length + "</span></button>" +
            "<div style=\"display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start\">" +
            seats.map(c => {
              const col = T_COL_INIT[c.status] || T_COL_INIT.continuing;
              return "<button class=\"t4tile\" data-ac=\"" + c.ac_no + "\" data-side=\"" + side + "\" style=\"all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:3px 6px 4px;border:1px solid " + col.bc + ";background:" + col.bg + ";border-radius:2px;min-width:52px;box-sizing:border-box;\">" +
              "<span style=\"display:flex;align-items:center;gap:3px\">" +
              "<span style=\"font-family:var(--mono);font-size:8.5px;opacity:0.55\">" + String(c.ac_no).padStart(2,"0") + "</span>" +
              (c.type === "SC" ? "<span style=\"font-family:var(--sans);font-size:8px;font-weight:700;background:#29241b;color:#f2ecdf;padding:0 3px;border-radius:2px;line-height:1.5\">SC</span>" : "") +
              "</span>" +
              "<span style=\"font-family:var(--sans);font-size:10.5px;font-weight:500;line-height:1.15\">" + esc(c.name) + "</span>" +
              "</button>";
            }).join("") +
            "</div></div>";
        }).join("") + "</div>";
    }

    // Chip counts
    const abolished = olds.filter(c => c.status === "abolished").length;
    const renamed = olds.filter(c => c.status === "renamed").length;
    const created = news.filter(c => c.status === "new").length;
    const continuing = olds.filter(c => c.status === "continuing").length;
    const scCount = olds.filter(c => c.type === "SC").length + news.filter(c => c.type === "SC" || c.sc_note).length;

    const chipDefs = [
      { key: "all", label: "All seats", count: "117+117", sw: null },
      { key: "continuing", label: "Name continued", count: String(continuing*2), sw: T_COL_INIT.continuing },
      { key: "renamed", label: "Renamed", count: String(renamed+renamed), sw: T_COL_INIT.renamed },
      { key: "new", label: "Created 2008", count: String(created+abolished), sw: T_COL_INIT["new"] },
      { key: "abolished", label: "Abolished", count: String(abolished), sw: T_COL_INIT.abolished },
      { key: "sc", label: "SC-reserved", count: String(scCount), sw: { bg: "#29241b", bc: "#29241b" } },
    ];

    const chipsHTML = chipDefs.map(c =>
      "<button class=\"chip\" data-filter=\"" + c.key + "\" aria-pressed=\"" + (c.key === "all" ? "true" : "false") + "\" style=\"display:inline-flex;align-items:center;gap:6px\">" +
      (c.sw ? "<span style=\"width:10px;height:10px;border-radius:2px;background:" + c.sw.bg + ";border:1px solid " + c.sw.bc + ";flex:none\"></span>" : "") +
      "<span>" + esc(c.label) + "</span>" +
      "<span style=\"font-family:var(--mono);font-size:10.5px;opacity:0.65\">" + c.count + "</span>" +
      "</button>"
    ).join("");

    return "<section class=\"section\" id=\"p4\">" +
      "<div class=\"section__head\"><span class=\"plate\">Plate IV</span>" +
      "<h2>The same change, seat by seat</h2>" +
      "<span class=\"aside\">Schematic tiles, grouped by district in rough geographic position</span></div>" +
      "<p>Every constituency before and after the 2008 order, one tile per seat. Tile positions are approximate geography, not true boundaries. Click any seat for its delimited extent and where its territory went; click a district name for its pattern of change.</p>" +
      "<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px\">" +
      "<span style=\"font-family:var(--sans);font-size:12.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-60);margin-right:4px\">Highlight</span>" +
      chipsHTML + "</div>" +
      "<div class=\"p4-grid\">" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid rgba(41,36,27,0.35);padding-bottom:6px;margin-bottom:12px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">Before <em style=\"font-weight:400\">— 1976 order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">117 seats · 12 districts</span></div>" +
      makeGrid(distOld, byDistOld, "old") + "</div>" +
      "<div>" +
      "<div style=\"display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid rgba(41,36,27,0.35);padding-bottom:6px;margin-bottom:12px\">" +
      "<h3 style=\"margin:0;font-size:21px;font-weight:600\">After <em style=\"font-weight:400\">— 2008 order</em></h3>" +
      "<span class=\"mono\" style=\"font-size:11px;color:var(--ink-60)\">117 seats · 20 districts</span></div>" +
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
      "</section>";
  }

  function tbtn(cls, val, label, pressed) {
    return "<button type=\"button\" class=\"tbtn " + cls + "\" data-val=\"" + esc(val) + "\" aria-pressed=\"" + (pressed ? "true" : "false") + "\">" + esc(label) + "</button>";
  }

  function shell(inner) {
    return "<a class=\"skip\" href=\"#main\">Skip to content</a>" +
      "<nav class=\"masthead\"><div class=\"wrap\">" +
      "<a href=\"index.html\" class=\"masthead__mark\"><span class=\"logo-b\" style=\"font-size:18px;font-family:Georgia,serif\">B</span><span style=\"letter-spacing:-0.01em\">Boundaries</span></a>" +
      "<span class=\"masthead__links\">" +
      "<a href=\"#p1\">Plate I</a><a href=\"#p2\">Plate II</a><a href=\"#p3\">Plate III</a><a href=\"#p4\">Plate IV</a><a href=\"#sources\">Sources</a>" +
      "</span></div></nav>" + inner +
      "<footer class=\"colophon\"><div class=\"wrap\">" +
      "<span>Boundaries</span><span>" + esc((data && data.assembly) || "") + " · A Cartographic Record</span>" +
      "</div></footer>";
  }


  function errHTML(msg) {
    return "<div class=\"wrap\"><p class=\"notice\" style=\"margin-top:40px\">" + esc(msg) + "</p></div>";
  }

})();
