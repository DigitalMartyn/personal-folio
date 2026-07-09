// DEV-ONLY live renderer + in-place editor.
//
// This file is injected on the fly by cms/server.mjs (port 5174) and is NEVER
// present in the committed/production HTML — production is the baked static
// output. It lets you (a) see works.json edits reflected live, and
// (b) with ?cms=edit, edit the page body sections in place and save them back.

(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var EDIT = params.get("cms") === "edit";

  function currentSlug() {
    var m = location.pathname.match(/\/works\/([^/]+)\/?$/);
    return m ? m[1] : null;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hydrate(project) {
    // Metadata fields
    document.querySelectorAll("[data-cms-field]").forEach(function (el) {
      var f = el.getAttribute("data-cms-field");
      var val =
        f === "title" ? project.title :
        f === "subtitle" ? project.subtitle :
        (project.meta && project.meta[f]);
      if (val != null) el.textContent = val;
    });
    // Body regions
    var regions = project.regions || {};
    document.querySelectorAll("[data-cms-region]").forEach(function (el) {
      var rid = el.getAttribute("data-cms-region");
      if (regions[rid] != null) el.innerHTML = regions[rid];
    });
    // Let static-work.js re-bind slideshows / reveal to the new DOM.
    document.dispatchEvent(new CustomEvent("cms:rendered"));
  }

  // ---- in-place editor ----
  function enableEditing(slug) {
    var bar = document.createElement("div");
    bar.style.cssText =
      "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;" +
      "background:#111;color:#fff;border-radius:999px;padding:8px 8px 8px 16px;" +
      "display:flex;align-items:center;gap:12px;font:600 13px -apple-system,sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.3)";
    var label = document.createElement("span");
    label.textContent = "Editing " + slug + " — click a section to edit";
    var save = document.createElement("button");
    save.textContent = "Save";
    save.style.cssText =
      "border:none;background:#2563eb;color:#fff;border-radius:999px;padding:7px 16px;cursor:pointer;font:inherit";
    bar.appendChild(label);
    bar.appendChild(save);
    document.body.appendChild(bar);

    var regions = document.querySelectorAll("[data-cms-region]");
    regions.forEach(function (el) {
      el.setAttribute("contenteditable", "true");
      el.style.outline = "2px dashed transparent";
      el.addEventListener("focus", function () { el.style.outline = "2px dashed #2563eb"; });
      el.addEventListener("blur", function () { el.style.outline = "2px dashed transparent"; });
    });

    save.addEventListener("click", function () {
      var payload = {};
      regions.forEach(function (el) {
        payload[el.getAttribute("data-cms-region")] = el.innerHTML;
      });
      save.textContent = "Saving…";
      fetch("/cms/api/region", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug, regions: payload }),
      })
        .then(function (r) { return r.json(); })
        .then(function (res) { save.textContent = res.ok ? "Saved ✓" : "Failed"; })
        .catch(function () { save.textContent = "Failed"; });
    });
  }

  fetch("/data/works.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var slug = currentSlug();
      if (!slug) return; // listing/home handled by bake for now
      var project = data.projects.find(function (p) { return p.slug === slug; });
      if (!project) return;
      hydrate(project);
      if (EDIT) enableEditing(slug);
    })
    .catch(function () {});
})();
