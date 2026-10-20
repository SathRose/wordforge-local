'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'wordforge.html'),'utf8');
const stub=fs.readFileSync(path.join(__dirname,'_stub_dom.js'),'utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>m[2]);
const api=new Function(stub+'\n'+scripts.join('\n;\n')+'\nreturn window.__WFAPI;')();
const batch=JSON.parse(fs.readFileSync(path.join(root,'imports/vocabgo/vocabgo-batch-reviewed.json'),'utf8'));
const original=JSON.parse(fs.readFileSync(path.join(root,'imports/vocabgo/lists-recognized.json'),'utf8'));
let n=0;function test(name,f){f();console.log('PASS '+name);n++;}
test('Exactly 10 screenshot lists and 300 unique words after stitch deduplication',()=>{
 assert.equal(batch.parts.length,10);
 assert.equal(new Set(batch.parts.flatMap(p=>p.words.map(w=>w.w))).size,300);
 batch.parts.forEach((p,i)=>{assert.equal(p.words.length,30);assert.deepEqual(p.words.map(w=>w.w),original.lists[i].words);});
});
for(const part of batch.parts)test(part.name+': complete material, source meaning and study order',()=>{
 const d=api.getDB(),b=d.custom[part.id];api.setBook('@'+part.id);api.setQueueOrder('random');
 assert.equal(b.words.length,30);assert.equal(b.sourceName,'词达人');
 assert.deepEqual(api.buildQueue('all'),part.words.map(w=>w.w));
 part.words.forEach((e,i)=>{
  const r=b.words[i];
  assert.equal(r[api.F.CN],e.cn);assert.equal(r[api.F.EN],e.en);assert.ok(!r[api.F.EN].includes('…'));
  assert.ok(r[api.F.EX]&&r[api.F.EXZ]);assert.ok(r[api.F.US]||r[api.F.UK]);assert.ok(r[api.F.POS]&&r[api.F.FM]);
  assert.equal(r[api.F.PH].split('|').length,2);assert.equal(e.source_attribution.officialVocabgoDefinition,false);
 });
});
test('Study-notes heading is honest, not mislabeled as synonym comparison',()=>{
 api.setBook('@vocabgo_cet4_2_list_03');api.resetJump();api.jumpTo('detail','invalid');
 const h=api.jumpViewHTML();assert.ok(h.includes('用法与辨析'));assert.ok(h.includes('ɪnˈvælɪd'));assert.ok(h.includes('ˈɪnvəlɪd'));
 assert.ok(h.includes('不是词达人官方逐字释义'));
});
test('Different sources keep distinct definitions for the same spelling',()=>{
 api.setBook('@nhce4_u1_part2_p020_022');api.resetJump();api.jumpTo('detail','sketch');
 const textbook=api.jumpViewHTML();
 api.setBook('@vocabgo_cet4_2_list_02');api.resetJump();api.jumpTo('detail','sketch');
 const vocabgo=api.jumpViewHTML();
 assert.ok(textbook.includes('a short written or spoken description'));
 assert.ok(vocabgo.includes('短剧'));assert.notEqual(textbook,vocabgo);
});
test('Additive import preserves progress, settings, original books and selected source',()=>{
 const d=api.blankDB();d.book='cet6';d.prog.sketch=[250,1440,123456,3,0,654321,1,3,0];d.cfg.newPerDay=13;
 d.custom.personal={name:'Other source',words:[api.mkRec({w:'own',cn:'自己的'})]};
 const before=JSON.parse(JSON.stringify(d));api.mergeTextbookImports(d,batch);
 assert.equal(Object.keys(d.custom).length,11);assert.deepEqual(d.prog,before.prog);assert.deepEqual(d.cfg,before.cfg);
 assert.deepEqual(d.custom.personal,before.custom.personal);assert.equal(d.book,'cet6');
});
test('Repeated load neither duplicates nor restores intentionally removed lists',()=>{
 const d=api.blankDB();api.mergeTextbookImports(d,batch);api.mergeTextbookImports(d,batch);
 assert.equal(Object.keys(d.custom).length,10);delete d.custom[batch.parts[2].id];api.mergeTextbookImports(d,batch);
 assert.equal(Object.keys(d.custom).length,9);
});
test('Fresh browser receives both independent sources with correct names',()=>{
 api.init();const d=api.getDB();
 assert.equal(Object.keys(d.custom).length,12);
 assert.equal(d.custom.nhce4_u1_part1_p007_009.name,'读写教程｜Part 1｜第7–9页');
 assert.equal(d.custom.vocabgo_cet4_2_list_10.name,'词达人｜CET4（第二版）｜List 10');
});
console.log('All '+n+' vocabulary import checks passed.');
