'use strict';
// Optional browser regression suite. Install Playwright outside the zero-dependency app,
// or set PLAYWRIGHT_MODULE to its module path. All test data uses an isolated context.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, process.argv[2] || 'wordforge.html'));
const results = [], errors = [];
let browser, server;
function check(name, condition) { assert.ok(condition, name); results.push(name); console.log('PASS ' + name); }
const articleText = Array.from({ length: 12 }, (_, i) =>
  `Learning through reading is a useful way to build a strong vocabulary. Every morning, students explore a new story about science and nature. They study how people protect the environment and develop sophisticated, comprehensive solutions to ambiguous problems. This is paragraph ${i + 1}.`).join('\n\n');
async function metrics(page, selector) {
  return page.locator(selector).evaluate(e => {
    const r = e.getBoundingClientRect(), v = document.querySelector('#view').getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, visible: r.top >= v.top - 1 && r.bottom <= v.bottom + 1 };
  });
}
async function noOverflow(page, name) {
  const bad = await page.evaluate(() => [...document.querySelectorAll('#topbar *, #view *, #mtab *, #mask.on *')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.right > innerWidth + 2 || r.left < -2);
  }).slice(0, 8).map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent.slice(0, 45) })));
  check(name + ': no horizontal overflow ' + JSON.stringify(bad), !bad.length);
}
async function seedArticle(page, id = 'mobile-fixture') {
  return page.evaluate(({ text, id }) => {
    const a = __WFAPI.artMk({ id, t: 'Learning, One Story at a Time', text, src: 'Isolated UI test', lic: 'Test fixture' });
    __WFAPI.artSave(a); return a.id;
  }, { text: articleText, id });
}
async function shot(page, name) {
  await page.waitForTimeout(2300); // Let real toast/entrance animations finish, do not edit the scene.
  await page.screenshot({ path: path.join(out, name) });
}
async function nav(page, name, width) {
  await page.locator(width < 900 ? `#mtab [data-go="${name}"]` : `.nav[data-go="${name}"]`).click();
}
(async () => {
  server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  for (const [width, height] of [[320, 640], [360, 640], [390, 844], [412, 892], [458, 966], [800, 360], [1440, 900]]) {
    const label = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900 });
    await context.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('wordforge_v1', JSON.stringify({ cfg: { netOff: true, autoSpeak: false } })));
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(label + ': ' + e.message));
    await page.goto(url); await page.waitForFunction(() => !!window.__WFAPI);
    // 切换真实选书按钮，确保旧会话和撤销栈不会跨词书残留。
    const switchResult = await page.evaluate(() => {
      const api = __WFAPI, original = api.getDB(), d = api.blankDB();
      const rows = api.bookWords('cet4').slice(0, 8);
      d.custom.switchA = { name: '切书 A', words: rows.slice(0, 4) };
      d.custom.switchB = { name: '切书 B', words: rows.slice(4, 8) };
      d.book = '@switchA'; d.cfg.autoSpeak = false;
      api.setDB(d); api.resetPreview(); api.startSession('auto');
      const progress = JSON.stringify(d.prog);
      api.showBookPicker();
      document.querySelector('[data-book="@switchB"]').click();
      const cleared = api.session() === null;
      const preview = api.previewQueue('auto');
      api.startSession('auto');
      const s = api.session(), allowed = rows.slice(4, 8).map(r => r[0]);
      const result = { cleared, newBook: s.book === '@switchB' && s.queue.every(w => allowed.includes(w)), preview: preview.every(w => allowed.includes(w)), preserved: progress === JSON.stringify(d.prog) };
      api.setDB(original); api.go('today'); api.resetPreview();
      return result;
    });
    check(label + ': changing book clears old session', switchResult.cleared);
    check(label + ': changing book replaces preview and actual queue', switchResult.newBook && switchResult.preview);
    check(label + ': changing book preserves progress', switchResult.preserved);
    await noOverflow(page, label + ' home');
    if (width < 900 && height >= 500) {
      check(label + ': primary study action visible without scrolling', (await metrics(page, '#startStudy')).visible);
      const title = await metrics(page, '#pgTitle');
      check(label + ': header title is not stacked character-by-character', title.width >= 28 && title.height < 40);
      const slots = await page.evaluate(() => ({ view: document.querySelector('#view').getBoundingClientRect().bottom, nav: document.querySelector('#mtab').getBoundingClientRect().top }));
      check(label + ': native-safe navigation does not cover content', Math.abs(slots.view - slots.nav) <= 1);
    }
    if (width === 390 || width === 1440) await shot(page, `home-${label}.png`);
    await page.evaluate(() => { __WFAPI.setCfg('vmode', 'w2m'); __WFAPI.setCfg('vask', 'recall'); __WFAPI.setCfg('autoSpeak', false); });
    await page.locator('#startStudy').click();
    check(label + ': start study opens an actual card', await page.locator('#wcard').count() === 1);
    check(label + ': explicit Next is present', await page.locator('#sessionNext').count() === 1);
    if (width < 900 && height >= 500) check(label + ': study navigation visible without scrolling', (await metrics(page, '#sessionNext')).visible);
    const index = await page.evaluate(() => __WFAPI.session().i);
    await page.locator('#sessionNext').click();
    check(label + ': skip works without keyboard or gestures', await page.evaluate(() => __WFAPI.session().i) === index + 1);
    await page.locator('#sessionPrev').click();
    check(label + ': previous restores the card', await page.evaluate(() => __WFAPI.session().i) === index);
    // Use the actual card-flip control, then score and submit via visible controls.
    const reveal = page.locator('#reveal');
    if (await reveal.count()) await reveal.click();
    else await page.locator('.opt').first().click();
    await page.locator('[data-g="3"]').click();
    check(label + ': answered Next is labelled as a save action', (await page.locator('#sessionNext').innerText()).includes('保存评价'));
    const cardState = await page.evaluate(() => { const s = __WFAPI.session(); return JSON.stringify([s.queue, s.i, s.pending, s.revealed, s.steps]); });
    await nav(page, 'read', width); await nav(page, 'study', width);
    check(label + ': tab return restores revealed card and pending rating', await page.locator('#wcard').count() === 1 && await page.evaluate(() => { const s = __WFAPI.session(); return JSON.stringify([s.queue, s.i, s.pending, s.revealed, s.steps]); }) === cardState);
    if (width === 390) await shot(page, 'session-390x844.png');
    const first = await page.evaluate(() => __WFAPI.session().queue[__WFAPI.session().i]);
    await page.locator('#sessionNext').click();
    check(label + ': score is committed only on Next', await page.evaluate(w => !!__WFAPI.getDB().prog[w], first));
    await page.locator('#sessionPrev').click();
    check(label + ': previous undoes scoring instead of double counting', await page.evaluate(w => !__WFAPI.getDB().prog[w], first));
    await page.evaluate(() => { const s = __WFAPI.session(); s.queue = [s.queue[s.i]]; s.i = 0; });
    if (await page.locator('#reveal').count()) await page.locator('#reveal').click();
    else await page.locator('.opt').first().click();
    await page.locator('#sessionNext').click();
    check(label + ': final card automatically starts a different batch', await page.evaluate(w => { const s = __WFAPI.session(); return s.i === 0 && !s.queue.includes(w); }, first));
    check(label + ': next batch displays a card', await page.locator('#wcard').count() === 1);
    await page.evaluate(() => __WFAPI.go('today'));
    check(label + ': Home remains accessible after automatic continuation', await page.locator('#startStudy').count() === 1);
    // Choices save immediately; wrong answers remain visible until the learner continues.
    await page.evaluate(() => { __WFAPI.setCfg('vmode', 'w2m'); __WFAPI.setCfg('vask', 'choice'); __WFAPI.setCfg('autoSpeak', false); __WFAPI.startSession('auto'); });
    check(label + ': choice mode renders options', await page.locator('.opt').count() > 0);
    const optionState = await page.evaluate(() => JSON.stringify(__WFAPI.session().opts));
    await nav(page, 'read', width);
    const hiddenIndex = await page.evaluate(() => __WFAPI.session().i);
    await page.keyboard.press('Enter'); await page.keyboard.press('f');
    check(label + ': hidden study session ignores study shortcuts', await page.locator('#wcard').count() === 0 && await page.evaluate(() => __WFAPI.session().i) === hiddenIndex);
    await nav(page, 'study', width);
    check(label + ': tab return keeps unanswered choice order', await page.locator('.opt').count() > 0 && await page.evaluate(() => JSON.stringify(__WFAPI.session().opts)) === optionState);
    {
      const word = await page.evaluate(() => { const s = __WFAPI.session(); return s.queue[s.i]; });
      const before = await page.evaluate(() => __WFAPI.session().i);
      const beforeRec = await page.evaluate(w => { const p = __WFAPI.getDB().prog[w]; return p ? { ok: p[7], no: p[8] } : { ok: 0, no: 0 }; }, word);
      const okIdx = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => o.ok));
      await page.locator(`.opt[data-pick="${okIdx}"]`).click();
      check(label + ': correct choice advances immediately', await page.evaluate(() => __WFAPI.session().i) === before + 1);
      const afterRec = await page.evaluate(w => { const p = __WFAPI.getDB().prog[w]; return { ok: p[7], no: p[8] }; }, word);
      check(label + ': correct choice is saved as known without manual rating',
        afterRec.ok === beforeRec.ok + 1 && afterRec.no === beforeRec.no, JSON.stringify({ beforeRec, afterRec }));
      check(label + ': no manual rating bar after a choice', await page.locator('.gbtn').count() === 0);
    }
    check(label + ': no spelling input is rendered', await page.locator('#spellIn').count() === 0);
    {
      await page.evaluate(() => __WFAPI.startSession('auto'));
      const word = await page.evaluate(() => { const s = __WFAPI.session(); return s.queue[s.i]; });
      const beforeRec = await page.evaluate(w => { const p = __WFAPI.getDB().prog[w]; return p ? { ok: p[7], no: p[8] } : { ok: 0, no: 0 }; }, word);
      const badIdx = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => !o.ok));
      const okIdx = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => o.ok));
      const beforeIndex = await page.evaluate(() => __WFAPI.session().i);
      const beforeDB = await page.evaluate(() => { const d = __WFAPI.getDB(); return JSON.stringify([d.prog, d.log, d.wlog]); });
      const beforeOpts = await page.evaluate(() => JSON.stringify(__WFAPI.session().opts));
      await page.locator(`.opt[data-pick="${badIdx}"]`).click();
      const afterRec = await page.evaluate(w => { const p = __WFAPI.getDB().prog[w]; return { ok: p[7], no: p[8] }; }, word);
      check(label + ': wrong choice is saved as forgotten without manual rating',
        afterRec.no === beforeRec.no + 1 && afterRec.ok === beforeRec.ok, JSON.stringify({ beforeRec, afterRec }));
      check(label + ': wrong answer stays on current word', await page.evaluate(() => __WFAPI.session().i) === beforeIndex);
      check(label + ': correct answer and mistaken choice have explicit labels',
        (await page.locator(`.opt.right[data-pick="${okIdx}"]`).innerText()).includes('正确答案') &&
        (await page.locator(`.opt.wrong[data-pick="${badIdx}"]`).innerText()).includes('你的选择'));
      check(label + ': wrong feedback is visible and options are locked', await page.locator('#choiceFeedback[role="status"]').count() === 1 && await page.locator('.opt:not([disabled])').count() === 0 && await page.locator('.gbtn').count() === 0);
      check(label + ': correct option is scrolled into view above the action dock', (await metrics(page, '.opt.right')).visible && await page.evaluate(() => document.querySelector('.opt.right').getBoundingClientRect().bottom <= document.querySelector('#sessionDock').getBoundingClientRect().top));
      await noOverflow(page, label + ' wrong answer');
      if (width === 390) await shot(page, 'wrong-choice-390x844.png');
      await nav(page, 'read', width); await nav(page, 'study', width);
      check(label + ': wrong feedback and option order survive tabs', await page.locator('.opt.right').count() === 1 && await page.locator('.opt.wrong').count() === 1 && await page.evaluate(() => JSON.stringify(__WFAPI.session().opts)) === beforeOpts);
      await page.keyboard.press(String(okIdx + 1));
      check(label + ': repeat choice cannot change grade or add rating bar', await page.locator('.gbtn').count() === 0 && await page.evaluate(() => __WFAPI.session().pending) === 0);
      await page.locator('#sessionNext').click();
      check(label + ': continuing wrong answer advances without duplicate scoring', await page.evaluate(() => __WFAPI.session().i) === beforeIndex + 1 && await page.evaluate(w => __WFAPI.getDB().prog[w][8], word) === afterRec.no);
      await page.locator('#sessionPrev').click();
      check(label + ': previous fully undoes saved wrong answer', await page.evaluate(() => { const d = __WFAPI.getDB(); return JSON.stringify([d.prog, d.log, d.wlog]); }) === beforeDB);
      // Keyboard choices use the same feedback path. Undo while still viewing a wrong answer.
      const keyboardBad = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => !o.ok));
      await page.keyboard.press(String(keyboardBad + 1));
      await page.locator('#sessionPrev').click();
      check(label + ': undo held first answer restores all records and allows retry', await page.evaluate(() => { const d = __WFAPI.getDB(); return JSON.stringify([d.prog, d.log, d.wlog]); }) === beforeDB && await page.locator('.opt:not([disabled])').count() > 0);
      // Last-word mistakes must not trigger batch continuation before confirmation.
      await page.evaluate(() => { const s = __WFAPI.session(); s.queue = [s.queue[s.i]]; s.i = 0; __WFAPI.go('study'); });
      const lastBad = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => !o.ok));
      await page.locator(`.opt[data-pick="${lastBad}"]`).click();
      check(label + ': last wrong answer waits for confirmation', await page.locator('#choiceFeedback').count() === 1 && await page.evaluate(() => __WFAPI.session().queue.length === 1 && __WFAPI.session().i === 0));
      await page.locator('#sessionNext').click();
      check(label + ': confirmed last wrong answer continues to different batch', await page.evaluate(w => !__WFAPI.session().queue.includes(w), word));
    }
    await page.evaluate(() => { __WFAPI.setCfg('vmode', 'm2w'); __WFAPI.startSession('auto'); });
    const reverseBad = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => !o.ok));
    const reverseAnswer = await page.evaluate(() => __WFAPI.session().opts.find(o => o.ok).v);
    await page.locator(`.opt[data-pick="${reverseBad}"]`).click();
    check(label + ': Chinese-to-English wrong choice highlights the correct word', (await page.locator('.opt.right').innerText()).includes(reverseAnswer) && await page.locator('#choiceFeedback').count() === 1);
    await page.evaluate(() => { const api = __WFAPI, s = api.session(), w = s.queue[s.i]; api.getDB().prog[w][api.N.DUE] = 1; api.startSession('review'); });
    const reviewState = await page.evaluate(() => { const s = __WFAPI.session(); return JSON.stringify([s.kind, s.queue, s.i, s.opts]); });
    await nav(page, 'read', width); await nav(page, 'review', width);
    check(label + ': review tab also restores its active session', await page.locator('#wcard').count() === 1 && await page.evaluate(() => { const s = __WFAPI.session(); return JSON.stringify([s.kind, s.queue, s.i, s.opts]); }) === reviewState);
    await page.locator('#quitSes').click(); await page.locator('#mYes').click();
    await nav(page, 'study', width);
    check(label + ': explicitly ended session is not resurrected by navigation', await page.locator('#wcard').count() === 0 && await page.evaluate(() => __WFAPI.session()) === null);
    const id = await seedArticle(page);
    // This route used to render correctly but have no click handlers from Today.
    await page.evaluate(id => { __WFAPI.go('today'); __WFAPI.jumpTo('art', id); }, id);
    await page.locator('[data-assist="2"]').click();
    check(label + ': reader assistance works when entered from Today', await page.evaluate(() => __WFAPI.getDB().cfg.readAssist === 2) && await page.locator('[data-assist="2"]').getAttribute('aria-pressed') === 'true');
    await page.locator('[data-assist="3"]').click();
    check(label + ': sentence mode updates actual article content', await page.locator('#rdBody .rsent').count() > 0);
    await page.locator('[data-assist="0"]').click();
    await page.locator('.reader-options summary').click();
    await page.locator('[data-read-size="1"]').click();
    check(label + ': font control is persisted', await page.evaluate(() => __WFAPI.getDB().cfg.readFontSize === 18));
    await page.locator('.reader-options summary').click();
    if (width === 390 || width === 1440) await shot(page, `reader-${label}.png`);
    await page.locator('#rdBody [data-word="learning"]').first().click();
    check(label + ': word lookup opens an accessible dialog', await page.locator('#mask.on [role="dialog"]').count() === 1);
    if (width === 390) await shot(page, 'word-sheet-390x844.png');
    await noOverflow(page, label + ' word sheet');
    await page.locator('#wpAdd').click();
    check(label + ': word can be collected from the reading sheet', await page.evaluate(() => __WFAPI.readBook().words.length > 0));
    await page.locator('#mClose').click();
    await page.evaluate(() => { const v = document.querySelector('#view'); v.scrollTop = (v.scrollHeight - v.clientHeight) * .45; });
    await page.waitForTimeout(150);
    const oldTop = await page.locator('#view').evaluate(v => v.scrollTop);
    const pos = await page.evaluate(id => __WFAPI.artGet(id).rd.pos, id);
    check(label + ': reading position saved', pos > .3 && pos < .6);
    await page.evaluate(() => __WFAPI.jumpTo('detail', 'learning'));
    await page.locator('#jumpBack').click();
    check(label + ': return from full word detail preserves reading position', Math.abs(await page.locator('#view').evaluate(v => v.scrollTop) - oldTop) <= 3);
    await page.evaluate(() => __wfBack());
    check(label + ': Back goes up the reading stack rather than exits', await page.locator('#rdBody').count() === 0);
    await page.evaluate(id => __WFAPI.jumpTo('art', id), id);
    check(label + ': reopening article resumes progress', await page.locator('#view').evaluate(v => v.scrollTop) > 100);
    await noOverflow(page, label + ' reader');
    await page.evaluate(() => { __WFAPI.go('read'); __WFAPI.RD_SET('mine'); __WFAPI.render(); });
    await page.locator('#rdPaste').fill('A draft that must survive tab changes.');
    await page.locator('[data-rtab="discover"]').click();
    await page.locator('[data-rtab="mine"]').first().click();
    check(label + ': paste draft survives tab changes', await page.locator('#rdPaste').inputValue() === 'A draft that must survive tab changes.');
    await page.locator('#rdPaste').fill('标题：A New Reading Test\n' + articleText);
    await page.locator('#rdImport').click();
    check(label + ': paste import opens a working reader', await page.locator('#rdBody').count() === 1 && (await page.locator('.rtitle').innerText()) === 'A New Reading Test');
    await page.evaluate(() => __WFAPI.go('read'));
    await page.locator('[data-rtab="discover"]').click();
    check(label + ': more sources remain available but collapsed', await page.locator('.read-more-sources').getAttribute('open') === null);
    if (width === 390) await shot(page, 'read-discover-390x844.png');
    await noOverflow(page, label + ' discovery');
    await context.close();
  }
  check('No browser JavaScript errors: ' + JSON.stringify(errors), errors.length === 0);
  fs.writeFileSync(path.join(out, 'mobile-ui-result.json'), JSON.stringify({ passed: results.length, errors, checks: results }, null, 2));
  console.log(`RESULT ${results.length} passed, 0 failed`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) server.close(); });
