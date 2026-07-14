(function () {
  "use strict";

  var token = new URLSearchParams(location.search).get("token") || "";
  var state = {
    stories: [], events: [], registry: null, stats: null, selected: null,
    repo: null, autonomy: null, distribution: {counts: {}, items: []}, taskTimer: null
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }
  function api(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({"X-RTFCL-Token": token}, opts.headers || {});
    if (opts.body && typeof opts.body !== "string" && !(opts.body instanceof ArrayBuffer)) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(path, opts).then(async function (response) {
      var text = await response.text(), value = {};
      try { value = text ? JSON.parse(text) : {}; }
      catch (_) { throw new Error("The local server returned an unreadable response."); }
      if (!response.ok) throw new Error(value.error || ("Request failed: " + response.status));
      return value;
    });
  }
  function toast(message, error) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.className = "toast" + (error ? " error" : "");
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.hidden = true; }, 6000);
  }
  function when(iso) {
    if (!iso) return "";
    var date = new Date(iso), ms = Date.now() - date.getTime();
    if (!Number.isFinite(ms)) return String(iso);
    if (ms < 60000) return "just now";
    if (ms < 3600000) return Math.floor(ms / 60000) + "m ago";
    if (ms < 86400000) return Math.floor(ms / 3600000) + "h ago";
    return date.toLocaleString();
  }
  function money(value) { return "$" + Number(value || 0).toFixed(2); }
  function statusClass(status) {
    if (status === "published" || status === "sent" || status === "succeeded") return "published";
    if (status === "awaiting-approval" || status === "owner-review" || status === "held") return "approval";
    if (status === "blocked" || status === "failed") return "blocked";
    return "";
  }

  async function refresh() {
    try {
      var values = await Promise.all([
        api("/api/stats"), api("/api/stories"), api("/api/events"),
        api("/api/registry"), api("/api/repository"), api("/api/autonomy"),
        api("/api/distribution")
      ]);
      state.stats = values[0];
      state.stories = values[1].stories || [];
      state.events = values[2].events || [];
      state.registry = values[3];
      state.repo = values[4];
      state.autonomy = values[5];
      state.distribution = values[6];
      renderStats(); renderAutonomy(); renderStories(); renderEvents(); renderDistribution(); fillPersonas();
      if (state.selected) {
        if (state.stories.some(function (story) { return story.id === state.selected; })) {
          await selectStory(state.selected);
        } else clearDetail();
      }
    } catch (error) { toast(error.message, true); }
  }

  function renderStats() {
    var stats = state.stats || {}, auto = state.autonomy || {};
    var cards = [
      [stats.agent_count || 0, "canonical agents"],
      [stats.stories || 0, "newsroom stories"],
      [stats.awaiting_approval || 0, "awaiting approval"],
      [stats.published || 0, "published"],
      [auto.mode || "—", "autonomy mode"],
      [state.repo && state.repo.ok ? (state.repo.dirty ? "DIRTY" : "CLEAN") : "—", "git workspace"]
    ];
    document.getElementById("statusGrid").innerHTML = cards.map(function (card) {
      return '<div class="stat"><b>' + esc(card[0]) + '</b><span>' + esc(card[1]) + '</span></div>';
    }).join("");
  }

  function renderAutonomy() {
    var auto = state.autonomy || {}, schedule = auto.schedule || {}, providers = auto.providers || {};
    var budget = auto.budget || {}, distribution = auto.distribution_counts || {};
    document.getElementById("autoMode").textContent = auto.mode || "—";
    document.getElementById("autoSchedule").textContent = schedule.enabled ? ("scheduled every " + schedule.interval_minutes + "m") : "schedule disabled";
    document.getElementById("autoProviders").textContent = (providers.available || []).join(" + ") || "none";
    document.getElementById("autoCredentials").textContent = "OpenAI " + (providers.openai_configured ? "ready" : "off") + " · Gemini " + (providers.gemini_configured ? "ready" : "off");
    document.getElementById("autoDailyBudget").textContent = money(budget.remaining_daily) + " left";
    document.getElementById("autoDailySpend").textContent = money(budget.daily_spend) + " of " + money(budget.daily_limit) + " spent";
    document.getElementById("autoMonthlyBudget").textContent = money(budget.remaining_monthly) + " left";
    document.getElementById("autoMonthlySpend").textContent = money(budget.monthly_spend) + " of " + money(budget.monthly_limit) + " spent";
    document.getElementById("autoToday").textContent = (auto.stories_created_today || 0) + " stories";
    document.getElementById("autoPublishes").textContent = (auto.publishes_today || 0) + " public releases";
    var totalDistribution = Object.keys(distribution).reduce(function (total, key) { return total + Number(distribution[key] || 0); }, 0);
    document.getElementById("autoDistribution").textContent = totalDistribution + " items";
    document.getElementById("autoDistributionDetail").textContent = Object.keys(distribution).map(function (key) { return key + " " + distribution[key]; }).join(" · ") || "empty";

    var cycles = (auto.cycle_history || []).slice(0, 8);
    var strip = document.getElementById("cycleStrip");
    if (!cycles.length) {
      strip.innerHTML = '<div class="cycle-empty">No autonomy cycles have run on this installation.</div>';
      return;
    }
    strip.innerHTML = cycles.map(function (cycle) {
      return '<div class="cycle-card"><div><span class="tag ' + statusClass(cycle.status) + '">' + esc(cycle.status) + '</span><b>' + esc(cycle.mode) + '</b></div><small>' + esc(when(cycle.started_at)) + ' · ' + esc(cycle.selected_count || 0) + ' selected · ' + esc(money(cycle.actual_cost_usd)) + '</small></div>';
    }).join("");
  }

  function renderStories() {
    var list = document.getElementById("storyList");
    document.getElementById("storyCount").textContent = state.stories.length;
    if (!state.stories.length) {
      list.innerHTML = '<div class="empty-state compact"><p>No newsroom records yet.</p></div>';
      return;
    }
    list.innerHTML = state.stories.map(function (story) {
      return '<button class="story-card ' + (state.selected === story.id ? "active" : "") + '" data-story="' + esc(story.id) + '"><h3>' + esc(story.title) + '</h3><div class="meta-row"><span class="tag ' + statusClass(story.status) + '">' + esc(story.status) + '</span><span class="tag">CP ' + esc(story.current_checkpoint) + '</span><span class="tag">' + esc(story.persona_id) + '</span></div><small>' + esc(when(story.updated_at)) + '</small></button>';
    }).join("");
    list.querySelectorAll("[data-story]").forEach(function (button) {
      button.addEventListener("click", function () { selectStory(button.dataset.story); });
    });
  }

  function renderEvents() {
    var el = document.getElementById("eventList");
    if (!state.events.length) { el.innerHTML = '<div class="event"><p>No events yet.</p></div>'; return; }
    el.innerHTML = state.events.map(function (event) {
      var payload = event.payload || {};
      var detail = payload.title || payload.release_id || payload.checkpoint_id || payload.slug || payload.decision || payload.error || "";
      return '<div class="event"><b>' + esc(event.event_type) + '</b><p>' + esc(detail) + '</p><time>' + esc(when(event.created_at)) + '</time></div>';
    }).join("");
  }

  function renderDistribution() {
    var value = state.distribution || {counts: {}, items: []}, items = value.items || [];
    document.getElementById("distributionCount").textContent = items.length;
    var el = document.getElementById("distributionList");
    if (!items.length) { el.innerHTML = '<div class="empty-state compact"><p>No channel packages are queued.</p></div>'; return; }
    el.innerHTML = items.slice(0, 40).map(function (item) {
      var payload = item.payload || {};
      var preview = payload.text || payload.caption || payload.subject || "Prepared channel package";
      return '<div class="distribution-row"><div><b>' + esc(item.channel) + '</b><span class="tag ' + statusClass(item.status) + '">' + esc(item.status) + '</span></div><p>' + esc(String(preview).slice(0, 190)) + '</p><small>' + esc(when(item.created_at)) + (item.error ? " · " + esc(item.error) : "") + '</small></div>';
    }).join("");
  }

  async function selectStory(id) {
    try {
      state.selected = id; renderStories();
      var story = await api("/api/stories/" + encodeURIComponent(id));
      renderDetail(story);
    } catch (error) { toast(error.message, true); }
  }
  function clearDetail() {
    state.selected = null;
    document.getElementById("emptyState").hidden = false;
    document.getElementById("storyDetail").hidden = true;
    renderStories();
  }

  function renderDetail(story) {
    var container = document.getElementById("storyDetail");
    document.getElementById("emptyState").hidden = true;
    container.hidden = false;
    var checkpoint = Number(story.current_checkpoint), releases = story.releases || [];
    var readyRelease = releases.find(function (release) { return release.status === "ready"; });
    var actions = [];
    if (story.origin === "fixture-demo" && checkpoint < 9) actions.push('<button data-action="fixture" class="accent">Run next fixture checkpoint</button>');
    if (story.status === "awaiting-approval" && story.publishable) {
      actions.push('<button data-action="approve" class="primary">Owner approve exact draft</button>');
      actions.push('<button data-action="reject" class="danger">Reject</button>');
    }
    if (story.status === "packaging") actions.push('<button data-action="package" class="accent">Build release package</button>');
    if (readyRelease) actions.push('<button data-action="publish" class="danger">Publish to production</button>');

    var policy = (story.policy_decisions || [])[0];
    var policyHtml = policy ? '<div class="gate-note"><b>Deterministic policy: ' + esc(policy.decision) + '</b><br>' + esc((policy.reason_codes || []).join(" · ") || "All configured release criteria passed") + '<br><small>Policy ' + esc(policy.policy_version) + ' · exact draft ' + esc(String(policy.artifact_sha256 || "").slice(0, 12)) + '</small></div>' : '';
    var timeline = (state.registry && state.registry.checkpoints || []).map(function (cp) {
      var cls = cp.number < checkpoint ? "done" : (cp.number === checkpoint ? "current" : "");
      return '<div class="timeline-row ' + cls + '"><div class="timeline-num">' + cp.number + '</div><div class="timeline-copy"><b>' + esc(cp.name) + '</b><span>' + esc(cp.owner) + '</span></div></div>';
    }).join("");
    var sources = (story.sources || []).map(function (source) {
      return '<div class="source-card"><b>' + esc(source.label) + '</b><a href="' + esc(source.url) + '" target="_blank" rel="noreferrer">' + esc(source.url) + '</a><p>' + esc(source.source_class) + (source.publisher ? " · " + esc(source.publisher) : "") + '</p></div>';
    }).join("") || '<p class="muted">No sources recorded.</p>';
    var claims = (story.claims || []).map(function (claim) {
      return '<div class="source-card"><b>' + esc(claim.status) + '</b><p>' + esc(claim.text) + '</p></div>';
    }).join("") || '<p class="muted">No claim map persisted yet.</p>';
    var artifacts = (story.artifacts || []).map(function (artifact) {
      return '<details class="artifact-card"><summary>CP ' + esc(artifact.checkpoint) + ' · ' + esc(artifact.agent_id) + ' · v' + esc(artifact.version) + ' · ' + esc(String(artifact.sha256).slice(0, 12)) + '</summary><pre>' + esc(JSON.stringify(artifact.content, null, 2)) + '</pre></details>';
    }).join("") || '<p class="muted">No artifacts yet.</p>';

    container.innerHTML = '<div class="detail-wrap"><div class="meta-row"><span class="tag ' + statusClass(story.status) + '">' + esc(story.status) + '</span><span class="tag">' + esc(story.section) + '</span><span class="tag">' + esc(story.automation_mode) + '</span><span class="tag">risk ' + esc(story.risk_level) + '</span></div><h2 class="detail-title">' + esc(story.title) + '</h2><p class="detail-dek">' + esc(story.dek || story.brief) + '</p><div class="detail-actions">' + actions.join("") + '</div>' + policyHtml + '<h3 class="section-title">Workflow</h3><div class="timeline">' + timeline + '</div><h3 class="section-title">Sources</h3><form id="sourceForm" class="mini-form"><input name="label" placeholder="Source label" required><input name="url" type="url" placeholder="https://…" required><button class="ghost">Add source</button></form><div class="stack">' + sources + '</div><h3 class="section-title">Claims</h3><div class="stack">' + claims + '</div><h3 class="section-title">Artifacts</h3>' + artifacts + '</div>';

    container.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () { storyAction(story, button.dataset.action); });
    });
    var sourceForm = document.getElementById("sourceForm");
    sourceForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        var data = Object.fromEntries(new FormData(sourceForm).entries());
        await api("/api/stories/" + encodeURIComponent(story.id) + "/sources", {method: "POST", body: data});
        sourceForm.reset(); toast("Source added"); await refresh();
      } catch (error) { toast(error.message, true); }
    });
  }

  async function storyAction(story, action) {
    try {
      if (action === "fixture") await api("/api/stories/" + story.id + "/run-fixture", {method: "POST", body: {}});
      else if (action === "approve") {
        var approver = prompt("Approver name", "0baak"); if (!approver) return;
        var note = prompt("Approval note (optional)", "Reviewed exact draft and source record") || "";
        await api("/api/stories/" + story.id + "/approve", {method: "POST", body: {approver: approver, note: note}});
      } else if (action === "reject") {
        var rejection = prompt("Reason for rejection"); if (!rejection) return;
        await api("/api/stories/" + story.id + "/reject", {method: "POST", body: {approver: "0baak", note: rejection}});
      } else if (action === "package") await api("/api/stories/" + story.id + "/package", {method: "POST", body: {}});
      else if (action === "publish") {
        document.getElementById("publishSlugInput").value = "";
        document.getElementById("publishForm").dataset.story = story.id;
        document.getElementById("publishForm").dataset.slug = story.slug;
        document.getElementById("publishDialog").showModal(); return;
      }
      toast("Story updated"); await refresh();
    } catch (error) { toast(error.message, true); }
  }

  function fillPersonas() {
    if (!state.registry) return;
    var select = document.getElementById("personaSelect");
    if (select.options.length) return;
    state.registry.agents.filter(function (agent) { return agent.class === "persona"; }).forEach(function (agent) {
      var option = document.createElement("option"); option.value = agent.id; option.textContent = agent.name + " — " + (agent.beat || ""); select.appendChild(option);
    });
  }

  function renderRegistry() {
    var body = document.getElementById("registryBody");
    if (!state.registry) return;
    var checkpoints = '<div class="checkpoint-strip">' + state.registry.checkpoints.map(function (cp) { return '<div class="checkpoint"><b>' + cp.number + '</b><span>' + esc(cp.name) + '<br>' + esc(cp.owner) + '</span></div>'; }).join("") + '</div>';
    var agents = '<div class="registry-grid">' + state.registry.agents.map(function (agent) { return '<div class="agent-card"><h3>' + esc(agent.name) + '</h3><p>' + esc(agent.responsibility) + '</p><span class="tag">' + esc(agent.class) + '</span><span class="tag">' + esc(agent.capability_profile) + '</span></div>'; }).join("") + '</div>';
    body.innerHTML = checkpoints + agents;
  }

  function openTask(taskId, title) {
    var dialog = document.getElementById("taskDialog"), log = document.getElementById("taskLog"), result = document.getElementById("taskResult");
    document.getElementById("taskTitle").textContent = title || "Working";
    log.textContent = "Starting…"; result.innerHTML = ""; dialog.showModal();
    if (state.taskTimer) clearInterval(state.taskTimer);
    async function poll() {
      try {
        var task = await api("/api/tasks/" + encodeURIComponent(taskId));
        log.textContent = (task.logs || []).join("\n") || "Working…"; log.scrollTop = log.scrollHeight;
        if (task.status !== "running") {
          clearInterval(state.taskTimer); state.taskTimer = null;
          result.innerHTML = task.status === "succeeded" ? '<div class="gate-note"><b>Completed</b><pre>' + esc(JSON.stringify(task.result, null, 2)) + '</pre></div>' : '<div class="gate-note danger-text"><b>Stopped safely</b><p>' + esc(task.error || "Unknown error") + '</p></div>';
          await refresh();
        }
      } catch (error) { clearInterval(state.taskTimer); state.taskTimer = null; toast(error.message, true); }
    }
    poll(); state.taskTimer = setInterval(poll, 1500);
  }

  document.getElementById("refreshBtn").addEventListener("click", refresh);
  document.getElementById("newBtn").addEventListener("click", function () { document.getElementById("newDialog").showModal(); });
  document.getElementById("importBtn").addEventListener("click", function () { document.getElementById("importFile").click(); });
  document.getElementById("releaseManagerBtn").addEventListener("click", async function () { try { await api("/api/tools/release-manager", {method: "POST", body: {}}); toast("Release Manager opened"); } catch (error) { toast(error.message, true); } });
  document.getElementById("configureBtn").addEventListener("click", async function () { try { await api("/api/autonomy/configure", {method: "POST", body: {}}); toast("Configuration window opened on this PC"); } catch (error) { toast(error.message, true); } });
  document.getElementById("demoBtn").addEventListener("click", async function () { try { var story = await api("/api/demo", {method: "POST", body: {}}); state.selected = story.id; toast("Non-publishable demo completed"); await refresh(); } catch (error) { toast(error.message, true); } });
  document.getElementById("runDraftBtn").addEventListener("click", async function () { try { var task = await api("/api/autonomy/run", {method: "POST", body: {allow_publish: false, dry_run: false}}); openTask(task.task_id, "Cost-optimized batch cycle"); } catch (error) { toast(error.message, true); } });
  document.getElementById("runBoundedBtn").addEventListener("click", function () { document.getElementById("allowPublishCheck").checked = false; document.getElementById("autonomyConfirmLabel").hidden = true; document.getElementById("autonomyConfirmInput").value = ""; document.getElementById("autonomyDialog").showModal(); });
  document.getElementById("allowPublishCheck").addEventListener("change", function () { document.getElementById("autonomyConfirmLabel").hidden = !this.checked; });
  document.getElementById("dispatchBtn").addEventListener("click", async function () { try { var result = await api("/api/autonomy/dispatch", {method: "POST", body: {limit: 20}}); toast("Distribution pass completed: " + JSON.stringify(result.result)); await refresh(); } catch (error) { toast(error.message, true); } });
  document.getElementById("toggleRegistry").addEventListener("click", function () { var body = document.getElementById("registryBody"); body.hidden = !body.hidden; this.textContent = body.hidden ? "Show registry" : "Hide registry"; if (!body.hidden) renderRegistry(); });
  document.getElementById("closeTaskBtn").addEventListener("click", function () { if (state.taskTimer) clearInterval(state.taskTimer); state.taskTimer = null; document.getElementById("taskDialog").close(); });

  document.getElementById("newForm").addEventListener("submit", async function (event) {
    if (event.submitter && event.submitter.value === "cancel") return;
    event.preventDefault();
    try { var data = Object.fromEntries(new FormData(event.currentTarget).entries()); var story = await api("/api/stories", {method: "POST", body: data}); document.getElementById("newDialog").close(); event.currentTarget.reset(); state.selected = story.id; toast("Candidate created"); await refresh(); } catch (error) { toast(error.message, true); }
  });
  document.getElementById("importFile").addEventListener("change", async function () {
    var file = this.files && this.files[0]; if (!file) return;
    try { var data = await file.arrayBuffer(); var story = await api("/api/import", {method: "POST", headers: {"Content-Type": "application/octet-stream", "X-Filename": file.name}, body: data}); state.selected = story.id; toast("Story package imported"); await refresh(); } catch (error) { toast(error.message, true); } finally { this.value = ""; }
  });
  document.getElementById("publishForm").addEventListener("submit", async function (event) {
    if (event.submitter && event.submitter.value === "cancel") return;
    event.preventDefault();
    var form = event.currentTarget, slug = form.dataset.slug, typed = document.getElementById("publishSlugInput").value.trim();
    if (typed !== slug) { toast("Slug confirmation does not match", true); return; }
    try { var task = await api("/api/stories/" + encodeURIComponent(form.dataset.story) + "/publish", {method: "POST", body: {confirm_slug: typed}}); document.getElementById("publishDialog").close(); openTask(task.task_id, "Publishing approved story"); } catch (error) { toast(error.message, true); }
  });
  document.getElementById("autonomyForm").addEventListener("submit", async function (event) {
    if (event.submitter && event.submitter.value === "cancel") return;
    event.preventDefault();
    var allow = document.getElementById("allowPublishCheck").checked;
    var confirm = document.getElementById("autonomyConfirmInput").value.trim();
    if (allow && confirm !== "RUN BOUNDED AUTOPILOT") { toast("Bounded cycle confirmation does not match", true); return; }
    try { var task = await api("/api/autonomy/run", {method: "POST", body: {allow_publish: allow, confirm: confirm, dry_run: false}}); document.getElementById("autonomyDialog").close(); openTask(task.task_id, allow ? "Configured bounded cycle" : "Configured review cycle"); } catch (error) { toast(error.message, true); }
  });

  refresh();
  setInterval(function () { if (!document.hidden && !state.taskTimer) refresh(); }, 15000);
}());
