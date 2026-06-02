(function () {
  var pending = null;

  function textOf(el) {
    return ((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function findInput() {
    return Array.from(document.querySelectorAll("textarea, input")).find(function (el) {
      return (el.getAttribute("placeholder") || "").indexOf("Ask about selected project") !== -1;
    });
  }

  function findChatCard() {
    var input = findInput();
    if (!input) return null;

    var node = input;
    for (var i = 0; i < 18 && node; i++) {
      var t = textOf(node);
      if (t.indexOf("PROJECT") !== -1 && t.indexOf("Clear") !== -1) return node;
      node = node.parentElement;
    }

    return null;
  }

  function getProjectTitle() {
    var card = findChatCard();
    if (!card) return "selected project";

    var select = card.querySelector("select");
    if (select && select.options && select.selectedIndex >= 0) {
      return textOf(select.options[select.selectedIndex]).replace(/^PROJECT\s+/i, "").trim();
    }

    var found = Array.from(card.querySelectorAll("*")).find(function (el) {
      var t = textOf(el);
      return t.length > 5 && t.length < 90 && /(facing|east|west|north|south|×|x|house|plot)/i.test(t);
    });

    return found ? textOf(found).replace(/^PROJECT\s+/i, "").trim() : "selected project";
  }

  function projectId() {
    return "project-" + getProjectTitle()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90);
  }

  function snapshot(card) {
    var set = new WeakSet();
    Array.from(card.querySelectorAll("*")).forEach(function (el) {
      if (textOf(el)) set.add(el);
    });
    return set;
  }

  function replaceLatestAssistant(before, userText, reply) {
    var card = findChatCard();
    if (!card || !reply) return false;

    var candidates = Array.from(card.querySelectorAll("*")).filter(function (el) {
      var t = textOf(el);
      if (!t || t.length < 12 || t.length > 4000) return false;
      if (el.querySelector("textarea, input, button, select")) return false;
      if (t === userText) return false;
      if (t.indexOf("PROJECT") === 0) return false;
      if (t.indexOf("Project-wise chat saved") !== -1) return false;

      return !before.has(el) ||
        t.indexOf("Isko kis output me convert karna hai") !== -1 ||
        t.indexOf("Pehle ye details confirm karo") !== -1 ||
        t.indexOf("BBS / steel draft ke liye safe workflow") !== -1 ||
        t.indexOf("Samjha bhai. Main selected project") !== -1;
    });

    if (!candidates.length) return false;

    var target = candidates[candidates.length - 1];
    target.textContent = reply;
    target.style.whiteSpace = "pre-wrap";
    return true;
  }

  async function callBrain(userText) {
    var res = await fetch("/api/project-chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        projectId: projectId(),
        projectTitle: getProjectTitle(),
        message: userText,
        persist: true
      })
    });

    var data = await res.json().catch(function () { return null; });
    if (res.ok && data && data.ok && data.reply) return String(data.reply);
    return "";
  }

  async function handleSend() {
    var input = findInput();
    var card = findChatCard();
    if (!input || !card) return;

    var userText = String(input.value || "").trim();
    if (!userText) return;

    var before = snapshot(card);
    pending = { userText: userText, before: before, at: Date.now() };

    try {
      var reply = await callBrain(userText);
      if (!reply) return;

      setTimeout(function () { replaceLatestAssistant(before, userText, reply); }, 80);
      setTimeout(function () { replaceLatestAssistant(before, userText, reply); }, 250);
      setTimeout(function () { replaceLatestAssistant(before, userText, reply); }, 600);
      setTimeout(function () { replaceLatestAssistant(before, userText, reply); }, 1200);
      setTimeout(function () { replaceLatestAssistant(before, userText, reply); }, 2200);
    } catch (e) {}
  }

  document.addEventListener("keydown", function (e) {
    var input = findInput();
    if (!input || e.target !== input) return;

    if (e.key === "Enter" && !e.shiftKey) {
      handleSend();
    }
  }, true);

  document.addEventListener("click", function (e) {
    var input = findInput();
    if (!input) return;

    var button = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!button) return;
    if (textOf(button).toLowerCase().indexOf("clear") !== -1) return;

    var node = button;
    for (var i = 0; i < 8 && node; i++) {
      if (node.contains(input)) {
        handleSend();
        break;
      }
      node = node.parentElement;
    }
  }, true);

  try {
    var observer = new MutationObserver(function () {
      if (!pending || Date.now() - pending.at > 6000) return;
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (e) {}
})();
