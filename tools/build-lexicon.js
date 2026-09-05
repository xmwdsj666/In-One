/*
 * 重建词库分片：以全小写 key 为准（二分一致性），保留词形拼写（AD -> ad[AD]）
 * 前置：tmp/raw/ 下已有 6 本词书解压产物；此后重跑 tools/build-lexicon.js 的替代版
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, 'tmp', 'raw');

const BOOKS = [
  { file: '1521164675301_GaoZhong_2/GaoZhong_2.json', tag: 'G', pri: 0 },
  { file: '1524052539052_CET4luan_2/CET4luan_2.json', tag: '4', pri: 1 },
  { file: '1524052554766_CET6_2/CET6_2.json', tag: '6', pri: 2 },
  { file: '1521164654696_KaoYan_2/KaoYan_2.json', tag: 'K', pri: 3 },
  { file: '1521164624473_IELTSluan_2/IELTSluan_2.json', tag: 'I', pri: 4 },
  { file: '1521164640451_TOEFL_2/TOEFL_2.json', tag: 'T', pri: 5 },
];

const ACCENTS = { 'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'ñ': 'n', 'ç': 'c', 'œ': 'oe', 'æ': 'ae' };
const clean = s => (s || '').replace(/[áàâäéèêëíìîïóòôöúùûüýñçœæ]/g, c => ACCENTS[c] || c).trim();

function trimRec(src, head, key) {
  const w = src.content.word.content;
  const t = (w.trans || []).slice(0, 3)
    .filter(x => x.tranCn)
    .map(x => (x.pos ? x.pos + '.' : '') + x.tranCn.replace(/\s+/g, ' ').trim());
  const ph = (w.phrase && w.phrase.phrases || []).slice(0, 2)
    .filter(x => x.pContent && x.pCn)
    .map(x => x.pContent.trim() + '|' + x.pCn.trim());
  const sent = (w.sentence && w.sentence.sentences || []).find(x => x.sContent && x.sCn);
  const s = sent ? sent.sContent.trim() + '|' + sent.sCn.trim() : '';
  const phone = (w.usphone && w.usphone.trim()) || (w.ukphone && w.ukphone.trim()) || '';
  const rec = { w: clean(head), p: clean(phone), t, ph, s: clean(s) };
  // 词形与 key 不同（大写缩写/专有名词）时补 alt 字段
  if (rec.w !== key) rec.a = rec.w;
  rec.w = key;
  return rec;
}

const byKey = new Map();
let empty = 0, dropped = 0, merged = 0, read = 0;

for (const b of BOOKS) {
  const lines = fs.readFileSync(path.join(TMP, b.file), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let src; try { src = JSON.parse(line); } catch (e) { dropped++; continue; }
    read++;
    const head = clean(src.headWord);
    const key = head.toLowerCase();
    if (!/^[a-z]/.test(key) || (src.content.word.content.trans || []).filter(x => x.tranCn).length === 0) {
      dropped++; continue;
    }
    const rec = trimRec(src, head, key);
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { rec, pri: b.pri, tags: new Set([b.tag]) });
    } else {
      cur.tags.add(b.tag);
      merged++;
      if (b.pri < cur.pri) { cur.pri = b.pri; cur.rec = rec; }
      else {
        if (!cur.rec.s && rec.s) cur.rec.s = rec.s;
        if (cur.rec.ph.length === 0 && rec.ph.length) cur.rec.ph = rec.ph;
      }
    }
  }
}

const all = [...byKey.entries()].map(([key, v]) => ({
  ...v.rec, l: [...v.tags].sort((a, c) => BOOKS.find(b => b.tag === a).pri - BOOKS.find(b => b.tag === c).pri).join(''),
}));
// 全小写 key 字母序排序（分片内即全局有序，二分安全）
all.sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));

const OUT = path.join(ROOT, 'src', 'common', 'lexicon');
fs.mkdirSync(OUT, { recursive: true });
const shards = {}; let gaokao = 0;
for (const r of all) {
  (shards[r.w[0]] = shards[r.w[0]] || []).push(r);
  if (r.l.includes('G')) gaokao++;
}
for (const letter of Object.keys(shards).sort()) {
  fs.writeFileSync(path.join(OUT, `${letter}.js`), `export default ${JSON.stringify(shards[letter])};\n`);
}
const words = [];
for (const r of all) { words.push(r.w); words.push(r.l); }
fs.writeFileSync(path.join(OUT, 'words.js'), `export default ${JSON.stringify(words)};\n`);

const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1);
const shardFiles = Object.keys(shards).sort().map(l => `${l}.js`);
const totalKB = shardFiles.reduce((s, f) => s + Number(kb(f)), 0);
console.log('=== 词库重建报告（全小写键版）===');
console.log(`读取 ${read} 行, 剔除 ${dropped}（空释义/非字母开头/坏行）, 合并去重 ${merged}`);
console.log(`最终词数: ${all.length}（高考词 ${gaokao}）, 分片 ${shardFiles.length} 个共 ${totalKB.toFixed(1)} KB, words.js ${kb('words.js')} KB`);
for (const w of ['student', 'abandon', 'ad', 'america', 'zoom']) {
  const hit = all.find(r => r.w === w);
  console.log(`样例[${w}]:`, hit ? JSON.stringify(hit).slice(0, 200) : '未收录');
}
