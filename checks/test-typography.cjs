'use strict';
// Real UI font preferences and inherited type styles, with isolated browser storage.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, 'wordforge.html')), checks = [], errors = [];
let browser, server;
function check(name, yes) { assert.ok(yes, name); checks.push(name); console.log('PASS ' + name); }
(async () => {
  server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  for (const [width, height] of [[320, 568], [390, 844], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
    await context.addInitScript(() => localStorage.setItem('wordforge_v1', JSON.stringify({ cfg: { netOff: true, autoSpeak: false, vmode: 'w2m', vask: 'choice' } })));
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => !!window.__WFAPI);
    await page.evaluate(() => __WFAPI.startSession('auto'));
    await page.evaluate(() => document.fonts.ready);
    const type = await page.evaluate(() => {
      const css = s => getComputedStyle(document.querySelector(s));
      return { family: css('body').fontFamily, body: css('body').fontWeight, word: css('.w-word').fontWeight,
        title: css('#pgTitle').fontWeight, next: css('#sessionNext').fontWeight, option: css('.opt').fontWeight,
        ipa: css('.w-ipa').fontFamily, ipaWeight: css('.w-ipa').fontWeight, tracking: css('.w-word').letterSpacing };
    });
    check(`${width}: native sans stack includes Chinese and Android fallbacks`, type.family.includes('Segoe UI') && type.family.includes('PingFang SC') && type.family.includes('Noto Sans') && type.family.includes('Roboto'));
    check(`${width}: body and options use regular weight`, type.body === '400' && type.option === '400');
    check(`${width}: word, Chinese title and primary action use semibold, not heavy bold`, type.word === '600' && type.title === '600' && type.next === '600');
    check(`${width}: phonetics use proportional sans with normal weight`, !/mono|Consolas/i.test(type.ipa) && type.ipaWeight === '400');
    const state = await page.evaluate(() => JSON.stringify([__WFAPI.session().queue, __WFAPI.session().opts, __WFAPI.getDB().prog]));
    for (const font of ['serif', 'mono', 'sans']) {
      await page.evaluate(() => __WFAPI.go('settings'));
      await page.locator(`[data-font="${font}"]`).click();
      await page.evaluate(() => __WFAPI.go('study'));
      const family = await page.locator('.w-word').evaluate(e => getComputedStyle(e).fontFamily);
      check(`${width}: explicit ${font} word-font preference remains effective`, font === 'serif' ? family.includes('Georgia') : font === 'mono' ? family.includes('Consolas') : family.includes('Segoe UI'));
      check(`${width}: changing ${font} typography preserves session and learning records`, await page.evaluate(() => JSON.stringify([__WFAPI.session().queue, __WFAPI.session().opts, __WFAPI.getDB().prog])) === state);
    }
    if (width === 390) {
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, 'typography-study-390x844.png') });
      await page.evaluate(() => __WFAPI.go('today'));
      await page.screenshot({ path: path.join(out, 'typography-home-390x844.png') });
    }
    await context.close();
  }
  check('No browser JavaScript errors', errors.length === 0);
  fs.writeFileSync(path.join(out, 'typography-result.json'), JSON.stringify({ passed: checks.length, errors, checks }, null, 2));
  console.log(`RESULT ${checks.length} passed, 0 failed`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) server.close(); });
