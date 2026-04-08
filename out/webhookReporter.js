"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookReporter = void 0;
const vscode = require("vscode");
class WebhookReporter {
    getWebhookUrl() {
        return vscode.workspace
            .getConfiguration("workshopTracker")
            .get("webhookUrl", "");
    }
    getWorkshopName() {
        return vscode.workspace
            .getConfiguration("workshopTracker")
            .get("workshopName", "Solace Agent Mesh Workshop");
    }
    async report(event) {
        const url = this.getWebhookUrl();
        if (!url)
            return; // silently skip if not configured
        const p = event.participant;
        const payload = {
            workshop: this.getWorkshopName(),
            codespace: event.codespace,
            gitName: p.gitName,
            gitEmail: p.gitEmail,
            githubUser: p.githubUser,
            name: p.name || p.gitName || p.githubUser || "unknown",
            email: p.email || p.gitEmail || p.githubEmail || "",
            sectionId: event.section.id,
            sectionTitle: event.section.title,
            action: event.action
        };
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                console.warn(`[WorkshopTracker] Webhook responded ${res.status}`);
            }
        }
        catch (err) {
            // Non-blocking — never surface network errors to participant
            console.warn("[WorkshopTracker] Webhook post failed:", err);
        }
    }
    async reportReset(event) {
        const url = this.getWebhookUrl();
        if (!url)
            return;
        const p = event.participant;
        const payload = {
            action: "reset",
            workshop: this.getWorkshopName(),
            codespace: event.codespace,
            gitName: p.gitName,
            gitEmail: p.gitEmail,
            githubUser: p.githubUser,
            name: p.name || p.gitName || p.githubUser || "unknown",
            email: p.email || p.gitEmail || p.githubEmail || ""
        };
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
        catch (err) {
            console.warn("[WorkshopTracker] Webhook reset failed:", err);
        }
    }
    static getCodespaceName() {
        return process.env["CODESPACE_NAME"] ?? process.env["HOSTNAME"] ?? "local";
    }
}
exports.WebhookReporter = WebhookReporter;
//# sourceMappingURL=webhookReporter.js.map