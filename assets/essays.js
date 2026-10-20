/* Essay index. One manifest entry per piece; the essay itself is a static
   page, so an essay can be read without this script ever running. */
(function () {
  "use strict";
  var MOUNT = document.getElementById("essay-list");
  if (!MOUNT) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return esc(iso);
    var m = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"];
    return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear();
  }

  function row(e) {
    var thumb = e.image
      ? '<img class="essay-row__thumb" src="' + esc(e.image) + '" alt="" loading="lazy">'
      : '<div class="essay-row__no-thumb">BOUNDARIES</div>';
    var meta = [];
    if (e.section) meta.push('<span class="tag">' + esc(e.section) + "</span>");
    if (e.date) meta.push('<span class="dot">&middot;</span><span>' + fmtDate(e.date) + "</span>");
    if (e.author) meta.push('<span class="dot">&middot;</span><span>' + esc(e.author) + "</span>");
    if (e.reading_time) meta.push('<span class="dot">&middot;</span><span>' + esc(e.reading_time) + "</span>");
    return (
      '<a class="essay-row" href="' + esc(e.url) + '">' +
      thumb +
      '<div><div class="essay-row__meta">' + meta.join("") + "</div>" +
      '<h2 class="essay-row__title">' + esc(e.title) + "</h2>" +
      (e.dek ? '<p class="essay-row__dek">' + esc(e.dek) + "</p>" : "") +
      "</div></a>"
    );
  }

  fetch("essays/manifest.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var list = (data && data.essays) || [];
      list = list.filter(function (e) { return e && e.status !== "draft"; });
      list.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
      if (!list.length) {
        MOUNT.className = "essay-empty";
        MOUNT.innerHTML =
          "The first essays are in preparation. Until then, the record itself is " +
          'the argument: <a href="index.html#register">the register</a> lists every ' +
          "assembly published so far.";
        return;
      }
      MOUNT.innerHTML = list.map(row).join("");
    })
    .catch(function () {
      MOUNT.className = "essay-empty";
      MOUNT.innerHTML = "The essay list could not be loaded.";
    });
})();
