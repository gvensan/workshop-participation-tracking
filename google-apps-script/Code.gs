// ============================================================
// Workshop Tracker — Google Apps Script Web App
// Deploy as: Execute as ME, Access: ANYONE (even anonymous)
// ============================================================

const SHEET_NAME = "Completions";
const HEADERS = [
  "Timestamp",
  "Workshop",
  "Codespace",
  "Git User Name",
  "Git Email",
  "GitHub User",
  "Name",
  "Email",
  "Section ID",
  "Section Title",
  "Action"   // "completed" or "unchecked"
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    
    // Handle reset: delete all rows for this participant + codespace
    if (payload.action === "reset") {
      deleteRowsForParticipant(sheet, payload);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: "reset" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      new Date().toISOString(),
      payload.workshop     || "",
      payload.codespace    || "",
      payload.gitName      || "",
      payload.gitEmail     || "",
      payload.githubUser   || "",
      payload.name         || "",
      payload.email        || "",
      payload.sectionId    || "",
      payload.sectionTitle || "",
      payload.action       || "completed"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handles preflight / health check from the extension
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: "Workshop Tracker active" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    // Style header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#4a86e8");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);

    // Set column widths
    sheet.setColumnWidth(1, 200);  // Timestamp
    sheet.setColumnWidth(2, 160);  // Workshop
    sheet.setColumnWidth(3, 180);  // Codespace
    sheet.setColumnWidth(4, 160);  // Git User Name
    sheet.setColumnWidth(5, 200);  // Git Email
    sheet.setColumnWidth(6, 140);  // GitHub User
    sheet.setColumnWidth(7, 140);  // Name
    sheet.setColumnWidth(8, 200);  // Email
    sheet.setColumnWidth(9, 80);   // Section ID
    sheet.setColumnWidth(10, 260); // Section Title
    sheet.setColumnWidth(11, 100); // Action
  }

  return sheet;
}

function deleteRowsForParticipant(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const pGitName    = (payload.gitName    || "").toLowerCase().trim();
  const pGitEmail   = (payload.gitEmail   || "").toLowerCase().trim();
  const pGithubUser = (payload.githubUser || "").toLowerCase().trim();
  const pName       = (payload.name       || "").toLowerCase().trim();
  const pEmail      = (payload.email      || "").toLowerCase().trim();

  // Walk rows bottom-up so deletions don't shift indices
  for (let i = data.length - 1; i >= 1; i--) {  // skip header row
    const rowGitName    = (data[i][3]  || "").toString().toLowerCase().trim();  // column D
    const rowGitEmail   = (data[i][4]  || "").toString().toLowerCase().trim();  // column E
    const rowGithubUser = (data[i][5]  || "").toString().toLowerCase().trim();  // column F
    const rowName       = (data[i][6]  || "").toString().toLowerCase().trim();  // column G
    const rowEmail      = (data[i][7]  || "").toString().toLowerCase().trim();  // column H

    // Match if ANY identifier overlaps
    const match =
      (pGitName    && rowGitName    === pGitName)    ||
      (pGitEmail   && rowGitEmail   === pGitEmail)   ||
      (pGithubUser && rowGithubUser === pGithubUser) ||
      (pEmail      && rowEmail      === pEmail)      ||
      (pName       && rowName       === pName);

    if (match) {
      sheet.deleteRow(i + 1);  // Sheets rows are 1-indexed
    }
  }
}
