(function () {
  var STUCK_TRANSFORM_RE = /translateY\((-?\d+(?:\.\d+)?)px\)/;
  var STUCK_TRANSFORM_THRESHOLD = 40;

  function isStuckTransform(el) {
    var m = STUCK_TRANSFORM_RE.exec(el.style.transform || "");
    return m && Math.abs(parseFloat(m[1])) >= STUCK_TRANSFORM_THRESHOLD;
  }

  function isHidden(el) {
    if (el.style.opacity === "") return false;
    var v = parseFloat(el.style.opacity);
    return !isNaN(v) && v < 0.05;
  }

  function revealOnScroll() {
    var targets = Array.prototype.filter.call(
      document.querySelectorAll("#main [style]"),
      function (el) {
        return isHidden(el) || isStuckTransform(el);
      }
    );
    if (!targets.length) return;

    function reveal(el) {
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      if (isHidden(el)) el.style.opacity = "1";
      if (isStuckTransform(el)) el.style.transform = "none";
    }

    if (!("IntersectionObserver" in window)) {
      targets.forEach(reveal);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "400px 0px 400px 0px" }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  function setupSlideshows() {
    var controlPanels = document.querySelectorAll(
      'fieldset[aria-label="Slideshow pagination controls"], [aria-label="Slideshow pagination controls"]'
    );
    controlPanels.forEach(function (panel) {
      if (panel.dataset.swInit) return; // avoid double-binding on re-init
      panel.dataset.swInit = "1";
      var viewport = panel.previousElementSibling;
      if (!viewport) return;
      var track = viewport.querySelector("ul");
      if (!track) return;
      var slides = Array.prototype.filter.call(track.children, function (li) {
        return li.tagName === "LI";
      });
      if (!slides.length) return;

      var current = 0;
      var gap = parseFloat(getComputedStyle(track).gap) || 0;

      function goTo(index) {
        index = Math.max(0, Math.min(slides.length - 1, index));
        current = index;
        var viewportWidth = viewport.getBoundingClientRect().width;
        var offset = -(index * (viewportWidth + gap));
        track.style.transition = "transform 0.4s ease";
        track.style.transform = "translateX(" + offset + "px)";
      }

      var prevBtn = panel.querySelector('button[aria-label="Previous"]');
      var nextBtn = panel.querySelector('button[aria-label="Next"]');
      if (prevBtn)
        prevBtn.addEventListener("click", function () {
          goTo(current - 1);
        });
      if (nextBtn)
        nextBtn.addEventListener("click", function () {
          goTo(current + 1);
        });

      var dotButtons = panel.querySelectorAll(
        'button[aria-label^="Scroll to page"]'
      );
      dotButtons.forEach(function (btn, i) {
        btn.addEventListener("click", function () {
          goTo(i);
        });
      });

      goTo(0);
    });
  }

  // Custom cursor — a faithful rebuild of the original Framer cursor (its
  // runtime was removed on decouple). Spec recovered from the Framer bundle,
  // which defined one cursor component with these variants:
  //   • default (data-framer-cursor 1xs2rsu / none): 26px white circle,
  //     mix-blend-mode:difference (reads black on light, white on dark)
  //   • hover (1azywwi, interactive): grows to a 70px circle, same blend
  //   • copy  (1igxo09, email): morphs into a black pill with white "Copy" text
  //   • pressed: shrinks on pointer-down
  // The native cursor is hidden so this stands in for it.
  function setupCustomCursor() {
    // Only for devices with a real pointer; touch/coarse pointers keep native.
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

    var css =
      "html.has-dot-cursor, html.has-dot-cursor * { cursor: none !important; }" +
      ".yuya-cursor{position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;" +
      "display:flex;align-items:center;justify-content:center;box-sizing:border-box;" +
      "width:26px;height:26px;border-radius:999px;background:#fff;mix-blend-mode:difference;" +
      "opacity:0;transform:translate(-50%,-50%) scale(1);overflow:hidden;white-space:nowrap;" +
      "transition:width .28s cubic-bezier(.22,1,.36,1),height .28s cubic-bezier(.22,1,.36,1)," +
      "padding .28s cubic-bezier(.22,1,.36,1),background-color .2s ease,transform .2s ease,opacity .2s ease;}" +
      ".yuya-cursor.is-hover{width:70px;height:70px;}" +
      ".yuya-cursor.is-copy{width:auto;height:auto;padding:20px 30px;background:#000;mix-blend-mode:normal;}" +
      ".yuya-cursor.is-pressed{transform:translate(-50%,-50%) scale(.62);}" +
      ".yuya-cursor__label{color:#fff;font:500 16px/1 'Inter',-apple-system,system-ui,sans-serif;" +
      "opacity:0;max-width:0;transition:opacity .18s ease;}" +
      ".yuya-cursor.is-copy .yuya-cursor__label{opacity:1;max-width:200px;}";
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var cur = document.createElement("div");
    cur.className = "yuya-cursor";
    cur.setAttribute("aria-hidden", "true");
    var label = document.createElement("span");
    label.className = "yuya-cursor__label";
    label.textContent = "Copy";
    cur.appendChild(label);
    document.body.appendChild(cur);

    var visible = false;

    function setState(state) {
      cur.classList.toggle("is-hover", state === "hover");
      cur.classList.toggle("is-copy", state === "copy");
    }

    document.addEventListener("mousemove", function (e) {
      // Position instantly at the pointer; size/shape morph via CSS transition.
      cur.style.left = e.clientX + "px";
      cur.style.top = e.clientY + "px";
      if (!visible) { visible = true; cur.style.opacity = "1"; }

      // Pick the variant from the element under the pointer (as Framer did).
      var hit = e.target && e.target.closest ? e.target.closest("[data-framer-cursor]") : null;
      var id = hit && hit.getAttribute("data-framer-cursor");
      if (id === "1igxo09") setState("copy");
      else if (id === "1azywwi") setState("hover");
      else setState("default");
    });
    document.addEventListener("mouseleave", function () {
      visible = false; cur.style.opacity = "0";
    });
    document.addEventListener("mousedown", function () { cur.classList.add("is-pressed"); });
    document.addEventListener("mouseup", function () { cur.classList.remove("is-pressed"); });

    document.documentElement.classList.add("has-dot-cursor");
  }

  function setupCopyToClipboard() {
    var emailBlocks = document.querySelectorAll('[data-framer-cursor="1igxo09"]');
    emailBlocks.forEach(function (block) {
      var text = block.textContent.trim();
      var match = text.match(/[^\s]+@[^\s]+\.[^\s]+/);
      if (!match) return;
      block.style.cursor = "pointer";
      block.addEventListener("click", function () {
        if (navigator.clipboard) navigator.clipboard.writeText(match[0]);
      });
    });
  }

  function fixOverflowingNav() {
    var headers = document.querySelectorAll("header");
    headers.forEach(function (header) {
      var all = header.querySelectorAll("*");
      Array.prototype.forEach.call(all, function (el) {
        var cs = getComputedStyle(el);
        if (cs.display !== "flex") return;
        var kids = el.children;
        if (!kids.length) return;
        var kidsWidth = 0;
        for (var i = 0; i < kids.length; i++) {
          kidsWidth += kids[i].getBoundingClientRect().width;
        }
        var ownWidth = el.getBoundingClientRect().width;
        if (kidsWidth <= ownWidth + 1) return;
        el.style.setProperty("width", "auto", "important");
        el.style.setProperty("max-width", "none", "important");
        el.style.setProperty("flex", "0 0 auto", "important");
      });
    });
  }

  var FV_ICON = {
    play: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#fff"><path d="M7 5l12 7-12 7z"></path></svg>',
    pause:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>',
    muted:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="#fff"><path d="M11 5 6 9H3v6h3l5 4z"></path><line x1="16" y1="9" x2="21" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"></line><line x1="21" y1="9" x2="16" y2="15" stroke="#fff" stroke-width="2" stroke-linecap="round"></line></svg>',
    unmuted:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="#fff"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="M16 8.5a4 4 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"></path></svg>',
  };

  function injectFloatingVideoStyles() {
    if (document.getElementById("fv-styles")) return;
    var css =
      '[data-framer-name="Floating YouTube Video"]{top:auto!important;bottom:24px!important;right:24px!important;left:auto!important;padding:0!important;background:transparent!important;cursor:grab;touch-action:none}' +
      '[data-framer-name="Floating YouTube Video"].fv-dragging{cursor:grabbing}' +
      ".floating-video{position:relative;width:100%;height:100%;overflow:hidden;background:#000;border-radius:inherit}" +
      ".floating-video__el{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}" +
      ".floating-video__controls{position:absolute;right:8px;bottom:8px;display:flex;gap:5px;opacity:0;transition:opacity .2s ease}" +
      '[data-framer-name="Floating YouTube Video"]:hover .floating-video__controls{opacity:1}' +
      ".floating-video__btn{width:24px;height:24px;padding:0;border:none;border-radius:50%;background:rgba(0,0,0,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s ease}" +
      ".floating-video__btn:hover{background:rgba(0,0,0,.8)}";
    var s = document.createElement("style");
    s.id = "fv-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function setupFloatingVideo() {
    var boxes = document.querySelectorAll(".floating-video");
    if (!boxes.length) return;
    injectFloatingVideoStyles();

    boxes.forEach(function (box) {
      var wrap = box.closest('[data-framer-name="Floating YouTube Video"]');
      var video = box.querySelector("video");
      if (!video) return;
      var btnRestart = box.querySelector('[data-fv="restart"]');
      var btnPlay = box.querySelector('[data-fv="playpause"]');
      var btnMute = box.querySelector('[data-fv="mute"]');

      // Nudge autoplay (muted autoplay is allowed without a gesture).
      var p = video.play();
      if (p && p.catch) p.catch(function () {});

      if (btnRestart)
        btnRestart.addEventListener("click", function (e) {
          e.stopPropagation();
          video.currentTime = 0;
          video.play();
        });

      if (btnPlay)
        btnPlay.addEventListener("click", function (e) {
          e.stopPropagation();
          if (video.paused) {
            video.play();
            btnPlay.innerHTML = FV_ICON.pause;
            btnPlay.setAttribute("aria-label", "Pause");
          } else {
            video.pause();
            btnPlay.innerHTML = FV_ICON.play;
            btnPlay.setAttribute("aria-label", "Play");
          }
        });

      if (btnMute)
        btnMute.addEventListener("click", function (e) {
          e.stopPropagation();
          video.muted = !video.muted;
          btnMute.innerHTML = video.muted ? FV_ICON.muted : FV_ICON.unmuted;
          btnMute.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
        });

      // Drag to reposition (grab anywhere except the control buttons).
      if (wrap && window.PointerEvent) {
        var dragging = false,
          sx,
          sy,
          ox,
          oy;
        box.addEventListener("pointerdown", function (e) {
          if (e.target.closest(".floating-video__btn")) return;
          dragging = true;
          wrap.classList.add("fv-dragging");
          var r = wrap.getBoundingClientRect();
          wrap.style.setProperty("top", r.top + "px", "important");
          wrap.style.setProperty("left", r.left + "px", "important");
          wrap.style.setProperty("bottom", "auto", "important");
          wrap.style.setProperty("right", "auto", "important");
          sx = e.clientX;
          sy = e.clientY;
          ox = r.left;
          oy = r.top;
          try {
            box.setPointerCapture(e.pointerId);
          } catch (_) {}
          e.preventDefault();
        });
        box.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          var r = wrap.getBoundingClientRect();
          var nx = ox + (e.clientX - sx);
          var ny = oy + (e.clientY - sy);
          nx = Math.max(8, Math.min(window.innerWidth - r.width - 8, nx));
          ny = Math.max(8, Math.min(window.innerHeight - r.height - 8, ny));
          wrap.style.setProperty("left", nx + "px", "important");
          wrap.style.setProperty("top", ny + "px", "important");
        });
        function endDrag(e) {
          if (!dragging) return;
          dragging = false;
          wrap.classList.remove("fv-dragging");
          try {
            box.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
        box.addEventListener("pointerup", endDrag);
        box.addEventListener("pointercancel", endDrag);
      }
    });
  }

  // Works listing pagination. Framer's runtime used to drive "Load More"; here
  // we show an initial batch of cards and reveal the rest on click.
  function setupLoadMore() {
    var grid = document.querySelector('[data-cms-cards="listing"]');
    if (!grid) return;
    var loadMore = document.querySelector(".framer-9ju4ua-container");
    var cards = Array.prototype.filter.call(grid.children, function (el) {
      return el.querySelector && el.querySelector(".framer-cw97fa-container");
    });

    var BATCH = 4;
    var shown = BATCH;

    function apply() {
      cards.forEach(function (c, i) {
        c.style.display = i < shown ? "" : "none";
      });
      if (loadMore) {
        loadMore.style.display = shown >= cards.length ? "none" : "";
      }
    }

    if (cards.length <= BATCH) {
      if (loadMore) loadMore.style.display = "none";
      return;
    }

    apply();
    if (loadMore) {
      loadMore.style.cursor = "pointer";
      loadMore.addEventListener("click", function (e) {
        e.preventDefault();
        shown += BATCH;
        apply();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    revealOnScroll();
    setupSlideshows();
    setupCustomCursor();
    setupCopyToClipboard();
    setupFloatingVideo();
    setupLoadMore();
    setTimeout(fixOverflowingNav, 700);
  });

  // The dev CMS renderer replaces [data-cms-region] innerHTML, which drops the
  // slideshow/reveal bindings inside those sections. Re-bind when it signals.
  document.addEventListener("cms:rendered", function () {
    revealOnScroll();
    setupSlideshows();
  });
})();
