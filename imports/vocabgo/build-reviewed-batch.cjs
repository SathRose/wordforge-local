'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = __dirname;
const read = n => JSON.parse(fs.readFileSync(path.join(base, n), 'utf8'));
const lists = read('lists-recognized.json').lists;
const study = read('study-material-reviewed.json');
const examples = read('examples-reviewed.json');
const local = read('local-dictionary-candidates.json');
const dictionary = read('dictionary-sources/ecdict-300-full-rows.json');
const urls = {
  ecdict: 'https://github.com/skywind3000/ECDICT',
  core: 'https://dictionary.cambridge.org/dictionary/english/core',
  invalid: 'https://dictionary.cambridge.org/pronunciation/english/invalid',
  resume: 'https://dictionary.cambridge.org/dictionary/learner-english/resume',
  contract: 'https://dictionary.cambridge.org/pronunciation/english/contract',
  frequent: 'https://dictionary.cambridge.org/dictionary/english/frequent',
  mold: 'https://dictionary.cambridge.org/dictionary/english/mold',
  attribute: 'https://dictionary.cambridge.org/dictionary/english/attribute',
  abstract: 'https://dictionary.cambridge.org/pronunciation/english/abstract',
  estimate: 'https://dictionary.cambridge.org/pronunciation/english/estimate',
  construct: 'https://dictionary.cambridge.org/dictionary/english/construct',
  insert: 'https://dictionary.cambridge.org/pronunciation/english/insert',
  ally: 'https://dictionary.cambridge.org/dictionary/english/ally'
};
// Preserve readings by part of speech rather than silently choosing only one.
const pronunciation = {
  core: ['kɔːr', 'kɔː'],
  kit: ['kɪt', 'kɪt'], trend: ['trend', 'trend'], bold: ['boʊld', 'bəʊld'],
  mold: ['moʊld', 'məʊld'],
  invalid: ['adj. ɪnˈvælɪd；n./v. ˈɪnvəlɪd', 'adj. ɪnˈvælɪd；n./v. ˈɪnvəlɪd'],
  resume: ['v. rɪˈzuːm；n. ˈrezəmeɪ', 'v. rɪˈzjuːm；n. ˈrezəmeɪ'],
  contract: ['n. ˈkɑːntrækt；v. kənˈtrækt', 'n. ˈkɒntrækt；v. kənˈtrækt'],
  frequent: ['adj. ˈfriːkwənt；v. friːˈkwent', 'adj. ˈfriːkwənt；v. frɪˈkwent'],
  attribute: ['n. ˈætrɪbjuːt；v. əˈtrɪbjuːt', 'n. ˈætrɪbjuːt；v. əˈtrɪbjuːt'],
  abstract: ['n./adj. ˈæbstrækt；v. æbˈstrækt', 'n./adj. ˈæbstrækt；v. æbˈstrækt'],
  estimate: ['n. ˈestəmət；v. ˈestəmeɪt', 'n. ˈestɪmət；v. ˈestɪmeɪt'],
  construct: ['v. kənˈstrʌkt；n. ˈkɑːnstrʌkt', 'v. kənˈstrʌkt；n. ˈkɒnstrʌkt'],
  insert: ['v. ɪnˈsɜːrt；n. ˈɪnsɜːrt', 'v. ɪnˈsɜːt；n. ˈɪnsɜːt'],
  ally: ['n. ˈælaɪ；v. əˈlaɪ', 'n. ˈælaɪ；v. əˈlaɪ']
};
const formsOverride = {
  emphasis: '名词复数:emphases', species: '单复数同形:species', customs: '原形:custom|海关、关税义常用复数:customs',
  formula: '名词复数:formulas / formulae', curriculum: '名词复数:curricula / curriculums',
  index: '名词复数:indexes / indices|过去式:indexed|过去分词:indexed|现在分词:indexing|第三人称单数:indexes',
  knit: '过去式:knitted / knit|过去分词:knitted / knit|现在分词:knitting|第三人称单数:knits',
  thrive: '过去式:thrived / throve|过去分词:thrived / thriven|现在分词:thriving|第三人称单数:thrives',
  weave: '过去式:wove|过去分词:woven|现在分词:weaving|第三人称单数:weaves|迂回行进义也可见:weaved',
  fulfill: '英式拼写:fulfil|过去式:fulfilled|过去分词:fulfilled|现在分词:fulfilling|第三人称单数:fulfills',
  mold: '英式拼写:mould|过去式:molded|过去分词:molded|现在分词:molding|第三人称单数:molds|复数:molds',
  dense: '比较级:denser|最高级:densest',
  nutrition: '通常不可数:nutrition', petroleum: '通常不可数:petroleum', gasoline: '通常不可数:gasoline',
  welfare: '通常不可数:welfare', optimism: '通常不可数:optimism'
};
const names = {p:'过去式',d:'过去分词',i:'现在分词','3':'第三人称单数',r:'比较级',t:'最高级',s:'名词复数','0':'原形'};
function forms(w, row) {
  if (formsOverride[w]) return formsOverride[w];
  const out = [];
  for (const item of (row?.exchange || '').split('/')) {
    const i = item.indexOf(':');
    const k = item.slice(0, i), v = item.slice(i + 1);
    if (i > 0 && names[k] && v && !(k === '0' && v === w)) out.push(names[k] + ':' + v);
  }
  return out.length ? [...new Set(out)].join('|') : (local[w][9] || '词形提示:主要变化见同族词和用法；不机械生成变形');
}
function ipa(s) {
  return String(s || '').trim().replace(/^\/|\/$/g,'').replace(/ә/g,'ə').replace(/ɡ/g,'g').replace(/'/g,'ˈ').replace(/:/g,'ː').replace(/əu/g,'əʊ');
}
let globalOrder = 0;
const parts = lists.map(item => {
  const words = item.words.map((w, i) => {
    const r = local[w], source = dictionary[w], m = study[w];
    const ex = examples[w] || {en:r[6],zh:r[7],source:'WordForge 本地例句（已核对语义）'};
    const pronunciations = pronunciation[w] || [ipa(r[1]), ipa(r[2] || source?.phonetic)];
    const english = source ? source.definition.replace(/\\n/g, '\n') : 'n. the central or essential part; the seed-bearing centre of a fruit. adj. essential or central. v. remove the central seed-bearing part of fruit.';
    const pos = [...new Set(m.cn.match(/\b(?:adj|adv|vt|vi|v|n)\./g) || [])].join(' ');
    const entry = {
      w, us:pronunciations[0], uk:pronunciations[1], pos,
      cn:m.cn.replace(/ (?=(?:adj|adv|vt|vi|v|n)\.)/g, '\n'),
      en:english, ex:ex.en, exz:ex.zh,
      fm:forms(w, source), ph:m.phrases.join('|'),
      mn:m.family ? '族:' + m.family : '',
      dis:'【学习要点】\n' + (m.note || '结合词性、搭配和例句记忆，不只记一个中文对应词。') + '\n资料说明：截图只提供词表；中文义项、搭配和同族词为学习整理，不是词达人官方逐字释义。',
      tg:`词达人|CET4（第二版）|List ${String(item.list).padStart(2,'0')}|学习整理版`,
      source_list:item.list, source_order:++globalOrder, list_order:i+1,
      references:[urls.ecdict, ...(urls[w] ? [urls[w]] : [])],
      source_attribution:{wordlist:'用户词达人截图',chinese:'结合ECDICT及核对结果学习整理',english:source ? 'ECDICT原始英文释义（未截断）' : '依据Cambridge core词条归纳',example:ex.source,phrases:'本次学习材料整理',officialVocabgoDefinition:false},
      dictionary_reference:source ? {translation:source.translation.replace(/\\n/g,'\n'),definition:english,source:source._source_url} : {source:urls.core}
    };
    assert.ok(entry.cn && /[\u4e00-\u9fff]/.test(entry.cn), w + ': Chinese definition');
    assert.ok(entry.en && !entry.en.includes('…'), w + ': untruncated English definition');
    assert.ok(entry.pos && (entry.us || entry.uk), w + ': grammar and pronunciation');
    assert.ok(entry.ex && /[\u4e00-\u9fff]/.test(entry.exz), w + ': bilingual example');
    assert.equal(m.phrases.length, 2, w + ': two study collocations');
    assert.ok(entry.fm, w + ': inflection or explicit form note');
    return entry;
  });
  assert.equal(words.length,30);
  return {id:`vocabgo_cet4_2_list_${String(item.list).padStart(2,'0')}`,name:item.name,sourceName:'词达人',listNumber:item.list,pages:[],desc:`词达人 CET4（第二版）List ${String(item.list).padStart(2,'0')} · 30词 · 截图词序 · 词典补充学习版`,words};
});
assert.equal(new Set(parts.flatMap(p=>p.words.map(w=>w.w))).size,300);
const batch = {
  batchId:'vocabgo-cet4-second-edition-lists01-10-20261020-v1',sourceName:'词达人',title:'词达人 CET4（第二版）List 01–10 · 词典补充学习版',
  preparedDate:'2026-10-20',contentStatus:'enriched-and-checked-before-import',parts,
  scope:'覆盖四级学习常见词性、常用义项及常见搭配；不声称穷尽所有专业义项，也不声称与词达人后台释义逐字一致。原始词典行另行保留。',
  sourceUrls:urls,sourceNotes:['截图已按List编号核对；List01/07/08的拼接重叠行已去重。','每List 30词，10组共300不同单词。','ECDICT直接下载获得299词完整原始行；core另经Cambridge核对。','同形异音/多词性重点词经Cambridge核对；其余音标保留来源信息并规范字符。','92条本地英文释义原有截断，已改用未截断原始参考。','94组例句由本次重新编写，修复了缺译文、错词、人名误命中和不自然用例等问题。','未使用原词库未经核实的机械拆词、词源或同形词族。','新增词条不改变已有读写教程词库和学习记录。']
};
for (const p of parts) fs.writeFileSync(path.join(base,`List-${String(p.listNumber).padStart(2,'0')}.json`),JSON.stringify({name:p.name,sourceName:p.sourceName,words:p.words},null,2)+'\n');
fs.writeFileSync(path.join(base,'vocabgo-batch-reviewed.json'),JSON.stringify(batch,null,2)+'\n');
const report = {status:'ready-for-import',lists:10,uniqueWords:300,bilingualExamples:300,collocations:600,wordFamilyEntries:parts.flatMap(p=>p.words).filter(w=>w.mn).length,ecdictFullRows:Object.keys(dictionary).length,untruncatedEnglish:300,officialVocabgoDefinitions:false};
fs.writeFileSync(path.join(base,'quality-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
