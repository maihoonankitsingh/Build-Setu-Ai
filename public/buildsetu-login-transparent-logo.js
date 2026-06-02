(function () {
  if (window.__buildsetuLoginTransparentLogoFinalInstalled) return;
  window.__buildsetuLoginTransparentLogoFinalInstalled = true;

  var LOGO_SRC = "/brand/login-page-build-sikhadenge-logo-clean.png?v=20260528_124413";

  function isLoginPage() {
    return location.pathname.indexOf("/login") !== -1 ||
      !!document.querySelector('input[placeholder*="you@example.com"]');
  }

  function text(el) {
    return String((el && el.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function compact(el) {
    return text(el).replace(/\s+/g, "");
  }

  function rect(el) {
    try { return el.getBoundingClientRect(); }
    catch (e) { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; }
  }

  function hide(el) {
    if (!el || !el.style) return;
    el.setAttribute("data-bs-login-remove-upper-logo", "true");
    el.style.setProperty("display", "none", "important");
  }

  function findBadge() {
    return Array.prototype.slice.call(document.querySelectorAll("body *")).find(function (el) {
      return text(el) === "AI construction workspace";
    });
  }

  function findLeftPanel(badge) {
    var node = badge;

    while (node && node !== document.body) {
      var t = text(node);
      var r = rect(node);

      if (
        t.indexOf("Manage your design and construction workflow") !== -1 &&
        r.left < window.innerWidth * 0.56 &&
        r.width > 320
      ) return node;

      node = node.parentElement;
    }

    return null;
  }

  function removeOldInserted(leftPanel) {
    Array.prototype.slice.call(leftPanel.querySelectorAll(
      ".bs-login-transparent-logo-wrap, .bs-login-uploaded-logo-wrap, .bs-login-clean-brand-pill, .bs-login-brand-final, .bs-login-header-logo-pill, .bs-login-final-logo-wrap, .bs-login-powered-logo-wrap, .bs-login-direct-logo-wrap, .bs-login-left-logo-fixed-wrap, .bs-login-left-real-logo-wrap"
    )).forEach(function (el) {
      el.remove();
    });
  }

  function insertLogo(badge) {
    var wrap = document.createElement("div");
    wrap.className = "bs-login-transparent-logo-wrap";
    wrap.innerHTML = '<img class="bs-login-transparent-logo-img" src="' + LOGO_SRC + '" alt="BuildSetu AI powered by Sikhadenge" />';
    badge.parentElement.insertBefore(wrap, badge);
    return wrap;
  }

  function removeUpperDuplicate(leftPanel, badge, logoWrap) {
    var logoTop = rect(logoWrap).top;
    var badgeTop = rect(badge).top;
    var panelRect = rect(leftPanel);

    Array.prototype.slice.call(leftPanel.querySelectorAll("*")).forEach(function (el) {
      if (!el || !el.parentElement) return;
      if (el === badge || el.contains(badge)) return;
      if (el === logoWrap || el.contains(logoWrap) || logoWrap.contains(el)) return;

      var r = rect(el);
      var t = text(el);
      var c = compact(el);
      var hasImg = !!(el.querySelector && el.querySelector('img[src*="buildsetu"], img[src*="logo"], img[src*="brand"], img[src*="header"]'));
      var hasSvg = !!(el.querySelector && el.querySelector("svg"));

      var isTopArea = r.top < logoTop + 12 && r.bottom < badgeTop - 4;
      var safeSize = r.width >= 12 && r.width <= panelRect.width * 0.92 && r.height >= 8 && r.height <= 150;

      var isLogoLike =
        hasImg ||
        /Powered by Sikhadenge/i.test(t) ||
        c === "BuildSetuAI" ||
        c === "BuildSetu" ||
        c === "AI" ||
        c.indexOf("BuildSetu") !== -1 ||
        (hasSvg && r.width < 340 && r.height < 160);

      if (isTopArea && safeSize && isLogoLike) hide(el);
    });

    Array.prototype.slice.call(document.querySelectorAll("body *")).forEach(function (el) {
      if (!el || !el.parentElement) return;
      if (leftPanel.contains(el)) return;
      if (el === logoWrap || el.contains(logoWrap) || logoWrap.contains(el)) return;

      var r = rect(el);
      var t = text(el);
      var c = compact(el);
      var hasImg = !!(el.querySelector && el.querySelector('img[src*="buildsetu"], img[src*="logo"], img[src*="brand"], img[src*="header"]'));

      if (
        r.top > 35 &&
        r.top < badgeTop + 45 &&
        r.left > window.innerWidth * 0.16 &&
        r.left < window.innerWidth * 0.72 &&
        r.width > 30 &&
        r.width < 620 &&
        r.height > 10 &&
        r.height < 180 &&
        (
          hasImg ||
          /Powered by Sikhadenge/i.test(t) ||
          c.indexOf("BuildSetu") !== -1
        )
      ) {
        hide(el);
      }
    });
  }

  function apply() {
    if (!isLoginPage()) return false;

    var badge = findBadge();
    if (!badge || !badge.parentElement) return false;

    var leftPanel = findLeftPanel(badge);
    if (!leftPanel) return false;

    removeOldInserted(leftPanel);
    var logoWrap = insertLogo(badge);
    removeUpperDuplicate(leftPanel, badge, logoWrap);

    return true;
  }

  function boot() {
    apply();

    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var ok = apply();
      if (ok || tries >= 6) clearInterval(timer);
    }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
