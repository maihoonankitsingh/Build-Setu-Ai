(function () {
  if (window.__buildsetuSafeLiveCreditsInstalled) return;
  window.__buildsetuSafeLiveCreditsInstalled = true;

  var BALANCE_API = "/api/credits/balance";
  var refreshTimer = null;

  var PLAN_LIMITS = {
    free: 3000,
    starter: 3000,
    basic: 3000,
    pro: 200000,
    studio: 500000,
    agency: 1000000,
    enterprise: 1000000
  };

  function parseNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    var clean = String(value).replace(/[^\d.-]/g, "");
    if (!clean) return null;
    var n = Number(clean);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }

  function formatIndian(value) {
    var n = parseNumber(value);
    return n === null ? "" : n.toLocaleString("en-IN");
  }

  function normalizePlan(value) {
    if (!value) return "";
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function extractCredits(data) {
    if (!data || typeof data !== "object") return null;

    var keys = [
      "credits",
      "balance",
      "creditsBalance",
      "creditBalance",
      "availableCredits",
      "remainingCredits",
      "walletCredits"
    ];

    for (var i = 0; i < keys.length; i++) {
      if (data[keys[i]] !== undefined) {
        var n = parseNumber(data[keys[i]]);
        if (n !== null) return n;
      }
    }

    var nested = ["user", "data", "wallet", "account", "result", "subscription", "plan"];
    for (var j = 0; j < nested.length; j++) {
      if (data[nested[j]] && typeof data[nested[j]] === "object") {
        var v = extractCredits(data[nested[j]]);
        if (v !== null) return v;
      }
    }

    return null;
  }

  function extractPlan(data) {
    if (!data || typeof data !== "object") return "";

    var keys = ["plan", "planName", "currentPlan", "subscriptionPlan", "tier", "package"];

    for (var i = 0; i < keys.length; i++) {
      if (typeof data[keys[i]] === "string" && data[keys[i]].trim()) {
        return normalizePlan(data[keys[i]]);
      }
    }

    var nested = ["user", "data", "wallet", "account", "result", "subscription", "plan"];
    for (var j = 0; j < nested.length; j++) {
      if (data[nested[j]] && typeof data[nested[j]] === "object") {
        var p = extractPlan(data[nested[j]]);
        if (p) return p;
      }
    }

    return "";
  }

  function findCreditCard() {
    var aside = document.querySelector("body aside:first-of-type");
    if (!aside) return null;

    var labels = Array.prototype.slice.call(aside.querySelectorAll("*")).filter(function (el) {
      return (el.textContent || "").trim() === "Available Credits";
    });

    if (!labels.length) return null;

    var node = labels[0];
    for (var i = 0; i < 10 && node; i++) {
      var text = node.textContent || "";
      if (text.indexOf("Available Credits") !== -1 && text.indexOf("Credits") !== -1) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  function getPlanFromCard(card) {
    var text = card ? card.textContent || "" : "";
    var known = text.match(/Plan:\s*(Free|Starter|Basic|Pro|Studio|Agency|Enterprise)/i);
    return known ? normalizePlan(known[1]) : "";
  }

  function getPlanLimit(plan, credits) {
    var key = normalizePlan(plan);
    if (PLAN_LIMITS[key]) return PLAN_LIMITS[key];
    if (credits <= 3000) return 3000;
    return Math.ceil(credits / 10000) * 10000;
  }

  function findCreditNumber(card) {
    var nodes = Array.prototype.slice.call(card.querySelectorAll("*"));
    var candidates = nodes.filter(function (el) {
      var txt = (el.textContent || "").trim();
      return /^\d[\d,]*$/.test(txt);
    });

    if (!candidates.length) return null;

    candidates.sort(function (a, b) {
      return (parseNumber(b.textContent) || 0) - (parseNumber(a.textContent) || 0);
    });

    return candidates[0];
  }

  function updateButtonText(card) {
    Array.prototype.slice.call(card.querySelectorAll("button, a")).forEach(function (el) {
      var txt = (el.textContent || "").trim();
      if (txt === "Buy More Credits" || txt === "Upgrade Plan") {
        el.textContent = "Upgrade";
      }
    });
  }

  function updateProgress(card, credits, limit) {
    var divs = Array.prototype.slice.call(card.querySelectorAll("div"));
    var bars = divs.filter(function (el) {
      var rect = el.getBoundingClientRect();
      return rect.width >= 80 && rect.height >= 3 && rect.height <= 12;
    });

    if (bars.length < 2) return;

    bars.sort(function (a, b) {
      return a.getBoundingClientRect().width - b.getBoundingClientRect().width;
    });

    var fill = bars[0];
    var percent = limit > 0 ? Math.max(0, Math.min(100, (credits / limit) * 100)) : 0;

    fill.style.width = percent + "%";
    fill.style.maxWidth = "100%";
    fill.style.transition = "width 220ms ease";
  }

  function updateCard(credits, apiPlan) {
    var card = findCreditCard();
    if (!card || credits === null) return;

    var plan = apiPlan || getPlanFromCard(card) || "free";
    var limit = getPlanLimit(plan, credits);

    var numberEl = findCreditNumber(card);
    if (numberEl) numberEl.textContent = formatIndian(credits);

    updateProgress(card, credits, limit);
    updateButtonText(card);

    card.setAttribute("data-buildsetu-credit-limit", String(limit));
    card.setAttribute("data-buildsetu-credit-plan", plan);
  }

  async function refreshCredits() {
    try {
      var res = await fetch(BALANCE_API + "?t=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) return;

      var data = await res.json();
      var credits = extractCredits(data);
      var plan = extractPlan(data);

      if (credits !== null) updateCard(credits, plan);
    } catch (e) {}
  }

  function scheduleRefresh(delay) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshCredits, delay || 250);
  }

  var originalFetch = window.fetch;
  if (originalFetch && !originalFetch.__buildsetuCreditsSafeWrapped) {
    var wrappedFetch = async function () {
      var input = arguments[0];
      var url = "";

      try {
        url = typeof input === "string" ? input : (input && input.url) || "";
      } catch (e) {}

      var response = await originalFetch.apply(this, arguments);

      if (
        /\/api\/credits\//.test(url) ||
        /\/api\/tools\/run/.test(url) ||
        /\/api\/ai\//.test(url) ||
        /\/api\/renders\//.test(url) ||
        /\/api\/boq\//.test(url) ||
        /\/api\/bbs\//.test(url)
      ) {
        scheduleRefresh(400);
        window.setTimeout(refreshCredits, 1400);
      }

      return response;
    };

    wrappedFetch.__buildsetuCreditsSafeWrapped = true;
    window.fetch = wrappedFetch;
  }

  window.addEventListener("focus", function () {
    scheduleRefresh(100);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) scheduleRefresh(100);
  });

  window.addEventListener("buildsetu:credits-refresh", function () {
    scheduleRefresh(100);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      scheduleRefresh(150);
    });
  } else {
    scheduleRefresh(150);
  }

  window.setInterval(refreshCredits, 15000);
})();
