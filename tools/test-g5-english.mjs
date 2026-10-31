// 五年級英語（Here We Go 第 5 冊，期中考：Starter、Unit 1、Unit 2、Review 1）題庫檢查
// 用法：node tools/test-g5-english.mjs
// 題庫由 tools/build-g5-english.mjs 產生。檢查 docs/題目格式.md 的欄位、id 不重複、各題型的答案格式、
// 英語朗讀欄位、每個檔的題數和玩法（tags[0]）。有錯就以非 0 結束。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "data/questions/g5/english");

// 玩法（tags[0]）：規格書 4.4 英語（ABC 港口）
const KINDS = ["listen", "spell", "sentence", "picture", "grammar", "table", "reading", "phonics", "talk", "number"];
const FILES = [
  { section: "ST", unit: "A", min: 30, need: { listen: 8, spell: 6, sentence: 2 } },
  { section: "U1", unit: "A", min: 40, need: { listen: 8, spell: 6, grammar: 8, sentence: 3, table: 2, reading: 2 } },
  { section: "U2", unit: "B", min: 40, need: { listen: 8, spell: 6, grammar: 8, sentence: 3, table: 3, reading: 2 } },
  { section: "R1", unit: "B", min: 25, need: { table: 5, listen: 6, reading: 3 } },
];
const Q_KEYS = new Set(["id", "grade", "subject", "unit", "section", "type", "prompt", "speak", "speakLang", "autoSay", "answerSpeak",
  "visual", "options", "answer", "items", "explanation", "difficulty", "tags"]);

const errors = [];
const err = (q, msg) => errors.push(`${q.id || "?"}：${msg}`);
const ids = new Set();
let total = 0;

for (const f of FILES) {
  const list = JSON.parse(readFileSync(join(DIR, `${f.section}.json`), "utf8"));
  total += list.length;
  if (list.length < f.min) errors.push(`${f.section}：只有 ${list.length} 題，至少要 ${f.min} 題`);
  const kinds = {};
  for (const q of list) {
    for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) err(q, `多了不認得的欄位 ${k}`);
    if (ids.has(q.id)) err(q, "id 重複");
    ids.add(q.id);
    if (q.grade !== 5 || q.subject !== "english" || q.section !== f.section || q.unit !== f.unit) err(q, "grade／subject／section／unit 不對");
    if (!q.prompt || !q.explanation) err(q, "缺題目或說明");
    if (![1, 2, 3].includes(q.difficulty)) err(q, "difficulty 要是 1–3");
    const kind = q.tags && q.tags[0];
    if (!KINDS.includes(kind)) err(q, `tags[0]「${kind}」不是英語玩法`);
    kinds[kind] = (kinds[kind] || 0) + 1;
    if (q.speakLang && (q.speakLang !== "en" || !q.speak)) err(q, "speakLang 要是 en，而且要有 speak");
    if (q.autoSay && !q.speakLang) err(q, "autoSay 要搭配英語 speak");
    if (q.answerSpeak && /[一-鿿]/.test(q.answerSpeak)) err(q, "answerSpeak 是英語朗讀，不能有中文");
    if ((kind === "listen" || kind === "spell") && q.prompt.startsWith("🎧") && !q.autoSay) err(q, "聽力題要自動念");
    if (q.type === "choice") {
      const labels = q.options.map((o) => (typeof o === "string" ? o : o.label));
      if (labels.length < 2 || labels.length > 4) err(q, "選項要 2–4 個");
      if (new Set(labels).size !== labels.length) err(q, "選項重複");
      if (!labels.includes(q.answer)) err(q, "答案不在選項裡");
      if (kind === "listen" && q.answer !== q.speak && !q.tags.includes("reply")) err(q, "聽音選字的答案要等於念出來的字");
    } else if (q.type === "order") {
      if (!Array.isArray(q.items) || q.items.length < 2) err(q, "排序題要有 items");
      if (kind === "spell" && q.items.join("") !== q.speak) err(q, "拼字題的字母要拼成念出來的字");
      if (kind === "sentence" && q.items.join(" ") !== q.speak) err(q, "句子重組要和朗讀的句子一樣");
    } else if (q.type === "truefalse") {
      if (typeof q.answer !== "boolean") err(q, "是非題答案要是 true／false");
    } else err(q, `不支援的題型 ${q.type}`);
    if (q.visual && !(q.visual.svg || q.visual.emojiGroups)) err(q, "visual 格式不對");
    if (q.visual?.svg && !/^<svg[^>]*viewBox/.test(q.visual.svg)) err(q, "SVG 要有 viewBox");
  }
  for (const [k, n] of Object.entries(f.need)) if ((kinds[k] || 0) < n) errors.push(`${f.section}：${k} 只有 ${kinds[k] || 0} 題，至少要 ${n} 題`);
  console.log(`${f.section}：${list.length} 題 ${JSON.stringify(kinds)}`);
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} 個問題：\n` + errors.join("\n"));
  process.exit(1);
}
console.log(`\n✅ 全部 ${total} 題通過`);
