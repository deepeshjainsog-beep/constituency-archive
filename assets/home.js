/* Boundaries — homepage register */
(async function () {
  "use strict";
  const grid = document.getElementById("register");
  const tally = document.getElementById("tally");
  const tally2 = document.getElementById("tally2");

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  let manifest;
  try {
    manifest = await (await fetch("states/manifest.json")).json();
  } catch (e) {
    if (grid) grid.innerHTML = "<p class=\"notice\">The manifest could not be loaded. Serve over HTTP rather than opening the file directly.</p>";
    return;
  }

  applyHero(manifest);
  const states = manifest.states || [];
  const live = states.filter(s => s.status === "live");

  const tallyText = live.length + " of " + states.length + " assemblies published · updated state by state";
  if (tally) tally.textContent = tallyText;
  if (tally2) tally2.textContent = live.length + " published · " + (states.length - live.length) + " coming soon";

  if (!grid) return;
  const frag = document.createDocumentFragment();
  states.forEach(function (s, i) {
    const serial = "S-" + String(i + 1).padStart(2, "0");
    const isLive = s.status === "live";
    const el = document.createElement(isLive ? "a" : "div");
    el.className = "state-card" + (isLive ? " is-live" : " is-soon");
    if (isLive) el.href = "state.html?state=" + encodeURIComponent(s.slug);

    el.innerHTML =
      "<div class=\"serial\">" + serial + (s.kind === "union-territory" ? " · UT" : "") + "</div>" +
      "<div class=\"name\">" + esc(s.name) + "</div>" +
      "<span class=\"stamp\">" + (isLive ? "Published" : "Coming soon") + "</span>" +
      (s.note ? "<div class=\"note\">" + esc(s.note) + "</div>" : "");
    frag.appendChild(el);
  });
  grid.textContent = "";
  grid.appendChild(frag);
})();

function applyHero(m) {
  const hp = (m && m.homepage) || {};
  if (hp.about_body && hp.about_body.length) {
    const section = document.querySelector('#about');
    if (section) {
      const existing = section.querySelectorAll('p');
      hp.about_body.forEach(function(txt, i) {
        if (existing[i]) existing[i].textContent = txt;
      });
    }
  }
  
  if (hp.eyebrow) {
    const el = document.querySelector('.hero__eyebrow');
    if (el) el.textContent = hp.eyebrow;
  }
  if (hp.lede) {
    const el = document.querySelector('.hero__lede');
    if (el) el.textContent = hp.lede;
  }
  if (hp.title) {
    const h1 = document.querySelector('.hero-title');
    if (h1) {
      const italic = (hp.title_italic_word || 'retired').toLowerCase();
      h1.innerHTML = hp.title.split(' ').map((w,i,arr) =>
        '<span class="w' + (w.toLowerCase().includes(italic) ? ' it' : '') + '">' +
        w + (i < arr.length-1 ? '\u00a0' : '') + '</span>'
      ).join('');
    }
  }
}
