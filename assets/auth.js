/* ============================================================================
   Boundaries — reader sign-in

   Shows a centred prompt thirty seconds into a visit, on every page. Signing
   in with Google records the reader's name and email to a Google Sheet.

   This is a soft prompt. The page behind it stays in the document, so a
   reader who dismisses it loses nothing and a search engine indexes the page
   as before. On a static site that is the only honest kind of gate: there is
   no server here to verify a token against, so anything stronger would be a
   curtain pretending to be a door.

   TWO VALUES TO FILL IN BELOW. Both are free. See essays/SIGN-IN-SETUP.md.
   ========================================================================== */
(function () {
  "use strict";

  /* a page may carry its own <script> tag as well as the loader in
     theme.js; only the first copy runs. */
  if (window.__bdAuthLoaded) return;
  window.__bdAuthLoaded = true;

  var CLIENT_ID = "296016950970-uitflaa3art0nsdga9hc6rm69c72c7t5.apps.googleusercontent.com";
  var SHEET_URL = "https://script.google.com/macros/s/AKfycbyf6EaSCNxHU9aVejxiG_0CEN9Yxx22lvgUVPzat_HZIGkLwNOI76z7k4Vw7Hcw6jz5UA/exec";

  var DELAY_MS      = 30000;   // how long before the prompt appears
  var SNOOZE_DAYS   = 14;      // how long "Not now" lasts
  var KEY_USER      = "boundaries.reader";
  var KEY_SNOOZE    = "boundaries.snooze";

  /* ---- storage, which can throw in a private window ---------------------- */

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function signedIn() { return !!get(KEY_USER); }
  function snoozed() {
    var t = parseInt(get(KEY_SNOOZE) || "0", 10);
    return t && Date.now() < t;
  }

  /* ---- do not prompt at all in these cases ------------------------------- */

  function skip() {
    if (!CLIENT_ID || CLIENT_ID.indexOf("PASTE_") === 0) return true;  // not set up
    if (signedIn() || snoozed()) return true;
    if (navigator.webdriver) return true;                              // automation
    if (/bot|crawl|spider|slurp|bingpreview|lighthouse/i.test(navigator.userAgent)) return true;
    return false;
  }


  /* ---- styles, carried here so the stylesheet needs no change ------------ */

  var BD_AUTH_CSS = ".bd-auth {\nposition: fixed;\ninset: 0;\nz-index: 9000;\ndisplay: grid;\nplace-items: center;\npadding: 24px;\nbackground: rgba(28, 26, 22, 0.42);\nbackdrop-filter: blur(3px);\n-webkit-backdrop-filter: blur(3px);\nopacity: 0;\ntransition: opacity 0.22s ease;\n}\n.bd-auth.is-in { opacity: 1; }\n[data-theme=\"dark\"] .bd-auth { background: rgba(0, 0, 0, 0.62); }\nbody.bd-auth-open { overflow: hidden; }\n.bd-auth__card {\nwidth: min(430px, 100%);\nbackground: var(--bg);\nborder: var(--border);\nborder-radius: 8px;\nbox-shadow: 0 24px 64px rgba(28, 26, 22, 0.22),\n0 2px 8px rgba(28, 26, 22, 0.10);\npadding: 34px 32px 26px;\ntext-align: center;\ntransform: translateY(10px) scale(0.985);\ntransition: transform 0.26s cubic-bezier(0.2, 0.7, 0.3, 1);\n}\n.bd-auth.is-in .bd-auth__card { transform: none; }\n.bd-auth__eyebrow {\nfont-family: var(--mono);\nfont-size: 10.5px;\nletter-spacing: 0.14em;\ntext-transform: uppercase;\ncolor: var(--teal);\nmargin-bottom: 14px;\n}\n.bd-auth__h {\nfont-family: var(--serif);\nfont-weight: 400;\nfont-size: 27px;\nline-height: 1.16;\nletter-spacing: -0.015em;\ncolor: var(--ink);\nmargin: 0 0 12px;\n}\n.bd-auth__p {\nfont-family: var(--text-serif, Georgia, serif);\nfont-size: 16.5px;\nline-height: 1.55;\ncolor: var(--ink-70);\nmargin: 0 auto 22px;\nmax-width: 34ch;\n}\n.bd-auth__btn {\ndisplay: flex;\njustify-content: center;\nmin-height: 44px;\nmargin-bottom: 6px;\n}\n.bd-auth__skip {\ndisplay: block;\nmargin: 10px auto 0;\npadding: 7px 14px;\nbackground: none;\nborder: 0;\nborder-radius: var(--r);\nfont-family: var(--mono);\nfont-size: 11.5px;\nletter-spacing: 0.06em;\ncolor: var(--ink-45);\ncursor: pointer;\n}\n.bd-auth__skip:hover { background: var(--ink-06); color: var(--ink); }\n.bd-auth__fine {\nfont-family: var(--mono);\nfont-size: 10px;\nline-height: 1.6;\nletter-spacing: 0.02em;\ncolor: var(--ink-35);\nmargin: 18px auto 0;\npadding-top: 14px;\nborder-top: var(--border);\nmax-width: 40ch;\n}\n.bd-auth__err {\nfont-family: var(--mono);\nfont-size: 11.5px;\ncolor: var(--ink-45);\nmargin: 0;\n}\n.bd-who {\nfont-family: var(--mono);\nfont-size: 11px;\nletter-spacing: 0.06em;\ncolor: var(--ink-45);\npadding: 4px 9px;\nborder: var(--border);\nborder-radius: var(--r-pill);\nwhite-space: nowrap;\n}\n@media (max-width: 560px) {\n.bd-auth__card { padding: 28px 22px 22px; }\n.bd-auth__h { font-size: 23px; }\n.bd-who { display: none; }\n}\n@media (prefers-reduced-motion: reduce) {\n.bd-auth, .bd-auth__card { transition: none; }\n}\n@media print { .bd-auth { display: none !important; } }";

  function injectCSS() {
    if (document.getElementById("bd-auth-css")) return;
    var s = document.createElement("style");
    s.id = "bd-auth-css";
    s.textContent = BD_AUTH_CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- the prompt -------------------------------------------------------- */

  var lastFocus = null;

  function open() {
    if (document.getElementById("bd-auth")) return;
    injectCSS();

    var wrap = document.createElement("div");
    wrap.id = "bd-auth";
    wrap.className = "bd-auth";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "bd-auth-h");
    wrap.innerHTML =
      '<div class="bd-auth__card">' +
        '<div class="bd-auth__eyebrow">Boundaries</div>' +
        '<h2 class="bd-auth__h" id="bd-auth-h">Keep reading the archive</h2>' +
        '<p class="bd-auth__p">Boundaries is free and stays free. Signing in lets ' +
          'us know who the archive is for, and lets us tell you when a new state ' +
          'or a new essay is published.</p>' +
        '<div class="bd-auth__btn" id="bd-auth-btn"></div>' +
        '<button type="button" class="bd-auth__skip" id="bd-auth-skip">Not now</button>' +
        '<p class="bd-auth__fine">We record your name and email address, nothing else. ' +
          'No password is created and nothing is shared.</p>' +
      '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add("bd-auth-open");

    lastFocus = document.activeElement;
    document.getElementById("bd-auth-skip").addEventListener("click", dismiss);
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) dismiss(); });
    document.addEventListener("keydown", onKey, true);
    requestAnimationFrame(function () { wrap.classList.add("is-in"); });

    loadGoogle(function () {
      try {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: onCredential,
          cancel_on_tap_outside: false
        });
        google.accounts.id.renderButton(document.getElementById("bd-auth-btn"), {
          theme: "filled_black", size: "large", shape: "pill",
          text: "continue_with", width: 280, logo_alignment: "center"
        });
      } catch (e) { fallback(); }
    }, fallback);
  }

  function fallback() {
    var b = document.getElementById("bd-auth-btn");
    if (b) b.innerHTML = '<p class="bd-auth__err">Google sign-in could not load. ' +
      'Please carry on reading.</p>';
  }

  function onKey(e) {
    if (e.key === "Escape") { dismiss(); return; }
    if (e.key !== "Tab") return;
    var w = document.getElementById("bd-auth");
    if (!w) return;
    var f = w.querySelectorAll('button, [href], iframe, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  function close() {
    var w = document.getElementById("bd-auth");
    if (w) w.remove();
    document.body.classList.remove("bd-auth-open");
    document.removeEventListener("keydown", onKey, true);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function dismiss() {
    set(KEY_SNOOZE, String(Date.now() + SNOOZE_DAYS * 864e5));
    close();
  }

  /* ---- Google Identity Services, loaded only when the prompt opens ------- */

  function loadGoogle(ok, bad) {
    if (window.google && google.accounts && google.accounts.id) { ok(); return; }
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = ok; s.onerror = bad;
    document.head.appendChild(s);
  }

  /* The ID token is read here only to show a name and to record it. It is not
     verified, and nothing on this site depends on it being true. */
  function decode(jwt) {
    try {
      var p = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      var pad = p.length % 4 ? "====".slice(p.length % 4) : "";
      return JSON.parse(decodeURIComponent(escape(atob(p + pad))));
    } catch (e) { return null; }
  }

  function onCredential(resp) {
    var c = decode(resp && resp.credential);
    if (!c) { close(); return; }
    var reader = { name: c.name || "", email: c.email || "", at: Date.now() };
    set(KEY_USER, JSON.stringify(reader));
    record(reader);
    close();
    badge(reader);
  }

  /* Apps Script does not send CORS headers, so this is a fire-and-forget post
     with a plain-text body, which is the one content type that does not
     trigger a preflight. We never see the response, and do not need to. */
  function record(r) {
    if (!SHEET_URL || SHEET_URL.indexOf("PASTE_") === 0) return;
    try {
      fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          name: r.name,
          email: r.email,
          page: location.pathname + location.search,
          referrer: document.referrer || "",
          at: new Date().toISOString()
        })
      });
    } catch (e) {}
  }

  /* ---- a quiet mark in the masthead once signed in ----------------------- */

  function badge(r) {
    var nav = document.querySelector(".masthead__links");
    if (!nav || document.getElementById("bd-who")) return;
    var first = (r.name || r.email || "").split(" ")[0];
    if (!first) return;
    var s = document.createElement("span");
    s.id = "bd-who";
    s.className = "bd-who";
    s.title = r.email || "";
    s.textContent = first;
    nav.insertBefore(s, nav.firstChild);
  }

  /* ---- go ----------------------------------------------------------------- */

  function start() {
    var saved = get(KEY_USER);
    if (saved) { try { badge(JSON.parse(saved)); } catch (e) {} }
    if (skip()) return;
    setTimeout(function () {
      if (document.visibilityState === "hidden") {
        document.addEventListener("visibilitychange", function once() {
          document.removeEventListener("visibilitychange", once);
          if (!skip()) open();
        });
      } else { open(); }
    }, DELAY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }
})();
