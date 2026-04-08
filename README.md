# Workshop Tracker — VS Code Extension

A VS Code extension for tracking participant progress through guided workshop sections. Designed for use with GitHub Codespaces.

---

## How It Works

- A **status bar item** (bottom right) always shows current progress: `✅ Progress: 3/8 sections`
- Click it to open the **Workshop Tracker panel**
- Participants enter their name & email (or GitHub identity is used as fallback)
- Each section has a checkbox — checking it fires a real-time POST to Google Sheets
- Progress persists across Codespace restarts

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
  "workshopTracker.workshopName": "My Workshop Name"
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
vsce package        # produces workshop-tracker-1.0.0.vsix
code --install-extension workshop-tracker-1.0.0.vsix
```

---

## Google Sheet Output

Each completion creates a row:

| Timestamp | Workshop | Codespace | GitHub User | Name | Email | Section ID | Section Title | Action |
|---|---|---|---|---|---|---|---|---|
| 2026-04-08T10:32:00Z | SAM Workshop | urban-disco-x1 | arun-gh | Arun K | arun@x.com | s3 | Publish Your First Event | completed |

- **Action** is `completed` or `unchecked` (if participant unchecks a section)
- **Codespace** is the `CODESPACE_NAME` env variable — unique per participant
- If name/email left blank, GitHub identity is used automatically

---

## Commands

| Command | Description |
|---|---|
| Click status bar | Open tracker panel |
| `Workshop Tracker: Reset My Progress` | Clear all checkboxes (via Command Palette) |

---

## Data Identity Priority

1. Name & email entered by participant (stored in VS Code globalState)
2. GitHub username + email from VS Code GitHub authentication (silent, non-intrusive)
3. `CODESPACE_NAME` environment variable (always available in Codespaces)
