(function () {
  "use strict";

  var state = { data: null, dirty: false, editingSlug: null };
  var $ = function (id) { return document.getElementById(id); };

  function setStatus(msg, cls) {
    var el = $("status");
    el.textContent = msg || "";
    el.className = "status" + (cls ? " " + cls : "");
  }

  function markDirty() {
    state.dirty = true;
    setStatus("Unsaved changes", "");
  }

  function sortedProjects() {
    return state.data.projects
      .slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function reindex() {
    sortedProjects().forEach(function (p, i) { p.order = i + 1; });
  }

  // ---------- table ----------
  function textCell(project, key, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    var input = document.createElement("input");
    input.type = "text";
    input.value = get(project, key) || "";
    input.addEventListener("input", function () { set(project, key, input.value); markDirty(); });
    td.appendChild(input);
    return td;
  }

  function get(o, key) {
    return key.split(".").reduce(function (a, k) { return a && a[k]; }, o);
  }
  function set(o, key, val) {
    var parts = key.split("."), last = parts.pop();
    var t = parts.reduce(function (a, k) { return (a[k] = a[k] || {}); }, o);
    t[last] = val;
  }

  function statusCell(project) {
    var td = document.createElement("td");
    var pill = document.createElement("span");
    function paint() {
      pill.className = "status-pill " + (project.status === "live" ? "live" : "draft");
      pill.textContent = project.status === "live" ? "Live" : "Draft";
    }
    paint();
    pill.title = "Click to toggle";
    pill.addEventListener("click", function () {
      project.status = project.status === "live" ? "draft" : "live";
      paint(); markDirty();
    });
    td.appendChild(pill);
    return td;
  }

  function coverCell(project) {
    var td = document.createElement("td");
    if (project.cover) {
      var img = document.createElement("img");
      img.className = "cover-thumb";
      img.src = "/" + project.cover;
      img.alt = "";
      img.addEventListener("click", function () { openDrawer(project.slug); });
      td.appendChild(img);
    } else {
      var ph = document.createElement("div");
      ph.className = "cover-empty";
      td.appendChild(ph);
    }
    return td;
  }

  function toggleCell(project, key) {
    var td = document.createElement("td");
    var btn = document.createElement("button");
    function paint() { btn.className = "toggle" + (get(project, key) ? " on" : ""); }
    paint();
    btn.addEventListener("click", function () { set(project, key, !get(project, key)); paint(); markDirty(); });
    td.appendChild(btn);
    return td;
  }

  function dragCell(project, tr) {
    var td = document.createElement("td");
    td.className = "col-drag";
    var handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    handle.draggable = true;
    handle.addEventListener("dragstart", function (e) {
      tr.classList.add("dragging");
      e.dataTransfer.setData("text/plain", project.slug);
      e.dataTransfer.effectAllowed = "move";
    });
    handle.addEventListener("dragend", function () { tr.classList.remove("dragging"); });
    td.appendChild(handle);
    return td;
  }

  function editCell(project) {
    var td = document.createElement("td");
    td.className = "col-edit";
    var btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Edit";
    btn.addEventListener("click", function () { openDrawer(project.slug); });
    td.appendChild(btn);
    return td;
  }

  function render() {
    var tbody = $("rows");
    tbody.innerHTML = "";
    sortedProjects().forEach(function (project) {
      var tr = document.createElement("tr");
      tr.dataset.slug = project.slug;

      tr.appendChild(dragCell(project, tr));
      tr.appendChild(textCell(project, "title", "title-cell"));
      tr.appendChild(statusCell(project));
      tr.appendChild(textCell(project, "subtitle"));
      tr.appendChild(textCell(project, "slug"));
      tr.appendChild(coverCell(project));
      tr.appendChild(toggleCell(project, "hasDetail"));
      tr.appendChild(textCell(project, "meta.industry"));
      tr.appendChild(editCell(project));

      // drop target handling
      tr.addEventListener("dragover", function (e) { e.preventDefault(); tr.classList.add("drop-target"); });
      tr.addEventListener("dragleave", function () { tr.classList.remove("drop-target"); });
      tr.addEventListener("drop", function (e) {
        e.preventDefault();
        tr.classList.remove("drop-target");
        var fromSlug = e.dataTransfer.getData("text/plain");
        moveBefore(fromSlug, project.slug);
      });

      tbody.appendChild(tr);
    });
  }

  function moveBefore(fromSlug, beforeSlug) {
    if (fromSlug === beforeSlug) return;
    var list = sortedProjects();
    var from = list.findIndex(function (p) { return p.slug === fromSlug; });
    var to = list.findIndex(function (p) { return p.slug === beforeSlug; });
    if (from < 0 || to < 0) return;
    var moved = list.splice(from, 1)[0];
    to = list.findIndex(function (p) { return p.slug === beforeSlug; });
    list.splice(to, 0, moved);
    list.forEach(function (p, i) { p.order = i + 1; });
    markDirty();
    render();
  }

  // ---------- drawer ----------
  function fieldInput(label, project, key) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label"); lab.textContent = label;
    var input = document.createElement("input"); input.type = "text";
    input.value = get(project, key) || "";
    input.addEventListener("input", function () { set(project, key, input.value); markDirty(); syncRowInputs(project); });
    wrap.appendChild(lab); wrap.appendChild(input);
    return wrap;
  }

  function fieldTextarea(label, project, key, cls) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label"); lab.textContent = label;
    var ta = document.createElement("textarea");
    if (cls) ta.className = cls;
    ta.value = get(project, key) || "";
    ta.addEventListener("input", function () { set(project, key, ta.value); markDirty(); });
    wrap.appendChild(lab); wrap.appendChild(ta);
    return wrap;
  }

  function syncRowInputs() { /* light: re-render on close for simplicity */ }

  function openDrawer(slug) {
    state.editingSlug = slug;
    var project = state.data.projects.find(function (p) { return p.slug === slug; });
    if (!project) return;
    $("drawerTitle").textContent = "Edit — " + (project.title || project.slug);
    var body = $("drawerBody");
    body.innerHTML = "";

    body.appendChild(fieldInput("Cover image path", project, "cover"));
    body.appendChild(fieldInput("Cover alt text", project, "coverAlt"));

    var meta = document.createElement("div"); meta.className = "subgrid";
    meta.appendChild(fieldInput("Client", project, "meta.client"));
    meta.appendChild(fieldInput("Year", project, "meta.year"));
    body.appendChild(meta);
    body.appendChild(fieldInput("Experience", project, "meta.experience"));
    body.appendChild(fieldInput("Industry", project, "meta.industry"));

    body.appendChild(sectionLabel("SEO"));
    body.appendChild(fieldInput("SEO title", project, "seoTitle"));
    body.appendChild(fieldTextarea("SEO description", project, "seoDescription"));

    if (project.regions && Object.keys(project.regions).length) {
      body.appendChild(sectionLabel("Page body (HTML per section)"));
      Object.keys(project.regions).forEach(function (rid) {
        body.appendChild(fieldTextarea(rid, project, "regions." + rid, "region"));
      });
    }

    $("drawer").classList.remove("hidden");
    $("scrim").classList.remove("hidden");
  }

  function sectionLabel(text) {
    var d = document.createElement("div");
    d.className = "section-label"; d.textContent = text;
    return d;
  }

  function closeDrawer() {
    $("drawer").classList.add("hidden");
    $("scrim").classList.add("hidden");
    render(); // reflect any field changes back into the table
  }

  // ---------- add / save / bake ----------
  function addProject() {
    var slug = prompt("Slug for the new project (e.g. acme-ai):");
    if (!slug) return;
    slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (state.data.projects.some(function (p) { return p.slug === slug; })) {
      alert("A project with that slug already exists."); return;
    }
    state.data.projects.push({
      slug: slug, status: "draft", order: state.data.projects.length + 1,
      title: slug.toUpperCase(), subtitle: "", cover: "", coverAlt: "",
      hasDetail: false, meta: { industry: "", client: "", year: "", experience: "" },
      seoTitle: "", seoDescription: "", regions: {},
    });
    markDirty(); render();
  }

  function save() {
    reindex();
    setStatus("Saving…");
    fetch("/cms/api/works", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.data),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) { state.dirty = false; setStatus("Saved ✓", "ok"); }
        else setStatus("Save failed", "err");
      })
      .catch(function () { setStatus("Save failed", "err"); });
  }

  function bake() {
    if (state.dirty) { save(); }
    setStatus("Baking…");
    fetch("/cms/api/bake", { method: "POST" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) setStatus("Baked ✓ (" + res.baked + " pages)", "ok");
        else setStatus("Bake failed", "err");
      })
      .catch(function () { setStatus("Bake failed", "err"); });
  }

  // ---------- init ----------
  function load() {
    fetch("/cms/api/works")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.data = data;
        render();
        setStatus(state.data.projects.length + " projects");
      })
      .catch(function () { setStatus("Failed to load works.json", "err"); });
  }

  window.addEventListener("DOMContentLoaded", function () {
    $("saveBtn").addEventListener("click", save);
    $("bakeBtn").addEventListener("click", bake);
    $("addBtn").addEventListener("click", addProject);
    $("drawerClose").addEventListener("click", closeDrawer);
    $("scrim").addEventListener("click", closeDrawer);
    window.addEventListener("beforeunload", function (e) {
      if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
    load();
  });
})();
