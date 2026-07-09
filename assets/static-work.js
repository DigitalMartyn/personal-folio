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

  document.addEventListener("DOMContentLoaded", function () {
    revealOnScroll();
    setupSlideshows();
  });
})();
