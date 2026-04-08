import * as vscode from "vscode";
import { ParticipantStore, Participant } from "./participantStore";
import { Section } from "./sectionsLoader";
import { WebhookReporter } from "./webhookReporter";

export class WorkshopPanel {
  private panel: vscode.WebviewPanel;
  private store: ParticipantStore;
  private sections: Section[];
  private reporter: WebhookReporter;
  private onDispose: () => void;
  private progressChangedEmitter = new vscode.EventEmitter<void>();
  readonly onProgressChanged = this.progressChangedEmitter.event;

  constructor(
    context: vscode.ExtensionContext,
    store: ParticipantStore,
    sections: Section[],
    onDispose: () => void
  ) {
    this.store    = store;
    this.sections = sections;
    this.reporter = new WebhookReporter();
    this.onDispose = onDispose;

    this.panel = vscode.window.createWebviewPanel(
      "workshopTracker",
      "Workshop Tracker",
      vscode.ViewColumn.Two,
      {
        enableScripts:       true,
        retainContextWhenHidden: true
      }
    );

    this.panel.onDidDispose(() => {
      this.progressChangedEmitter.dispose();
      onDispose();
    });

    this.panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg));

    this.render();
    this.initGitHubIdentity();
  }

  reveal() { this.panel.reveal(); }

  refresh() { this.render(); }

  refreshSections(sections: Section[]) {
    this.sections = sections;
    this.render();
  }

  // ── Message handler ──────────────────────────────────────────

  private async handleMessage(msg: any) {
    switch (msg.type) {

      case "saveIdentity": {
        await this.store.saveParticipant({
          name:  msg.name,
          email: msg.email
        });
        break;
      }

      case "sectionToggle": {
        const section = this.sections.find(s => s.id === msg.sectionId);
        if (!section) break;

        const action: "completed" | "unchecked" = msg.checked ? "completed" : "unchecked";

        if (msg.checked) {
          await this.store.markCompleted(msg.sectionId);
        } else {
          await this.store.markUncompleted(msg.sectionId);
        }

        this.progressChangedEmitter.fire();

        // Fire-and-forget POST to Google Sheets
        const participant = this.store.getParticipant();
        await this.reporter.report({
          participant,
          section,
          action,
          codespace: WebhookReporter.getCodespaceName(),
          workshop:  ""  // resolved inside reporter from config
        });

        // Update progress bar without full re-render
        const completed = this.store.getCompletedCount();
        const total     = this.sections.length;
        this.panel.webview.postMessage({
          type: "progressUpdate",
          completed,
          total
        });
        break;
      }

      case "resetProgress": {
        await this.store.resetProgress();
        this.progressChangedEmitter.fire();
        this.render();
        break;
      }
    }
  }

  // ── GitHub identity init ─────────────────────────────────────

  private async initGitHubIdentity() {
    const gh = await this.store.tryFetchGitHubIdentity();
    if (gh.user) {
      this.panel.webview.postMessage({
        type:        "githubIdentity",
        githubUser:  gh.user,
        githubEmail: gh.email
      });
    }
  }

  // ── HTML render ──────────────────────────────────────────────

  private render() {
    const participant = this.store.getParticipant();
    const completed   = this.store.getCompleted();
    const total       = this.sections.length;
    const doneCount   = completed.length;

    const sectionsJson = JSON.stringify(
      this.sections.map(s => ({
        ...s,
        done: completed.includes(s.id)
      }))
    );

    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workshop Tracker</title>
<style>
  :root {
    --bg:        var(--vscode-editor-background);
    --fg:        var(--vscode-editor-foreground);
    --border:    var(--vscode-panel-border);
    --input-bg:  var(--vscode-input-background);
    --input-fg:  var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
    --btn-bg:    var(--vscode-button-background);
    --btn-fg:    var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --accent:    var(--vscode-focusBorder);
    --success:   #4caf50;
    --card-bg:   var(--vscode-editorWidget-background);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size:   var(--vscode-font-size);
    color: var(--fg);
    background: var(--bg);
    padding: 20px;
    max-width: 680px;
    margin: 0 auto;
  }

  h1 { font-size: 1.3em; margin-bottom: 4px; }
  .subtitle { opacity: 0.6; font-size: 0.85em; margin-bottom: 20px; }

  /* Progress bar */
  .progress-wrap {
    background: var(--border);
    border-radius: 6px;
    height: 8px;
    margin-bottom: 6px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background: var(--success);
    border-radius: 6px;
    transition: width 0.4s ease;
  }
  .progress-label {
    font-size: 0.8em;
    opacity: 0.7;
    margin-bottom: 20px;
    text-align: right;
  }

  /* Identity card */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }
  .card h2 { font-size: 1em; margin-bottom: 12px; opacity: 0.8; }
  .field { margin-bottom: 10px; }
  .field label { display: block; font-size: 0.8em; opacity: 0.7; margin-bottom: 4px; }
  .field input {
    width: 100%;
    padding: 6px 10px;
    background: var(--input-bg);
    color: var(--input-fg);
    border: 1px solid var(--input-border, var(--border));
    border-radius: 4px;
    font-size: 0.95em;
  }
  .field input:focus { outline: 1px solid var(--accent); }
  .gh-hint { font-size: 0.78em; opacity: 0.55; margin-top: 6px; }

  /* Save button */
  .btn {
    padding: 6px 14px;
    background: var(--btn-bg);
    color: var(--btn-fg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    margin-top: 4px;
  }
  .btn:hover { background: var(--btn-hover); }
  .btn.ghost {
    background: transparent;
    color: var(--fg);
    border: 1px solid var(--border);
    opacity: 0.6;
    font-size: 0.8em;
  }
  .btn.ghost:hover { opacity: 1; }
  .saved-flash { font-size: 0.8em; color: var(--success); margin-left: 8px; opacity: 0; transition: opacity 0.3s; }
  .saved-flash.show { opacity: 1; }

  /* Sections */
  .sections-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .sections-header h2 { font-size: 1em; opacity: 0.8; }

  .section-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .section-item:hover { border-color: var(--accent); }
  .section-item.done { opacity: 0.65; }
  .section-item.done .section-title { text-decoration: line-through; }

  .section-check {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: var(--success);
    cursor: pointer;
    flex-shrink: 0;
  }

  .section-body { flex: 1; }
  .section-number { font-size: 0.75em; opacity: 0.5; }
  .section-title  { font-size: 0.95em; font-weight: 500; margin-bottom: 2px; }
  .section-desc   { font-size: 0.8em; opacity: 0.6; }

  .done-badge {
    font-size: 0.75em;
    background: var(--success);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
    align-self: center;
  }

  .footer { margin-top: 24px; text-align: center; opacity: 0.4; font-size: 0.75em; }
</style>
</head>
<body>

<h1>🧩 Workshop Tracker</h1>
<p class="subtitle">Track your progress through the workshop sections</p>

<!-- Progress -->
<div class="progress-wrap">
  <div class="progress-bar" id="progressBar"
       style="width: ${total ? Math.round((doneCount/total)*100) : 0}%"></div>
</div>
<div class="progress-label" id="progressLabel">
  ${doneCount} of ${total} sections completed
</div>

<!-- Identity -->
<div class="card">
  <h2>👤 Your Details</h2>
  <div class="field">
    <label>Name</label>
    <input id="inputName" type="text" placeholder="Your full name"
           value="${escapeHtml(participant.name)}" />
  </div>
  <div class="field">
    <label>Email</label>
    <input id="inputEmail" type="email" placeholder="your@email.com"
           value="${escapeHtml(participant.email)}" />
  </div>
  <button class="btn" onclick="saveIdentity()">Save</button>
  <span class="saved-flash" id="savedFlash">✓ Saved</span>
  <p class="gh-hint" id="ghHint">
    ${participant.githubUser
      ? `GitHub: <strong>${escapeHtml(participant.githubUser)}</strong> — used as fallback if name/email left blank`
      : "GitHub identity will be detected automatically as fallback"}
  </p>
</div>

<!-- Sections -->
<div class="sections-header">
  <h2>📋 Workshop Sections</h2>
  <button class="btn ghost" onclick="resetProgress()">Reset progress</button>
</div>

<div id="sectionsList"></div>

<div class="footer">Workshop Tracker · Solace Workshops</div>

<script>
  const vscode    = acquireVsCodeApi();
  const sections  = ${sectionsJson};

  function renderSections() {
    const list = document.getElementById("sectionsList");
    list.innerHTML = sections.map((s, i) => \`
      <div class="section-item \${s.done ? "done" : ""}" onclick="toggleSection('\${s.id}')">
        <input class="section-check" type="checkbox" \${s.done ? "checked" : ""}
               onclick="event.stopPropagation(); toggleSection('\${s.id}')" />
        <div class="section-body">
          <div class="section-number">Section \${i + 1}</div>
          <div class="section-title">\${s.title}</div>
          \${s.description ? \`<div class="section-desc">\${s.description}</div>\` : ""}
        </div>
        \${s.done ? '<span class="done-badge">✓ Done</span>' : ""}
      </div>
    \`).join("");
  }

  function toggleSection(id) {
    const s = sections.find(x => x.id === id);
    if (!s) return;
    s.done = !s.done;
    renderSections();
    vscode.postMessage({ type: "sectionToggle", sectionId: id, checked: s.done });
  }

  function saveIdentity() {
    const name  = document.getElementById("inputName").value.trim();
    const email = document.getElementById("inputEmail").value.trim();
    vscode.postMessage({ type: "saveIdentity", name, email });
    const flash = document.getElementById("savedFlash");
    flash.classList.add("show");
    setTimeout(() => flash.classList.remove("show"), 2000);
  }

  function resetProgress() {
    if (confirm("Reset all progress? This cannot be undone.")) {
      vscode.postMessage({ type: "resetProgress" });
    }
  }

  // Enter key saves identity
  ["inputName","inputEmail"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
      if (e.key === "Enter") saveIdentity();
    });
  });

  // Messages from extension host
  window.addEventListener("message", e => {
    const msg = e.data;

    if (msg.type === "progressUpdate") {
      const pct = msg.total ? Math.round((msg.completed / msg.total) * 100) : 0;
      document.getElementById("progressBar").style.width = pct + "%";
      document.getElementById("progressLabel").textContent =
        \`\${msg.completed} of \${msg.total} sections completed\`;
    }

    if (msg.type === "githubIdentity") {
      document.getElementById("ghHint").innerHTML =
        \`GitHub: <strong>\${msg.githubUser}</strong> — used as fallback if name/email left blank\`;
    }
  });

  renderSections();
</script>
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
