// ============================================================
// Workshop Tracker — Google Apps Script Web App
// Deploy as: Execute as ME, Access: ANYONE (even anonymous)
// ============================================================

const SHEET_NAME = "Completions";
const HEADERS = [
  "Timestamp",
  "Workshop",
  "Codespace",
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
    
    sheet.appendRow([
      new Date().toISOString(),
      payload.workshop   || "",
      payload.codespace  || "",
      payload.githubUser || "",
      payload.name       || "",
      payload.email      || "",
      payload.sectionId  || "",
      payload.sectionTitle || "",
      payload.action     || "completed"
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
    sheet.setColumnWidth(1, 200); // Timestamp
    sheet.setColumnWidth(2, 160); // Workshop
    sheet.setColumnWidth(3, 180); // Codespace
    sheet.setColumnWidth(4, 140); // GitHub User
    sheet.setColumnWidth(5, 140); // Name
    sheet.setColumnWidth(6, 200); // Email
    sheet.setColumnWidth(7, 80);  // Section ID
    sheet.setColumnWidth(8, 260); // Section Title
    sheet.setColumnWidth(9, 100); // Action
  }

  return sheet;
}
