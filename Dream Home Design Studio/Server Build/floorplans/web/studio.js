(function () {
  "use strict";

  var NAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} ()+,-]{0,78}[\p{L}\p{N})])?$/u;

  var plansList = document.getElementById("plans");
  var emptyState = document.getElementById("plans-empty");
  var message = document.getElementById("message");
  var form = document.getElementById("new-plan-form");
  var nameInput = document.getElementById("new-plan-name");
  var newButton = document.getElementById("new-plan-button");
  var cancelButton = document.getElementById("new-plan-cancel");

  function normalizeName(value) {
    return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  }

  function editorUrl(name) {
    return "editor.jsp?home=" + encodeURIComponent(name);
  }

  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("error", !!isError);
    message.hidden = !text;
  }

  function formatDate(ms) {
    var date = new Date(ms);
    var now = new Date();
    var sameDay = date.toDateString() === now.toDateString();
    var time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (sameDay) {
      return "Today, " + time;
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ", " + time;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function post(action, name) {
    var body = new URLSearchParams();
    body.set("action", action);
    body.set("name", name);
    return fetch("api/projects", {
      method: "POST",
      headers: { "X-Studio-Request": "fetch" },
      body: body
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || ("Request failed (" + response.status + ")"));
        }
        return data;
      });
    });
  }

  function makeButton(label, onClick) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderPlans(projects) {
    plansList.textContent = "";
    projects.forEach(function (project) {
      var item = document.createElement("li");
      item.className = "plan";

      var open = document.createElement(project.openable ? "a" : "div");
      open.className = "plan-open";
      if (project.openable) {
        open.href = editorUrl(project.name);
      }
      var name = document.createElement("div");
      name.className = "plan-name";
      name.textContent = project.name;
      var meta = document.createElement("div");
      meta.className = "plan-meta";
      meta.textContent = formatDate(project.modified) + " · " + formatSize(project.size);
      open.appendChild(name);
      open.appendChild(meta);
      if (!project.openable) {
        var warning = document.createElement("div");
        warning.className = "plan-warning";
        warning.textContent = "Rename this file on the Butterfly Drive (letters, numbers, spaces and hyphens only) to open it here.";
        open.appendChild(warning);
      }
      item.appendChild(open);

      if (project.openable) {
        var actions = document.createElement("div");
        actions.className = "plan-actions";
        var openButton = document.createElement("a");
        openButton.className = "button primary";
        openButton.href = editorUrl(project.name);
        openButton.textContent = "Open";
        actions.appendChild(openButton);
        actions.appendChild(makeButton("Duplicate", function (event) {
          var button = event.currentTarget;
          button.disabled = true;
          post("duplicate", project.name).then(function (data) {
            showMessage("Made a copy called “" + data.name + "”.");
            return loadPlans();
          }).catch(function (error) {
            showMessage(error.message, true);
          }).then(function () {
            button.disabled = false;
          });
        }));
        var download = document.createElement("a");
        download.className = "button";
        download.href = "api/download?name=" + encodeURIComponent(project.name);
        download.setAttribute("download", project.name + ".sh3d");
        download.textContent = "Download";
        actions.appendChild(download);
        item.appendChild(actions);
      }
      plansList.appendChild(item);
    });
    emptyState.hidden = projects.length > 0;
    plansList.setAttribute("aria-busy", "false");
  }

  function loadPlans() {
    return fetch("api/projects", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load plans (" + response.status + ")");
        return response.json();
      })
      .then(function (data) { renderPlans(data.projects || []); })
      .catch(function (error) { showMessage(error.message, true); });
  }

  function loadConfig() {
    return fetch("api/config", { cache: "no-store" })
      .then(function (response) { return response.json(); })
      .then(function (config) {
        var host = location.hostname;
        var desktops = { "tool-freecad": config.freecadPort, "tool-blender": config.blenderPort, "tool-qgis": config.qgisPort };
        Object.keys(desktops).forEach(function (id) {
          document.getElementById(id).href = "https://" + host + ":" + desktops[id] + "/";
        });
        if (config.driveUrl) {
          var drive = document.getElementById("tool-drive");
          drive.href = config.driveUrl;
          drive.hidden = false;
        }
      })
      .catch(function () { /* tool links stay inert */ });
  }

  newButton.addEventListener("click", function () {
    form.hidden = false;
    newButton.hidden = true;
    showMessage("");
    nameInput.focus();
  });

  cancelButton.addEventListener("click", function () {
    form.hidden = true;
    newButton.hidden = false;
    form.reset();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = normalizeName(nameInput.value);
    if (!NAME_PATTERN.test(name)) {
      showMessage("Use letters, numbers, spaces, hyphens, commas, plus signs or brackets (up to 80 characters).", true);
      nameInput.focus();
      return;
    }
    var submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    post("create", name).then(function (data) {
      location.href = editorUrl(data.name);
    }).catch(function (error) {
      showMessage(error.message, true);
      submit.disabled = false;
    });
  });

  // Coming back from the editor with the browser Back button can show a
  // cached page; refresh the list whenever the page becomes visible again.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) loadPlans();
  });

  loadConfig();
  loadPlans();
})();
