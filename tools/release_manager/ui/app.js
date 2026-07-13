"use strict";

const token = document.querySelector('meta[name="rtfc-token"]').content;
const state = {
  package: null,
  taskId: null,
  repositoryReady: false,
  logCount: 0,
  taskLogIndex: 0,
};

const els = {
  systemStatus: document.getElementById("systemStatus"),
  systemStatusTitle: document.getElementById("systemStatusTitle"),
  systemStatusDetail: document.getElementById("systemStatusDetail"),
  dropZone: document.getElementById("dropZone"),
  packageInput: document.getElementById("packageInput"),
  packageSummary: document.getElementById("packageSummary"),
  releaseTitle: document.getElementById("releaseTitle"),
  releaseId: document.getElementById("releaseId"),
  articleCount: document.getElementById("articleCount"),
  fileCount: document.getElementById("fileCount"),
  packageSize: document.getElementById("packageSize"),
  createdAt: document.getElementById("createdAt"),
  articleList: document.getElementById("articleList"),
  commitMessage: document.getElementById("commitMessage"),
  publishButton: document.getElementById("publishButton"),
  openFolderButton: document.getElementById("openFolderButton"),
  activityLog: document.getElementById("activityLog"),
  liveLink: document.getElementById("liveLink"),
  confirmModal: document.getElementById("confirmModal"),
  modalRelease: document.getElementById("modalRelease"),
  confirmReleaseId: document.getElementById("confirmReleaseId"),
  confirmReleaseInput: document.getElementById("confirmReleaseInput"),
  cancelPublishButton: document.getElementById("cancelPublishButton"),
  confirmPublishButton: document.getElementById("confirmPublishButton"),
};

function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-RTFC-Token", token);
  return fetch(path, { ...options, headers }).then(async (response) => {
    const payload = await response.json().catch(() => ({ ok: false, error: "Invalid local service response." }));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }
    return payload;
  });
}

function log(message, type = "normal", label = null) {
  const row = document.createElement("p");
  if (type === "error") row.classList.add("is-error");
  if (type === "success") row.classList.add("is-success");
  const time = document.createElement("time");
  time.textContent = label || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const copy = document.createElement("span");
  copy.textContent = message;
  row.append(time, copy);
  if (state.logCount === 0) els.activityLog.textContent = "";
  els.activityLog.appendChild(row);
  els.activityLog.scrollTop = els.activityLog.scrollHeight;
  state.logCount += 1;
}

function setStep(step, status) {
  const node = document.querySelector(`[data-step="${step}"]`);
  if (!node) return;
  node.classList.toggle("is-active", status === "active");
  node.classList.toggle("is-done", status === "done");
}

function setCheck(name, status) {
  const node = document.querySelector(`[data-check="${name}"]`);
  if (!node) return;
  node.classList.remove("is-good", "is-running", "is-bad");
  if (status) node.classList.add(`is-${status}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function refreshStatus() {
  try {
    const payload = await api("/api/status");
    const repo = payload.repository;
    if (!repo.ok) throw new Error(repo.error || "Repository check failed.");
    state.repositoryReady = repo.branch === "main" && !repo.dirty;
    els.systemStatus.classList.toggle("is-good", state.repositoryReady);
    els.systemStatus.classList.toggle("is-bad", !state.repositoryReady);
    els.systemStatusTitle.textContent = state.repositoryReady ? "Production repository ready" : "Repository needs attention";
    const sync = repo.ahead || repo.behind ? ` · ${repo.ahead || 0} ahead / ${repo.behind || 0} behind` : "";
    els.systemStatusDetail.textContent = `${repo.branch} · ${repo.head} · ${repo.dirty ? "uncommitted changes" : "clean"}${sync}`;
    setCheck("repo", state.repositoryReady ? "good" : "bad");
    updatePublishButton();
  } catch (error) {
    els.systemStatus.classList.add("is-bad");
    els.systemStatusTitle.textContent = "Local service unavailable";
    els.systemStatusDetail.textContent = error.message;
    log(error.message, "error");
  }
}

async function uploadPackage(file) {
  if (!file) return;
  state.package = null;
  updatePublishButton();
  els.dropZone.classList.add("is-loading");
  setStep("package", "active");
  setStep("validate", "active");
  setCheck("manifest", "running");
  setCheck("routes", "running");
  log(`Inspecting ${file.name}…`);
  try {
    const payload = await api("/api/package", {
      method: "POST",
      headers: {
        "Content-Type": "application/zip",
        "X-RTFC-Filename": file.name,
      },
      body: file,
    });
    state.package = payload.package;
    renderPackage(payload.package);
    setStep("package", "done");
    setStep("validate", "done");
    setStep("publish", "active");
    setCheck("manifest", "good");
    setCheck("routes", "good");
    setCheck("rollback", null);
    setCheck("deploy", null);
    log(`Package verified: ${payload.package.file_count} file(s), ${payload.package.article_count} article(s).`, "success");
  } catch (error) {
    setCheck("manifest", "bad");
    setCheck("routes", "bad");
    log(error.message, "error");
    window.alert(`Release package rejected:\n\n${error.message}`);
  } finally {
    els.dropZone.classList.remove("is-loading");
    els.packageInput.value = "";
    updatePublishButton();
  }
}

function renderPackage(pkg) {
  els.packageSummary.classList.remove("is-hidden");
  els.releaseTitle.textContent = pkg.title;
  els.releaseId.textContent = pkg.release_id;
  els.articleCount.textContent = String(pkg.article_count);
  els.fileCount.textContent = String(pkg.file_count);
  els.packageSize.textContent = formatBytes(pkg.total_bytes);
  els.createdAt.textContent = formatDate(pkg.created_at);
  els.commitMessage.textContent = pkg.commit_message;
  els.articleList.textContent = "";
  pkg.articles.forEach((article, index) => {
    const card = document.createElement("article");
    card.className = "article-card";
    const number = document.createElement("span");
    number.className = "article-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = article.title;
    const meta = document.createElement("small");
    meta.textContent = `${article.id} · /${article.slug}`;
    content.append(title, meta);
    card.append(number, content);
    els.articleList.appendChild(card);
  });
}

function updatePublishButton() {
  els.publishButton.disabled = !(state.package && state.repositoryReady && !state.taskId);
}

function showConfirmation() {
  if (!state.package) return;
  els.modalRelease.textContent = `${state.package.release_id} · ${state.package.article_count} article(s) · ${state.package.commit_message}`;
  els.confirmReleaseId.textContent = state.package.release_id;
  els.confirmReleaseInput.value = "";
  els.confirmPublishButton.disabled = true;
  els.confirmModal.classList.remove("is-hidden");
  window.setTimeout(() => els.confirmReleaseInput.focus(), 50);
}

function hideConfirmation() {
  els.confirmModal.classList.add("is-hidden");
  els.confirmReleaseInput.value = "";
  els.confirmPublishButton.disabled = true;
}

async function startPublish() {
  if (!state.package) return;
  const confirmedReleaseId = els.confirmReleaseInput.value.trim();
  if (confirmedReleaseId !== state.package.release_id) {
    window.alert("The release ID does not match. Nothing was published.");
    return;
  }
  hideConfirmation();
  els.publishButton.disabled = true;
  els.confirmPublishButton.disabled = true;
  setStep("publish", "active");
  setCheck("rollback", "running");
  setCheck("deploy", null);
  log(`Owner approved release ${state.package.release_id}.`);
  try {
    const payload = await api("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: state.package.package_id,
        confirm_release_id: confirmedReleaseId,
      }),
    });
    state.taskId = payload.task_id;
    state.logCount = 0;
    state.taskLogIndex = 0;
    els.activityLog.textContent = "";
    pollTask();
  } catch (error) {
    state.taskId = null;
    els.confirmPublishButton.disabled = false;
    log(error.message, "error");
    updatePublishButton();
  }
}

async function pollTask() {
  if (!state.taskId) return;
  try {
    const payload = await api(`/api/task?id=${encodeURIComponent(state.taskId)}`);
    const task = payload.task;
    while (state.taskLogIndex < task.logs.length) {
      const line = task.logs[state.taskLogIndex];
      state.taskLogIndex += 1;
      const isError = line.includes("ERROR:") || line.includes("WARNING:");
      log(line.replace(/^\[[^\]]+\]\s*/, ""), isError ? "error" : "normal", line.slice(1, 9));
    }
    const joined = task.logs.join("\n");
    if (joined.includes("Backup saved")) setCheck("rollback", "good");
    if (joined.includes("Waiting for Cloudflare") || joined.includes("Cloudflare deployment")) setCheck("deploy", "running");

    if (task.status === "running") {
      window.setTimeout(pollTask, 850);
      return;
    }
    state.taskId = null;
    els.confirmPublishButton.disabled = false;
    if (task.status === "succeeded") {
      setStep("publish", "done");
      setStep("confirm", task.result.deployed ? "done" : "active");
      setCheck("rollback", "good");
      setCheck("deploy", task.result.deployed ? "good" : "running");
      els.liveLink.href = task.result.live_url;
      els.liveLink.classList.remove("is-disabled");
      log(
        task.result.deployed
          ? `Release ${task.result.release_id} is live on rtfclmgzn.com.`
          : `Release ${task.result.release_id} was pushed; Cloudflare confirmation is still pending.`,
        "success"
      );
      if (task.result.deployed) {
        window.open(task.result.live_url, "_blank", "noopener");
      }
      await refreshStatus();
    } else {
      setStep("publish", "active");
      setCheck("rollback", "good");
      setCheck("deploy", "bad");
      log(task.error || "Publishing failed.", "error");
      window.alert(`Release failed:\n\n${task.error || "Unknown error"}\n\nLocal files were restored when possible.`);
      await refreshStatus();
    }
    updatePublishButton();
  } catch (error) {
    log(error.message, "error");
    window.setTimeout(pollTask, 1500);
  }
}

els.packageInput.addEventListener("change", () => uploadPackage(els.packageInput.files[0]));
els.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.dropZone.classList.add("is-dragging");
});
els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("is-dragging"));
els.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  els.dropZone.classList.remove("is-dragging");
  uploadPackage(event.dataTransfer.files[0]);
});
els.publishButton.addEventListener("click", showConfirmation);
els.cancelPublishButton.addEventListener("click", hideConfirmation);
els.confirmReleaseInput.addEventListener("input", () => {
  els.confirmPublishButton.disabled = !(state.package && els.confirmReleaseInput.value.trim() === state.package.release_id);
});
els.confirmPublishButton.addEventListener("click", startPublish);
els.confirmModal.addEventListener("click", (event) => {
  if (event.target === els.confirmModal) hideConfirmation();
});
els.openFolderButton.addEventListener("click", () => {
  api("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch((error) => log(error.message, "error"));
});

refreshStatus();
