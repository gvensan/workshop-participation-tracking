"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const panel_1 = require("./panel");
const participantStore_1 = require("./participantStore");
const sectionsLoader_1 = require("./sectionsLoader");
const webhookReporter_1 = require("./webhookReporter");
let statusBarItem;
let panel;
async function activate(context) {
    const store = new participantStore_1.ParticipantStore(context);
    const sectionsLoader = new sectionsLoader_1.SectionsLoader();
    // ── Status Bar ──────────────────────────────────────────────
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "workshopTracker.openPanel";
    statusBarItem.tooltip = "Click to open Workshop Tracker";
    updateStatusBar(store, sectionsLoader);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // ── Open Panel Command ───────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand("workshopTracker.openPanel", async () => {
        if (panel) {
            panel.reveal();
            return;
        }
        const sections = await sectionsLoader.load();
        panel = new panel_1.WorkshopPanel(context, store, sections, () => {
            panel = undefined;
            updateStatusBar(store, sectionsLoader);
        });
        panel.onProgressChanged(() => updateStatusBar(store, sectionsLoader));
    }));
    // ── Reset Command ────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand("workshopTracker.resetProgress", async () => {
        const confirm = await vscode.window.showWarningMessage("Reset all workshop progress?", { modal: true }, "Reset");
        if (confirm === "Reset") {
            const participant = store.getParticipant();
            await store.resetProgress();
            updateStatusBar(store, sectionsLoader);
            panel?.refresh();
            vscode.window.showInformationMessage("Workshop progress reset.");
            // Remove this participant's rows from the Google Sheet
            const reporter = new webhookReporter_1.WebhookReporter();
            reporter.reportReset({
                participant,
                codespace: webhookReporter_1.WebhookReporter.getCodespaceName()
            });
        }
    }));
    // ── Watch for sections file changes ─────────────────────────
    const watcher = vscode.workspace.createFileSystemWatcher("**/workshop-sections.json");
    watcher.onDidChange(async () => {
        try {
            sectionsLoader.invalidate();
            updateStatusBar(store, sectionsLoader);
            panel?.refreshSections(await sectionsLoader.load());
        }
        catch (err) {
            console.warn("[WorkshopTracker] Failed to reload sections:", err);
        }
    });
    context.subscriptions.push(watcher);
}
async function updateStatusBar(store, loader) {
    const sections = await loader.load();
    const completed = store.getCompletedCount();
    const total = sections.length;
    if (total === 0) {
        statusBarItem.text = "$(checklist) Workshop Tracker";
    }
    else if (completed === total) {
        statusBarItem.text = `$(pass-filled) Completed ${total}/${total} sections`;
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    }
    else {
        statusBarItem.text = `$(checklist) Progress: ${completed}/${total} sections`;
        statusBarItem.backgroundColor = undefined;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map