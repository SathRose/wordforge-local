'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const adb = path.join(process.env.ANDROID_HOME || 'D:/Android/SDK','platform-tools/adb.exe');
const serial = process.env.WORDFORGE_DEVICE || 'emulator-5556';
function shell(args) {
  const r=cp.spawnSync(adb,['-s',serial,...args],{encoding:'utf8',windowsHide:true,timeout:15000});
  if(r.status!==0)throw new Error(r.stdout+r.stderr);
  return r.stdout.trim();
}
async function connect() {
  let page;
  for(let i=0;i<60&&!page;i++) {
    try {
      const pid=shell(['shell','pidof','com.wordforge.local']);
      shell(['forward','tcp:9223','localabstract:webview_devtools_remote_'+pid]);
      const pages=await (await fetch('http://127.0.0.1:9223/json/list')).json();
      page=pages.find(p=>p.type==='page'&&p.url.includes('appassets.androidplatform.net'));
    } catch(e) { /* Process and WebView socket initialize asynchronously after launch. */ }
    if(!page)await new Promise(r=>setTimeout(r,200));
  }
  if(!page)throw new Error('WebView page missing');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let seq=0; const pending=new Map();
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    const timer=setTimeout(()=>{ pending.delete(id); reject(new Error(method+' timed out after 20s')); }, 20000);
    pending.set(id,{
      resolve:(v)=>{ clearTimeout(timer); resolve(v); },
      reject:(e)=>{ clearTimeout(timer); reject(e); }
    });
    ws.send(JSON.stringify({id,method,params}));
  });
  async function evaluate(expression) {
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  return {call,evaluate,close:()=>ws.close(),ws};
}
module.exports={connect,shell};
if(require.main===module)(async()=>{
  const c=await connect();
  const source=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):'JSON.stringify({url:location.href,title:document.title,ready:!!window.__WFAPI})';
  try {
    let ready=false;
    for(let i=0;i<60;i++) { if(await c.evaluate('!!window.__WFAPI')){ready=true;break;} await new Promise(r=>setTimeout(r,200)); }
    if(!ready)throw new Error('App API did not initialize within 12 seconds');
    console.log(JSON.stringify(await c.evaluate(source),null,2));
  } finally { c.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
