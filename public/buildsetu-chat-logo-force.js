(function () {
  var LOGO_SRC = "/brand/login-page-build-sikhadenge-logo-clean.png";

  function textOf(el) {
    return ((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function findExactTextElement(targetText) {
    var all = Array.from(document.querySelectorAll("body *"));
    return all.find(function (el) {
      return textOf(el) === targetText;
    });
  }

  function fixHeader() {
    try {
      var subtitle = findExactTextElement("Project-wise live assistant");
      if (!subtitle) return false;

      var textBox = subtitle.parentElement;
      if (!textBox) return false;

      var parentRow = textBox.parentElement;
      if (!parentRow) return false;

      var titleFound = textOf(textBox).indexOf("BuildSetu AI") !== -1;
      var subtitleFound = textOf(textBox).indexOf("Project-wise live assistant") !== -1;
      if (!titleFound || !subtitleFound) return false;

      var icon = textBox.previousElementSibling;
      if (icon) {
        icon.style.display = "none";
      }

      textBox.innerHTML =
        '<img src="' + LOGO_SRC + '" alt="BuildSetu AI" style="height:34px;width:auto;max-width:170px;object-fit:contain;display:block;" />';

      textBox.style.display = "flex";
      textBox.style.alignItems = "center";
      textBox.style.justifyContent = "flex-start";
      textBox.style.minWidth = "0";
      textBox.style.lineHeight = "1";

      parentRow.style.alignItems = "center";
      parentRow.style.gap = "10px";

      return true;
    } catch (e) {
      return false;
    }
  }

  function runMany() {
    fixHeader();
    setTimeout(fixHeader, 100);
    setTimeout(fixHeader, 300);
    setTimeout(fixHeader, 700);
    setTimeout(fixHeader, 1200);
    setTimeout(fixHeader, 2500);
  }

  runMany();

  var timer = setInterval(fixHeader, 500);
  setTimeout(function () {
    clearInterval(timer);
  }, 20000);

  try {
    var observer = new MutationObserver(function () {
      fixHeader();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", runMany);
  window.addEventListener("load", runMany);
})();
