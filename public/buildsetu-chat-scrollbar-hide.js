(function () {
  function txt(el) {
    return ((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function findChatCard() {
    var input = Array.from(document.querySelectorAll("input, textarea")).find(function (el) {
      return ((el.getAttribute("placeholder") || "") === "Ask about selected project...");
    });

    if (!input) {
      input = Array.from(document.querySelectorAll("body *")).find(function (el) {
        return txt(el).indexOf("Ask about selected project") !== -1;
      });
    }

    if (!input) return null;

    var node = input;
    for (var i = 0; i < 12 && node; i++) {
      var t = txt(node);
      if (
        t.indexOf("PROJECT") !== -1 &&
        t.indexOf("Clear") !== -1 &&
        t.indexOf("Project-wise chat saved") !== -1
      ) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  function hideScrollbarOnlyInsideChat() {
    var card = findChatCard();
    if (!card) return;

    card.classList.add("buildsetu-chat-scrollbar-hidden-only");
  }

  function ensureStyle() {
    if (document.getElementById("buildsetu-chat-scrollbar-hidden-only-style")) return;

    var style = document.createElement("style");
    style.id = "buildsetu-chat-scrollbar-hidden-only-style";
    style.textContent = `
      .buildsetu-chat-scrollbar-hidden-only,
      .buildsetu-chat-scrollbar-hidden-only * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      .buildsetu-chat-scrollbar-hidden-only::-webkit-scrollbar,
      .buildsetu-chat-scrollbar-hidden-only *::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    ensureStyle();
    hideScrollbarOnlyInsideChat();
  }

  run();
  setTimeout(run, 100);
  setTimeout(run, 500);
  setTimeout(run, 1200);
  setTimeout(run, 2500);

  try {
    var observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
})();
