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

  function setupFloatingVideo() {
    document.querySelectorAll(".floating-video").forEach(function (box) {
      var video = box.querySelector("video");
      var btn = box.querySelector(".floating-video__play");
      if (!video || !btn) return;

      function start() {
        if (video.controls) return;
        video.controls = true;
        btn.style.display = "none";
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }

      box.addEventListener("click", function () {
        if (!video.controls) start();
      });

      video.addEventListener("ended", function () {
        video.controls = false;
        video.currentTime = 0;
        btn.style.display = "flex";
      });
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
})();
