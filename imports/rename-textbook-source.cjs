'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const batchPath = path.join(__dirname, 'textbook-batch.json');
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const oldNames = batch.parts.map(p => p.name);
batch.sourceName = '读写教程';
batch.sourceNameVersion = 'reading-writing-source-name-v1';
batch.parts.forEach((p, i) => { p.name = `读写教程｜Part ${i + 1}｜第${p.pages[0]}–${p.pages.at(-1)}页`; });
let html = fs.readFileSync(path.join(root, 'wordforge.html'), 'utf8');
fs.copyFileSync(path.join(root, 'wordforge.html'), path.join(root, 'backups', 'wordforge-before-source-rename.html'));
const safeJSON = JSON.stringify(batch).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const seed = /(<script id="wf-textbook-import">)window\.__WF_TEXTBOOK_IMPORT=[\s\S]*?;<\/script>/g;
if ([...html.matchAll(seed)].length !== 1) throw Error('Expected one embedded import payload');
html = html.replace(seed, (_, prefix) => prefix + 'window.__WF_TEXTBOOK_IMPORT=' + safeJSON + ';</script>');
const oldEarlyReturn = '  if (d._textbookImportBatches[batch.batchId]) return d;';
const migration = `  if (d._textbookImportBatches[batch.batchId]) {
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
  }`;
function patch(s) {
  if (s.split(oldEarlyReturn).length !== 2) throw Error('Expected one migration location');
  s = s.replace(oldEarlyReturn, migration);
  s = s.replace('      sourceBatch: batch.batchId,', '      sourceBatch: batch.batchId,\n      sourceName: batch.sourceName || "",');
  s = s.replace('importedAt: now(), parts: batch.parts.map', 'importedAt: now(), sourceNameVersion: batch.sourceNameVersion || "", parts: batch.parts.map');
  return s;
}
html = patch(html);
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) new Function(m[2]);
const installerPath = path.join(__dirname, 'install-textbook-import.cjs');
const installer = patch(fs.readFileSync(installerPath, 'utf8'));
new Function(installer);
fs.writeFileSync(path.join(root, 'wordforge.html'), html, 'utf8');
fs.writeFileSync(installerPath, installer, 'utf8');
fs.writeFileSync(batchPath, JSON.stringify(batch, null, 2) + '\n', 'utf8');
batch.parts.forEach((p, i) => {
  fs.writeFileSync(path.join(__dirname, `Part-${i + 1}-pages-${p.pages[0]}-${p.pages.at(-1)}.json`), JSON.stringify({name:p.name, sourceName:batch.sourceName, words:p.words}, null, 2) + '\n', 'utf8');
});
for (const filename of [path.join(root, '本地使用说明.md'), path.join(__dirname, '导入清单.md')]) {
  let text = fs.readFileSync(filename, 'utf8');
  oldNames.forEach((name,i) => { text = text.split(name).join(batch.parts[i].name); });
  fs.writeFileSync(filename, text, 'utf8');
}
const infoPath = path.join(root, 'deployment-info.json');
const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
info.sha256 = crypto.createHash('sha256').update(html).digest('hex');
info.textbookSourceName = batch.sourceName;
fs.writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(batch.parts.map(p => ({name:p.name,count:p.words.length})), null, 2));
