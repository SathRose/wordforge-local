'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'wordforge.html');
const batch = JSON.parse(fs.readFileSync(path.join(__dirname, 'textbook-batch.json'), 'utf8'));
let html = fs.readFileSync(target, 'utf8');
if (html.includes('id="wf-textbook-import"')) throw new Error('Textbook patch already installed; no files changed.');
function replaceOnce(before, after) {
  if (html.split(before).length !== 2) throw new Error('Expected exactly one patch location: ' + before.slice(0, 90));
  html = html.replace(before, after);
}

// JSON is embedded, so imported books also work offline and in a fresh browser.
const safeJSON = JSON.stringify(batch).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
replaceOnce('<script id="wf-data">', '<script id="wf-textbook-import">window.__WF_TEXTBOOK_IMPORT=' + safeJSON + ';</script>\n<script id="wf-data">');

replaceOnce('var CIDX = null;     /* 自定义词 word -> record */', 'var CIDX = null;     /* 自定义词 word -> record */\nvar CUSTOM_BOOK_INDEX = Object.create(null);');
replaceOnce('function refreshCustomIndex() {\n  CIDX = Object.create(null);', 'function refreshCustomIndex() {\n  CIDX = Object.create(null);\n  CUSTOM_BOOK_INDEX = Object.create(null);');
replaceOnce('    var ws = c[k].words || [];\n    for (var j = 0; j < ws.length; j++) {\n      var w = ws[j];\n      if (w && w[F.W] && !IDX[w[F.W]]) CIDX[w[F.W]] = w;',
  '    var ws = c[k].words || [];\n    var bookIndex = CUSTOM_BOOK_INDEX[k] = Object.create(null);\n    for (var j = 0; j < ws.length; j++) {\n      var w = ws[j];\n      if (w && w[F.W]) bookIndex[w[F.W]] = w;\n      if (w && w[F.W] && !IDX[w[F.W]]) CIDX[w[F.W]] = w;');
replaceOnce('function rec(w) { return IDX[w] || CIDX[w] || null; }', `function rec(w) {
  // Only explicitly source-locked books override the built-in dictionary.
  var id = DB && DB.book && DB.book.charAt(0) === "@" ? DB.book.slice(1) : "";
  var book = id && DB.custom[id];
  var own = book && book.preferSourceDefinitions && CUSTOM_BOOK_INDEX[id];
  return (own && own[w]) || IDX[w] || CIDX[w] || null;
}`);

replaceOnce('function load() {', `function mergeTextbookImports(d) {
  var batch = window.__WF_TEXTBOOK_IMPORT;
  if (!batch || !Array.isArray(batch.parts)) return d;
  d._textbookImportBatches = d._textbookImportBatches || {};
  if (d._textbookImportBatches[batch.batchId]) {
    var imported = d._textbookImportBatches[batch.batchId];
    if (batch.sourceNameVersion && imported.sourceNameVersion !== batch.sourceNameVersion) {
      try {
        var renameBackup = KEY + "__backup_before_" + batch.sourceNameVersion;
        if (!localStorage.getItem(renameBackup)) localStorage.setItem(renameBackup, JSON.stringify(d));
      } catch (e) { storageOK = false; return d; }
      batch.parts.forEach(function (part) {
        var book = d.custom[part.id];
        if (book) { book.name = part.name; book.sourceName = batch.sourceName; }
      });
      imported.sourceNameVersion = batch.sourceNameVersion;
      try { localStorage.setItem(KEY, JSON.stringify(d)); }
      catch (e) { storageOK = false; }
    }
    return d;
  }
  // Keep a per-browser backup before adding anything. Never overwrite existing progress.
  try {
    var backupKey = KEY + "__backup_before_" + batch.batchId;
    if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify(d));
  } catch (e) { storageOK = false; return d; }
  var hadBooks = Object.keys(d.custom || {}).length > 0;
  var hadProgress = Object.keys(d.prog || {}).length > 0;
  var firstAdded = "";
  batch.parts.forEach(function (part) {
    if (d.custom[part.id]) return;
    d.custom[part.id] = {
      name: part.name,
      desc: "新视野大学英语（第四版）Unit 1 · 第" + part.pages[0] + "–" + part.pages[part.pages.length - 1] + "页 · 按页码及栏内顺序",
      words: part.words.map(mkRec),
      created: now(),
      sourcePages: part.pages.slice(),
      sourceBatch: batch.batchId,
      sourceName: batch.sourceName || "",
      preferSourceDefinitions: true,
      preserveSourceOrder: true
    };
    if (!firstAdded) firstAdded = "@" + part.id;
  });
  if (!hadBooks && !hadProgress && firstAdded) d.book = firstAdded;
  d._textbookImportBatches[batch.batchId] = { importedAt: now(), sourceNameVersion: batch.sourceNameVersion || "", parts: batch.parts.map(function (p) { return p.id; }) };
  try { localStorage.setItem(KEY, JSON.stringify(d)); }
  catch (e) { storageOK = false; }
  return d;
}
function load() {`);
replaceOnce('  if (!d) return blankDB();', '  if (!d) d = blankDB();');
replaceOnce('  return d;\n}\nvar saveTimer = null;', '  return mergeTextbookImports(d);\n}\nvar saveTimer = null;');

replaceOnce('  /* 新词按词频优先（BNC/COCA 靠前的先学） */\n  fresh.sort(function (a, b) { return (rec(a)[F.FRQ] || rec(a)[F.BNC] || 999999) - (rec(b)[F.FRQ] || rec(b)[F.BNC] || 999999); });',
  '  /* Source-locked textbooks retain page order; other books keep frequency priority. */\n  if (!sourceOrderedBook()) fresh.sort(function (a, b) { return (rec(a)[F.FRQ] || rec(a)[F.BNC] || 999999) - (rec(b)[F.FRQ] || rec(b)[F.BNC] || 999999); });');
replaceOnce('function applyOrder(arr) {\n  var mode = cfg().queueOrder || "smart";', `function sourceOrderedBook() {
  var b = DB && DB.book && DB.book.charAt(0) === "@" ? DB.custom[DB.book.slice(1)] : null;
  return !!(b && b.preserveSourceOrder);
}
function queueOrderMode() { return sourceOrderedBook() ? "order" : cfg().queueOrder || "smart"; }
function applyOrder(arr) {
  var mode = queueOrderMode();`);
replaceOnce('orderName(cfg().queueOrder) + " · 每轮重新洗牌</span>"', 'orderName(queueOrderMode()) + (sourceOrderedBook() ? " · 按课本页码" : " · 每轮重新洗牌") + "</span>"');
replaceOnce('  blankDB: blankDB,', '  blankDB: blankDB,\n  mergeTextbookImports: mergeTextbookImports,');

// Parsing every inline script catches syntax errors before writing the release.
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) new Function(m[2]);
fs.writeFileSync(target, html, 'utf8');
console.log('Installed textbook batch: ' + batch.parts.map(p => p.words.length).join(' + ') + ' entries.');
