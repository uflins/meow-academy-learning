// 五年級自然（光之草原）題庫檢查
// 用法：node tools/test-g5-science.mjs
// 檢查 docs/題目格式.md 的欄位、id 不重複、題數、答案在選項裡、附圖 SVG 格式，
// 以及家長的出題規定：方位用「東偏北／東偏南」不用「東北／東南」、四季太陽題要寫明「在嘉義（北回歸線上）」、
// 不考能源、節氣只考春分／夏至／秋分／冬至、不出鏡子反射題。有錯就以非 0 結束。

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data/questions/g5/science');

// 檔案、標題、這一節可以用的玩法（tags[0]）
const FILES = [
  { section: '1-1', title: '太陽和影子', kinds: ['shadow', 'experiment'] },
  { section: '1-2', title: '四季的太陽位置', kinds: ['season', 'measure', 'shadow', 'experiment'] },
  { section: '1-3', title: '光的折射', kinds: ['refraction', 'experiment'] },
  { section: '1-4', title: '美麗的彩虹', kinds: ['rainbow', 'experiment'] },
  { section: '1-5', title: '放大鏡的聚光與成像', kinds: ['lens', 'experiment'] },
  { section: '2-1', title: '根莖葉的功能', kinds: ['plantpart', 'experiment'] },
  { section: '2-2', title: '花、果實和種子', kinds: ['plantpart', 'reproduce'] },
  { section: '2-3', title: '果實和種子的傳播', kinds: ['disperse'] },
  { section: '2-4', title: '營養器官的繁殖', kinds: ['reproduce'] },
  { section: '2-5', title: '植物與人類生活', kinds: ['life'] },
];
const KINDS = ['shadow', 'season', 'measure', 'refraction', 'rainbow', 'lens', 'plantpart', 'reproduce', 'disperse', 'life', 'experiment'];
const MIN_COUNT = 18;
const TYPES = new Set(['choice', 'multi', 'truefalse', 'input', 'order']);
const KEYPADS = { digits: /^\d+$/, degree: /^\d+$/, fraction: /^\d+(\/\d+)?$/, decimal: /^\d+(\.\d+)?$/ };
const Q_KEYS = new Set(['id', 'grade', 'subject', 'unit', 'section', 'type', 'prompt', 'speak', 'visual', 'options', 'answer',
  'accept', 'keypad', 'items', 'explanation', 'explainSpeak', 'difficulty', 'tags']);
const OPT_KEYS = new Set(['label', 'image', 'svg', 'speak']);
const BAD_TEXT = /NaN|undefined|Infinity|\[object |\bnull\b/;

// ---------- 家長的出題規定 ----------
const FOUR_DAYS = /春分|夏至|秋分|冬至/;
const SUN_WORDS = /升起|落下|日出|日落|高度角|正頭頂|影|方位|太陽在/;
const JIAYI = '在嘉義（北回歸線上）';
const INTERCARDINAL = /東北|東南|西北|西南/; // 單元 1 一律用「東偏北、東偏南、西偏北、西偏南」
const ENERGY = /能源|太陽能|發電|石油|煤|天然氣|核能|再生能|節能|省電/;
const OTHER_TERMS = ['立春', '雨水', '驚蟄', '清明', '穀雨', '立夏', '小滿', '芒種', '小暑', '大暑', '立秋', '處暑',
  '白露', '寒露', '霜降', '立冬', '小雪', '大雪', '小寒', '大寒'];
const MIRROR = /鏡子|平面鏡|面鏡|反射/; // 只能出現在彩虹題（彩虹成因「一次反射」、鏡子不能做彩虹）

const errors = [];
const err = (where, msg) => errors.push(`${where}：${msg}`);
const labelOf = (o) => (typeof o === 'string' ? o : o?.label);

function checkSvg(where, svg) {
  if (typeof svg !== 'string') return err(where, 'svg 不是字串');
  if (!svg.startsWith('<svg')) err(where, 'svg 沒有以 <svg 開頭');
  if (!svg.trimEnd().endsWith('</svg>')) err(where, 'svg 沒有以 </svg> 結尾');
  const root = svg.slice(0, svg.indexOf('>') + 1);
  const vb = root.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) return err(where, '根元素沒有 viewBox');
  if (/\s(width|height)=/.test(root)) err(where, '根元素寫死了 width/height');
  if (BAD_TEXT.test(svg)) err(where, 'svg 裡有 NaN/undefined/Infinity/null');
  const vbW = Number(vb[1]);
  for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) {
    if ((Number(m[1]) * 600) / vbW < 14 - 1e-9) { err(where, `字太小（font-size ${m[1]}，viewBox 寬 ${vbW}）`); break; }
  }
  const opens = (svg.match(/<text\b/g) || []).length, closes = (svg.match(/<\/text>/g) || []).length;
  if (opens !== closes) err(where, '<text> 沒有成對');
}

// 題目裡所有給孩子看的文字（含選項、說明、SVG 裡的字）
function allText(q) {
  const parts = [q.prompt, q.explanation, q.speak, q.explainSpeak];
  if (Array.isArray(q.options)) for (const o of q.options) parts.push(typeof o === 'string' ? o : o?.label, o?.speak);
  if (Array.isArray(q.items)) parts.push(...q.items);
  if (typeof q.answer === 'string') parts.push(q.answer);
  const svgs = [q.visual?.svg, ...(Array.isArray(q.options) ? q.options.map((o) => o?.svg) : [])].filter(Boolean);
  for (const s of svgs) for (const m of s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) parts.push(m[1]);
  return parts.filter((x) => typeof x === 'string').join('\n');
}

// ---------- 逐檔逐題 ----------
const seenIds = new Map();
const report = [];
const typeCount = {};
const answerPos = {};

for (const f of FILES) {
  const file = `${f.section}.json`;
  const path = join(DIR, file);
  if (!existsSync(path)) { err(file, '檔案不存在'); continue; }
  let list;
  try { list = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { err(file, 'JSON 解析失敗：' + e.message); continue; }
  if (!Array.isArray(list)) { err(file, '內容要是陣列'); continue; }

  const kindCount = {};
  const diffCount = { 1: 0, 2: 0, 3: 0 };
  const prompts = new Set();
  const unit = f.section.split('-')[0];

  list.forEach((q, i) => {
    const where = `${file} #${i + 1}（${q?.id ?? '沒有 id'}）`;
    if (!q || typeof q !== 'object') return err(where, '題目要是物件');

    // 欄位
    for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) err(where, `不認得的欄位 ${k}`);
    if (typeof q.id !== 'string' || !new RegExp(`^g5sci-${f.section}-\\d{3}$`).test(q.id)) err(where, `id 格式要像 g5sci-${f.section}-001`);
    if (seenIds.has(q.id)) err(where, `id 重複（也在 ${seenIds.get(q.id)}）`);
    seenIds.set(q.id, file);
    if (q.grade !== 5) err(where, 'grade 要是 5');
    if (q.subject !== 'science') err(where, 'subject 要是 science');
    if (q.unit !== unit) err(where, `unit 要是 "${unit}"`);
    if (q.section !== f.section) err(where, `section 要是 "${f.section}"`);
    if (!TYPES.has(q.type)) err(where, `type 不合法：${q.type}`);
    if (typeof q.prompt !== 'string' || q.prompt.trim().length < 4) err(where, '缺 prompt');
    else if (prompts.has(q.prompt + JSON.stringify(q.answer ?? q.items))) err(where, '同一個檔裡有重複的題目');
    else prompts.add(q.prompt + JSON.stringify(q.answer ?? q.items));
    if (typeof q.explanation !== 'string' || q.explanation.trim().length < 4) err(where, '缺 explanation');
    else if (q.explanation.length > 90) err(where, `explanation 太長（${q.explanation.length} 字），要短`);
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 3) err(where, 'difficulty 要是 1–3');
    else diffCount[q.difficulty]++;
    if (BAD_TEXT.test(q.prompt) || BAD_TEXT.test(q.explanation)) err(where, '文字裡有 NaN/undefined/null');

    // 玩法
    if (!Array.isArray(q.tags) || !q.tags.length) err(where, 'tags 要是非空陣列');
    else {
      const kind = q.tags[0];
      if (!KINDS.includes(kind)) err(where, `tags[0] 要是玩法（${KINDS.join('、')}），現在是 ${kind}`);
      else if (!f.kinds.includes(kind)) err(where, `${f.section} 不該有「${kind}」玩法`);
      kindCount[kind] = (kindCount[kind] ?? 0) + 1;
      if (q.tags.filter((t) => KINDS.includes(t)).length !== 1) err(where, 'tags 只能有一種玩法');
    }
    typeCount[q.type] = (typeCount[q.type] ?? 0) + 1;

    // 附圖
    if (q.visual !== null && q.visual !== undefined) {
      if (typeof q.visual !== 'object' || Object.keys(q.visual).join() !== 'svg') err(where, 'visual 要是 null 或 { svg }');
      else checkSvg(`${where} visual`, q.visual.svg);
    }

    // 作答
    if (q.type === 'choice' || q.type === 'multi') {
      if (!Array.isArray(q.options)) { err(where, '缺 options'); return; }
      const max = q.type === 'choice' ? 4 : 6;
      if (q.options.length < 2 || q.options.length > max) err(where, `選項要 2–${max} 個，現在 ${q.options.length}`);
      q.options.forEach((o, j) => {
        if (typeof o === 'string') return;
        if (!o || typeof o !== 'object') return err(where, `選項 ${j + 1} 格式不對`);
        for (const k of Object.keys(o)) if (!OPT_KEYS.has(k)) err(where, `選項不認得的欄位 ${k}`);
        if (o.svg !== undefined) checkSvg(`${where} 選項 ${labelOf(o)}`, o.svg);
      });
      const labels = q.options.map(labelOf);
      if (labels.some((l) => typeof l !== 'string' || !l.trim())) err(where, '每個選項都要有 label');
      if (new Set(labels).size !== labels.length) err(where, `選項 label 重複：${labels.join('／')}`);
      if (q.type === 'choice') {
        if (typeof q.answer !== 'string' || !labels.includes(q.answer)) err(where, `answer「${q.answer}」不在選項裡`);
        else {
          const k = `${labels.indexOf(q.answer) + 1}/${labels.length}`;
          answerPos[k] = (answerPos[k] ?? 0) + 1;
        }
      } else {
        if (!Array.isArray(q.answer) || !q.answer.length) err(where, 'multi 的 answer 要是非空陣列');
        else {
          if (q.answer.some((a) => !labels.includes(a))) err(where, `multi 的 answer 有不在選項裡的：${q.answer.join('、')}`);
          if (new Set(q.answer).size !== q.answer.length) err(where, 'multi 的 answer 有重複');
          if (q.answer.length >= labels.length) err(where, 'multi 至少要有一個錯的選項');
        }
        if (!q.prompt.includes('全部選出來')) err(where, 'multi 的題目要寫「（全部選出來）」');
      }
    } else if (q.options !== undefined) err(where, `${q.type} 不要有 options`);

    if (q.type === 'truefalse' && typeof q.answer !== 'boolean') err(where, 'truefalse 的 answer 要是 true 或 false');
    if (q.type === 'input') {
      if (!KEYPADS[q.keypad]) err(where, `keypad 不合法：${q.keypad}`);
      else if (typeof q.answer !== 'string' || !KEYPADS[q.keypad].test(q.answer)) err(where, `answer「${q.answer}」打不出來（keypad ${q.keypad}）`);
    }
    if (q.type === 'order') {
      if (!Array.isArray(q.items) || q.items.length < 2) err(where, 'order 至少要 2 個 items');
      else {
        if (q.items.some((x) => typeof x !== 'string' || !x.trim())) err(where, 'order 的 items 要是字串');
        if (new Set(q.items).size !== q.items.length) err(where, 'order 的 items 重複');
      }
      if (q.answer !== undefined) err(where, 'order 不用填 answer（items 就是答案）');
    }

    // ---------- 家長的出題規定 ----------
    const text = allText(q);
    const shown = [q.prompt, ...(Array.isArray(q.options) ? q.options.map(labelOf) : []), ...(q.items ?? [])].join('\n');
    if (unit === '1' && INTERCARDINAL.test(text)) err(where, `方位要照書上寫「東偏北／東偏南／西偏北／西偏南」，不要寫「${text.match(INTERCARDINAL)[0]}」`);
    if (FOUR_DAYS.test(shown) && SUN_WORDS.test(shown) && !q.prompt.includes(JIAYI)) err(where, `四季代表日的太陽題，題目要寫明「${JIAYI}」`);
    if (ENERGY.test(text)) err(where, `不考能源：「${text.match(ENERGY)[0]}」`);
    for (const t of OTHER_TERMS) if (text.includes(t)) err(where, `節氣只考春分、夏至、秋分、冬至，不要出現「${t}」`);
    if (MIRROR.test(text) && q.tags?.[0] !== 'rainbow') err(where, `不出鏡子反射題：「${text.match(MIRROR)[0]}」只能出現在彩虹題`);
    if (/世界最(大|高)的樹|杏仁桉|薛曼/.test(text)) err(where, '「世界最大的樹」那段不出題');
  });

  if (list.length < MIN_COUNT) err(file, `至少要 ${MIN_COUNT} 題，現在 ${list.length} 題`);
  for (const d of [1, 2, 3]) if (!diffCount[d]) err(file, `沒有難度 ${d} 的題目，難度要 1–3 都有`);
  report.push({ file, title: f.title, total: list.length, kindCount, diffCount });
}

// ---------- 結果 ----------
console.log('檔案       節名                 題數  難度1/2/3   玩法');
for (const r of report) {
  const kinds = Object.entries(r.kindCount).map(([k, n]) => `${k} ${n}`).join('、');
  const diff = `${r.diffCount[1]}/${r.diffCount[2]}/${r.diffCount[3]}`;
  console.log(`${r.file.padEnd(9)}  ${r.title.padEnd(10, '　')}  ${String(r.total).padStart(4)}  ${diff.padStart(9)}   ${kinds}`);
}
console.log(`合計 ${report.reduce((s, r) => s + r.total, 0)} 題；題型：${Object.entries(typeCount).map(([k, n]) => `${k} ${n}`).join('、')}`);
console.log(`選擇題答案位置（第幾個/共幾個）：${Object.entries(answerPos).sort().map(([k, n]) => `${k}:${n}`).join('  ')}`);

if (errors.length) {
  console.error(`\n✗ 有 ${errors.length} 個問題：`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n✓ 全部通過');
