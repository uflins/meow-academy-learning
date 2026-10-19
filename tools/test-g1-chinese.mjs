// 一年級國語（注音首冊 第 1–9 課）題庫檢查
// 用法：node tools/test-g1-chinese.mjs
// 檢查 docs/題目格式.md 的欄位、一年級規則（speak、2–3 個選項）、答案在選項裡、
// id 不重複、每課只用教過的注音符號和結合韻、題數和玩法比例。有錯就以非 0 結束。

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "data/questions/g1/chinese");

// ---------- 各課符號表（範圍整理/一年級國語.md 第 2 節，依書末「各課符號表」） ----------
const LESSON_TABLE = {
  1: { symbols: "ㄅㄆㄇㄉㄧㄠ", compounds: [] },
  2: { symbols: "ㄈㄏㄓㄔㄨㄚㄜ", compounds: [] },
  3: { symbols: "ㄌㄑㄗㄩㄛㄢㄤ", compounds: [] },
  4: { symbols: "ㄒㄕㄟㄡㄦ", compounds: ["ㄧㄠ", "ㄨㄢ"] },
  5: { symbols: "ㄋㄍㄞㄥ", compounds: ["ㄧㄚ", "ㄧㄡ", "ㄧㄤ"] },
  6: { symbols: "ㄐㄙㄝ", compounds: ["ㄧㄝ", "ㄨㄚ", "ㄨㄛ", "ㄨㄥ"] },
  7: { symbols: "ㄊㄎㄣ", compounds: ["ㄧㄢ", "ㄧㄥ", "ㄨㄞ", "ㄨㄟ"] },
  8: { symbols: "ㄖㄘ", compounds: ["ㄧㄛ", "ㄨㄤ", "ㄩㄢ", "ㄩㄥ"] },
  9: { symbols: "", compounds: ["ㄧㄞ", "ㄧㄣ", "ㄨㄣ", "ㄩㄝ", "ㄩㄣ"] },
};

// 檔案（依上課順序）；upTo = 可以用到第幾課的符號；minCount = 至少幾題
const FILES = [
  { file: "lesson-1.json", section: "1", key: "l1", upTo: 1, minCount: 15 },
  { file: "lesson-2.json", section: "2", key: "l2", upTo: 2, minCount: 15 },
  { file: "lesson-3.json", section: "3", key: "l3", upTo: 3, minCount: 15 },
  { file: "review-1.json", section: "r1", key: "r1", upTo: 3, minCount: 20 },
  { file: "lesson-4.json", section: "4", key: "l4", upTo: 4, minCount: 15 },
  { file: "lesson-5.json", section: "5", key: "l5", upTo: 5, minCount: 15 },
  { file: "lesson-6.json", section: "6", key: "l6", upTo: 6, minCount: 15 },
  { file: "review-2.json", section: "r2", key: "r2", upTo: 6, minCount: 20 },
  { file: "lesson-7.json", section: "7", key: "l7", upTo: 7, minCount: 15 },
  { file: "lesson-8.json", section: "8", key: "l8", upTo: 8, minCount: 15 },
  { file: "lesson-9.json", section: "9", key: "l9", upTo: 9, minCount: 15 },
  { file: "review-3.json", section: "r3", key: "r3", upTo: 9, minCount: 20 },
];
const MOUTH_FROM = FILES.findIndex((f) => f.key === "r1"); // 嘴形猜猜看從複習一開始

// 只用 iPad 內建、Unicode 13 以前就有的 emoji（新增圖片時請一併加進來）
const EMOJI_OK = new Set(
  ("🐱 🐆 ✏️ 👜 🌾 👶 🔪 🍚 🤗 🏃 👃 👦 🐴 🐷 🐯 🫖 🕷️ 👨 🚗 5️⃣ 8️⃣ 📏 🍵 👩 🐟 🦛 🌽 🍐 🥚 🐺 ☔ 🔵 7️⃣ " +
    "🌶️ 🟢 🧢 🏠 🎒 🐒 👂 ⛵ ⌚ 😄 ✋ 🐍 📖 🌳 🥣 🦁 2️⃣ 👧 🐧 🐊 🐶 🌊 🐝 🐘 🥛 🍰 ⚽ 🐮 🐑 🦷 🐦 🦆 🦐 💡 " +
    "👵 🦈 6️⃣ 🥁 🐔 🍉 🍌 👟 ☂️ 🌸 🔥 🔴 3️⃣ 4️⃣ 🐛 ⏰ 🦶 9️⃣ 🙏 🍴 👩‍🏫 🍲 🍃 🐸 🐢 🥢 🚪 🍞 🐰 👖 🦵 👻 " +
    "💧 👄 ⭐ 🧊 💰 🍬 🍮 🦋 🥕 🌈 🐻 🛏️ 🧲 👑 🟡 🥵 🍖 🌿 🥬 ⭕ 🪟 🏊 📅 🧅 🤴 🦚 ☁️ ⛄ 🐬 🪱 🌙 👗 ❤️ " +
    "🦟 ❄️ 🏫 🐠 ♨️ 🪑 🍔 🧙 📄 🪄 🎈 🐓 🍎 ☀️").split(" "),
);

const KINDS = ["look-pick", "blend", "tone", "detective", "mouth"];
const TONES = ["一聲", "二聲", "三聲", "四聲", "輕聲"];
const INITIALS = "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ";
const MEDIALS = "ㄧㄨㄩ";
const FINALS = "ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ";
const TONE_MARK = { "ˊ": "二聲", "ˇ": "三聲", "ˋ": "四聲" };
const ZY_RE = /[ㄅ-ㄩˊˇˋ˙]/;
const SYLLABLE_RE = new RegExp(`^(˙)?([${INITIALS}])?([${MEDIALS}])?([${FINALS}])?([ˊˇˋ])?$`);
const Q_KEYS = new Set(["id", "grade", "subject", "unit", "section", "type", "prompt", "speak", "visual", "options",
  "answer", "explanation", "explainSpeak", "difficulty", "tags", "needsAudio"]);
const OPT_KEYS = new Set(["label", "image", "svg", "speak"]);

const errors = [];
const err = (where, msg) => errors.push(`${where}：${msg}`);

// ---------- 符號表本身 ----------
{
  const all = Object.values(LESSON_TABLE).map((l) => l.symbols).join("");
  const comps = Object.values(LESSON_TABLE).flatMap((l) => l.compounds);
  if ([...all].length !== 37 || new Set(all).size !== 37) err("符號表", `應有 37 個不重複符號，現在 ${[...all].length}`);
  if (comps.length !== 22 || new Set(comps).size !== 22) err("符號表", `應有 22 個結合韻，現在 ${comps.length}`);
}

function allowedUpTo(n) {
  const symbols = new Set();
  const compounds = new Set();
  for (let i = 1; i <= n; i++) {
    for (const s of LESSON_TABLE[i].symbols) symbols.add(s);
    for (const c of LESSON_TABLE[i].compounds) compounds.add(c);
  }
  return { symbols, compounds };
}

const isZhuyin = (s) => typeof s === "string" && ZY_RE.test(s);
const labelOf = (o) => (typeof o === "string" ? o : o?.label);
const toneOf = (syl) => (syl.startsWith("˙") ? "輕聲" : TONE_MARK[syl[syl.length - 1]] ?? "一聲");

// 一個注音拼法（音節用空白分開）是否寫得合法：輕聲點在前、聲調在後、一聲不標
function checkSpelling(where, s) {
  for (const syl of s.split(" ")) {
    const m = SYLLABLE_RE.exec(syl);
    if (!m || !(m[2] || m[3] || m[4])) { err(where, `注音寫法不對：「${s}」`); continue; }
    if (m[1] && m[5]) err(where, `輕聲不能再標聲調：「${s}」`);
  }
}

// 文字裡的注音只能用到教過的符號和結合韻
function checkScope(where, text, allowed, upTo) {
  if (typeof text !== "string") return;
  const chars = [...text];
  chars.forEach((c, i) => {
    if (/[ㄅ-ㄩ]/.test(c) && !allowed.symbols.has(c)) err(where, `用到第 ${upTo} 課以後才教的符號「${c}」：${text}`);
    const next = chars[i + 1];
    if (MEDIALS.includes(c) && next && FINALS.includes(next) && !allowed.compounds.has(c + next)) {
      err(where, `用到第 ${upTo} 課以後才教的結合韻「${c + next}」：${text}`);
    }
  });
}

function checkVisual(where, v) {
  if (v === null || v === undefined) return;
  if (typeof v !== "object") return err(where, "visual 要是物件或 null");
  const keys = Object.keys(v);
  if (keys.length !== 1 || !["svg", "emojiGroups", "splitDiagram"].includes(keys[0])) return err(where, "visual 格式不對");
  if (v.emojiGroups) {
    if (!Array.isArray(v.emojiGroups) || !v.emojiGroups.length) return err(where, "emojiGroups 要是非空陣列");
    for (const g of v.emojiGroups) {
      if (!EMOJI_OK.has(g.emoji)) err(where, `emoji 不在允許清單：${g.emoji}`);
      if (!Number.isInteger(g.count) || g.count < 1) err(where, "emojiGroups.count 要是正整數");
    }
  }
}
const visualEmoji = (q) => q.visual?.emojiGroups?.[0]?.emoji;

// ---------- 逐檔逐題 ----------
const seenIds = new Map();
const report = [];

FILES.forEach((f, fileIndex) => {
  const path = join(DIR, f.file);
  if (!existsSync(path)) return err(f.file, "檔案不存在");
  let list;
  try { list = JSON.parse(readFileSync(path, "utf8")); } catch (e) { return err(f.file, "JSON 解析失敗：" + e.message); }
  if (!Array.isArray(list)) return err(f.file, "內容要是陣列");

  const allowed = allowedUpTo(f.upTo);
  const kindCount = Object.fromEntries(KINDS.map((k) => [k, 0]));
  let neutralTone = 0;

  list.forEach((q, i) => {
    const where = `${f.file} #${i + 1}（${q?.id ?? "沒有 id"}）`;
    if (!q || typeof q !== "object") return err(where, "題目要是物件");

    // 欄位
    for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) err(where, `不認得的欄位 ${k}`);
    if (typeof q.id !== "string" || !new RegExp(`^g1zh-${f.key}-\\d{3}$`).test(q.id)) err(where, `id 格式要像 g1zh-${f.key}-001`);
    if (seenIds.has(q.id)) err(where, `id 重複（也在 ${seenIds.get(q.id)}）`);
    seenIds.set(q.id, f.file);
    if (q.grade !== 1) err(where, "grade 要是 1");
    if (q.subject !== "chinese") err(where, "subject 要是 chinese");
    if (q.unit !== "首冊") err(where, "unit 要是「首冊」");
    if (q.section !== f.section) err(where, `section 要是 "${f.section}"`);
    if (q.type !== "choice") err(where, "type 要是 choice");
    if (typeof q.prompt !== "string" || !q.prompt.trim()) err(where, "缺 prompt");
    if (typeof q.speak !== "string" || !q.speak.trim()) err(where, "一年級每題都要有 speak");
    if (isZhuyin(q.speak)) err(where, `speak 不要寫注音符號，要寫詞語：${q.speak}`);
    if (typeof q.explanation !== "string" || !q.explanation.trim()) err(where, "缺 explanation");
    if (isZhuyin(q.explanation) && !(typeof q.explainSpeak === "string" && q.explainSpeak.trim())) err(where, "explanation 有注音，要另給 explainSpeak");
    if (q.explainSpeak != null && isZhuyin(q.explainSpeak)) err(where, `explainSpeak 不要寫注音符號：${q.explainSpeak}`);
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 3) err(where, "difficulty 要是 1–3");
    if (q.needsAudio !== undefined && !(typeof q.needsAudio === "string" && SYLLABLE_RE.test(q.needsAudio))) err(where, "needsAudio 要是一個注音");
    checkVisual(where, q.visual);

    // 選項
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 3) {
      err(where, "一年級選項要 2–3 個");
      return;
    }
    const labels = q.options.map(labelOf);
    q.options.forEach((o, j) => {
      if (typeof o === "string") return;
      if (!o || typeof o !== "object") return err(where, `選項 ${j + 1} 格式不對`);
      for (const k of Object.keys(o)) if (!OPT_KEYS.has(k)) err(where, `選項不認得的欄位 ${k}`);
      if (o.image !== undefined && !EMOJI_OK.has(o.image)) err(where, `選項 emoji 不在允許清單：${o.image}`);
      if (o.speak !== undefined && (typeof o.speak !== "string" || !o.speak.trim() || isZhuyin(o.speak))) err(where, `選項 speak 要是詞語，不要寫注音：${o.speak}`);
    });
    if (labels.some((l) => typeof l !== "string" || !l.trim())) err(where, "每個選項都要有 label");
    if (new Set(labels).size !== labels.length) err(where, `選項 label 重複：${labels.join("／")}`);
    if (typeof q.answer !== "string" || !labels.includes(q.answer)) err(where, `answer「${q.answer}」不在選項裡`);

    // 範圍
    const texts = [q.prompt, q.speak, q.explanation, q.explainSpeak, q.answer, q.needsAudio,
      ...q.options.flatMap((o) => (typeof o === "string" ? [o] : [o.label, o.speak]))];
    for (const t of texts) checkScope(where, t, allowed, f.upTo);
    for (const t of q.tags ?? []) for (const c of String(t)) {
      if (/[ㄅ-ㄩ]/.test(c) && !allowed.symbols.has(c)) err(where, `tags 用到還沒教的符號「${c}」`);
    }

    // 玩法
    const kind = Array.isArray(q.tags) ? q.tags.find((t) => KINDS.includes(t)) : undefined;
    if (!kind) return err(where, `tags 要寫玩法（${KINDS.join("、")}）`);
    if (q.tags.filter((t) => KINDS.includes(t)).length !== 1) err(where, "tags 只能有一種玩法");
    kindCount[kind]++;

    if (kind === "look-pick") {
      if (!visualEmoji(q)) err(where, "看圖找注音要有圖（visual.emojiGroups）");
      q.options.forEach((o) => { if (typeof o === "object" && (o.image || o.svg)) err(where, "注音選項不要放圖"); });
      labels.forEach((l) => checkSpelling(where, l));
      const m = /的注音是 ([^。]+)。/.exec(q.explanation);
      if (m && m[1] !== q.answer) err(where, `說明的注音「${m[1]}」和答案「${q.answer}」不一樣`);
    }
    if (kind === "blend") {
      if (!q.prompt.includes("＋")) err(where, "拼音魔法鍋的 prompt 要列出「ㄇ ＋ ㄠ」這樣的零件");
      q.options.forEach((o) => {
        if (typeof o !== "object" || !o.image || !o.speak) err(where, "拼音魔法鍋的選項要有 image 和 speak");
        if (isZhuyin(labelOf(o))) err(where, "拼音魔法鍋的選項是圖片和詞，不要寫注音");
      });
      const parts = (q.prompt.split("\n").pop() ?? "").split("＋").map((s) => s.trim()).join("");
      const m = /拼成 (\S+)，/.exec(q.explanation);
      if (m) { checkSpelling(where, m[1]); if (m[1] !== parts) err(where, `零件「${parts}」和說明的拼法「${m[1]}」不一樣`); }
    }
    if (kind === "tone") {
      if (labels.some((l) => !TONES.includes(l))) err(where, `聲調選項只能是 ${TONES.join("、")}`);
      const m = /寫成 ([^，]+)，(?:第([一二三四])個字)?是/.exec(q.explanation);
      if (m) {
        checkSpelling(where, m[1]);
        const syl = m[1].split(" ")[m[2] ? "一二三四".indexOf(m[2]) : 0];
        if (!syl || toneOf(syl) !== q.answer) err(where, `「${m[1]}」看起來是${syl ? toneOf(syl) : "？"}，答案卻是${q.answer}`);
      }
      if (q.answer === "輕聲") neutralTone++;
    }
    if (kind === "detective") {
      q.options.forEach((o) => { if (typeof o !== "object" || !o.image || !o.speak) err(where, "注音小偵探的選項要有 image 和 speak"); });
      labels.forEach((l) => checkSpelling(where, l));
      const m = /要寫成 (.+)，不是 (.+)。/.exec(q.explanation);
      if (!m) err(where, "注音小偵探的說明要寫「要寫成…，不是…。」");
      else {
        if (m[2] !== q.answer) err(where, `說明裡錯的寫法「${m[2]}」不是答案「${q.answer}」`);
        if (m[1] === m[2]) err(where, "正確和錯誤的寫法一樣");
        checkSpelling(where, m[1]);
      }
    }
    if (kind === "mouth") {
      if (fileIndex < MOUTH_FROM) err(where, "嘴形猜猜看從複習一才開始");
      if (labels.some((l) => !MEDIALS.includes(l) || l.length !== 1)) err(where, "嘴形題的選項只能是 ㄧ、ㄨ、ㄩ");
      q.options.forEach((o) => { if (typeof o !== "object" || !o.speak) err(where, "嘴形題選項要有 speak（念詞語，不念單一符號）"); });
      if (!visualEmoji(q)) err(where, "嘴形題要有圖");
      const m = /的注音是 (\S+)，有 (\S) 的音/.exec(q.explanation);
      if (m) {
        checkSpelling(where, m[1]);
        if (m[2] !== q.answer || !m[1].includes(q.answer)) err(where, `說明「${m[1]}」和答案「${q.answer}」對不起來`);
        if ([...m[1]].filter((c) => MEDIALS.includes(c)).length !== 1) err(where, `嘴形題的字要剛好有一個 ㄧㄨㄩ：${m[1]}`);
      }
    }
  });

  // 題數和玩法比例
  if (list.length < f.minCount) err(f.file, `至少要 ${f.minCount} 題，現在 ${list.length} 題`);
  for (const k of ["look-pick", "blend", "tone", "detective"]) if (kindCount[k] < 2) err(f.file, `「${k}」至少 2 題，現在 ${kindCount[k]}`);
  if (fileIndex >= MOUTH_FROM && kindCount.mouth < 1) err(f.file, "複習一以後每個檔至少要有 1 題嘴形猜猜看");
  if (neutralTone < 1) err(f.file, "至少要有 1 題輕聲的聲調題");
  report.push({ file: f.file, total: list.length, ...kindCount });
});

// ---------- 結果 ----------
console.log("檔案              題數  看圖 拼音 聲調 偵探 嘴形");
for (const r of report) {
  console.log(`${r.file.padEnd(17)} ${String(r.total).padStart(4)}  ${[r["look-pick"], r.blend, r.tone, r.detective, r.mouth].map((n) => String(n).padStart(4)).join(" ")}`);
}
console.log(`合計 ${report.reduce((s, r) => s + r.total, 0)} 題`);

if (errors.length) {
  console.error(`\n✗ 有 ${errors.length} 個問題：`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("\n✓ 全部通過");
