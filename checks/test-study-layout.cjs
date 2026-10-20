'use strict';
// Compact study layout: isolated browser data only, never the user's running source.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, 'wordforge.html'));
let browser, server;
const checks = [], errors = [];
function check(name, value, detail) { assert.ok(value, name + (detail ? ': ' + JSON.stringify(detail) : '')); checks.push(name); }
async function geometry(page, label, mustFit = true) {
  await page.waitForTimeout(260); // Finish real card entrance animations before hit-testing.
  const g = await page.evaluate(() => {
    const v = document.querySelector('#view'), card = document.querySelector('#wcard'), dock = document.querySelector('#sessionDock');
    const vr = v.getBoundingClientRect(), cr = card.getBoundingClientRect(), dr = dock.getBoundingClientRect();
    const targets = [...document.querySelectorAll('#view .opt, #sessionNext, #sessionPrev, #reveal, #view .gbtn, #studyDetails, #studyPrompt, #view #say')].filter(e => !e.disabled);
    const obscured = targets.filter(e => {
      const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      return y < vr.top || y > vr.bottom || !e.contains(document.elementFromPoint(x, y));
    }).map(e => e.id || e.getAttribute('data-pick'));
    const clipped = [...document.querySelectorAll('.opt>span:last-child, .study-meaning, #view .w-word')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => ({ cls: e.className, sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth }));
    return { scroll: v.scrollHeight - v.clientHeight, top: v.scrollTop, overlap: cr.bottom > dr.top + 1, dockVisible: dr.top >= vr.top && dr.bottom <= vr.bottom + 1, obscured, clipped,
      small: [...document.querySelectorAll('.opt, #sessionNext, #sessionPrev, #view .gbtn')].some(e => e.getBoundingClientRect().height < 43),
      horizontal: document.documentElement.scrollWidth > innerWidth || card.scrollWidth > card.clientWidth + 1,
      density: v.getAttribute('data-density') };
  });
  check(label + ': card and controls never overlap', !g.overlap, g);
  check(label + ': option text is not clipped or clamped', !g.clipped.length && !g.horizontal, g);
  check(label + ': tap targets retain at least 44px height', !g.small, g);
  if (mustFit) {
    if (g.scroll > 1) await page.screenshot({ path: path.join(out, 'compact-overflow-debug.png') });
    check(label + ': complete main flow fits without vertical scrolling', g.scroll <= 1 && g.top === 0 && g.dockVisible, g);
    check(label + ': every visible action is hit-testable, not covered', !g.obscured.length, g);
  }
  return g;
}
async function setup(page, mode, count) {
  await page.evaluate(({ mode, count }) => {
    const a = __WFAPI, d = a.blankDB();
    const words = [
      ['environmental', 'adj. 环境的；有关自然环境及其保护的'],
      ['responsibility', 'n. 责任；职责；需要负责处理的事情'],
      ['comprehensive', 'adj. 全面的；综合性的；内容详尽的'],
      ['pronunciation', 'n. 发音；读音；单词或语言的发音方式'],
      ['accommodation', 'n. 住宿；住处；为旅客提供的房间'],
      ['communication', 'n. 交流；沟通；信息的传递与表达']
    ].map(([w, cn]) => a.mkRec({ w: w + 'qa', cn: cn + '\n补充义项：用于完整题干与详解的第二行', us: 'ˌkɒmprɪˈhensɪv', uk: 'ˌkɑːmprɪˈhensɪv', en: 'A complete explanation used only in the full prompt.', ex: 'This example remains available in the word details.', exz: '例句完整保留在详解中。', fm: '复数:books' }));
    d.custom.layout = { name: '隔离布局测试', words }; d.book = '@layout';
    Object.assign(d.cfg, { autoSpeak: false, netOff: true, optCount: count, fontSize: 20, blurDef: true, vflipFirst: true,
      vmode: mode === 'recall' || mode === 'recallCard' ? 'm2w' : 'w2m', vask: mode === 'card' || mode === 'recallCard' ? 'recall' : mode === 'listen' ? 'listen' : 'choice' });
    a.setDB(d); a.resetPreview(); a.startSession('auto');
  }, { mode, count });
}
(async () => {
  server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  for (const [width, height] of [[320, 568], [320, 640], [360, 640], [390, 844], [412, 815], [458, 966], [800, 360], [1440, 900]]) {
    if (process.env.STUDY_VIEWPORT && process.env.STUDY_VIEWPORT !== `${width}x${height}`) continue;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900 });
    await context.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
    await context.addInitScript(() => {
      localStorage.setItem('wordforge_v1', JSON.stringify({ cfg: { netOff: true, autoSpeak: false, fontSize: 20 } }));
      window.WordForgeNative = { ttsSpeak() {} }; // Make listen mode deterministic; no sound/network.
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => !!window.__WFAPI);
    check(`${width}x${height}: configured maximum interface font is actually applied`, await page.evaluate(() => getComputedStyle(document.documentElement).fontSize) === '20px');
    for (const count of [4, 6]) for (const mode of ['recog', 'recall', 'listen', 'card', 'recallCard']) {
      const label = `${width}x${height}/${mode}/${count}`;
      await setup(page, mode, count);
      check(label + ': requested question type actually renders', await page.evaluate(() => __WFAPI.pickMode()) === mode);
      await geometry(page, label + '/question');
      if (mode === 'recall' || mode === 'recallCard') {
        const state = await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().opts, __WFAPI.getDB().prog]));
        await page.locator('#studyPrompt').click();
        check(label + ': full prompt retains secondary meanings without revealing word header', (await page.locator('.modal-b').innerText()).includes('补充义项') && await page.locator('.modal-b .w-word').count() === 0);
        await page.locator('#mClose').click();
        check(label + ': prompt dialog does not change question or records', await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().opts, __WFAPI.getDB().prog])) === state);
      }
      if (mode === 'card' || mode === 'recallCard') await page.locator('#reveal').click();
      else {
        const bad = await page.evaluate(() => __WFAPI.session().opts.findIndex(o => !o.ok));
        await page.locator(`.opt[data-pick="${bad}"]`).click();
      }
      await geometry(page, label + '/answered');
      const state = await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().opts, __WFAPI.getDB().prog]));
      await page.locator('#studyDetails').click();
      const detailText = await page.locator('.modal-b').innerText();
      check(label + ': full details retain example and all meanings', detailText.includes('This example remains available') && detailText.includes('补充义项'), detailText);
      await page.locator('#mClose').click();
      check(label + ': details close preserves answer and score', await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().opts, __WFAPI.getDB().prog])) === state);
      if (count === 4 && ['recog', 'card'].includes(mode) && [320, 390, 800].includes(width)) {
        await page.waitForTimeout(300); // Let the real modal-close fade finish before visual evidence.
        await page.screenshot({ path: path.join(out, `compact-${mode}-${width}x${height}.png`) });
      }
    }
    await setup(page, 'card', 4); await page.locator('#reveal').click();
    const drillState = await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().revealed, __WFAPI.getDB().prog]));
    await page.locator('#studyDetails').click();
    await page.locator('.modal-b [data-jump]').first().click();
    check(`${width}x${height}: details drill-down closes old overlay`, await page.locator('#mask.on').count() === 0 && await page.locator('#jumpBack').count() === 1);
    await page.locator('#jumpBack').click();
    check(`${width}x${height}: drill-down returns to the same revealed card`, await page.locator('#wcard').count() === 1 && await page.evaluate(() => JSON.stringify([__WFAPI.session().i, __WFAPI.session().revealed, __WFAPI.getDB().prog])) === drillState);
    await setup(page, 'recog', 6);
    const resizeState = await page.evaluate(() => JSON.stringify([__WFAPI.session().queue, __WFAPI.session().opts, __WFAPI.getDB().prog]));
    await page.setViewportSize({ width: 320, height: 568 });
    await geometry(page, `${width}x${height}/resize-to-short-screen`);
    check(`${width}x${height}: resizing only changes layout, not queue or records`, await page.evaluate(() => JSON.stringify([__WFAPI.session().queue, __WFAPI.session().opts, __WFAPI.getDB().prog])) === resizeState);
    await page.setViewportSize({ width, height });
    // Arbitrarily long user content must remain readable, never hidden behind a fixed dock.
    await setup(page, 'recog', 6);
    await page.evaluate(() => { const s = __WFAPI.session(); s.opts.forEach(o => { o.v = '超长自定义释义，完整保留不裁掉。'.repeat(60); }); __WFAPI.go('study'); });
    await geometry(page, `${width}x${height}/extreme-text`, false);
    await page.locator('#sessionNext').scrollIntoViewIfNeeded();
    check(`${width}x${height}: extreme-content fallback still reaches Next`, await page.locator('#sessionNext').isVisible());
    await context.close(); console.log('PASS all compact layouts at ' + width + 'x' + height);
  }
  check('No browser JavaScript errors', errors.length === 0, errors);
  fs.writeFileSync(path.join(out, 'study-layout-result.json'), JSON.stringify({ passed: checks.length, errors, checks }, null, 2));
  console.log(`RESULT ${checks.length} passed, 0 failed`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) server.close(); });
