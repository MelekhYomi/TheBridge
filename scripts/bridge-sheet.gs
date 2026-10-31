/**
 * TheBridge data API for the "Bridge Database" Google Sheet.
 *
 * The website is the only client. It sends JSON requests signed with a secret
 * key, and this script reads and writes rows in the sheet's tabs and stores
 * uploaded files in Google Drive. The website tells the script which tab and
 * columns to use, so adding a field on the website never needs a change here.
 *
 * Setup (once):
 *   1. Open the Bridge Database sheet > Extensions > Apps Script.
 *   2. Replace everything in Code.gs with this file and save.
 *   3. Project Settings (gear icon) > Script Properties > Add script property:
 *        Property: API_KEY    Value: the SHEET_API_KEY value from the website's .env
 *   4. Deploy > Manage deployments > pencil (edit) > Version: New version > Deploy.
 *      (First time only: Deploy > New deployment > Web app, Execute as: Me,
 *       Who has access: Anyone. Copy the /exec URL into SHEET_API_URL.)
 *
 * Without API_KEY set, every request is refused.
 *
 * Tabs are created when first needed. Each tab's first row holds the column
 * headings; you can reorder columns or add your own, but don't rename the
 * website's headings, as that is how it finds its data.
 */

const MEDIA_FOLDER = 'TheBridge website media';
const PHOTO_FOLDER = 'TheBridge facilitator photos';

function doGet() {
  return json_({ ok: true, service: 'TheBridge data API' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request' });
  }
  const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!key || typeof req.key !== 'string' || req.key !== key) return json_({ ok: false, error: 'Unauthorized' });

  try {
    if (req.action === 'ping') return json_({ ok: true });
    if (req.action === 'list') return json_({ ok: true, tables: req.tables.map(listTable_) });
    if (req.action === 'file') return json_({ ok: true, file: readFile_(req.id) });

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (req.action === 'append') return json_({ ok: true, row: append_(req) });
      if (req.action === 'update') return json_({ ok: true, row: update_(req) });
      if (req.action === 'update_many') return json_({ ok: true, rows: req.items.map((it) => update_(Object.assign({}, req, it))) });
      if (req.action === 'remove') return json_({ ok: true, removed: remove_(req) });
      if (req.action === 'upload') return json_({ ok: true, file: upload_(req.file, MEDIA_FOLDER) });
      if (req.action === 'delete_file') return json_({ ok: true, removed: deleteFile_(req.id) });
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// ---------- Tabs ----------

const norm_ = (s) => String(s || '').trim().toLowerCase();

/** Opens a tab and maps its header row to the website's column keys. */
function openTab_(t, create) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(t.tab);
  if (!sh) {
    if (!create) return null;
    sh = ss.insertSheet(t.tab);
  }
  const lastCol = sh.getLastColumn();
  let headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
  while (headers.length && !headers[headers.length - 1]) headers.pop();

  const byHeading = {};
  t.columns.forEach(([k, label]) => { byHeading[norm_(label)] = k; byHeading[norm_(k)] = k; });
  let keys = headers.map((h) => byHeading[norm_(h)] || null);

  const missing = t.columns.filter(([k]) => keys.indexOf(k) < 0);
  if (missing.length && create) {
    const start = headers.length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing.map(([, label]) => label)]);
    sh.getRange(1, 1, 1, start + missing.length - 1).setFontWeight('bold').setBackground('#FFD60A');
    sh.setFrozenRows(1);
    keys = keys.concat(missing.map(([k]) => k));
  }
  return { sh, keys };
}

function rowObject_(keys, values) {
  const o = {};
  keys.forEach((k, i) => { if (k) o[k] = values[i] == null ? '' : String(values[i]); });
  return o;
}

function listTable_(t) {
  const tab = openTab_(t, false);
  if (!tab || tab.sh.getLastRow() < 2) return [];
  const values = tab.sh.getRange(2, 1, tab.sh.getLastRow() - 1, tab.keys.length).getDisplayValues();
  return values.filter((r) => r.some((v) => v !== '')).map((r) => rowObject_(tab.keys, r));
}

// Text that Sheets would run as a formula is stored with a leading ' so it stays text.
function cell_(v) {
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function findRow_(tab, match, id) {
  const col = tab.keys.indexOf(match) + 1;
  if (col < 1 || tab.sh.getLastRow() < 2) return -1;
  const ids = tab.sh.getRange(2, col, tab.sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return -1;
}

function append_(req) {
  const tab = openTab_(req, true);
  const row = Object.assign({}, req.row);
  // Files sent with the row (e.g. a facilitator photo) go to Drive; the cell gets the link.
  Object.keys(req.files || {}).forEach((k) => { row[k] = upload_(req.files[k], PHOTO_FOLDER).url; });
  const values = tab.keys.map((k) => cell_(k ? row[k] : ''));
  const r = tab.sh.getLastRow() + 1;
  tab.sh.getRange(r, 1, 1, values.length).setNumberFormat('@').setValues([values]);
  return rowObject_(tab.keys, tab.keys.map((k) => (k ? row[k] : '')));
}

function update_(req) {
  const tab = openTab_(req, true);
  const r = findRow_(tab, req.match || 'id', req.id);
  if (r < 0) {
    if (!req.upsert) return null;
    return append_(Object.assign({}, req, { row: Object.assign({}, req.patch, { [req.match || 'id']: req.id }) }));
  }
  Object.keys(req.patch).forEach((k) => {
    const c = tab.keys.indexOf(k) + 1;
    if (c > 0) tab.sh.getRange(r, c).setNumberFormat('@').setValue(cell_(req.patch[k]));
  });
  return rowObject_(tab.keys, tab.sh.getRange(r, 1, 1, tab.keys.length).getDisplayValues()[0]);
}

function remove_(req) {
  const tab = openTab_(req, false);
  if (!tab) return false;
  const r = findRow_(tab, req.match || 'id', req.id);
  if (r < 0) return false;
  tab.sh.deleteRow(r);
  return true;
}

// ---------- Drive files ----------

function folder_(name) {
  const found = DriveApp.getFoldersByName(name);
  return found.hasNext() ? found.next() : DriveApp.createFolder(name);
}

function upload_(f, folderName) {
  const blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type, f.name);
  const file = folder_(folderName).createFile(blob);
  return { id: file.getId(), size: file.getSize(), url: file.getUrl() };
}

// Only files in the website's own folders can be read or deleted.
function ownFile_(id) {
  const file = DriveApp.getFileById(id);
  const parents = file.getParents();
  while (parents.hasNext()) {
    const n = parents.next().getName();
    if (n === MEDIA_FOLDER || n === PHOTO_FOLDER) return file;
  }
  throw new Error('File not found');
}

function readFile_(id) {
  const blob = ownFile_(id).getBlob();
  return { type: blob.getContentType(), name: blob.getName(), data: Utilities.base64Encode(blob.getBytes()) };
}

function deleteFile_(id) {
  ownFile_(id).setTrashed(true); // to Drive's bin, recoverable for 30 days
  return true;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
