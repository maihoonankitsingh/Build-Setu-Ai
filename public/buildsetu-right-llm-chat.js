
/* BUILDSETU_SYNC_BRAIN_START */
(function () {
  function clean(el) {
    return ((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function findInput() {
    return Array.from(document.querySelectorAll("textarea, input")).find(function (el) {
      return (el.getAttribute("placeholder") || "").indexOf("Ask about selected project") !== -1;
    });
  }

  function getProjectTitle() {
    try {
      var input = findInput();
      var card = input;
      for (var i = 0; i < 16 && card; i++) {
        var t = clean(card);
        if (t.indexOf("PROJECT") !== -1 && t.indexOf("Clear") !== -1) break;
        card = card.parentElement;
      }

      if (card) {
        var select = card.querySelector("select");
        if (select && select.options && select.selectedIndex >= 0) {
          return clean(select.options[select.selectedIndex]);
        }

        var all = Array.from(card.querySelectorAll("*"));
        var match = all.find(function (el) {
          var t = clean(el);
          return t.length > 5 && t.length < 90 && /(facing|east|west|north|south|×|x|house|plot)/i.test(t);
        });

        if (match) return clean(match);
      }
    } catch (e) {}

    return "selected project";
  }

  function reply(raw) {
    raw = String(raw || window.__BUILDSETU_LAST_CHAT_INPUT__ || "").trim();
    var msg = raw.toLowerCase();
    var project = getProjectTitle();

    if (!raw || msg === "hi" || msg === "hello" || msg === "hey" || msg === "hii" || msg === "hy" || msg === "namaste" || msg === "bhai") {
      return "Haan bhai, main BuildSetu AI assistant hoon.\n\nMain selected project ke context me baat karunga.\n\nProject: " + project + "\n\nAap mujhe batao is project me pehle kya banana hai:\n1. Floor plan direction\n2. BOQ estimate\n3. BBS / steel draft\n4. Interior design idea\n5. Exterior elevation idea\n6. Client proposal / PDF\n\nAap simple language me likho, main step-by-step guide karunga.";
    }

    if (/floor|plan|layout|naksha|working plan|ghar ka plan/.test(msg)) {
      return "Samjha bhai. Is project ke liye floor plan direction banana hai.\n\nProject: " + project + "\n\nPehle ye details confirm karo:\n1. Total floors kitne chahiye?\n2. Ground floor me rooms kya-kya chahiye?\n3. First floor me rooms kya-kya chahiye?\n4. Parking car ke liye chahiye ya bike?\n5. Staircase internal chahiye ya external?\n6. Vastu strict follow karna hai ya practical layout priority hai?\n\nIske baad main room placement aur planning logic dunga.";
    }

    if (/boq|estimate|cost|budget|rate|quantity|material/.test(msg)) {
      return "BOQ estimate ke liye main project-wise draft banaunga.\n\nProject: " + project + "\n\nMujhe ye data chahiye:\n1. Approx built-up area\n2. Floors count\n3. Quality: basic / standard / premium\n4. City/location\n5. Civil only ya electrical/plumbing/finishing bhi include?\n6. Labour included chahiye ya material only?\n\nPhir main BOQ sections bana dunga.";
    }

    if (/bbs|steel|bar|beam|column|slab|rcc|reinforcement|footing/.test(msg)) {
      return "BBS / steel draft ke liye safe workflow ye hai.\n\nProject: " + project + "\n\nMujhe structural inputs chahiye:\n1. Column schedule hai kya?\n2. Beam schedule hai kya?\n3. Slab reinforcement detail known hai?\n4. Footing type known hai?\n5. Steel grade aur concrete grade known hai?\n\nMain BBS table aur missing-input checklist bana sakta hoon. Final BBS engineer se verify hoga.";
    }

    if (/interior|living|bedroom|kitchen|furniture|false ceiling|wardrobe|color|colour/.test(msg)) {
      return "Interior design ke liye main pehle concept direction banaunga.\n\nProject: " + project + "\n\nMujhe ye details bhejo:\n1. Room type\n2. Room size\n3. Style: modern / luxury / minimal / Indian\n4. Color/material preference\n5. Budget level\n6. Furniture/storage requirement\n\nRender image chahiye hoga to image generation tool use hoga.";
    }

    if (/exterior|elevation|front|facade|building look|modern look/.test(msg)) {
      return "Exterior elevation ke liye main concept direction bana sakta hoon.\n\nProject: " + project + "\n\nMujhe ye details chahiye:\n1. Front width\n2. Floors count\n3. Balcony chahiye ya nahi\n4. Gate/boundary wall chahiye?\n5. Material preference: wood / stone / glass / tiles\n6. Day view ya night lighting view?\n\nPhir main 3 options dunga.";
    }

    if (/proposal|client|pdf|agreement|presentation|quotation|document/.test(msg)) {
      return "Client proposal ke liye main project-wise draft banaunga.\n\nProject: " + project + "\n\nProposal structure:\n1. Project brief\n2. Scope of work\n3. Deliverables\n4. Timeline\n5. Payment terms\n6. Revision policy\n7. Exclusions\n8. Disclaimer\n9. Next steps\n\nClient name, project value aur scope bhejo.";
    }

    return "Samjha bhai. Main selected project ke context me answer dunga.\n\nProject: " + project + "\n\nAapka message: " + raw + "\n\nIsko kis output me convert karna hai?\n1. Floor plan direction\n2. BOQ estimate\n3. BBS draft\n4. Interior idea\n5. Exterior elevation\n6. Client proposal";
  }

  function capture() {
    var input = findInput();
    if (input) window.__BUILDSETU_LAST_CHAT_INPUT__ = String(input.value || "").trim();
  }

  document.addEventListener("input", capture, true);
  document.addEventListener("keydown", capture, true);
  document.addEventListener("click", capture, true);

  window.BuildSetuSyncBrainReply = reply;
})();
/* BUILDSETU_SYNC_BRAIN_END */


(function () {
  if (window.__buildsetuForceRightProjectChat) return;
  window.__buildsetuForceRightProjectChat = true;

  var state = {
    projects: [],
    selectedProject: null,
    sending: false,
    menuOpen: false
  };

  function key(v) {
    return String(v || "workspace")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  }

  function esc(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function projectKey(p) {
    return key((p && (p.id || p.projectId || p.name || p.title)) || "workspace");
  }

  function storeKey(p) {
    return "buildsetu:right-project-chat:" + projectKey(p);
  }

  function loadMessages(p) {
    try {
      var raw = localStorage.getItem(storeKey(p));
      var data = raw ? JSON.parse(raw) : null;
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveMessages(p, messages) {
    try {
      localStorage.setItem(storeKey(p), JSON.stringify(messages.slice(-100)));
    } catch (e) {}
  }

  function defaultMessages(p) {
    var name = p && p.name ? p.name : "selected project";
    return [
      {
        role: "assistant",
        content:
          "Project selected: " + name + ".\nDesigner aur engineer yahan project planning, BOQ, BBS, proposal, material planning, design ideas aur execution clarity ke liye chat kar sakte hain."
      }
    ];
  }

  function findPanel() {
    var asides = Array.prototype.slice.call(document.querySelectorAll("aside"));

    for (var i = 0; i < asides.length; i++) {
      var t = asides[i].textContent || "";
      if (
        asides[i].classList.contains("bs-ai-panel") ||
        t.indexOf("AI Assistant") !== -1 ||
        t.indexOf("Generate BOQ") !== -1 ||
        t.indexOf("Generate BBS") !== -1 ||
        t.indexOf("Project Proposal") !== -1 ||
        t.indexOf("Ask anything") !== -1
      ) {
        return asides[i];
      }
    }

    return null;
  }

  async function fetchProjects() {
    try {
      var res = await fetch("/api/projects/list?t=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) return [];

      var data = await res.json();
      var list = [];

      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.projects)) list = data.projects;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      else if (data.data && Array.isArray(data.data.projects)) list = data.data.projects;
      else if (data.result && Array.isArray(data.result.projects)) list = data.result.projects;

      var seen = {};
      return list
        .map(function (p) {
          return {
            id: p.id || p.projectId || p.slug || p.name || p.title,
            name: p.name || p.title || p.projectName || p.slug || "Untitled project"
          };
        })
        .filter(function (p) {
          var k = projectKey(p);
          if (!p.name || seen[k]) return false;
          seen[k] = true;
          return true;
        })
        .slice(0, 3);
    } catch (e) {
      return [];
    }
  }

  function fallbackProjects() {
    return [
      { id: "59x71-east-and-north-facing", name: "59×71 east and north facing" },
      { id: "30x40-north-facing-house", name: "30×40 North Facing House" },
      { id: "prisma-visible-project", name: "Prisma visible project" }
    ];
  }

  function renderProjectMenu(panel) {
    var current = panel.querySelector("[data-bs-ai-current]");
    var menu = panel.querySelector("[data-bs-ai-menu]");
    if (!current || !menu) return;

    var selected = state.selectedProject || state.projects[0];
    current.textContent = selected ? selected.name : "Select project";

    menu.innerHTML = state.projects.map(function (p) {
      var active = projectKey(p) === projectKey(selected) ? " is-active" : "";
      return (
        '<button type="button" class="bs-ai-project-option' + active + '" data-project="' + esc(projectKey(p)) + '">' +
        '<span>' + esc(p.name) + '</span>' +
        '</button>'
      );
    }).join("");

    menu.style.display = state.menuOpen ? "grid" : "none";

    Array.prototype.slice.call(menu.querySelectorAll("[data-project]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-project");
        var found = state.projects.find(function (p) { return projectKey(p) === k; });
        if (found) {
          state.selectedProject = found;
          try {
            localStorage.setItem("buildsetu:selected-right-project", projectKey(found));
          } catch (e) {}
        }

        state.menuOpen = false;
        renderProjectMenu(panel);
        renderMessages(panel);
      });
    });
  }

  function msgHtml(m) {
    var role = m.role === "user" ? "user" : "assistant";
    var loading = m.loading ? " bs-ai-msg-loading" : "";
    return '<div class="bs-ai-msg bs-ai-msg-' + role + loading + '">' + esc(m.content).replace(/\n/g, "<br>") + "</div>";
  }

  function renderMessages(panel) {
    var box = panel.querySelector("[data-bs-ai-messages]");
    if (!box) return;

    var messages = loadMessages(state.selectedProject);
    if (!messages.length) {
      messages = defaultMessages(state.selectedProject);
      saveMessages(state.selectedProject, messages);
    }

    box.innerHTML = messages.map(msgHtml).join("");
    box.scrollTop = box.scrollHeight;
  }

  async function askAI(text, history) {
    var p = state.selectedProject || { id: "workspace", name: "Workspace chat" };

    try {
      var res = await fetch("/api/tools/run", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          tool: "project-assistant",
          mode: "project-chat",
          projectId: p.id,
          projectName: p.name,
          message: text,
          history: history.slice(-16),
          instruction:
            "You are BuildSetu AI, a real-time project collaboration assistant for designers and engineers. Reply in concise Hinglish. Help with floor planning, BOQ, BBS, proposal, material planning, interior/exterior ideas and execution next steps."
        })
      });

      if (res.ok) {
        var data = await res.json();
        var answer =
          data.answer ||
          data.message ||
          data.output ||
          data.result ||
          data.text ||
          (data.data && (data.data.answer || data.data.message || data.data.output));

        if (answer && String(answer).trim()) return String(answer).trim();
      }
    } catch (e) {}

    return window.BuildSetuSyncBrainReply ? window.BuildSetuSyncBrainReply(window.__BUILDSETU_LAST_CHAT_INPUT__ || "") : "Haan bhai, main BuildSetu AI assistant hoon. Aap project requirement batao.";
  }

  function resizeInput(input) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 116) + "px";
  }

  function build(panel) {
    if (!panel) return;

    panel.setAttribute("data-bs-force-right-chat", "true");
    panel.classList.add("bs-ai-panel");

    panel.innerHTML = `
      <div class="bs-ai-top">
        <div class="bs-ai-brand">
          <div class="bs-ai-dot"></div>
          <div>
            <div class="bs-ai-title">BuildSetu AI</div>
            <div class="bs-ai-subtitle">Project-wise live assistant</div>
          </div>
        </div>
        <button type="button" class="bs-ai-clear" data-bs-ai-clear>Clear</button>
      </div>

      <div class="bs-ai-projectbar">
        <div class="bs-ai-project-label">Project</div>
        <button type="button" class="bs-ai-project-trigger" data-bs-ai-trigger>
          <span data-bs-ai-current>Select project</span>
          <span class="bs-ai-chevron" aria-hidden="true"></span>
        </button>
        <div class="bs-ai-project-menu" data-bs-ai-menu></div>
      </div>

      <div class="bs-ai-messages" data-bs-ai-messages></div>

      <form class="bs-ai-form" data-bs-ai-form>
        <textarea class="bs-ai-input" data-bs-ai-input rows="1" placeholder="Ask about selected project..."></textarea>
        <button type="submit" class="bs-ai-send" aria-label="Send">➤</button>
      </form>

      <div class="bs-ai-note">Project-wise chat saved in this browser. Verify BOQ, BBS, legal and structural outputs.</div>
    `;

    var trigger = panel.querySelector("[data-bs-ai-trigger]");
    var menu = panel.querySelector("[data-bs-ai-menu]");
    var input = panel.querySelector("[data-bs-ai-input]");
    var form = panel.querySelector("[data-bs-ai-form]");
    var clear = panel.querySelector("[data-bs-ai-clear]");

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      state.menuOpen = !state.menuOpen;
      renderProjectMenu(panel);
    });

    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", function () {
      if (state.menuOpen) {
        state.menuOpen = false;
        renderProjectMenu(panel);
      }
    });

    input.addEventListener("input", function () {
      resizeInput(input);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });

    clear.addEventListener("click", function () {
      var fresh = defaultMessages(state.selectedProject);
      saveMessages(state.selectedProject, fresh);
      renderMessages(panel);
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (state.sending) return;

      var text = input.value.trim();
      if (!text) return;

      state.sending = true;
      input.value = "";
      resizeInput(input);

      var messages = loadMessages(state.selectedProject);
      if (!messages.length) messages = defaultMessages(state.selectedProject);

      messages.push({ role: "user", content: text });
      messages.push({ role: "assistant", content: "Thinking...", loading: true });
      saveMessages(state.selectedProject, messages);
      renderMessages(panel);

      var answer = await askAI(text, messages.filter(function (m) { return !m.loading; }));

      messages = loadMessages(state.selectedProject);
      for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].loading) {
          messages[i] = { role: "assistant", content: answer };
          break;
        }
      }

      saveMessages(state.selectedProject, messages);
      renderMessages(panel);
      state.sending = false;
    });
  }

  async function init() {
    var panel = findPanel();
    if (!panel) return;

    if (panel.getAttribute("data-bs-force-right-chat") !== "true") {
      build(panel);
    }

    var apiProjects = await fetchProjects();
    state.projects = apiProjects.length ? apiProjects : fallbackProjects();

    var saved = "";
    try {
      saved = localStorage.getItem("buildsetu:selected-right-project") || "";
    } catch (e) {}

    state.selectedProject =
      state.projects.find(function (p) { return projectKey(p) === saved; }) ||
      state.projects[0];

    renderProjectMenu(panel);
    renderMessages(panel);
  }

  function boot() {
    init();

    var count = 0;
    var timer = setInterval(function () {
      count++;
      var panel = findPanel();
      if (panel && panel.getAttribute("data-bs-force-right-chat") !== "true") {
        init();
      }
      if (count > 30) clearInterval(timer);
    }, 400);

    if (document.body) {
      var observer = new MutationObserver(function () {
        var panel = findPanel();
        if (panel && panel.getAttribute("data-bs-force-right-chat") !== "true") {
          init();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


/* BUILDSETU_CHAT_HEADER_LOGIN_LOGO_PATCH_START */
(function () {
  function fixBuildSetuChatHeaderLogo() {
    try {
      var nodes = Array.from(document.querySelectorAll("*"));
      var subtitle = nodes.find(function (el) {
        return (el.textContent || "").trim() === "Project-wise live assistant";
      });

      if (!subtitle) return;

      var textBox = subtitle.parentElement;
      var headerLeft = textBox && textBox.parentElement;
      if (!headerLeft) return;

      headerLeft.innerHTML =
        '<img src="/brand/login-page-build-sikhadenge-logo-clean.png" alt="BuildSetu AI" style="height:42px;width:auto;max-width:190px;object-fit:contain;display:block;" />';

      headerLeft.style.display = "flex";
      headerLeft.style.alignItems = "center";
      headerLeft.style.minWidth = "0";
    } catch (e) {}
  }

  fixBuildSetuChatHeaderLogo();
  setTimeout(fixBuildSetuChatHeaderLogo, 300);
  setTimeout(fixBuildSetuChatHeaderLogo, 900);
  document.addEventListener("DOMContentLoaded", fixBuildSetuChatHeaderLogo);
})();
/* BUILDSETU_CHAT_HEADER_LOGIN_LOGO_PATCH_END */


/* BUILDSETU_CHAT_HEADER_FORCE_LOGIN_LOGO_20260528_213533 */
(function(){var s=document.createElement("script");s.src="/buildsetu-chat-logo-force.js?v=20260528_213533";s.defer=true;document.head.appendChild(s);})();
