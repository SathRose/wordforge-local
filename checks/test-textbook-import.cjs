'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'wordforge.html'), 'utf8');
const stub = fs.readFileSync(path.join(__dirname, '_stub_dom.js'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => m[2]);
const api = new Function(stub + '\n' + scripts.join('\n;\n') + '\nreturn window.__WFAPI;')();
const batch = JSON.parse(fs.readFileSync(path.join(root, 'imports', 'textbook-batch.json'), 'utf8'));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

for (const part of batch.parts) {
  test(part.name + ': exact source entries and order', () => {
    const book = api.getDB().custom[part.id];
    assert.equal(book.words.length, part.words.length);
    assert.deepEqual(book.words.map(w => w[api.F.W]), part.words.map(w => w.w));
    part.words.forEach((entry, i) => {
      assert.equal(book.words[i][api.F.CN], entry.cn);
      assert.equal(book.words[i][api.F.EN], entry.en);
      assert.equal(book.words[i][api.F.UK], entry.uk);
    });
  });
  test(part.name + ': new-word study queue respects page order even with random preference', () => {
    api.setBook('@' + part.id);
    api.setQueueOrder('random');
    const q = api.buildQueue('all');
    assert.deepEqual(q, part.words.map(w => w.w));
    assert.deepEqual(api.applyOrder(['a', 'b', 'c']), ['a', 'b', 'c']);
    assert.equal(api.getDB().cfg.queueOrder, 'random');
  });
}
test('Built-in duplicate uses the textbook meaning inside source book', () => {
  api.setBook('@' + batch.parts[0].id);
  api.jumpTo('detail', 'absorb');
  const detail = api.jumpViewHTML();
  assert.ok(detail.includes('interest sb. so much'));
  assert.ok(detail.includes('使全神贯注'));
});
test('Built-in books retain their original dictionary', () => {
  api.setBook('cet4');
  api.resetJump();
  api.jumpTo('detail', 'absorb');
  const original = api.words().find(w => w[api.F.W] === 'absorb');
  assert.ok(api.jumpViewHTML().includes(api.esc(original[api.F.CN])));
});
test('Cross-column/cross-page meanings merged, supplement not duplicated', () => {
  assert.ok(batch.parts[0].words.find(w => w.w === 'capture').en.endsWith('using words or pictures'));
  assert.ok(batch.parts[0].words.find(w => w.w === 'competent').en.includes('having enough skill or knowledge'));
  assert.ok(batch.parts[1].words.find(w => w.w === 'negotiate').en.includes('try to reach an agreement'));
  assert.ok(batch.parts[1].words.find(w => w.w === 'desperate').cn.includes('绝望的'));
  for (const p of batch.parts) assert.equal(new Set(p.words.map(w => w.w)).size, p.words.length);
});
test('Migration preserves existing learning data, preferences and custom books', () => {
  const d = api.blankDB();
  d.book = 'cet6';
  d.cfg.newPerDay = 17;
  d.prog.kept = [250, 1440, 12345, 3, 1, 54321, 1, 4, 1];
  d.custom.personal = { name: 'Existing', words: [api.mkRec({ w: 'personal', cn: '个人的' })] };
  const old = JSON.parse(JSON.stringify(d));
  api.mergeTextbookImports(d);
  assert.equal(d.book, old.book);
  assert.deepEqual(d.cfg, old.cfg);
  assert.deepEqual(d.prog, old.prog);
  assert.deepEqual(d.custom.personal, old.custom.personal);
  assert.equal(Object.keys(d.custom).length, 3);
  assert.ok(d._textbookImportBatches[batch.batchId]);
});
test('Reload/idempotence does not duplicate or resurrect intentionally deleted books', () => {
  const d = api.blankDB();
  api.mergeTextbookImports(d);
  api.mergeTextbookImports(d);
  assert.equal(Object.keys(d.custom).length, 2);
  d.custom[batch.parts[1].id].name = 'User renamed';
  delete d.custom[batch.parts[0].id];
  api.mergeTextbookImports(d);
  assert.equal(Object.keys(d.custom).length, 1);
  assert.equal(d.custom[batch.parts[1].id].name, 'User renamed');
});
test('Missing import payload leaves ordinary databases unchanged', () => {
  const seed = window.__WF_TEXTBOOK_IMPORT;
  window.__WF_TEXTBOOK_IMPORT = null;
  const d = api.blankDB();
  const before = JSON.stringify(d);
  api.mergeTextbookImports(d);
  assert.equal(JSON.stringify(d), before);
  window.__WF_TEXTBOOK_IMPORT = seed;
});
console.log('All ' + passed + ' textbook import checks passed.');
