'use strict';
// Uses the installed Android SDK and JDK; no Gradle, npm packages, or network needed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const qa = process.argv.includes('--qa');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'D:/Android/SDK';
const jdk = process.env.JAVA_HOME || 'C:/Program Files/Microsoft/jdk-21.0.12.8-hotspot';
const tools = path.join(sdk, 'build-tools/36.0.0');
const platform = path.join(sdk, 'platforms/android-36/android.jar');
// Some Windows SDK binaries do not support Unicode paths. Stage their inputs in ASCII.
const build = path.join(require('node:os').tmpdir(), 'wordforge-apk-' + crypto.createHash('sha256').update(root).digest('hex').slice(0,12), qa ? 'qa' : 'release');
const archivedBuild = path.join(__dirname, qa ? 'build-qa' : 'build-release');
const releases = path.join(root, 'releases');
const signing = path.join(__dirname, 'signing');
const key = path.join(signing, 'wordforge-local.p12');
const pass = path.join(signing, 'password.txt');
function copyTree(from,to) {
  fs.mkdirSync(to,{recursive:true});
  for(const entry of fs.readdirSync(from,{withFileTypes:true})) {
    const src=path.join(from,entry.name), dst=path.join(to,entry.name);
    if(entry.isDirectory())copyTree(src,dst);else if(entry.isFile())fs.copyFileSync(src,dst);
  }
}
for (const p of ['assets','gen','classes','dex']) fs.mkdirSync(path.join(build,p), {recursive:true});
fs.mkdirSync(releases,{recursive:true}); fs.mkdirSync(signing,{recursive:true});
copyTree(path.join(__dirname,'res'),path.join(build,'res'));
fs.copyFileSync(path.join(__dirname,'AndroidManifest.xml'),path.join(build,'AndroidManifest.xml'));
fs.copyFileSync(path.join(__dirname,'src/com/wordforge/local/MainActivity.java'),path.join(build,'MainActivity.java'));
function run(exe,args,cwd=__dirname) {
  const r = cp.spawnSync(exe,args,{cwd,encoding:'utf8',windowsHide:true,env:process.env,maxBuffer:8*1024*1024});
  if(r.error || r.status!==0) throw new Error(path.basename(exe)+' failed\n'+(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
  if(r.stderr.trim()) console.log(r.stderr.trim());
}
const java=path.join(jdk,'bin/java.exe');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let html=fs.readFileSync(path.join(root,'wordforge.html'),'utf8');
const originalHash=hash(path.join(root,'wordforge.html'));
const injection='<meta http-equiv="Content-Security-Policy" content="frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">\n<script>'+fs.readFileSync(path.join(__dirname,'native-bridge.js'),'utf8')+'</script>\n';
if(!html.includes('<head>') || !html.includes('function download(name, text, mime) {')) throw new Error('HTML bridge insertion points not found');
html=html.replace('<head>','<head>\n'+injection);
html=html.replace('function download(name, text, mime) {','function download(name, text, mime) {\n  if (window.WordForgeNative && typeof window.WordForgeNative.exportText === "function") {\n    window.WordForgeNative.exportText(String(name), String(text)); return true;\n  }');
html=html.replace('typeof window.WordForgeNative.ttsSpeak === "function") { TTS_OK = true;', 'typeof window.WordForgeNative.ttsSpeak === "function" && window.WordForgeNative.ttsAvailable()) { TTS_OK = true;');
fs.writeFileSync(path.join(build,'assets/index.html'),html);
fs.copyFileSync(path.join(root,'upstream-LICENSE'),path.join(build,'assets/upstream-LICENSE.txt'));
fs.copyFileSync(path.join(root,'imports/vocabgo/dictionary-sources/ECDICT-LICENSE'),path.join(build,'assets/ECDICT-LICENSE.txt'));
const config=path.join(build,'gen/com/wordforge/local/BuildConfig.java');
fs.mkdirSync(path.dirname(config),{recursive:true});
fs.writeFileSync(config,'package com.wordforge.local; public final class BuildConfig { public static final boolean QA = '+qa+'; }');
run(path.join(tools,'aapt2.exe'),['compile','--dir',path.join(build,'res'),'-o',path.join(build,'resources.zip')]);
run(path.join(tools,'aapt2.exe'),['link','-I',platform,'--manifest',path.join(build,'AndroidManifest.xml'),'-o',path.join(build,'base.apk'),'-A',path.join(build,'assets'),path.join(build,'resources.zip')]);
run(path.join(jdk,'bin/javac.exe'),['-encoding','UTF-8','-source','8','-target','8','-Xlint:-options','-classpath',platform,'-d',path.join(build,'classes'),path.join(build,'MainActivity.java'),config]);
run(path.join(jdk,'bin/jar.exe'),['--create','--file',path.join(build,'classes.jar'),'-C',path.join(build,'classes'),'.']);
run(java,['-cp',path.join(tools,'lib/d8.jar'),'com.android.tools.r8.D8','--min-api','26','--lib',platform,'--output',path.join(build,'dex'),path.join(build,'classes.jar')]);
run(path.join(jdk,'bin/jar.exe'),['--update','--file',path.join(build,'base.apk'),'-C',path.join(build,'dex'),'classes.dex']);
run(path.join(tools,'zipalign.exe'),['-f','-p','4',path.join(build,'base.apk'),path.join(build,'aligned.apk')]);
if(!fs.existsSync(key)) {
  if(!fs.existsSync(pass)) fs.writeFileSync(pass,crypto.randomBytes(32).toString('base64')+'\n',{mode:0o600});
  run(path.join(jdk,'bin/keytool.exe'),['-genkeypair','-keystore',key,'-storetype','PKCS12','-storepass:file',pass,'-keypass:file',pass,'-alias','wordforge','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=WordForge Local, OU=Local Build, O=Personal, C=CN','-noprompt']);
}
const apk=path.join(build,qa?'wordforge-qa.apk':'wordforge-release.apk');
run(java,['-jar',path.join(tools,'lib/apksigner.jar'),'sign','--ks',key,'--ks-key-alias','wordforge','--ks-pass','file:'+pass,'--out',apk,path.join(build,'aligned.apk')]);
const verified=cp.spawnSync(java,['-jar',path.join(tools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk],{encoding:'utf8',windowsHide:true});
if(verified.status!==0)throw new Error('Signature verification failed: '+verified.stderr);
fs.writeFileSync(path.join(build,'signature-verification.txt'),verified.stdout+verified.stderr);
run(path.join(tools,'zipalign.exe'),['-c','-p','4',apk]);
copyTree(build,archivedBuild);
const manifest = fs.readFileSync(path.join(__dirname, 'AndroidManifest.xml'), 'utf8');
const versionName = manifest.match(/android:versionName="([^"]+)"/)[1];
const versionCode = Number(manifest.match(/android:versionCode="(\d+)"/)[1]);
const published=qa?path.join(archivedBuild,'wordforge-qa.apk'):path.join(releases,'词匠-本地版-'+versionName+'.apk');
if(!qa)fs.copyFileSync(apk,published);
const info={file:published,package:'com.wordforge.local',versionName,versionCode,minAndroid:'8.0',targetSdk:35,qa,bytes:fs.statSync(apk).size,sha256:hash(apk),sourceHtmlSha256:originalHash,packagedHtmlSha256:hash(path.join(build,'assets/index.html')),builtAt:new Date().toISOString(),sdkBuildTools:'36.0.0'};
fs.writeFileSync(qa?path.join(archivedBuild,'build-info.json'):path.join(releases,'apk-build-info.json'),JSON.stringify(info,null,2)+'\n');
console.log(JSON.stringify(info,null,2));
