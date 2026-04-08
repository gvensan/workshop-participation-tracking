"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantStore = void 0;
const vscode = require("vscode");
class ParticipantStore {
    constructor(context) {
        this.context = context;
    }
    // ── Participant identity ─────────────────────────────────────
    getParticipant() {
        return {
            name: this.context.globalState.get("wt.name", ""),
            email: this.context.globalState.get("wt.email", ""),
            githubUser: this.context.globalState.get("wt.githubUser", ""),
            githubEmail: this.context.globalState.get("wt.githubEmail", "")
        };
    }
    async saveParticipant(p) {
        if (p.name !== undefined)
            await this.context.globalState.update("wt.name", p.name);
        if (p.email !== undefined)
            await this.context.globalState.update("wt.email", p.email);
        if (p.githubUser !== undefined)
            await this.context.globalState.update("wt.githubUser", p.githubUser);
        if (p.githubEmail !== undefined)
            await this.context.globalState.update("wt.githubEmail", p.githubEmail);
    }
    // ── GitHub auth (best-effort, non-blocking) ──────────────────
    async tryFetchGitHubIdentity() {
        try {
            const session = await vscode.authentication.getSession("github", ["user:email", "read:user"], { createIfNone: false, silent: true });
            if (!session)
                return { user: "", email: "" };
            const user = session.account.label ?? "";
            const email = session.account.id
                ? await this.fetchGitHubEmail(session.accessToken)
                : "";
            await this.saveParticipant({ githubUser: user, githubEmail: email });
            return { user, email };
        }
        catch {
            return { user: "", email: "" };
        }
    }
    async fetchGitHubEmail(token) {
        try {
            const res = await fetch("https://api.github.com/user/emails", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "User-Agent": "workshop-tracker-vscode"
                }
            });
            if (!res.ok)
                return "";
            const emails = (await res.json());
            const primary = emails.find(e => e.primary && e.verified);
            return primary?.email ?? emails[0]?.email ?? "";
        }
        catch {
            return "";
        }
    }
    // ── Progress tracking ────────────────────────────────────────
    getCompleted() {
        return this.context.globalState.get("wt.completed", []);
    }
    getCompletedCount() {
        return this.getCompleted().length;
    }
    isCompleted(sectionId) {
        return this.getCompleted().includes(sectionId);
    }
    async markCompleted(sectionId) {
        const list = this.getCompleted();
        if (!list.includes(sectionId)) {
            await this.context.globalState.update("wt.completed", [...list, sectionId]);
        }
    }
    async markUncompleted(sectionId) {
        const list = this.getCompleted().filter(id => id !== sectionId);
        await this.context.globalState.update("wt.completed", list);
    }
    async resetProgress() {
        await this.context.globalState.update("wt.completed", []);
    }
}
exports.ParticipantStore = ParticipantStore;
//# sourceMappingURL=participantStore.js.map