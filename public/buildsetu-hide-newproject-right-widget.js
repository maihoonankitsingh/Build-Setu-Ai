(function () {
  function isNewProjectIntake() {
    return !!document.querySelector(".bsu-ai-intake-page") ||
      document.body.innerText.includes("Client Brief se AI Project Workspace");
  }

  function hideRightProjectWidget() {
    if (!isNewProjectIntake()) {
      document.documentElement.classList.remove("bsu-new-project-clean-mode");
      return;
    }

    document.documentElement.classList.add("bsu-new-project-clean-mode");

    var patterns = [
      "Project selected:",
      "Ask about selected project",
      "Project-wise chat saved",
      "Verify BOQ, BBS",
      "design ideas aur execution clarity"
    ];

    var nodes = Array.from(document.body.querySelectorAll("body *"));

    nodes.forEach(function (el) {
      if (!el || el.closest(".bsu-ai-intake-page")) return;

      var text = (el.innerText || el.textContent || "").trim();
      if (!text) return;

      var matched = patterns.some(function (pattern) {
        return text.indexOf(pattern) !== -1;
      });

      if (!matched) return;

      var rect = el.getBoundingClientRect();
      var style = window.getComputedStyle(el);

      if (
        rect.width >= 220 &&
        rect.height >= 80 &&
        rect.left > window.innerWidth * 0.52 &&
        (style.position === "fixed" ||
          style.position === "sticky" ||
          style.position === "absolute" ||
          style.position === "relative" ||
          style.position === "static")
      ) {
        el.setAttribute("data-bsu-hidden-new-project-widget", "1");
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
      }
    });
  }

  function boot() {
    hideRightProjectWidget();
    setTimeout(hideRightProjectWidget, 150);
    setTimeout(hideRightProjectWidget, 500);
    setTimeout(hideRightProjectWidget, 1200);

    var observer = new MutationObserver(function () {
      hideRightProjectWidget();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.addEventListener("resize", hideRightProjectWidget);
    window.addEventListener("popstate", hideRightProjectWidget);
    document.addEventListener("click", function () {
      setTimeout(hideRightProjectWidget, 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
