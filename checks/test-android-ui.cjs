'use strict';
// Run only against an isolated QA emulator, never a phone with real study data.
// Build with --qa, install it, launch the Activity, then run this script.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect, shell } = require('../android/check-webview.cjs');
const out = path.resolve(__dirname, '../test-results');
fs.mkdirSync(out, { recursive: true });
const delay = ms => new Promise(r => setTimeout(r, ms));
const results = [];
let c;
function check(name, value) { assert.ok(value, name); results.push(name); console.log('PASS ' + name); }
async function tap(selector) {
  const point = await c.evaluate(`(function(){var e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing tap target');e.scrollIntoView({block:${JSON.stringify(selector.startsWith('#rdBody') ? 'center' : 'nearest')},behavior:'instant'});var r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await c.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await c.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(450); // WebView versions with a delayed tap recognizer need one extra frame window.
}
async function shot(name) {
  await delay(2300);
  const data = await c.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data.data, 'base64'));
}
async function back() { shell(['shell', 'input', 'keyevent', '4']); await delay(450); }
(async () => {
  c = await connect();
  for (let i = 0; i < 80; i++) {
    if (await c.evaluate('!!window.__WFAPI')) break;
    await delay(150);
  }
  if (/mInputShown=true/.test(shell(['shell', 'dumpsys', 'input_method']))) await back();
  const sdk = shell(['shell', 'getprop', 'ro.build.version.sdk']);
  await c.evaluate(`if(document.getElementById('mask').classList.contains('on'))document.getElementById('mClose').click();__WFAPI.getDB().cfg.netOff=true;__WFAPI.getDB().cfg.autoSpeak=false;__WFAPI.go('today');__wfFlushSave();`);
  const viewport = await c.evaluate(`({width:innerWidth,height:innerHeight})`);
  const home = await c.evaluate(`(function(){var r=document.getElementById('startStudy').getBoundingClientRect(),v=document.getElementById('view').getBoundingClientRect(),n=document.getElementById('mtab').getBoundingClientRect();return{visible:r.top>=v.top&&r.bottom<=v.bottom,nav:Math.abs(v.bottom-n.top)<2,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
  check('API ' + sdk + ': primary action is visible on first screen', home.visible);
  check('Native viewport and bottom navigation do not overlap', home.nav && !home.overflow);
  await shot('android-api' + sdk + '-home');
  await tap('#startStudy');
  check('A real touch opens the study card', await c.evaluate(`!!document.getElementById('wcard')`));
  const before = await c.evaluate(`({i:__WFAPI.session().i,log:JSON.stringify(__WFAPI.getDB().log),prog:JSON.stringify(__WFAPI.getDB().prog)})`);
  /* 选择题点击即自动保存并推进；卡片题仍走揭晓 → 评分 → 下一张。 */
  if (await c.evaluate(`!!document.querySelector('.opt')`)) {
    await tap('.opt');
    check('Choice tap commits and advances without manual rating',
      await c.evaluate(`__WFAPI.session().i`) === before.i + 1);
    check('No manual rating bar after a choice',
      await c.evaluate(`document.querySelectorAll('.gbtn').length`) === 0);
  } else {
    await tap('#reveal');
    await tap('[data-g="3"]');
    await tap('#sessionNext');
    check('Visible save-and-next button commits and advances',
      await c.evaluate(`__WFAPI.session().i`) === before.i + 1);
  }
  await tap('#sessionPrev');
  const restored = await c.evaluate(`({i:__WFAPI.session().i,log:JSON.stringify(__WFAPI.getDB().log),prog:JSON.stringify(__WFAPI.getDB().prog)})`);
  check('Previous restores all progress and counts exactly', JSON.stringify(restored) === JSON.stringify(before));
  await back();
  check('Android Back asks before leaving an active session', await c.evaluate(`document.getElementById('mask').classList.contains('on')&&!!document.getElementById('mYes')`));
  await tap('#mYes');
  const text = Array.from({ length: 12 }, () => 'Learning a language through stories makes every new word meaningful. Students explore science, discover unusual ideas, and build a comprehensive understanding of nature. Reading is a journey that rewards patience.').join('\n\n');
  await c.evaluate(`(function(){var a=__WFAPI.artMk({id:'native-ui-fixture',t:'Read with Curiosity',text:${JSON.stringify(text)},src:'QA fixture'});__WFAPI.artSave(a);__WFAPI.go('today');__WFAPI.jumpTo('art',a.id);})()`);
  await tap('[data-assist="3"]');
  check('Assistance switch works from the Today article route', await c.evaluate(`document.querySelectorAll('#rdBody .rsent').length>0`));
  await tap('[data-assist="0"]');
  await shot('android-api' + sdk + '-reader');
  await tap('#rdBody [data-word="learning"]');
  check('Word touch opens the reading sheet', await c.evaluate(`document.getElementById('mask').classList.contains('word-sheet')&&document.getElementById('mask').classList.contains('on')`));
  await shot('android-api' + sdk + '-word-sheet');
  await back();
  check('Hardware Back closes the word sheet, not the article', await c.evaluate(`!document.getElementById('mask').classList.contains('on')&&!!document.getElementById('rdBody')`));
  await c.evaluate(`document.getElementById('view').scrollTop=600`); await delay(200);
  const top = await c.evaluate(`document.getElementById('view').scrollTop`);
  await c.evaluate(`__WFAPI.jumpTo('detail','learning')`);
  await back();
  check('Hardware Back from full entry preserves reading location', Math.abs(await c.evaluate(`document.getElementById('view').scrollTop`) - top) < 3);
  await back();
  check('Hardware Back from the article returns to Today', await c.evaluate(`__WFAPI.curView()==='today'&&__WFAPI.jumpStack().length===0`));
  // A real soft keyboard must resize the native root instead of covering the input/navigation.
  shell(['shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1']);
  await c.evaluate(`__WFAPI.go('read');__WFAPI.RD_SET('mine');__WFAPI.render();`);
  const fullHeight = await c.evaluate('innerHeight');
  await tap('#rdPaste'); await delay(700);
  await c.call('Input.insertText', { text: '标题：A Native Paste Test\n' + text });
  for (let i = 0; i < 32; i++) {
    if (await c.evaluate('innerHeight') < fullHeight - 80) break;
    await delay(250);
  }
  const keyboard = await c.evaluate(`({height:innerHeight,focus:document.activeElement.id,viewBottom:document.getElementById('view').getBoundingClientRect().bottom,navTop:document.getElementById('mtab').getBoundingClientRect().top})`);
  check('Android IME is open during paste editing', keyboard.focus === 'rdPaste' && keyboard.height < fullHeight - 80);
  check('Navigation stays above the soft keyboard', Math.abs(keyboard.viewBottom - keyboard.navTop) < 2);
  await shot('android-api' + sdk + '-keyboard');
  await back();
  await tap('#rdImport');
  check('Native paste import opens the article', await c.evaluate(`!!document.getElementById('rdBody')&&document.querySelector('.rtitle').textContent==='A Native Paste Test'`));
  await c.evaluate(`__wfFlushSave()`);
  const persistent = await c.evaluate(`JSON.stringify(__WFAPI.getDB())`);
  await c.call('Page.reload', {}); await delay(1300);
  check('Reader data survives a WebView reload', await c.evaluate(`JSON.stringify(__WFAPI.getDB())`) === persistent);
  await c.evaluate(`__WFAPI.go('today')`);
  fs.writeFileSync(path.join(out, 'android-ui-api' + sdk + '-result.json'), JSON.stringify({ passed: results.length, sdk, viewport, keyboard, checks: results }, null, 2));
  console.log(`RESULT ${results.length} passed, 0 failed (API ${sdk})`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { if (c) c.close(); });
