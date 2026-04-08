# Workshop Tracker — VS Code Extension

A VS Code extension for tracking participant progress through guided workshop sections. Designed for use with GitHub Codespaces.

---

## How It Works

- A **status bar item** (bottom right) always shows current progress: `Progress: 3/8 sections`
- Click it to open the **Workshop Tracker panel**
- Participant name & email are auto-detected from `git config` (GitHub OAuth as secondary source)
- Each section has a checkbox — checking a section **cascades** and marks all prior sections as done; unchecking cascades forward and unmarks all subsequent sections
- Checking a section fires a real-time POST to Google Sheets; **unchecking deletes** the corresponding rows (no "unchecked" log)
- Completed sections show a **Feedback** button inside the card — click to expand a textarea, submit, and the saved feedback shows inline (click to edit)
- Feedback is written to a separate **"Feedback"** sheet in Google Sheets
- Unchecking a section also clears its feedback (locally and from the Feedback sheet)
- Resetting progress removes all of that participant's rows from both the Completions and Feedback sheets
- A configurable **reminder notification** nudges participants to update progress at a set interval
- Progress and feedback persist across Codespace restarts via `globalState`

---

## Setup

### 1. Google Apps Script (the backend)

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Go to **Extensions → Apps Script**
3. Paste the contents of `google-apps-script/Code.gs`
4. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web App URL** — you'll need this next

### 2. Configure the Extension

Set the webhook URL in one of two ways:

**Option A — devcontainer.json (recommended for Codespaces):**
```json
"settings": {
  "workshopTracker.webhookUrl": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  "workshopTracker.workshopName": "My Workshop Name"
}
```

**Option B — VS Code settings.json:**
```json
{
  "workshopTracker.webhookUrl": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  "workshopTracker.workshopName": "My Workshop Name",
  "workshopTracker.reminderEnabled": true,
  "workshopTracker.reminderIntervalMinutes": 30
}
```

### 3. Define Your Sections

Edit `workshop-sections.json` in the root of your repo:

```json
[
  { "id": "s1", "title": "Environment Setup", "description": "Optional detail" },
  { "id": "s2", "title": "Connect to the Broker" }
]
```

The extension watches this file — changes reload automatically without restarting.

### 4. Install the Extension

**For Codespaces (auto-install):**
Add to `.devcontainer/devcontainer.json`:
```json
"extensions": ["solace-workshops.workshop-tracker"]
```

**For local/manual install:**
```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension workshop-tracker-1.0.0.vsix
```

---

## Google Sheet Output

Each completion creates a row:

| Timestamp | Workshop | Codespace | Git User Name | Git Email | GitHub User | Name | Email | Section ID | Section Title | Action |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-04-08T10:32:00Z | SAM Workshop | urban-disco-x1 | Arun K | arun@x.com | arun-gh | Arun K | arun@x.com | s3 | Publish Your First Event | completed |

- Only `completed` rows are stored — unchecking a section **deletes** its row instead of logging "unchecked"
- **Git User Name / Git Email** are from `git config` — always available in Codespaces
- **GitHub User** is from VS Code GitHub OAuth (empty if not authenticated)
- **Name / Email** are auto-filled from git config
- **Codespace** is the `CODESPACE_NAME` env variable — unique per participant
- **Reset** deletes all rows matching that participant from both Completions and Feedback sheets

### Feedback Sheet

Per-section feedback is written to a separate **"Feedback"** sheet (auto-created on first submission):

| Timestamp | Workshop | Codespace | Git User Name | Git Email | GitHub User | Name | Email | Section ID | Section Title | Feedback |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-04-08T11:15:00Z | SAM Workshop | urban-disco-x1 | Arun K | arun@x.com | arun-gh | Arun K | arun@x.com | s3 | Publish Your First Event | Clear instructions, worked on first try |

---

## Commands

| Command | Description |
|---|---|
| Click status bar | Open tracker panel |
| `Workshop Tracker: Reset My Progress` | Clear all checkboxes, feedback, and remove rows from both sheets (via Command Palette) |

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `workshopTracker.webhookUrl` | string | `""` | Google Apps Script Web App URL |
| `workshopTracker.workshopName` | string | `"Solace Agent Mesh Workshop"` | Workshop name included in every event |
| `workshopTracker.reminderEnabled` | boolean | `true` | Show periodic reminders to update progress |
| `workshopTracker.reminderIntervalMinutes` | number | `30` | Minutes between reminders (minimum 1) |

When reminders are enabled, a notification pops up at the configured interval showing current progress with an "Open Tracker" button. Reminders stop automatically once all sections are completed. Set `reminderEnabled` to `false` to disable.

---

## Data Identity Priority

1. `git config user.name` & `git config user.email` — auto-detected on activation, always available in Codespaces
2. GitHub username + email from VS Code GitHub authentication (silent, non-intrusive)
3. `CODESPACE_NAME` environment variable (always available in Codespaces, used for the Codespace column)
