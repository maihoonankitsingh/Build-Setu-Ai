(function () {
  if (window.__buildsetuRecentProjectsFinalInstalled) return;
  window.__buildsetuRecentProjectsFinalInstalled = true;

  function esc(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openProjects(projectName) {
    var url = new URL(window.location.href);
    url.searchParams.set("view", "projects");
    url.searchParams.set("project", projectName);
    window.location.href = url.pathname + url.search + url.hash;
  }

  function fallbackProjects() {
    return [
      { name: "59×71 east and north facing", type: "Residential House", image: "" },
      { name: "30×40 North Facing House", type: "Residential House", image: "" },
      { name: "Prisma visible project", type: "Interior", image: "" }
    ];
  }

  async function getProjects() {
    try {
      var res = await fetch("/api/projects/list?t=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) return fallbackProjects();

      var data = await res.json();
      var list = [];

      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.projects)) list = data.projects;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      else if (data.data && Array.isArray(data.data.projects)) list = data.data.projects;

      var seen = {};
      var projects = list
        .map(function (p) {
          return {
            name: p.name || p.title || p.projectName || p.slug || "",
            type: p.type || p.category || p.projectType || "Residential House",
            image: p.image || p.imageUrl || p.thumbnail || p.thumbnailUrl || p.coverImage || p.coverImageUrl || p.renderImage || p.renderImageUrl || p.previewImage || p.previewImageUrl || ""
          };
        })
        .filter(function (p) {
          if (!p.name) return false;
          var key = p.name.toLowerCase().trim();
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        })
        .slice(0, 3);

      return projects.length ? projects : fallbackProjects();
    } catch (e) {
      return fallbackProjects();
    }
  }

  function findRecentOuterSection() {
    var title = Array.prototype.slice.call(document.querySelectorAll("main *")).find(function (el) {
      return (el.textContent || "").trim() === "Recent Projects";
    });

    if (!title) return null;

    var best = null;
    var node = title;

    while (node && node !== document.body) {
      var text = node.textContent || "";
      var rect = node.getBoundingClientRect();

      var isRecent =
        text.indexOf("Recent Projects") !== -1 &&
        text.indexOf("View all projects") !== -1 &&
        (
          text.indexOf("59×71") !== -1 ||
          text.indexOf("30×40") !== -1 ||
          text.indexOf("Prisma") !== -1 ||
          text.indexOf("AI_DRAFT") !== -1
        );

      var isTooBig =
        text.indexOf("Projects by Stage") !== -1 ||
        text.indexOf("Monthly Activity") !== -1 ||
        text.indexOf("Credit Usage") !== -1 ||
        text.indexOf("Welcome back") !== -1;

      if (isRecent && !isTooBig && rect.width > 600 && rect.height > 120) {
        best = node;
      }

      node = node.parentElement;
    }

    return best;
  }

  function render(section, projects) {
    if (!section) return;

    section.classList.add("bs-recent-final-section");
    section.setAttribute("data-bs-recent-final", "true");

    section.innerHTML =
      '<div class="bs-recent-final-head">' +
        '<div>' +
          '<div class="bs-recent-final-title">Recent Projects</div>' +
          '<div class="bs-recent-final-subtitle">Latest client workspaces and project status.</div>' +
        '</div>' +
        '<button type="button" class="bs-recent-final-view">View all projects <span>→</span></button>' +
      '</div>' +
      '<div class="bs-recent-final-grid">' +
        projects.map(function (p) {
          return (
            '<button type="button" class="bs-recent-final-card" data-project-name="' + esc(p.name) + '" style="--bs-recent-bg: url(\'' + esc(p.image || "") + '\');">' +
              '<div class="bs-recent-final-name">' + esc(p.name) + '</div>' +
              '<div class="bs-recent-final-type">' + esc(p.type) + '</div>' +
              '<div class="bs-recent-final-foot">' +
                '<span class="bs-recent-final-badge">AI_DRAFT</span>' +
                '<span class="bs-recent-final-open">Open →</span>' +
              '</div>' +
            '</button>'
          );
        }).join("") +
      '</div>';

    var viewBtn = section.querySelector(".bs-recent-final-view");
    if (viewBtn) {
      viewBtn.addEventListener("click", function () {
        var url = new URL(window.location.href);
        url.searchParams.set("view", "projects");
        window.location.href = url.pathname + url.search + url.hash;
      });
    }

    Array.prototype.slice.call(section.querySelectorAll("[data-project-name]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        openProjects(btn.getAttribute("data-project-name"));
      });
    });
  }

  async function init() {
    var section = findRecentOuterSection();
    if (!section) return;

    var projects = await getProjects();
    render(section, projects);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var count = 0;
  var timer = setInterval(function () {
    count++;
    init();
    if (count > 20 || document.querySelector("[data-bs-recent-final='true']")) {
      clearInterval(timer);
    }
  }, 300);
})();
