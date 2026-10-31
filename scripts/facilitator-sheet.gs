/**
 * Google Apps Script for the facilitator profile form (/fprofile).
 *
 * The website POSTs each submission here as JSON. This script adds a row to the
 * "Facilitator's Profile" tab of the Bridge Database sheet and saves the photo
 * to a private Drive folder, putting the photo's link in the row.
 *
 * Setup (once):
 *   1. Open the Bridge Database sheet > Extensions > Apps Script.
 *   2. Replace everything in Code.gs with this file and save.
 *   3. Deploy > New deployment > type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  Deploy, then allow the permissions.
 *   4. Copy the Web app URL (ends in /exec) and set it as FPROFILE_SHEET_URL
 *      in Vercel (and in .env for local testing).
 *
 * After editing this script later, use Deploy > Manage deployments > edit >
 * Version: New version, so the same URL keeps working.
 *
 * Keep the URL private: anyone who has it can add rows.
 */

const SHEET_NAME = "Facilitator's Profile";
const PHOTO_FOLDER = 'TheBridge facilitator photos';

// [key sent by the website, column heading]
const COLUMNS = [
  ['submitted_at', 'Submitted at'],
  ['name', 'Full name'],
  ['phone', 'WhatsApp number'],
  ['email', 'Email address'],
  ['role', 'Current role & organisation'],
  ['experience', 'Years of experience'],
  ['bio', 'Professional bio'],
  ['photo', 'Photo'],
  ['link', 'LinkedIn / portfolio'],
  ['courses', 'Course(s) assigned'],
  ['topic', 'Session topic'],
  ['qualifications', 'Qualifications & experience'],
  ['level', 'Session level'],
  ['takeaways', '3 key things attendees will learn'],
  ['outline', 'Session outline / agenda'],
  ['formats', 'Delivery format'],
  ['length', 'Session length'],
  ['tools', 'Tools to install before class'],
  ['availability', 'Available date & time'],
  ['requirements', 'Special requirements'],
  ['certificate', 'Certificate / follow-up resources'],
  ['comments', 'Additional comments'],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();

    if (data.photo && data.photo.data) {
      const blob = Utilities.newBlob(Utilities.base64Decode(data.photo.data), data.photo.type, data.photo.name);
      data.photo = getFolder_().createFile(blob).getUrl();
    } else {
      data.photo = '';
    }

    sheet.appendRow(COLUMNS.map(([key]) => data[key] == null ? '' : data[key]));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you check the deployment by opening the URL in a browser.
function doGet() {
  return json_({ ok: true, service: 'TheBridge facilitator profiles' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(([, heading]) => heading));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#FFD60A');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getFolder_() {
  const found = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return found.hasNext() ? found.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
