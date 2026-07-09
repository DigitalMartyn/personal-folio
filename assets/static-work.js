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

  var CURSOR_LABELS = {
    "1igxo09": "Copy",
  };

  function setupCustomCursor() {
    var targets = document.querySelectorAll("[data-framer-cursor]");
    if (!targets.length) return;

    var pill = document.createElement("div");
    pill.textContent = "";
    pill.style.cssText =
      "position:fixed;top:0;left:0;z-index:9999;pointer-events:none;" +
      "background:#000;color:#fff;font:600 13px/1 -apple-system,sans-serif;" +
      "padding:10px 16px;border-radius:999px;opacity:0;" +
      "transform:translate(-50%,-50%);transition:opacity 0.15s ease;" +
      "white-space:nowrap;";
    document.body.appendChild(pill);

    var dot = document.createElement("div");
    dot.style.cssText =
      "position:fixed;top:0;left:0;z-index:9998;pointer-events:none;" +
      "width:10px;height:10px;border-radius:50%;background:rgba(0,0,0,0.4);" +
      "opacity:0;transform:translate(-50%,-50%);transition:opacity 0.15s ease;";
    document.body.appendChild(dot);

    document.addEventListener("mousemove", function (e) {
      pill.style.left = e.clientX + "px";
      pill.style.top = e.clientY + "px";
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
    });

    targets.forEach(function (el) {
      var id = el.getAttribute("data-framer-cursor");
      if (id === "1xs2rsu") return;
      var label = CURSOR_LABELS[id];
      el.addEventListener("mouseenter", function () {
        if (label) {
          pill.textContent = label;
          pill.style.opacity = "1";
        } else {
          dot.style.opacity = "1";
        }
      });
      el.addEventListener("mouseleave", function () {
        pill.style.opacity = "0";
        dot.style.opacity = "0";
      });
    });
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

  document.addEventListener("DOMContentLoaded", function () {
    revealOnScroll();
    setupSlideshows();
    setupCustomCursor();
    setupCopyToClipboard();
    setupFloatingVideo();
    setTimeout(fixOverflowingNav, 700);
  });

  // The dev CMS renderer replaces [data-cms-region] innerHTML, which drops the
  // slideshow/reveal bindings inside those sections. Re-bind when it signals.
  document.addEventListener("cms:rendered", function () {
    revealOnScroll();
    setupSlideshows();
  });
})();
