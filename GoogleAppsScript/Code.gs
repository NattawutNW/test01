const QUIZ_SHEET_ID = '1oCnwp408va_iLJiwjkJwzCGki6wrult2fKVROLXHKfQ';
const QUIZ_DRIVE_ROOT_ID = '1rhtYMneVI-MSVLNGk1Xz445sLk8Phq97';
const QUIZ_SECTIONS = {
  users: 'Users', exams: 'Exams', classes: 'Classes', students: 'Students'
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('QuizSuite — ระบบจัดการข้อสอบ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function authorizeQuizSuiteResources() {
  const spreadsheet = SpreadsheetApp.openById(QUIZ_SHEET_ID);
  const folder = DriveApp.getFolderById(QUIZ_DRIVE_ROOT_ID);
  ensureDataSheet_(spreadsheet, 'Metadata');
  return 'Authorized: ' + spreadsheet.getName() + ' / ' + folder.getName();
}

function loadQuizSuiteState() {
  const book = SpreadsheetApp.openById(QUIZ_SHEET_ID);
  const state = {};
  Object.keys(QUIZ_SECTIONS).forEach(key => {
    const sheet = ensureDataSheet_(book, QUIZ_SECTIONS[key]);
    state[key] = readRows_(sheet);
  });
    state.folders = readRows_(ensureDataSheet_(book, 'Folders'));
    const settingsRows = readRows_(ensureDataSheet_(book, 'Settings'));
    state.settings = settingsRows.preferences || {};
  const meta = readRows_(ensureDataSheet_(book, 'Metadata'));
  Object.assign(state, meta.reduce((out, row) => {
    out[row.id] = row.value;
    return out;
  }, {}));
  const hasSavedData = book.getSheets().some(sheet => sheet.getLastRow() > 1);
  if (!hasSavedData) return null;
  state.currentUser = null;
  return state;
}

function saveQuizSuiteState(state) {
  if (!state || typeof state !== 'object') throw new Error('Invalid QuizSuite state');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.openById(QUIZ_SHEET_ID);
    Object.keys(QUIZ_SECTIONS).forEach(key => {
      const rows = Array.isArray(state[key]) ? state[key] : [];
      const safeRows = key === 'users' ? rows.map(hashUserPassword_) : rows;
      writeRows_(ensureDataSheet_(book, QUIZ_SECTIONS[key]), safeRows, item => {
        return key === 'users' ? item.username : item.id;
      });
    });
    ['folders', 'settings'].forEach(key => {
      const rows = key === 'folders'
        ? (Array.isArray(state.folders) ? state.folders.map((name, i) => ({ id: String(i), value: name })) : [])
        : [{ id: 'preferences', value: state.settings || {} }];
      writeRows_(ensureDataSheet_(book, QUIZ_SECTIONS[key]), rows, row => row.id);
    });
    const metadata = [
      { id: 'schoolName', value: state.schoolName || '' },
      { id: 'logo', value: state.logo || '' },
      { id: 'schemaVersion', value: 1 }
    ];
    writeRows_(ensureDataSheet_(book, 'Metadata'), metadata, row => row.id);
    return { ok: true, savedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function hashUserPassword_(user) {
  const password = String(user.password || '');
  if (password.indexOf('sha256$') === 0) return user;
  const salt = Utilities.getUuid().replace(/-/g, '');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  const hex = digest.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  return { ...user, salt: salt, password: 'sha256$' + salt + '$' + hex };
}

function uploadQuizSuiteLogo(dataUrl, originalName, mimeType) {
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.indexOf('base64,') < 0) {
    throw new Error('Logo upload data is invalid');
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Unsupported image data');
  const contentType = mimeType || match[1];
  if (!/^image\/(png|jpeg|webp|gif)$/.test(contentType)) throw new Error('รองรับเฉพาะ PNG, JPG, WEBP หรือ GIF');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 1200000) throw new Error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 1.2 MB');
  const year = String(new Date().getFullYear());
  const root = DriveApp.getFolderById(QUIZ_DRIVE_ROOT_ID);
  const iterator = root.getFoldersByName(year);
  const folder = iterator.hasNext() ? iterator.next() : root.createFolder(year);
  const safeName = String(originalName || 'school-logo').replace(/[\\/:*?"<>|]/g, '_');
  const file = folder.createFile(Utilities.newBlob(bytes, contentType, safeName));
  return {
    id: file.getId(),
    name: file.getName(),
    url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
    folder: year
  };
}

function ensureDataSheet_(book, name) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(['ID', 'JSON data', 'Updated at']);
  return sheet;
}

function readRows_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, 3).getValues()
    .filter(row => row[0] !== '' && row[1] !== '')
    .map(row => {
      const data = JSON.parse(row[1]);
      if (sheet.getName() === 'Metadata') return { id: String(row[0]), value: data };
      if (sheet.getName() === 'Folders') return { id: String(row[0]), value: data };
      if (sheet.getName() === 'Settings') return { id: String(row[0]), value: data };
      return data;
    }).reduce((out, row) => {
      if (sheet.getName() === 'Metadata') out[row.id] = row.value;
      else if (sheet.getName() === 'Folders') out.push(row.value);
      else if (sheet.getName() === 'Settings') out[row.id] = row.value;
      else out.push(row);
      return out;
    }, sheet.getName() === 'Metadata' || sheet.getName() === 'Settings' ? {} : []);
}

function writeRows_(sheet, items, getId) {
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, 3).clearContent();
  if (!items.length) return;
  const stamp = new Date();
  const values = items.map(item => [String(getId(item) || ''), JSON.stringify(item.value !== undefined ? item.value : item), stamp]);
  sheet.getRange(2, 1, values.length, 3).setValues(values);
}
