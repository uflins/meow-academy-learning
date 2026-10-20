// 五年級社會（翰林，期中考：單元一 第1–3課、單元二 第1–2課）題庫檢查
// 用法：node tools/test-g5-social.mjs
// 檢查 docs/題目格式.md 的欄位、id 不重複、各題型的答案格式、附圖 SVG、
// 每個檔的題數和玩法（tags[0]）、難度分布、選擇題答案位置不要都一樣、
// 時光列車的先後順序、不能出現考試範圍以外的內容。有錯就以非 0 結束。

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "data/questions/g5/social");

// 玩法（tags[0]）：規格書 4.4 社會（寶島群島）
const KINDS = {
  map: "寶島航海王",
  island: "離島集章",
  dig: "考古挖寶",
  timeline: "時光列車",
  who: "猜猜我是誰",
  culture: "原住民族",
  cause: "因果配對",
  truefalse: "是非快答",
};
const KIND_KEYS = Object.keys(KINDS);

// 每個檔：單元、至少幾題、各玩法至少幾題
const FILES = [
  { section: "1-1", unit: "一", min: 20, need: { map: 5, island: 5, cause: 3, truefalse: 3, who: 2 } },
  { section: "1-2", unit: "一", min: 20, need: { dig: 6, timeline: 3, who: 2, truefalse: 3, cause: 2 } },
  { section: "1-3", unit: "一", min: 20, need: { culture: 8, who: 2, truefalse: 3, cause: 2, dig: 2 } },
  { section: "2-1", unit: "二", min: 20, need: { timeline: 4, who: 5, map: 3, cause: 3, truefalse: 3 } },
  { section: "2-2", unit: "二", min: 20, need: { who: 4, cause: 4, truefalse: 3, timeline: 2, culture: 2 } },
];

const TYPES = new Set(["choice", "multi", "truefalse", "input", "order"]);
const KEYPADS = { digits: /^\d+$/, degree: /^\d+$/, fraction: /^\d+(\/\d+)?$/, decimal: /^\d+(\.\d+)?$/ };
const Q_KEYS = new Set(["id", "grade", "subject", "unit", "section", "type", "prompt", "speak", "visual", "options",
  "answer", "accept", "keypad", "items", "explanation", "explainSpeak", "difficulty", "tags"]);
const OPT_KEYS = new Set(["label", "image", "svg", "speak"]);
// 只用 iPad 內建就有、意思一看就懂的 emoji（新增時請一併加進來）
const EMOJI_OK = new Set(["🪨", "⚰️", "⚒️", "📿", "🏺", "🐂", "🥭", "🦌"]);

// ---------- 範圍 ----------
// 範圍以外、或範圍整理標記「有疑問、不要出」的內容
const OUT_OF_SCOPE = [
  ["大坌坑", "史前文化只考長濱、卑南、十三行"],
  ["八里", "十三行書上只寫「臺灣北部」"],
  ["經度", "書上只有赤道和南北回歸線，沒有經度"],
  ["東經", "書上只有赤道和南北回歸線，沒有經度"],
  ["西經", "書上只有赤道和南北回歸線，沒有經度"],
  ["颱風", "照片中沒有颱風的內容"],
  ["山脈", "地形不在範圍內"],
  ["新港文書", "自修沒有這個名稱，只寫用羅馬字母寫土地契約"],
  ["日治", "超過單元二第2課"],
  ["日本統治", "超過單元二第2課"],
  ["劉銘傳", "超過單元二第2課"],
  ["沈葆楨", "超過單元二第2課"],
  ["牡丹社", "超過單元二第2課"],
  ["馬偕", "超過單元二第2課"],
  ["開港", "超過單元二第2課"],
  ["渡臺禁令", "超過單元二第2課"],
  ["林爽文", "超過單元二第2課"],
  ["朱一貴", "超過單元二第2課"],
  ["吳沙", "超過單元二第2課"],
  ["郊商", "超過單元二第2課"],
  ["艋舺", "超過單元二第2課"],
  ["鹿港", "超過單元二第2課"],
  ["霧社", "超過單元二第2課"],
  ["二二八", "超過單元二第2課"],
];
// 用「臺」：臺灣、臺南、臺東…（大肚台地依書上寫法）
const TAI_RE = /台(?!地)/;
const SIMPLIFIED_RE = /[湾国历时门东线岛战贸]/;
// 西元年只能是書上年表的年份
const YEARS_OK = new Set(["1624", "1626", "1642", "1662", "1684"]);

// 時光列車的先後（關鍵字 → 順序值）。order 題裡每張卡都對得上時，就檢查順序。
const TIMELINE_RANK = [
  [/舊石器|長濱|約 5 萬年前|打製石器/, 1],
  [/新石器|卑南|約 7,000 年前|磨製石器/, 2],
  [/金屬器|十三行|約 2,500 年前|^鐵器$/, 3],
  [/大航海時代|新航路/, 4],
  [/荷蘭人(來到臺灣|占領南臺灣|進入大員|來臺)/, 1624],
  [/西班牙人占領北臺灣/, 1626],
  [/荷蘭人趕走西班牙人/, 1642],
  [/鄭成功逼荷蘭人離開/, 1662],
  [/臺灣納入清帝國版圖|施琅帶兵攻臺/, 1684],
];

const errors = [];
const err = (where, msg) => errors.push(`${where}：${msg}`);
const labelOf = (o) => (typeof o === "string" ? o : o?.label);

function allStrings(x, out = []) {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => allStrings(v, out));
  else if (x && typeof x === "object") Object.values(x).forEach((v) => allStrings(v, out));
  return out;
}

function checkSvg(where, svg) {
  if (typeof svg !== "string") return err(where, "svg 要是字串");
  if (!svg.startsWith("<svg")) err(where, "svg 要以 <svg 開頭");
  if (!svg.trimEnd().endsWith("</svg>")) err(where, "svg 要以 </svg> 結尾");
  const root = svg.slice(0, svg.indexOf(">") + 1);
  const vb = root.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) return err(where, "svg 根元素沒有 viewBox");
  if (/\s(width|height)=/.test(root)) err(where, "svg 根元素不要寫死 width/height");
  if (/NaN|undefined|Infinity/.test(svg)) err(where, "svg 裡有 NaN/undefined/Infinity");
  const w = Number(vb[1]);
  for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) {
    if ((Number(m[1]) * 600) / w < 14 - 1e-9) { err(where, `svg 字太小（font-size ${m[1]}，viewBox 寬 ${w}）`); break; }
  }
  const opens = (svg.match(/<text\b/g) || []).length;
  const closes = (svg.match(/<\/text>/g) || []).length;
  if (opens !== closes) err(where, "svg 的 <text> 沒有成對");
}

function checkVisual(where, v) {
  if (v === null || v === undefined) return;
  if (typeof v !== "object") return err(where, "visual 要是物件");
  const keys = Object.keys(v);
  if (keys.length !== 1 || !["svg", "emojiGroups"].includes(keys[0])) return err(where, "visual 只能是 { svg } 或 { emojiGroups }");
  if (v.svg !== undefined) checkSvg(where, v.svg);
  if (v.emojiGroups) {
    if (!Array.isArray(v.emojiGroups) || !v.emojiGroups.length) return err(where, "emojiGroups 要是非空陣列");
    for (const g of v.emojiGroups) {
      if (!EMOJI_OK.has(g.emoji)) err(where, `emoji 不在允許清單：${g.emoji}`);
      if (!Number.isInteger(g.count) || g.count < 1) err(where, "emojiGroups.count 要是正整數");
    }
  }
}

// ---------- 逐檔逐題 ----------
const seenIds = new Map();
const seenPrompts = new Map();
const report = [];

for (const f of FILES) {
  const file = `${f.section}.json`;
  const path = join(DIR, file);
  if (!existsSync(path)) { err(file, "檔案不存在"); continue; }
  let list;
  try { list = JSON.parse(readFileSync(path, "utf8")); } catch (e) { err(file, "JSON 解析失敗：" + e.message); continue; }
  if (!Array.isArray(list)) { err(file, "內容要是陣列"); continue; }

  const kindCount = Object.fromEntries(KIND_KEYS.map((k) => [k, 0]));
  const diffCount = { 1: 0, 2: 0, 3: 0 };
  const answerPos = [];

  list.forEach((q, i) => {
    const where = `${file} #${i + 1}（${q?.id ?? "沒有 id"}）`;
    if (!q || typeof q !== "object") return err(where, "題目要是物件");

    // 欄位
    for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) err(where, `不認得的欄位 ${k}`);
    const idRe = new RegExp(`^g5soc-${f.section}-\\d{3}$`);
    if (typeof q.id !== "string" || !idRe.test(q.id)) err(where, `id 格式要像 g5soc-${f.section}-001`);
    if (seenIds.has(q.id)) err(where, `id 重複（也在 ${seenIds.get(q.id)}）`);
    seenIds.set(q.id, file);
    if (q.grade !== 5) err(where, "grade 要是 5");
    if (q.subject !== "social") err(where, "subject 要是 social");
    if (q.unit !== f.unit) err(where, `unit 要是 "${f.unit}"`);
    if (q.section !== f.section) err(where, `section 要是 "${f.section}"`);
    if (!TYPES.has(q.type)) err(where, `type 不合法：${q.type}`);
    if (typeof q.prompt !== "string" || q.prompt.trim().length < 4) err(where, "缺 prompt");
    else if (q.prompt.length > 120) err(where, `prompt 太長（${q.prompt.length} 字）`);
    const promptKey = q.prompt + "|" + (q.visual?.svg ?? "") + "|" + JSON.stringify(q.items ?? q.answer);
    if (seenPrompts.has(promptKey)) err(where, `和 ${seenPrompts.get(promptKey)} 是同一題`);
    seenPrompts.set(promptKey, q.id);
    if (typeof q.explanation !== "string" || q.explanation.trim().length < 4) err(where, "缺 explanation");
    else if (q.explanation.length > 90) err(where, `explanation 太長（${q.explanation.length} 字），要短`);
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 3) err(where, "difficulty 要是 1–3");
    else diffCount[q.difficulty]++;
    checkVisual(where, q.visual);

    // 玩法
    const kind = Array.isArray(q.tags) ? q.tags[0] : undefined;
    if (!KIND_KEYS.includes(kind)) err(where, `tags[0] 要是玩法：${KIND_KEYS.join("、")}`);
    else kindCount[kind]++;
    if (Array.isArray(q.tags) && q.tags.slice(1).some((t) => KIND_KEYS.includes(t))) err(where, "tags 只能有一種玩法（放在第一個）");
    if (kind === "timeline" && q.type !== "order") err(where, "時光列車要用 order");
    if (kind === "truefalse" && q.type !== "truefalse") err(where, "是非快答要用 truefalse");
    if (q.type === "truefalse" && kind !== "truefalse") err(where, "truefalse 題的 tags[0] 要是 truefalse");
    if (kind === "who") {
      if (q.type !== "choice") err(where, "猜猜我是誰要用 choice");
      const clues = (q.prompt || "").split("\n").filter((l) => /^[①②③④]/.test(l));
      if (!/^猜猜我是/.test(q.prompt || "")) err(where, "猜猜我是誰的 prompt 要以「猜猜我是」開頭");
      if (clues.length < 2 || clues.length > 3) err(where, `猜猜我是誰要 2–3 句提示，現在 ${clues.length}`);
      const ans = String(q.answer ?? "").replace(/（.*）/, "");
      if (ans && clues.some((c) => c.includes(ans))) err(where, `提示裡直接出現了答案「${ans}」`);
    }

    // 題型
    const hasOptions = q.options !== undefined;
    if (q.type === "choice" || q.type === "multi") {
      if (!Array.isArray(q.options)) return err(where, "缺 options");
      const labels = q.options.map(labelOf);
      q.options.forEach((o, j) => {
        if (typeof o === "string") return;
        if (!o || typeof o !== "object") return err(where, `選項 ${j + 1} 格式不對`);
        for (const k of Object.keys(o)) if (!OPT_KEYS.has(k)) err(where, `選項不認得的欄位 ${k}`);
        if (o.image !== undefined && !EMOJI_OK.has(o.image)) err(where, `選項 emoji 不在允許清單：${o.image}`);
        if (o.svg !== undefined) checkSvg(`${where} 選項 ${j + 1}`, o.svg);
      });
      if (labels.some((l) => typeof l !== "string" || !l.trim())) err(where, "每個選項都要有 label");
      if (new Set(labels).size !== labels.length) err(where, `選項 label 重複：${labels.join("／")}`);
      if (q.type === "choice") {
        if (q.options.length < 2 || q.options.length > 4) err(where, "choice 要 2–4 個選項");
        if (typeof q.answer !== "string" || !labels.includes(q.answer)) err(where, `answer「${q.answer}」不在選項裡`);
        else answerPos.push({ id: q.id, pos: labels.indexOf(q.answer), n: labels.length, letters: labels.every((l) => /^[甲乙丙丁]$/.test(l)) });
      } else {
        if (q.options.length < 3 || q.options.length > 6) err(where, "multi 要 3–6 個選項");
        if (!Array.isArray(q.answer) || !q.answer.length) err(where, "multi 的 answer 要是非空陣列");
        else {
          if (new Set(q.answer).size !== q.answer.length) err(where, "multi 的 answer 重複");
          for (const a of q.answer) if (!labels.includes(a)) err(where, `multi 的 answer「${a}」不在選項裡`);
          if (q.answer.length >= labels.length) err(where, "multi 至少要有一個錯的選項");
          if (q.answer.length < 2) err(where, "multi 至少要有兩個正確答案（只有一個請用 choice）");
        }
        if (!/可以選很多個|可複選/.test(q.prompt)) err(where, "multi 的 prompt 要提示「可以選很多個」");
      }
      // 地圖代號題：選項是甲乙丙丁時，圖上要有這些代號
      if (labels.every((l) => /^[甲乙丙丁]$/.test(l))) {
        if (!q.visual?.svg) err(where, "選項是甲乙丙丁，要附地圖");
        else for (const l of labels) if (!q.visual.svg.includes(`>${l}</text>`)) err(where, `地圖上找不到代號「${l}」`);
      }
    } else {
      if (hasOptions) err(where, `${q.type} 題不要 options`);
    }
    if (q.type === "truefalse" && typeof q.answer !== "boolean") err(where, "truefalse 的 answer 要是 true/false");
    if (q.type === "input") {
      if (!KEYPADS[q.keypad]) err(where, `keypad 不合法：${q.keypad}`);
      else if (typeof q.answer !== "string" || !KEYPADS[q.keypad].test(q.answer)) err(where, `answer「${q.answer}」打不出來（keypad ${q.keypad}）`);
    }
    if (q.type === "order") {
      if (q.answer !== undefined) err(where, "order 題不用 answer（items 就是答案）");
      if (!Array.isArray(q.items) || q.items.length < 2) err(where, "order 至少要 2 張卡");
      else {
        if (q.items.some((x) => typeof x !== "string" || !x.trim())) err(where, "order 的卡片要是文字");
        if (new Set(q.items).size !== q.items.length) err(where, "order 的卡片重複");
        if (q.items.some((x) => x.length > 16)) err(where, "order 的卡片字太多（16 字以內）");
        // 時光列車：卡片都認得時，檢查先後
        const ranks = q.items.map((x) => TIMELINE_RANK.find(([re]) => re.test(x))?.[1]);
        if (ranks.every((r) => r !== undefined)) {
          for (let j = 1; j < ranks.length; j++) {
            if (ranks[j] <= ranks[j - 1]) err(where, `時光列車順序不對：「${q.items[j - 1]}」應該在「${q.items[j]}」之後`);
          }
        }
      }
    } else if (q.items !== undefined) err(where, `${q.type} 題不要 items`);

    // 範圍與用字
    const texts = allStrings({ ...q, visual: q.visual?.emojiGroups ?? null });
    const svgText = q.visual?.svg ? [...q.visual.svg.matchAll(/>([^<>]+)<\/text>/g)].map((m) => m[1]) : [];
    for (const t of [...texts, ...svgText]) {
      for (const [word, why] of OUT_OF_SCOPE) if (t.includes(word)) err(where, `出現「${word}」：${why}`);
      if (TAI_RE.test(t)) err(where, `請用「臺」不要用「台」：${t}`);
      if (SIMPLIFIED_RE.test(t)) err(where, `疑似簡體字：${t}`);
      for (const m of t.matchAll(/(?<![\d,])(1[5-9]\d\d)(?![\d,])/g)) {
        if (!YEARS_OK.has(m[1])) err(where, `年份 ${m[1]} 不在書上的年表（1624、1626、1642、1662、1684）`);
      }
    }
  });

  // 題數、玩法、難度
  if (list.length < f.min) err(file, `至少要 ${f.min} 題，現在 ${list.length} 題`);
  for (const [k, n] of Object.entries(f.need)) if (kindCount[k] < n) err(file, `「${KINDS[k]}」（${k}）至少 ${n} 題，現在 ${kindCount[k]}`);
  if (KIND_KEYS.filter((k) => kindCount[k] > 0).length < 4) err(file, "至少要有 4 種玩法");
  for (const d of [1, 2, 3]) if (diffCount[d] < 3) err(file, `難度 ${d} 至少 3 題，現在 ${diffCount[d]}`);
  // 選項不會在遊戲裡打亂，所以答案位置要分散（甲乙丙丁的地圖題不算）
  const pos = answerPos.filter((p) => !p.letters);
  if (pos.length >= 6) {
    const counts = {};
    for (const p of pos) counts[p.pos] = (counts[p.pos] || 0) + 1;
    const top = Math.max(...Object.values(counts));
    if (top / pos.length > 0.55) err(file, `選擇題答案太集中在同一個位置（${JSON.stringify(counts)}）`);
  }
  report.push({ file, total: list.length, diff: diffCount, ...kindCount });
}

// ---------- 特定觀念一定要有 ----------
{
  const load = (s) => { try { return JSON.parse(readFileSync(join(DIR, `${s}.json`), "utf8")); } catch { return []; } };
  const l13 = load("1-3");
  // 孩子曾把泰雅族小米祈福祭儀的「頭目」寫成「祭司」
  const chief = l13.filter((q) => /小米祈福/.test(q.prompt) && /祭司|頭目/.test(q.prompt + JSON.stringify(q.options ?? "")));
  if (!chief.some((q) => q.type === "truefalse" && q.answer === false && /祭司/.test(q.prompt))) err("1-3.json", "要有「小米祈福祭儀由祭司祈福」的是非題（答案 ×）");
  if (!chief.some((q) => q.type === "choice" && q.answer === "頭目")) err("1-3.json", "要有「小米祈福祭儀由誰祈福」的選擇題（答案 頭目）");
  // 狩獵 11 月～隔年 4 月、吃飛魚 3～10 月 容易混淆
  if (!l13.some((q) => /打獵/.test(q.prompt) && q.answer === "11 月～隔年 4 月")) err("1-3.json", "要有泰雅族打獵月份的題目");
  if (!l13.some((q) => /飛魚/.test(q.prompt) && q.answer === "3～10 月")) err("1-3.json", "要有達悟族吃飛魚月份的題目");
}

// ---------- 結果 ----------
const col = ["map", "island", "dig", "timeline", "who", "culture", "cause", "truefalse"];
console.log(`檔案       題數  ${col.map((k) => KINDS[k].slice(0, 2)).join(" ")}   難度1/2/3`);
for (const r of report) {
  console.log(`${r.file.padEnd(9)} ${String(r.total).padStart(4)}  ${col.map((k) => String(r[k]).padStart(4)).join(" ")}   ${r.diff[1]}/${r.diff[2]}/${r.diff[3]}`);
}
console.log(`合計 ${report.reduce((s, r) => s + r.total, 0)} 題`);

if (errors.length) {
  console.error(`\n✗ 有 ${errors.length} 個問題：`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("\n✓ 全部通過");
