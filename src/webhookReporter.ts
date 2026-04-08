import * as vscode from "vscode";
import { Participant } from "./participantStore";
import { Section } from "./sectionsLoader";

export interface CompletionEvent {
  participant: Participant;
  section: Section;
  action: "completed" | "unchecked";
  codespace: string;
  workshop: string;
}

export class WebhookReporter {
  private getWebhookUrl(): string {
    return vscode.workspace
      .getConfiguration("workshopTracker")
      .get<string>("webhookUrl", "");
  }

  private getWorkshopName(): string {
    return vscode.workspace
      .getConfiguration("workshopTracker")
      .get<string>("workshopName", "Solace Agent Mesh Workshop");
  }

  async report(event: CompletionEvent): Promise<void> {
    const url = this.getWebhookUrl();
    if (!url) return; // silently skip if not configured

    const payload = {
      workshop:     this.getWorkshopName(),
      codespace:    event.codespace,
      githubUser:   event.participant.githubUser  || event.participant.name || "unknown",
      name:         event.participant.name        || event.participant.githubUser || "",
      email:        event.participant.email       || event.participant.githubEmail || "",
      sectionId:    event.section.id,
      sectionTitle: event.section.title,
      action:       event.action
    };

    try {
      const res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn(`[WorkshopTracker] Webhook responded ${res.status}`);
      }
    } catch (err) {
      // Non-blocking — never surface network errors to participant
      console.warn("[WorkshopTracker] Webhook post failed:", err);
    }
  }

  static getCodespaceName(): string {
    return process.env["CODESPACE_NAME"] ?? process.env["HOSTNAME"] ?? "local";
  }
}
