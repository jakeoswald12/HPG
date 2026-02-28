// ═══════════════════════════════════════════════════════════════
//  Google Apps Script — Bull Sale Check-In → Buyers Tab
//  VERSION: 5
//
//  IMPORTANT: To redeploy, you MUST create a NEW deployment:
//  Deploy → New deployment → Web app → Execute as: Me →
//  Who has access: Anyone → Deploy
//  Then copy the NEW URL and update the check-in app settings.
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Buyers');

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ version: 5, error: 'Buyers sheet not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    // Read ONLY columns A (1), B (2), and C (3)
    var dataRange = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

    var targetRow = -1;
    var buyerNum = null;
    var debugInfo = []; // collect info about first 10 rows for troubleshooting

    for (var i = 0; i < dataRange.length; i++) {
      var colA = dataRange[i][0]; // Buyer #
      var colB = dataRange[i][1]; // Last Name
      var colC = dataRange[i][2]; // First Name

      // Collect debug info for first 10 rows
      if (i < 10) {
        debugInfo.push({
          row: i + 2,
          A: JSON.stringify(colA),
          B: JSON.stringify(colB),
          C: JSON.stringify(colC),
          typeA: typeof colA,
          typeB: typeof colB,
          typeC: typeof colC
        });
      }

      // Column A must be a numeric buyer number
      if (colA === '' || colA === null || colA === undefined) continue;
      if (isNaN(Number(colA))) continue;

      // Row is available if BOTH Last Name (B) and First Name (C) are empty
      var bStr = String(colB).trim();
      var cStr = String(colC).trim();

      if (bStr === '' && cStr === '') {
        targetRow = i + 2;
        buyerNum = colA;
        break;
      }
    }

    if (targetRow === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ version: 5, error: 'No available buyer numbers', debug: debugInfo, totalRows: dataRange.length })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Fill in columns B, C, E-J individually (skip D — it has a formula)
    sheet.getRange(targetRow, 2).setValue(data.lastName || '');
    sheet.getRange(targetRow, 3).setValue(data.firstName || '');
    sheet.getRange(targetRow, 5).setValue(data.address || '');
    sheet.getRange(targetRow, 6).setValue(data.city || '');
    sheet.getRange(targetRow, 7).setValue(data.state || '');
    sheet.getRange(targetRow, 8).setValue(data.zip || '');
    sheet.getRange(targetRow, 9).setValue(data.phone || '');
    sheet.getRange(targetRow, 10).setValue(data.email || '');

    return ContentService.createTextOutput(
      JSON.stringify({ version: 5, success: true, buyerNumber: buyerNum, row: targetRow, debug: debugInfo })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ version: 5, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
