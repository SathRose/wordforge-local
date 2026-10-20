'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'wordforge.html'), 'utf8');
const stub = fs.readFileSync(path.join(__dirname, '_stub_dom.js'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => m[2]);
function boot(db) {
  const seed = db ? '\nlocalStorage.setItem("wordforge_v1",' + JSON.stringify(JSON.stringify(db)) + ');\n' : '';
  return new Function(stub + seed + scripts.join('\n;\n') + '\nreturn window.__WFAPI;')();
}
let api = boot();
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const defaults = api.defaultBookPickerOrder();
const customIds = Object.keys(api.getDB().custom).map(k => '@' + k);
test('All 12 imported custom books appear before built-in books', () => {
  assert.equal(customIds.length, 12);
  assert.deepEqual(defaults.slice(0, 12), customIds);
  assert.equal(defaults.length, 40);
  assert.equal(new Set(defaults).size, defaults.length);
});
test('Empty or malformed saved preference falls back to custom-first order', () => {
  for (const v of [null, undefined, {}, 'cet4', []]) assert.deepEqual(api.normalizeBookPickerOrder(v), defaults);
});
test('An explicit arbitrary order spans all categories', () => {
  assert.deepEqual(api.normalizeBookPickerOrder(defaults.slice().reverse()), defaults.slice().reverse());
});
test('Missing/deleted IDs and duplicate IDs are removed', () => {
  const v = api.normalizeBookPickerOrder(['bogus', defaults[13], defaults[13], null, 2, ...defaults]);
  assert.equal(v[0], defaults[13]);
  assert.equal(v.length, 40);
  assert.equal(new Set(v).size, 40);
});
test('Newly imported custom books prepend without disturbing existing relative order', () => {
  const saved = defaults.slice().reverse();
  api.getDB().custom.pickerNew = { name:'新来源', words:[] };
  assert.deepEqual(api.normalizeBookPickerOrder(saved), ['@pickerNew', ...saved]);
  delete api.getDB().custom.pickerNew;
});
test('Missing built-in books append rather than overriding saved positions', () => {
  assert.deepEqual(api.normalizeBookPickerOrder(customIds), defaults);
});
test('Top / up / down work without mutating the source array', () => {
  const original = ['a', 'b', 'c'];
  assert.deepEqual(api.moveBookPickerItem(original, 'c', 'top'), ['c', 'a', 'b']);
  assert.deepEqual(api.moveBookPickerItem(original, 'c', 'up'), ['a', 'c', 'b']);
  assert.deepEqual(api.moveBookPickerItem(original, 'a', 'down'), ['b', 'a', 'c']);
  assert.deepEqual(original, ['a', 'b', 'c']);
});
test('Move boundaries, unknown ID and unknown action safely do nothing', () => {
  for (const [id, action] of [['a','up'],['a','top'],['c','down'],['x','up'],['b','remove']])
    assert.deepEqual(api.moveBookPickerItem(['a','b','c'], id, action), ['a','b','c']);
});
test('Old database migration adds order preference without changing existing data', () => {
  const old = JSON.parse(JSON.stringify(api.getDB()));
  delete old.bookPickerOrder;
  old.cfg.theme = 'sakura';
  old.prog.accent = { reps: 3, due: 1792800000000, marker:'preserve' };
  const oldCopy = JSON.parse(JSON.stringify(old));
  api = boot(old);
  assert.deepEqual(api.getDB().bookPickerOrder, []);
  const loaded = JSON.parse(JSON.stringify(api.getDB()));
  delete loaded.bookPickerOrder;
  assert.deepEqual(loaded, oldCopy);
});
test('Opening and cancelling editor never writes order preference', () => {
  const before = JSON.stringify(api.getDB());
  api.showBookOrderEditor();
  document.getElementById('bookSortReset').click();
  document.getElementById('bookSortCancel').click();
  assert.equal(JSON.stringify(api.getDB()), before);
});
test('Saving custom order writes local storage and leaves all other fields untouched', () => {
  const db = api.getDB();
  db.bookPickerOrder = defaults.slice().reverse();
  const before = JSON.stringify(db);
  api.showBookOrderEditor();
  document.getElementById('bookSortSave').click();
  assert.equal(JSON.stringify(api.getDB()), before);
  assert.deepEqual(JSON.parse(localStorage.getItem('wordforge_v1')), db);
});
test('Saved order survives a full reload', () => {
  api = boot(JSON.parse(localStorage.getItem('wordforge_v1')));
  assert.deepEqual(api.normalizeBookPickerOrder(api.getDB().bookPickerOrder), defaults.slice().reverse());
});
test('Picker card DOM follows saved order and contains no nested buttons', () => {
  api.showBookPicker();
  const markup = document.getElementById('modal').innerHTML;
  const ids = [...markup.matchAll(/data-book="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, defaults.slice().reverse());
  assert.ok(markup.includes('id="bookSortEdit"'));
  assert.ok(!/<button[^>]*data-book[^>]*>(?:(?!<\/button>)[\s\S])*<button/.test(markup));
});
test('Restore default is a draft until save; progress and word order remain intact', () => {
  const before = JSON.parse(JSON.stringify(api.getDB()));
  const order = api.getDB().custom[customIds[0].slice(1)].words.map(w => w[api.F.W]);
  api.showBookOrderEditor();
  document.getElementById('bookSortReset').click();
  assert.deepEqual(api.getDB(), before);
  document.getElementById('bookSortSave').click();
  assert.deepEqual(api.getDB().bookPickerOrder, defaults);
  before.bookPickerOrder = defaults;
  assert.deepEqual(api.getDB(), before);
  assert.deepEqual(api.getDB().custom[customIds[0].slice(1)].words.map(w => w[api.F.W]), order);
});
console.log('RESULT ' + passed + ' passed, 0 failed');
