import * as vscode from "vscode";
import { execSync } from "child_process";

export interface Participant {
  name: string;
  email: string;
  githubUser: string;
  githubEmail: string;
}

export class ParticipantStore {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // ── Participant identity ─────────────────────────────────────

  getParticipant(): Participant {
    return {
      name:        this.context.globalState.get("wt.name", ""),
      email:       this.context.globalState.get("wt.email", ""),
      githubUser:  this.context.globalState.get("wt.githubUser", ""),
      githubEmail: this.context.globalState.get("wt.githubEmail", "")
    };
  }

  async saveParticipant(p: Partial<Participant>): Promise<void> {
    if (p.name       !== undefined) await this.context.globalState.update("wt.name", p.name);
    if (p.email      !== undefined) await this.context.globalState.update("wt.email", p.email);
    if (p.githubUser !== undefined) await this.context.globalState.update("wt.githubUser", p.githubUser);
    if (p.githubEmail!== undefined) await this.context.globalState.update("wt.githubEmail", p.githubEmail);
  }

  // ── Git config identity (always available in Codespaces) ─────

  async tryFetchGitConfig(): Promise<{ name: string; email: string }> {
    try {
      const name  = execSync("git config user.name",  { encoding: "utf8" }).trim();
      const email = execSync("git config user.email", { encoding: "utf8" }).trim();

      // Auto-fill name/email if the user hasn't manually set them
      const current = this.getParticipant();
      if (!current.name && name)   await this.saveParticipant({ name });
      if (!current.email && email) await this.saveParticipant({ email });

      return { name, email };
    } catch {
      return { name: "", email: "" };
    }
  }

  // ── GitHub auth (best-effort, non-blocking) ──────────────────

  async tryFetchGitHubIdentity(): Promise<{ user: string; email: string }> {
    try {
      const session = await vscode.authentication.getSession(
        "github",
        ["user:email", "read:user"],
        { createIfNone: false, silent: true }
      );
      if (!session) {
        // Fall back to git config
        return await this.gitConfigAsGitHubFallback();
      }

      const user  = session.account.label ?? "";
      const email = session.account.id
        ? await this.fetchGitHubEmail(session.accessToken)
        : "";

      await this.saveParticipant({ githubUser: user, githubEmail: email });
      return { user, email };
    } catch {
      return await this.gitConfigAsGitHubFallback();
    }
  }

  private async gitConfigAsGitHubFallback(): Promise<{ user: string; email: string }> {
    const git = await this.tryFetchGitConfig();
    if (git.name || git.email) {
      await this.saveParticipant({
        githubUser:  git.name,
        githubEmail: git.email
      });
    }
    return { user: git.name, email: git.email };
  }

  private async fetchGitHubEmail(token: string): Promise<string> {
    try {
      const res = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent":  "workshop-tracker-vscode"
        }
      });
      if (!res.ok) return "";
      const emails = (await res.json()) as any[];
      const primary = emails.find(e => e.primary && e.verified);
      return primary?.email ?? emails[0]?.email ?? "";
    } catch {
      return "";
    }
  }

  // ── Progress tracking ────────────────────────────────────────

  getCompleted(): string[] {
    return this.context.globalState.get<string[]>("wt.completed", []);
  }

  getCompletedCount(): number {
    return this.getCompleted().length;
  }

  isCompleted(sectionId: string): boolean {
    return this.getCompleted().includes(sectionId);
  }

  async markCompleted(sectionId: string): Promise<void> {
    const list = this.getCompleted();
    if (!list.includes(sectionId)) {
      await this.context.globalState.update("wt.completed", [...list, sectionId]);
    }
  }

  async markUncompleted(sectionId: string): Promise<void> {
    const list = this.getCompleted().filter(id => id !== sectionId);
    await this.context.globalState.update("wt.completed", list);
  }

  async resetProgress(): Promise<void> {
    await this.context.globalState.update("wt.completed", []);
  }
}
