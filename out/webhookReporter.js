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
        const payload = {
            workshop: this.getWorkshopName(),
            codespace: event.codespace,
            githubUser: event.participant.githubUser || event.participant.name || "unknown",
            name: event.participant.name || event.participant.githubUser || "",
            email: event.participant.email || event.participant.githubEmail || "",
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
    static getCodespaceName() {
        return process.env["CODESPACE_NAME"] ?? process.env["HOSTNAME"] ?? "local";
    }
}
exports.WebhookReporter = WebhookReporter;
//# sourceMappingURL=webhookReporter.js.map