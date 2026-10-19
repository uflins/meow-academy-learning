// 一年級數學出題器測試：node tools/test-math1.mjs
// 每一節、每個難度各出 PER 題（固定亂數種子），檢查題目格式、朗讀、選項、數字範圍、SVG。
// 有任何錯誤就以非 0 結束。

import * as gen from "../js/gen/math1.js";
import { seededRng } from "../js/gen/util.js";

const PER = 200;

const EXPECTED = {
  1: ["1-1", "1-2", "1-3", "1-4"],
  2: ["2-1", "2-2", "2-3"],
  3: ["3-1", "3-2", "3-3", "3-4"],
  4: ["4-1", "4-2", "4-3"],
  5: ["5-1", "5-2", "5-3"],
};

const failures = [];
function fail(where, msg, q) {
  failures.push({ where, msg, q });
}

const DIGIT_ANSWER = /^(10|[0-9])$/;
const EQUATION = /[+＋=＝−－×÷]|\s-\s/;
const BIG_ZH = /十[一二三四五六七八九]|[二三四五六七八九兩]十|百|千/;
const BAD_STR = /undefined|NaN|\bnull\b|\[object/;

// 很簡單的 XML 標籤配對檢查
function svgProblems(svg) {
  const out = [];
  if (typeof svg !== "string" || !svg.startsWith("<svg")) return ["svg 不是 <svg 開頭"];
  const root = svg.slice(0, svg.indexOf(">") + 1);
  if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(root)) out.push("svg 沒有 viewBox");
  if (/\s(width|height)=/.test(root)) out.push("svg 根元素寫死 width/height");
  if (/NaN|undefined/.test(svg)) out.push("svg 內有 NaN/undefined");
  const stack = [];
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) {
        out.push(`svg 標籤沒配對：</${name}>`);
        break;
      }
    } else stack.push(name);
  }
  if (stack.length) out.push(`svg 有沒關的標籤：${stack.join(",")}`);
  return out;
}

function numbersIn(s) {
  return (String(s).match(/\d+/g) || []).map(Number);
}

function walkStrings(v, fn, path = "") {
  if (typeof v === "string") fn(v, path);
  else if (typeof v === "number") {
    if (!Number.isFinite(v)) fn("NaN", path);
  } else if (v === undefined) fn("undefined", path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, fn, `${path}[${i}]`));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkStrings(x, fn, `${path}.${k}`);
}

function emojiCounts(svg) {
  const counts = {};
  const re = /dominant-baseline="central">([^<]+)<\/text>/g;
  let m;
  // emo() 產生的 <text> 是 dominant-baseline="central"> 直接接內容；文字標籤後面還有 font-family，不會被算到
  while ((m = re.exec(svg))) counts[m[1]] = (counts[m[1]] || 0) + 1;
  return counts;
}

function validate(q, unit, sec, d) {
  const where = `${sec.section} 難${d}`;
  const err = (msg) => fail(where, msg, q);
  if (!q || typeof q !== "object") return err("沒有回傳題目");

  // 基本欄位
  if (typeof q.id !== "string" || !q.id) err("id 缺少");
  if (q.grade !== 1) err("grade 不是 1");
  if (q.subject !== "math") err("subject 不是 math");
  if (q.unit !== unit.unit) err(`unit 是 ${q.unit}`);
  if (q.section !== sec.section) err(`section 是 ${q.section}`);
  if (q.difficulty !== d) err(`difficulty 是 ${q.difficulty}`);
  if (!["choice", "input", "order"].includes(q.type)) err(`type 不對：${q.type}`);
  for (const k of ["prompt", "speak", "explanation", "explainSpeak"]) {
    if (typeof q[k] !== "string" || !q[k].trim()) err(`${k} 是空的`);
  }
  if (!Array.isArray(q.tags) || !q.tags.length || q.tags.some((t) => typeof t !== "string" || !t)) err("tags 不對");

  // 不能有 NaN / undefined
  walkStrings(q, (s, path) => {
    if (path.includes(".svg")) return;
    if (BAD_STR.test(s)) err(`${path} 含有 ${s}`);
  });

  // 朗讀：不用阿拉伯數字（iPad 念「2條」可能念成「二條」）
  for (const k of ["speak", "explainSpeak"]) {
    if (/\d/.test(q[k] || "")) err(`${k} 有阿拉伯數字：${q[k]}`);
  }

  // 文字：不出算式符號、數字 0–10
  const texts = [q.prompt, q.speak, q.explanation, q.explainSpeak];
  if (q.options) for (const o of q.options) texts.push(o && o.label, o && o.speak);
  for (const t of texts) {
    if (t == null) continue;
    if (EQUATION.test(t)) err(`出現算式符號：${t}`);
    if (BIG_ZH.test(t)) err(`國字數字超過 10：${t}`);
    for (const n of numbersIn(t)) if (n > 10) err(`數字超過 10：${t}`);
  }

  // 附圖
  const v = q.visual;
  if (v !== null) {
    const keys = Object.keys(v || {});
    if (keys.length !== 1 || !["svg", "emojiGroups", "splitDiagram"].includes(keys[0])) err(`visual 格式不對：${keys}`);
    if (v.svg !== undefined) for (const p of svgProblems(v.svg)) err(p);
    if (v.emojiGroups !== undefined) {
      if (!Array.isArray(v.emojiGroups) || !v.emojiGroups.length) err("emojiGroups 是空的");
      else
        for (const g of v.emojiGroups) {
          if (typeof g.emoji !== "string" || !g.emoji) err("emojiGroups 缺 emoji");
          if (!Number.isInteger(g.count) || g.count < 0 || g.count > 10) err(`emojiGroups count 超出 0–10：${g.count}`);
          if (g.label !== undefined && (typeof g.label !== "string" || !g.label)) err("emojiGroups label 不對");
        }
    }
    if (v.splitDiagram !== undefined) {
      const sd = v.splitDiagram;
      const vals = [sd.total, ...(sd.parts || [])];
      if (!Array.isArray(sd.parts) || sd.parts.length !== 2) err("splitDiagram parts 不是兩格");
      for (const x of vals) if (x !== null && (!Number.isInteger(x) || x < 0 || x > 10)) err(`splitDiagram 數字不對：${x}`);
      const nulls = vals.filter((x) => x === null).length;
      if (nulls !== 1) err(`splitDiagram 應該剛好一格是 ?，現在有 ${nulls} 格`);
      // 答案要和分合圖一致
      const missing = sd.total === null ? sd.parts[0] + sd.parts[1] : sd.parts[0] === null ? sd.total - sd.parts[1] : sd.total - sd.parts[0];
      if (missing < 0 || missing > 10) err(`分合圖的 ? 超出 0–10：${missing}`);
      if (q.type === "input" && Number(q.answer) !== missing) err(`分合圖答案應該是 ${missing}，卻是 ${q.answer}`);
      if (q.type === "choice" && DIGIT_ANSWER.test(q.answer) && Number(q.answer) !== missing) err(`分合圖選擇題答案應該是 ${missing}`);
      if (q.type === "choice" && (q.answer === "是" || q.answer === "不是")) {
        const yes = sd.parts[0] + sd.parts[1] === 10;
        if (yes !== (q.answer === "是")) err("「是不是 10」答案錯");
      }
    }
  }

  // 題型
  if (q.type === "choice") {
    const opts = q.options;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > 3) err(`選項數量 ${opts && opts.length}（要 2–3 個）`);
    else {
      const labels = opts.map((o) => (typeof o === "object" ? o.label : o));
      if (labels.some((l) => typeof l !== "string" || !l)) err("選項 label 不對");
      if (new Set(labels).size !== labels.length) err(`選項 label 重複：${labels}`);
      if (!labels.includes(q.answer)) err(`答案 ${q.answer} 不在選項 ${labels} 裡`);
      for (const o of opts) {
        if (typeof o !== "object") err("選項要是物件（一年級要有 image 或 speak）");
        else {
          if (!o.image && !o.speak) err(`選項 ${o.label} 沒有 image 也沒有 speak`);
          if (o.speak && /\d/.test(o.speak)) err(`選項朗讀有阿拉伯數字：${o.speak}`);
          if (o.svg !== undefined) for (const p of svgProblems(o.svg)) err(`選項 ${p}`);
        }
      }
    }
  } else if (q.type === "input") {
    if (q.keypad !== "digits") err(`keypad 是 ${q.keypad}`);
    if (typeof q.answer !== "string" || !DIGIT_ANSWER.test(q.answer)) err(`input 答案不是 0–10：${q.answer}`);
  } else if (q.type === "order") {
    const it = q.items;
    if (!Array.isArray(it) || it.length < 2) err("order items 太少");
    else {
      if (it.some((x) => typeof x !== "string" || !DIGIT_ANSWER.test(x))) err(`order items 不是 0–10：${it}`);
      if (new Set(it).size !== it.length) err("order items 重複");
      const nums = it.map(Number);
      const asc = nums.every((x, i) => i === 0 || x > nums[i - 1]);
      const desc = nums.every((x, i) => i === 0 || x < nums[i - 1]);
      if (!asc && !desc) err(`order items 沒有排好：${it}`);
      if (asc && !/從小/.test(q.speak)) err("從小到大的題目，朗讀沒說從小排到大");
      if (desc && !/從大/.test(q.speak)) err("從大到小的題目，朗讀沒說從大排到小");
    }
  }

  // 內容對答案（能從題目資料直接驗證的部分）
  const tag = q.tags && q.tags[0];
  if (tag === "count-row" && Number(q.answer) !== v.emojiGroups[0].count) err("點數答案和 emoji 數量不一樣");
  if ((tag === "count-scatter" || tag === "count-crowded") && v && v.svg) {
    const counts = Object.values(emojiCounts(v.svg));
    if (counts.length !== 1 || counts[0] !== Number(q.answer)) err(`點數答案 ${q.answer}，圖上是 ${counts}`);
  }
  if (tag === "count-mixed" && v && v.svg) {
    const counts = Object.values(emojiCounts(v.svg));
    if (!counts.includes(Number(q.answer))) err("混合點數答案不是圖上任何一種的數量");
  }
  if ((tag === "ten-frame-read" || tag === "ten-frame-scrambled") && v && v.svg) {
    const dots = (v.svg.match(/fill="#ef5350"\/>/g) || []).length;
    if (dots !== Number(q.answer)) err(`十格框答案 ${q.answer}，圖上有 ${dots} 個圈`);
  }
  if ((tag === "enough" || tag === "enough-equal") && v.emojiGroups) {
    const [a, b] = v.emojiGroups.map((g) => g.count);
    if ((b >= a) !== (q.answer === "夠")) err(`夠不夠答錯：${a} 和 ${b}，答 ${q.answer}`);
  }
  if (q.tags.includes("more-less") && v && v.emojiGroups && v.emojiGroups.length === 2 && tag !== "enough" && tag !== "enough-equal") {
    const [a, b] = v.emojiGroups.map((g) => g.count);
    const names = q.options.map((o) => o.label);
    const more = /比較多/.test(q.speak);
    let expect;
    if (a === b) expect = "一樣多";
    else expect = (a > b) === more ? names[0] : names[1];
    if (q.answer !== expect) err(`比多少答錯：${a}、${b}，應該是 ${expect}`);
  }
  // 長短題：念題一定要說出比的是哪一個字
  if (q.tags.includes("ask-shorter") && !/短/.test(q.speak)) err("問短的題目朗讀沒有「短」");
  if (q.tags.includes("ask-longer") && !/長/.test(q.speak)) err("問長的題目朗讀沒有「長」");
}

/* ---------- 跑測試 ---------- */

if (gen.subject !== "math") fail("module", "subject 不是 math");
if (gen.grade !== 1) fail("module", "grade 不是 1");
const got = Object.fromEntries((gen.units || []).map((u) => [u.unit, u.sections.map((s) => s.section)]));
for (const [u, secs] of Object.entries(EXPECTED)) {
  if (JSON.stringify(got[u]) !== JSON.stringify(secs)) fail("module", `單元 ${u} 的節應該是 ${secs}，現在是 ${got[u]}`);
}

const ids = new Set();
const shorten = (k, v) => {
  if (k === "svg" && typeof v === "string") {
    const vb = (v.match(/viewBox="([^"]+)"/) || [])[1];
    return `<svg viewBox="${vb}"> …${v.length} 字`;
  }
  return v;
};

let total = 0;
let seed = 1;
for (const unit of gen.units) {
  console.log(`\n==================== 單元 ${unit.unit} ${unit.title} ====================`);
  for (const sec of unit.sections) {
    const tagCount = {};
    const typeCount = {};
    const prompts = new Set();
    const samples = [];
    let n = 0;
    for (let d = 1; d <= 3; d++) {
      const rng = seededRng(seed++ * 7919);
      for (let i = 0; i < PER; i++) {
        let q;
        try {
          q = sec.make(rng, d);
        } catch (e) {
          fail(`${sec.section} 難${d}`, `丟出例外：${e.stack}`);
          continue;
        }
        const before = failures.length;
        validate(q, unit, sec, d);
        if (q && q.id) {
          if (ids.has(q.id)) fail(`${sec.section}`, `id 重複：${q.id}`, q);
          ids.add(q.id);
        }
        n++;
        if (failures.length === before && q) {
          const t = q.tags[0];
          tagCount[t] = (tagCount[t] || 0) + 1;
          typeCount[q.type] = (typeCount[q.type] || 0) + 1;
          prompts.add(q.prompt);
          if ((i === 3 && d === 1) || (i === 7 && d === 3)) samples.push(q);
        }
      }
    }
    total += n;
    console.log(`\n--- ${sec.section} ${sec.title}：${n} 題，不同題目文字 ${prompts.size} 種`);
    console.log(`    題型：${Object.entries(typeCount).map(([k, v]) => `${k} ${v}`).join("、")}`);
    console.log(`    子題型：${Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("、")}`);
    for (const s of samples) console.log("    範例：" + JSON.stringify(s, shorten));
  }
}

console.log(`\n共產生 ${total} 題。`);
if (failures.length) {
  console.log(`\n❌ 有 ${failures.length} 個錯誤，前 25 個：`);
  for (const f of failures.slice(0, 25)) {
    console.log(`  [${f.where}] ${f.msg}`);
    if (f.q) console.log("     " + JSON.stringify(f.q, shorten).slice(0, 600));
  }
  process.exit(1);
}
console.log("✅ 全部通過");
