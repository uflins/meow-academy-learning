// 五年級數學出題器測試：node tools/test-math5.mjs
// 每一節、每個難度用固定亂數各產生 N 題，檢查題目格式（docs/題目格式.md），
// 印出各節統計和每節 2 題範例給人看措辭。有任何錯誤就以非 0 結束。
import { seededRng } from '../js/gen/util.js';
import * as math5 from '../js/gen/math5.js';

const N = Number(process.env.N || 200);
const TYPES = new Set(['choice', 'multi', 'truefalse', 'input', 'order']);
const KEYPADS = {
  digits: /^\d+$/,
  degree: /^\d+$/,
  fraction: /^\d+(\/\d+)?$/,
  decimal: /^\d+(\.\d+)?$/,
};
const BAD_TEXT = /NaN|undefined|Infinity|\[object |\bnull\b/;

const labelOf = (o) => (typeof o === 'string' ? o : o && o.label);

// 簡單的字串雜湊（算「不重複」用，附圖不同也算不同題）
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function checkSvg(svg, where, errs) {
  if (typeof svg !== 'string') { errs.push(`${where}: svg 不是字串`); return; }
  if (!svg.startsWith('<svg')) errs.push(`${where}: svg 沒有以 <svg 開頭`);
  if (!svg.trimEnd().endsWith('</svg>')) errs.push(`${where}: svg 沒有以 </svg> 結尾`);
  const root = svg.slice(0, svg.indexOf('>') + 1);
  const vb = root.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) { errs.push(`${where}: 根元素沒有 viewBox`); return; }
  if (/\s(width|height)=/.test(root)) errs.push(`${where}: 根元素寫死了 width/height`);
  if (BAD_TEXT.test(svg)) errs.push(`${where}: svg 裡有 NaN/undefined/Infinity/null`);
  const vbW = Number(vb[1]);
  for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) {
    const eff = (Number(m[1]) * 600) / vbW; // 換算成 600 寬時的字級
    if (eff < 14 - 1e-9) { errs.push(`${where}: 字太小（font-size ${m[1]}，viewBox 寬 ${vbW}）`); break; }
  }
  const opens = (svg.match(/<text\b/g) || []).length, closes = (svg.match(/<\/text>/g) || []).length;
  if (opens !== closes) errs.push(`${where}: <text> 沒有成對`);
}

function validate(q, unit, section, d) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(q && typeof q === 'object', '不是物件');
  if (!q || typeof q !== 'object') return errs;
  need(typeof q.id === 'string' && q.id.length > 0, 'id 缺少');
  need(q.grade === 5, 'grade 應為 5');
  need(q.subject === 'math', 'subject 應為 math');
  need(q.unit === unit, `unit 應為 ${unit}，實際 ${q.unit}`);
  need(q.section === section, `section 應為 ${section}，實際 ${q.section}`);
  need(TYPES.has(q.type), `type 不合法：${q.type}`);
  need(typeof q.prompt === 'string' && q.prompt.length >= 4 && q.prompt.length <= 160, `prompt 長度不合理（${q.prompt && q.prompt.length}）`);
  need(typeof q.explanation === 'string' && q.explanation.length >= 4 && q.explanation.length <= 170, `explanation 長度不合理（${q.explanation && q.explanation.length}）`);
  need(q.difficulty === d, `difficulty 應為 ${d}`);
  need(Array.isArray(q.tags), 'tags 應為陣列');
  need(q.visual === null || (typeof q.visual === 'object' && typeof q.visual.svg === 'string'), 'visual 應為 null 或 { svg }');
  if (q.visual && q.visual.svg) checkSvg(q.visual.svg, 'visual', errs);

  const json = JSON.stringify(q);
  need(!/NaN|undefined|Infinity/.test(json), '內容有 NaN/undefined/Infinity');
  const texts = [q.prompt, q.explanation, ...(q.options || []).map(labelOf), ...(q.items || []), ...(Array.isArray(q.answer) ? q.answer : [q.answer])];
  for (const t of texts) if (typeof t === 'string' && BAD_TEXT.test(t)) errs.push(`文字裡有 NaN/undefined/null：${t}`);

  switch (q.type) {
    case 'choice': {
      need(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4, `choice 選項數應為 2–4（${q.options && q.options.length}）`);
      const labels = (q.options || []).map(labelOf);
      need(labels.every((l) => typeof l === 'string' && l.length > 0), '選項 label 要是非空字串');
      need(new Set(labels).size === labels.length, `選項 label 重複：${labels.join(' | ')}`);
      need(typeof q.answer === 'string', 'choice 的 answer 要是字串');
      need(labels.includes(q.answer), `答案「${q.answer}」不在選項裡：${labels.join(' | ')}`);
      (q.options || []).forEach((o, i) => { if (typeof o === 'object' && o.svg) checkSvg(o.svg, `option ${i}`, errs); });
      break;
    }
    case 'multi': {
      need(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 10, `multi 選項數應為 2–10（${q.options && q.options.length}）`);
      const labels = (q.options || []).map(labelOf);
      need(labels.every((l) => typeof l === 'string' && l.length > 0), '選項 label 要是非空字串');
      need(new Set(labels).size === labels.length, `選項 label 重複：${labels.join(' | ')}`);
      need(Array.isArray(q.answer) && q.answer.length >= 1, 'multi 的 answer 要是非空陣列');
      if (Array.isArray(q.answer)) {
        need(q.answer.every((a) => typeof a === 'string'), 'multi 的 answer 要是字串陣列');
        need(new Set(q.answer).size === q.answer.length, 'multi 的 answer 有重複');
        for (const a of q.answer) need(labels.includes(a), `答案「${a}」不在選項裡：${labels.join(' | ')}`);
      }
      (q.options || []).forEach((o, i) => { if (typeof o === 'object' && o.svg) checkSvg(o.svg, `option ${i}`, errs); });
      break;
    }
    case 'truefalse':
      need(typeof q.answer === 'boolean', 'truefalse 的 answer 要是 true/false');
      break;
    case 'input': {
      need(Object.hasOwn(KEYPADS, q.keypad), `keypad 不合法：${q.keypad}`);
      need(typeof q.answer === 'string' && q.answer.length > 0, 'input 的 answer 要是非空字串');
      if (typeof q.answer === 'string' && KEYPADS[q.keypad]) {
        need(KEYPADS[q.keypad].test(q.answer), `答案「${q.answer}」用 ${q.keypad} 鍵盤打不出來`);
        need(q.answer.length <= 8, `答案「${q.answer}」超過鍵盤 8 個字`);
      }
      if (q.accept != null) need(Array.isArray(q.accept) && q.accept.every((a) => typeof a === 'string'), 'accept 要是字串陣列');
      break;
    }
    case 'order':
      need(Array.isArray(q.items) && q.items.length >= 2, 'order 需要 items');
      if (Array.isArray(q.items)) {
        need(q.items.every((x) => typeof x === 'string' && x.length > 0), 'items 要是非空字串');
        need(new Set(q.items).size === q.items.length, 'items 有重複');
      }
      break;
    default:
  }
  return errs;
}

function show(q) {
  const lines = [`    [${q.type}｜難度${q.difficulty}] ${q.prompt}${q.visual ? '  〔附圖〕' : ''}`];
  if (q.options) lines.push(`      選項：${q.options.map((o) => (typeof o === 'string' ? o : `${o.label}${o.svg ? '〔圖〕' : ''}`)).join('  ／  ')}`);
  if (q.type === 'order') lines.push(`      正確順序：${q.items.join(' → ')}`);
  else lines.push(`      答案：${Array.isArray(q.answer) ? q.answer.join('、') : q.answer}${q.keypad ? `（鍵盤 ${q.keypad}）` : ''}${q.accept ? `，也接受 ${q.accept.join('、')}` : ''}`);
  lines.push(`      說明：${q.explanation}`);
  return lines.join('\n');
}

let failures = 0;
let total = 0;
const t0 = Date.now();

if (math5.subject !== 'math') { console.log('✗ subject 應為 "math"'); failures++; }
if (math5.grade !== 5) { console.log('✗ grade 應為 5'); failures++; }

const EXPECT = {
  1: ['1-1', '1-2'],
  2: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'],
  3: ['3-1', '3-2', '3-3', '3-4', '3-5'],
  4: ['4-1', '4-2', '4-3'],
  5: ['5-1', '5-2', '5-3', '5-4'],
};
const gotUnits = math5.units.map((u) => u.unit);
if (JSON.stringify(gotUnits) !== JSON.stringify(Object.keys(EXPECT))) { console.log(`✗ 單元應為 1–5，實際 ${gotUnits}`); failures++; }

for (const u of math5.units) {
  const want = EXPECT[u.unit] || [];
  const got = u.sections.map((s) => s.section);
  if (JSON.stringify(want) !== JSON.stringify(got)) { console.log(`✗ 單元 ${u.unit} 的節應為 ${want}，實際 ${got}`); failures++; }
  console.log(`\n══ 單元 ${u.unit}　${u.title} ══`);
  for (const s of u.sections) {
    const ts = Date.now();
    const types = {};
    const keys = new Set();
    const tags = new Set();
    const samples = [];
    let secFail = 0;
    const firstErrors = [];
    for (let d = 1; d <= 3; d++) {
      const seed = 1000 * Number(u.unit) + 100 * Number(s.section.split('-')[1]) + d;
      const rng = seededRng(seed);
      for (let i = 0; i < N; i++) {
        let q;
        try {
          q = s.make(rng, d);
        } catch (e) {
          secFail++;
          if (firstErrors.length < 5) firstErrors.push(`難度${d} 第${i}題丟出錯誤：${e.message}`);
          continue;
        }
        total++;
        const errs = validate(q, u.unit, s.section, d);
        if (errs.length) {
          secFail++;
          if (firstErrors.length < 5) firstErrors.push(`難度${d} 第${i}題：${errs.join('；')}\n        prompt：${q && q.prompt}`);
        }
        types[q.type] = (types[q.type] || 0) + 1;
        keys.add(hash(JSON.stringify([q.prompt, q.answer ?? q.items, q.visual, q.options])));
        (q.tags || []).forEach((t) => tags.add(t));
        if ((d === 1 && i === 3) || (d === 3 && i === 7)) samples.push(q);
      }
    }
    failures += secFail;
    const n = N * 3;
    const typeStr = Object.entries(types).map(([k, v]) => `${k} ${v}`).join('、');
    console.log(`${secFail ? '✗' : '✓'} ${s.section} ${s.title}：${n} 題，失敗 ${secFail}，不重複 ${keys.size}（${Math.round((keys.size / n) * 100)}%），題型 ${typeStr}，${Date.now() - ts} ms`);
    console.log(`    觀念標籤：${[...tags].join('、')}`);
    for (const e of firstErrors) console.log(`    ✗ ${e}`);
    for (const q of samples) console.log(show(q));
  }
}

console.log(`\n共產生 ${total} 題，失敗 ${failures}，耗時 ${Date.now() - t0} ms`);
if (failures) {
  console.log('✗ 測試失敗');
  process.exit(1);
}
console.log('✓ 全部通過');
