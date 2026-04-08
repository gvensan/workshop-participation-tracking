"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantStore = void 0;
const vscode = require("vscode");
const child_process_1 = require("child_process");
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
            githubEmail: this.context.globalState.get("wt.githubEmail", ""),
            gitName: this.context.globalState.get("wt.gitName", ""),
            gitEmail: this.context.globalState.get("wt.gitEmail", "")
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
        if (p.gitName !== undefined)
            await this.context.globalState.update("wt.gitName", p.gitName);
        if (p.gitEmail !== undefined)
            await this.context.globalState.update("wt.gitEmail", p.gitEmail);
    }
    // ── Git config identity (always available in Codespaces) ─────
    async tryFetchGitConfig() {
        try {
            const name = (0, child_process_1.execSync)("git config user.name", { encoding: "utf8" }).trim();
            const email = (0, child_process_1.execSync)("git config user.email", { encoding: "utf8" }).trim();
            // Store in dedicated git fields
            await this.saveParticipant({ gitName: name, gitEmail: email });
            // Also auto-fill the display name/email if the user hasn't manually set them
            const current = this.getParticipant();
            if (!current.name && name)
                await this.saveParticipant({ name });
            if (!current.email && email)
                await this.saveParticipant({ email });
            return { name, email };
        }
        catch {
            return { name: "", email: "" };
        }
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