// 五年級國語（康軒 5上 第1–6課、學習地圖一二、閱讀階梯一）題庫檢查
// 用法：node tools/test-g5-chinese.mjs
// 檢查 docs/題目格式.md 的欄位、id 不重複、各題型的答案格式、題數和玩法（tags[0]）、難度分布、
// 修辭卡只用範圍內的 7 種、注音寫法（聲調在後、輕聲點在前）、
// 並依自修的生字表核對讀音題、破音字題、部首題和筆畫題的答案。有錯就以非 0 結束。

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "data/questions/g5/chinese");

// 玩法（tags[0]）：規格書 4.4 國語（文字森林）
const KINDS = {
  reading: "讀音雙胞胎",
  polyphone: "破音字特別關",
  lookalike: "形近字／同音字",
  wrongchar: "錯字通緝令",
  radical: "部首／筆畫",
  word: "詞語",
  rhetoric: "修辭技能卡",
  idiom: "成語（怪物說錯話、成語拼拼樂）",
  sentence: "句型",
  content: "課文理解",
};
const KIND_KEYS = Object.keys(KINDS);

// 每個檔：單元、至少幾題、至少幾種玩法
const FILES = [
  { section: "L1", unit: "一", min: 22, kinds: 8 },
  { section: "L2", unit: "一", min: 22, kinds: 8 },
  { section: "L3", unit: "一", min: 22, kinds: 8 },
  { section: "M1", unit: "一", min: 12, kinds: 2 },
  { section: "L4", unit: "二", min: 22, kinds: 8 },
  { section: "L5", unit: "二", min: 22, kinds: 8 },
  { section: "L6", unit: "二", min: 22, kinds: 8 },
  { section: "M2", unit: "二", min: 12, kinds: 2 },
  { section: "R1", unit: "二", min: 12, kinds: 2 },
];

// 範圍內的修辭（規格書 8.1）；誇飾、映襯不在範圍內，題庫裡不該出現
const RHETORIC = ["譬喻", "轉化", "設問", "排比", "摹寫", "類疊", "引用"];
const OUT_OF_SCOPE = ["誇飾", "映襯"];

const TYPES = new Set(["choice", "multi", "truefalse", "input", "order"]);
const KEYPADS = { digits: /^\d+$/, degree: /^\d+$/, fraction: /^\d+(\/\d+)?$/, decimal: /^\d+(\.\d+)?$/ };
const Q_KEYS = new Set(["id", "grade", "subject", "unit", "section", "type", "prompt", "speak", "visual", "options",
  "answer", "accept", "keypad", "items", "explanation", "explainSpeak", "difficulty", "tags"]);
const OPT_KEYS = new Set(["label", "image", "svg", "speak"]);

// ---------- 自修生字表（範圍整理/五年級國語.md 第 4 節）：字 注音 部首 總筆畫 ----------
const CHAR_TABLE = {
  L1: `蚊 ㄨㄣˊ 虫 10|帳 ㄓㄤˋ 巾 11|洲 ㄓㄡ 水 9|瘧 ㄋㄩㄝˋ 疒 14|疾 ㄐㄧˊ 疒 10|集 ㄐㄧˊ 隹 12|寄 ㄐㄧˋ 宀 11|贈 ㄗㄥˋ 貝 19|獎 ㄐㄧㄤˇ 犬 15|死 ㄙˇ 歹 6|叮 ㄉㄧㄥ 口 5|存 ㄘㄨㄣˊ 子 6|募 ㄇㄨˋ 力 13|狀 ㄓㄨㄤˋ 犬 8|藏 ㄘㄤˊ 艸 18|誌 ㄓˋ 言 14|基 ㄐㄧ 土 11|赴 ㄈㄨˋ 走 9`,
  L2: `德 ㄉㄜˊ 彳 15|乎 ㄏㄨ 丿 5|血 ㄒㄧㄝˇ 血 6|攝 ㄕㄜˋ 手 21|颱 ㄊㄞˊ 風 14|錄 ㄌㄨˋ 金 16|哀 ㄞ 口 9|巒 ㄌㄨㄢˊ 山 22|縱 ㄗㄨㄥ 糸 17|臍 ㄑㄧˊ 肉 18|禍 ㄏㄨㄛˋ 示 13|殘 ㄘㄢˊ 歹 12|檳 ㄅㄧㄣ 木 18|榔 ㄌㄤˊ 木 13|降 ㄐㄧㄤˋ 阜 9|鏟 ㄔㄢˇ 金 19|汙 ㄨ 水 6|斷 ㄉㄨㄢˋ 斤 18`,
  L3: `峭 ㄑㄧㄠˋ 山 10|勁 ㄐㄧㄥˋ 力 9|聳 ㄙㄨㄥˇ 耳 17|飢 ㄐㄧ 食 10|隱 ㄧㄣˇ 阜 17|扯 ㄔㄜˇ 手 7|銳 ㄖㄨㄟˋ 金 15|箭 ㄐㄧㄢˋ 竹 15|韌 ㄖㄣˋ 韋 12|虯 ㄑㄧㄡˊ 虫 8|鬚 ㄒㄩ 髟 22|茂 ㄇㄠˋ 艸 9|止 ㄓˇ 止 4|蔓 ㄇㄢˋ 艸 15|藉 ㄐㄧㄝˋ 艸 18|豐 ㄈㄥ 豆 18|挫 ㄘㄨㄛˋ 手 10|折 ㄓㄜˊ 手 7`,
  L4: `恆 ㄏㄥˊ 心 9|澄 ㄔㄥˊ 水 15|穗 ㄙㄨㄟˋ 禾 17|養 ㄧㄤˇ 食 15|源 ㄩㄢˊ 水 13|藝 ㄧˋ 艸 19|樸 ㄆㄨˊ 木 16|堆 ㄉㄨㄟ 土 11|撿 ㄐㄧㄢˇ 手 16|巾 ㄐㄧㄣ 巾 3|痠 ㄙㄨㄢ 疒 12|素 ㄙㄨˋ 糸 10|尊 ㄗㄨㄣ 寸 12|嚴 ㄧㄢˊ 口 20|勞 ㄌㄠˊ 力 12|怨 ㄩㄢˋ 心 9|慷 ㄎㄤ 心 14|慨 ㄎㄞˇ 心 12|滋 ㄗ 水 12`,
  L5: `譽 ㄩˋ 言 21|務 ㄨˋ 力 11|聯 ㄌㄧㄢˊ 耳 17|核 ㄏㄜˊ 木 10|申 ㄕㄣ 田 5|局 ㄐㄩˊ 尸 7|松 ㄙㄨㄥ 木 8|註 ㄓㄨˋ 言 12|冊 ㄘㄜˋ 冂 5|企 ㄑㄧˇ 人 6|毅 ㄧˋ 殳 15|歷 ㄌㄧˋ 止 16|英 ㄧㄥ 艸 9|銷 ㄒㄧㄠ 金 15|售 ㄕㄡˋ 口 11|勝 ㄕㄥˋ 力 12|霸 ㄅㄚˋ 雨 21|項 ㄒㄧㄤˋ 頁 12`,
  L6: `娛 ㄩˊ 女 10|汽 ㄑㄧˋ 水 7|哨 ㄕㄠˋ 口 10|典 ㄉㄧㄢˇ 八 8|框 ㄎㄨㄤ 木 10|劇 ㄐㄩˋ 刀 15|佳 ㄐㄧㄚ 人 8|膩 ㄋㄧˋ 肉 16|效 ㄒㄧㄠˋ 攴 10|隊 ㄉㄨㄟˋ 阜 12|父 ㄈㄨˋ 父 4|責 ㄗㄜˊ 貝 11|判 ㄆㄢˋ 刀 7|鳴 ㄇㄧㄥˊ 鳥 14|穎 ㄧㄥˇ 禾 16|獲 ㄏㄨㄛˋ 犬 17|益 ㄧˋ 皿 10|貌 ㄇㄠˋ 豸 14|官 ㄍㄨㄢ 宀 8|增 ㄗㄥ 土 15`,
};
const LESSON_SIZE = { L1: 18, L2: 18, L3: 18, L4: 19, L5: 18, L6: 20 };

// 多音字：依自修，讀音跟著詞語走（家長確認：讀音以自修為準）
const WORD_READINGS = {
  藏: { 收藏: "ㄘㄤˊ", 躲藏: "ㄘㄤˊ", 寶藏: "ㄗㄤˋ", 西藏: "ㄗㄤˋ" },
  漿: { 豆漿: "ㄐㄧㄤ", 米漿: "ㄐㄧㄤ", 漿糊: "ㄐㄧㄤˋ" },
  縱: { 縱谷: "ㄗㄨㄥ", 縱隊: "ㄗㄨㄥ", 縱火: "ㄗㄨㄥˋ", 放縱: "ㄗㄨㄥˋ" },
  濟: { 人才濟濟: "ㄐㄧˇ", 經濟: "ㄐㄧˋ", 救濟: "ㄐㄧˋ" },
  降: { 降低: "ㄐㄧㄤˋ", 下降: "ㄐㄧㄤˋ", 投降: "ㄒㄧㄤˊ" },
  藉: { 憑藉: "ㄐㄧㄝˋ", 藉由: "ㄐㄧㄝˋ", 藉口: "ㄐㄧㄝˋ", 狼藉: "ㄐㄧˊ", 杯盤狼藉: "ㄐㄧˊ" },
  削: { 削足適履: "ㄒㄩㄝ", 刀削麵: "ㄒㄧㄠ" },
  養: { 養活: "ㄧㄤˇ", 奉養: "ㄧㄤˋ", 供養: "ㄧㄤˋ" },
  勞: { 辛勞: "ㄌㄠˊ", 慰勞: "ㄌㄠˋ", 勞軍: "ㄌㄠˋ" },
  行: { 行經: "ㄒㄧㄥˊ", 行業: "ㄏㄤˊ" },
  要: { 要是: "ㄧㄠˋ", 要求: "ㄧㄠ" },
  得: { 路得: "ㄉㄜˊ", 得到: "ㄉㄜˊ" },
  勝: { 勝利: "ㄕㄥˋ", 略勝一籌: "ㄕㄥˋ", 出奇制勝: "ㄕㄥˋ", 勝任: "ㄕㄥ", 不勝枚舉: "ㄕㄥ" },
  樂: { 娛樂: "ㄌㄜˋ", 快樂: "ㄌㄜˋ", 音樂: "ㄩㄝˋ", 配樂: "ㄩㄝˋ" },
};
// 自修沒教、但字典裡也有的讀音：不能拿來當讀音題的錯誤選項（免得孩子在別處看到而混淆）
const OTHER_READINGS = {
  血: ["ㄒㄩㄝˋ"], 勁: ["ㄐㄧㄣˋ"], 蔓: ["ㄨㄢˋ", "ㄇㄢˊ"], 澄: ["ㄉㄥˋ"], 核: ["ㄏㄨˊ"], 瘧: ["ㄧㄠˋ"],
  企: ["ㄑㄧˋ"], 樸: ["ㄆㄨˇ", "ㄆㄛˋ"], 慨: ["ㄎㄞˋ"], 框: ["ㄎㄨㄤˋ"], 譽: ["ㄩˊ"], 霸: ["ㄆㄛˋ"], 汙: ["ㄨˋ"],
  樂: ["ㄧㄠˋ"], 父: ["ㄈㄨˇ"],
};

// ---------- 注音 ----------
const INITIALS = "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ";
const MEDIALS = "ㄧㄨㄩ";
const FINALS = "ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ";
const SYLLABLE_RE = new RegExp(`^(˙)?([${INITIALS}])?([${MEDIALS}])?([${FINALS}])?([ˊˇˋ])?$`);
const ZY_TOKEN_RE = /[ㄅ-ㄩˉˊˇˋ˙]+/g; // 注音符號＋聲調（含不該用的 ˉ）
const MEDIAL_FINALS = { ㄧ: "ㄚㄛㄝㄞㄠㄡㄢㄣㄤㄥ", ㄨ: "ㄚㄛㄞㄟㄢㄣㄤㄥ", ㄩ: "ㄝㄢㄣㄥ" };

// 一個音節合不合法；回傳錯誤說明或 null
function syllableError(syl) {
  const m = SYLLABLE_RE.exec(syl);
  if (!m) return "符號順序不對（聲調要在最後、輕聲點要在最前，一聲不標）";
  const [, neutral, ini, med, fin, tone] = m;
  if (!ini && !med && !fin) return "只有聲調符號";
  if (neutral && tone) return "輕聲不能再標聲調";
  if (ini && "ㄐㄑㄒ".includes(ini) && !(med === "ㄧ" || med === "ㄩ")) return `${ini} 後面要接ㄧ或ㄩ`;
  if (ini && "ㄓㄔㄕㄖㄗㄘㄙㄍㄎㄏ".includes(ini) && (med === "ㄧ" || med === "ㄩ")) return `${ini} 不能接${med}`;
  if (ini && "ㄅㄆㄇㄈㄉㄊ".includes(ini) && med === "ㄩ") return `${ini} 不能接ㄩ`;
  if (ini && !med && !fin && !"ㄓㄔㄕㄖㄗㄘㄙ".includes(ini)) return `${ini} 不能單獨成音`;
  if (med && fin && !MEDIAL_FINALS[med].includes(fin)) return `${med}${fin} 不是結合韻`;
  if (fin === "ㄦ" && (ini || med)) return "ㄦ 不能和其他符號拼";
  return null;
}
// 字串裡的注音（音節之間用空白或其他字隔開）都要合法
function zhuyinErrors(text) {
  const out = [];
  for (const tok of text.match(ZY_TOKEN_RE) || []) {
    const e = syllableError(tok);
    if (e) out.push(`「${tok}」${e}`);
  }
  // 國字「一」夾在注音裡（應該是注音ㄧ），例如「ㄗ一ㄥˋ」「ㄐ一ˋ」
  const m = /[ㄅ-ㄩ]一(?=[ㄅ-ㄩˊˇˋ\s／、，。）]|$)/.exec(text);
  if (m) out.push(`「${text.slice(Math.max(0, m.index - 2), m.index + 4)}」裡的「一」是國字，注音要用ㄧ`);
  return out;
}
const ZY_ONLY_RE = /^[ㄅ-ㄩˊˇˋ˙]+$/;
const hasZhuyin = (s) => typeof s === "string" && /[ㄅ-ㄩ]/.test(s);

// ---------- 開始 ----------
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}：${msg}`);
const warn = (where, msg) => warnings.push(`${where}：${msg}`);
const labelOf = (o) => (typeof o === "string" ? o : o && o.label);

// 生字表本身
const CHARS = {};
for (const [lesson, rows] of Object.entries(CHAR_TABLE)) {
  const list = rows.split("|");
  if (list.length !== LESSON_SIZE[lesson]) err("生字表", `${lesson} 應有 ${LESSON_SIZE[lesson]} 字，現在 ${list.length}`);
  for (const row of list) {
    const [c, zy, radical, strokes] = row.trim().split(" ");
    if (CHARS[c]) err("生字表", `「${c}」重複`);
    for (const e of zhuyinErrors(zy)) err("生字表", `「${c}」${e}`);
    CHARS[c] = { zy, radical, strokes: Number(strokes), lesson };
  }
}
if (Object.keys(CHARS).length !== 111) err("生字表", `應有 111 字，現在 ${Object.keys(CHARS).length}`);
for (const [c, words] of Object.entries(WORD_READINGS)) {
  for (const [w, zy] of Object.entries(words)) {
    if (!w.includes(c)) err("多音字表", `「${w}」裡沒有「${c}」`);
    for (const e of zhuyinErrors(zy)) err("多音字表", `${w}：${e}`);
  }
}

// 某個詞裡某個字的讀音（自修）
function readingOf(word, c) {
  if (WORD_READINGS[c]) return WORD_READINGS[c][word];
  return CHARS[c]?.zy;
}

function walkStrings(v, fn, path = "") {
  if (typeof v === "string") fn(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, fn, `${path}[${i}]`));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkStrings(x, fn, path ? `${path}.${k}` : k);
}

// ---------- 各玩法的內容核對 ----------
function checkReading(where, q, labels) {
  const m = /^「(.+?)」的「(.)」怎麼念？/.exec(q.prompt);
  if (!m) return err(where, "讀音題的 prompt 要寫成「詞」的「字」怎麼念？");
  const [, word, c] = m;
  if (!word.includes(c)) err(where, `「${word}」裡沒有「${c}」`);
  const expect = readingOf(word, c);
  if (!expect) return err(where, `「${word}」的「${c}」不在自修的生字表／多音字表，無法核對讀音`);
  if (q.answer !== expect) err(where, `「${word}」的「${c}」自修念 ${expect}，答案卻是 ${q.answer}`);
  if (q.type !== "choice" || labels.length < 3) err(where, "讀音題要是 3–4 個注音選項的 choice");
  for (const l of labels) {
    if (!ZY_ONLY_RE.test(l)) err(where, `讀音題的選項只能是一個注音：「${l}」`);
    if ((OTHER_READINGS[c] || []).includes(l)) err(where, `選項 ${l} 也是「${c}」在別的詞裡的讀音，不要當錯誤選項`);
  }
}

function checkPolyphone(where, q, labels) {
  const pair = /「(.+?)」和「(.+?)」的「(.)」/.exec(q.prompt);
  if (pair) {
    const [, w1, w2, c] = pair;
    const r1 = readingOf(w1, c), r2 = readingOf(w2, c);
    if (!r1 || !r2) return err(where, `「${w1}」「${w2}」的「${c}」不在多音字表，無法核對`);
    if (q.type === "truefalse") {
      if (q.answer !== (r1 === r2)) err(where, `${w1} ${r1}、${w2} ${r2}，答案應為 ${r1 === r2}`);
    } else if (q.answer !== `${r1}／${r2}`) err(where, `答案應為 ${r1}／${r2}，現在是 ${q.answer}`);
    return;
  }
  const which = /「(.)」念([ㄅ-ㄩˊˇˋ˙]+)/.exec(q.prompt);
  if (which && q.type === "choice") {
    const [, c, zy] = which;
    const hits = labels.filter((w) => readingOf(w, c) === zy);
    labels.forEach((w) => { if (!readingOf(w, c)) err(where, `「${w}」的「${c}」不在多音字表`); });
    if (hits.length !== 1 || hits[0] !== q.answer) err(where, `念 ${zy} 的應該只有「${q.answer}」，實際是 ${hits.join("、") || "沒有"}`);
    return;
  }
  if (q.type === "choice" && labels.every((l) => l.split("、").length === 2) && /相同/.test(q.prompt)) {
    const same = labels.filter((l) => {
      const [a, b] = l.split("、");
      const common = [...a].filter((x) => b.includes(x) && WORD_READINGS[x]);
      if (common.length !== 1) { err(where, `「${l}」找不到唯一的共同多音字`); return false; }
      const ra = readingOf(a, common[0]), rb = readingOf(b, common[0]);
      if (!ra || !rb) { err(where, `「${l}」不在多音字表`); return false; }
      return ra === rb;
    });
    if (same.length !== 1 || same[0] !== q.answer) err(where, `讀音相同的應該只有「${q.answer}」，實際是 ${same.join("、") || "沒有"}`);
    return;
  }
  err(where, "破音字題的格式無法自動核對（請用「A」和「B」的「字」、「字」念…、或「A、B」相同 的寫法）");
}

function checkRadical(where, q, labels) {
  let m = /^「(.)」的部首是什麼？$/.exec(q.prompt);
  if (m) {
    const info = CHARS[m[1]];
    if (!info) return err(where, `「${m[1]}」不是本冊生字`);
    if (q.type !== "choice") return err(where, "部首題要是 choice");
    if (q.answer !== info.radical) err(where, `「${m[1]}」自修的部首是 ${info.radical}，答案卻是 ${q.answer}`);
    if (labels.some((l) => [...l].length !== 1)) err(where, "部首選項每個都是一個字");
    return;
  }
  m = /^「(.)」一共有幾畫？$/.exec(q.prompt);
  if (m) {
    const info = CHARS[m[1]];
    if (!info) return err(where, `「${m[1]}」不是本冊生字`);
    if (q.type !== "input" || q.keypad !== "digits") return err(where, "筆畫題要用 input＋digits");
    if (q.answer !== String(info.strokes)) err(where, `「${m[1]}」自修是 ${info.strokes} 畫，答案卻是 ${q.answer}`);
    return;
  }
  err(where, "部首／筆畫題的 prompt 要寫成「字」的部首是什麼？或「字」一共有幾畫？");
}

function checkWrongchar(where, q, labels) {
  const m = /「(.+)」$/.exec(q.prompt);
  if (!m) return err(where, "錯字通緝令要把句子放在最後一行的「」裡");
  const sentence = m[1];
  for (const l of labels) {
    const fix = /^(.)→(.)$/.exec(l);
    const ch = fix ? fix[1] : l;
    if ([...ch].length !== 1) err(where, `選項要是一個字或「錯→對」：${l}`);
    else if (!sentence.includes(ch)) err(where, `選項「${ch}」不在句子裡`);
    if (fix && fix[1] === fix[2]) err(where, `「${l}」前後是同一個字`);
  }
  if (labels.some((l) => l.includes("→")) && !labels.every((l) => l.includes("→"))) err(where, "選項格式要一致");
}

function checkRhetoric(where, q, labels) {
  if (q.type === "choice" || q.type === "multi") {
    for (const l of labels) if (!RHETORIC.includes(l)) err(where, `修辭卡只能是 ${RHETORIC.join("、")}：「${l}」`);
    const ans = q.type === "multi" ? q.answer : [q.answer];
    for (const a of ans) if (!q.tags.includes(a)) err(where, `tags 要標出答案的修辭「${a}」`);
    if (labels.length !== 4) err(where, "修辭卡題要有 4 張卡");
  } else if (q.type !== "truefalse") err(where, "修辭題只用 choice、multi、truefalse");
}

// ---------- 逐檔逐題 ----------
const seenIds = new Map();
const seenPrompts = new Map();
const report = [];
const kindTotal = Object.fromEntries(KIND_KEYS.map((k) => [k, 0]));
const typeTotal = {};
const answerPos = [0, 0, 0, 0];

for (const f of FILES) {
  const file = `${f.section}.json`;
  const path = join(DIR, file);
  if (!existsSync(path)) { err(file, "檔案不存在"); continue; }
  let list;
  try { list = JSON.parse(readFileSync(path, "utf8")); } catch (e) { err(file, "JSON 解析失敗：" + e.message); continue; }
  if (!Array.isArray(list)) { err(file, "內容要是陣列"); continue; }

  const kindCount = Object.fromEntries(KIND_KEYS.map((k) => [k, 0]));
  const diff = { 1: 0, 2: 0, 3: 0 };

  list.forEach((q, i) => {
    const where = `${file} #${i + 1}（${q?.id ?? "沒有 id"}）`;
    if (!q || typeof q !== "object") return err(where, "題目要是物件");

    // 欄位
    for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) err(where, `不認得的欄位 ${k}`);
    if (typeof q.id !== "string" || !new RegExp(`^g5zh-${f.section}-\\d{3}$`).test(q.id)) err(where, `id 格式要像 g5zh-${f.section}-001`);
    if (seenIds.has(q.id)) err(where, `id 重複（也在 ${seenIds.get(q.id)}）`);
    seenIds.set(q.id, file);
    if (q.grade !== 5) err(where, "grade 要是 5");
    if (q.subject !== "chinese") err(where, "subject 要是 chinese");
    if (q.unit !== f.unit) err(where, `unit 要是 "${f.unit}"`);
    if (q.section !== f.section) err(where, `section 要是 "${f.section}"`);
    if (!TYPES.has(q.type)) return err(where, `type 不合法：${q.type}`);
    if (typeof q.prompt !== "string" || !q.prompt.trim()) err(where, "缺 prompt");
    else if ([...q.prompt].length > 120) err(where, `prompt 太長（${[...q.prompt].length} 字）`);
    if (typeof q.explanation !== "string" || !q.explanation.trim()) err(where, "缺 explanation");
    else if ([...q.explanation].length > 90) err(where, `explanation 太長（${[...q.explanation].length} 字），要短短一兩句`);
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 3) err(where, "difficulty 要是 1–3");
    else diff[q.difficulty]++;
    if (q.visual !== undefined && q.visual !== null) err(where, "國語題不用附圖");

    // 不能有空字串；注音要寫對；不能出現範圍外的修辭
    walkStrings(q, (s, p) => {
      if (!s.trim()) err(where, `${p} 是空字串`);
      for (const e of zhuyinErrors(s)) err(where, `${p} 注音寫法不對：${e}`);
      for (const bad of OUT_OF_SCOPE) if (s.includes(bad)) err(where, `${p} 出現範圍外的修辭「${bad}」`);
      if (/[ㄅ-ㄩ]/.test(s) && /(^|[^ㄅ-ㄩˊˇˋ˙])[ㄧㄨㄩ](?=[一-鿿])/.test(s)) {
        warn(where, `${p} 有單獨的ㄧ／ㄨ／ㄩ緊接著國字，確認不是把國字「一」打成注音：${s}`);
      }
    });

    // 朗讀：題目有注音、或考讀音的題，要給不洩漏答案的 speak
    const kind = Array.isArray(q.tags) ? q.tags[0] : undefined;
    if (q.speak !== undefined) {
      if (typeof q.speak !== "string" || hasZhuyin(q.speak)) err(where, "speak 要是文字，不要放注音");
    }
    if ((kind === "reading" || kind === "polyphone" || hasZhuyin(q.prompt)) && !q.speak) {
      err(where, "讀音、破音字或題目有注音的題要給 speak（朗讀會念出讀音，等於洩漏答案）");
    }
    if (q.speak && /「(.+?)」/.test(q.prompt)) {
      for (const m of q.prompt.matchAll(/「(.+?)」/g)) if (q.speak.includes(m[1])) err(where, `speak 念出了「${m[1]}」，會洩漏讀音`);
    }

    // tags
    if (!Array.isArray(q.tags) || !q.tags.length) err(where, "要有 tags");
    else {
      if (!KIND_KEYS.includes(kind)) err(where, `tags[0] 要是玩法：${KIND_KEYS.join("、")}`);
      else { kindCount[kind]++; kindTotal[kind]++; }
      if (new Set(q.tags).size !== q.tags.length) err(where, "tags 重複");
      if (q.tags.some((t) => typeof t !== "string")) err(where, "tags 要是字串");
    }
    typeTotal[q.type] = (typeTotal[q.type] || 0) + 1;

    // 題型
    let labels = [];
    if (q.type === "choice" || q.type === "multi") {
      if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) err(where, "選項要 3–4 個");
      const opts = Array.isArray(q.options) ? q.options : [];
      labels = opts.map(labelOf);
      opts.forEach((o, j) => {
        if (typeof o === "string") return;
        if (!o || typeof o !== "object") return err(where, `選項 ${j + 1} 格式不對`);
        for (const k of Object.keys(o)) if (!OPT_KEYS.has(k)) err(where, `選項不認得的欄位 ${k}`);
      });
      if (labels.some((l) => typeof l !== "string" || !l.trim())) err(where, "每個選項都要有 label");
      if (new Set(labels).size !== labels.length) err(where, `選項 label 重複：${labels.join("／")}`);
      if (labels.some((l) => [...String(l)].length > 30)) err(where, "選項太長（> 30 字）");
      if (q.type === "choice") {
        if (typeof q.answer !== "string" || !labels.includes(q.answer)) err(where, `answer「${q.answer}」不在選項裡`);
        else if (labels.length === 4) answerPos[labels.indexOf(q.answer)]++;
      } else {
        if (!Array.isArray(q.answer) || q.answer.length < 2) err(where, "複選題的 answer 要是至少 2 個 label 的陣列");
        else {
          if (new Set(q.answer).size !== q.answer.length) err(where, "複選答案重複");
          for (const a of q.answer) if (!labels.includes(a)) err(where, `複選答案「${a}」不在選項裡`);
          if (q.answer.length >= labels.length) err(where, "複選題至少要有一個錯的選項");
        }
      }
    } else {
      if (q.options !== undefined) err(where, `${q.type} 不用 options`);
    }
    if (q.type === "truefalse" && typeof q.answer !== "boolean") err(where, "是非題的 answer 要是 true 或 false");
    if (q.type === "input") {
      if (!KEYPADS[q.keypad]) err(where, `keypad 不合法：${q.keypad}`);
      else if (typeof q.answer !== "string" || !KEYPADS[q.keypad].test(q.answer)) err(where, `answer「${q.answer}」不合 ${q.keypad} 鍵盤`);
      if (q.accept !== undefined && (!Array.isArray(q.accept) || q.accept.some((a) => typeof a !== "string"))) err(where, "accept 要是字串陣列");
    }
    if (q.type === "order") {
      if (!Array.isArray(q.items) || q.items.length < 2) err(where, "排序題的 items 至少要 2 個");
      else {
        if (q.items.length > 6) err(where, "排序題的卡片太多（> 6）");
        if (q.items.some((x) => typeof x !== "string" || !x.trim())) err(where, "items 要是非空字串");
        if (q.items.some((x) => [...String(x)].length > 14)) err(where, "排序卡片的字太長（> 14 字）");
        if (new Set(q.items).size < 2) err(where, "items 不能全部一樣");
      }
      if (q.answer !== undefined) err(where, "排序題不用 answer（items 就是正確順序）");
    }

    // 重複題
    const key = `${q.prompt}|${JSON.stringify(q.answer ?? q.items)}`;
    if (seenPrompts.has(key)) err(where, `和 ${seenPrompts.get(key)} 是同一題`);
    seenPrompts.set(key, q.id);

    // 各玩法的內容核對
    if (kind === "reading") checkReading(where, q, labels);
    if (kind === "polyphone") checkPolyphone(where, q, labels);
    if (kind === "radical") checkRadical(where, q, labels);
    if (kind === "wrongchar") { if (q.type !== "choice") err(where, "錯字通緝令要是 choice"); else checkWrongchar(where, q, labels); }
    if (kind === "rhetoric") checkRhetoric(where, q, labels);
    if (kind === "lookalike" || kind === "sentence") {
      if (!q.prompt.includes("（　）")) err(where, "填空題的 prompt 要有（　）");
    }
    if (kind === "idiom") {
      if (q.type === "order") {
        if (q.items.length !== 4 || q.items.some((x) => [...x].length !== 1)) err(where, "成語拼拼樂要是 4 個單字卡");
      } else if (q.type !== "truefalse") err(where, "成語題用 truefalse（怪物說錯話）或 order（成語拼拼樂）");
      else if (!q.prompt.startsWith("怪物說：")) err(where, "怪物說錯話的 prompt 要用「怪物說：」開頭");
    }
  });

  // 題數、玩法、難度
  if (list.length < f.min) err(file, `至少要 ${f.min} 題，現在 ${list.length} 題`);
  const usedKinds = KIND_KEYS.filter((k) => kindCount[k] > 0);
  if (usedKinds.length < f.kinds) err(file, `至少要用 ${f.kinds} 種玩法，現在 ${usedKinds.length} 種`);
  for (const d of [1, 2, 3]) if (!diff[d]) err(file, `沒有難度 ${d} 的題目`);
  report.push({ file, total: list.length, kindCount, diff });
}

// 選擇題的答案位置不要都擠在同一格
{
  const n = answerPos.reduce((s, x) => s + x, 0);
  if (n) answerPos.forEach((c, i) => { if (c / n > 0.4) err("全部", `4 選 1 的答案有 ${Math.round((c / n) * 100)}% 在第 ${i + 1} 個`); });
}

// ---------- 結果 ----------
const short = { reading: "讀音", polyphone: "破音", lookalike: "形近", wrongchar: "錯字", radical: "部首", word: "詞語",
  rhetoric: "修辭", idiom: "成語", sentence: "句型", content: "課文" };
console.log(`檔案     題數  ${KIND_KEYS.map((k) => short[k]).join(" ")}   難度1/2/3`);
for (const r of report) {
  console.log(`${r.file.padEnd(8)} ${String(r.total).padStart(4)}  ${KIND_KEYS.map((k) => String(r.kindCount[k]).padStart(4)).join(" ")}   ${r.diff[1]}/${r.diff[2]}/${r.diff[3]}`);
}
const total = report.reduce((s, r) => s + r.total, 0);
console.log(`合計     ${String(total).padStart(4)}  ${KIND_KEYS.map((k) => String(kindTotal[k]).padStart(4)).join(" ")}`);
console.log(`題型：${Object.entries(typeTotal).map(([t, n]) => `${t} ${n}`).join("、")}`);
console.log(`4 選 1 的答案位置：${answerPos.map((c, i) => `第${i + 1}個 ${c}`).join("、")}`);

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} 個提醒（不算錯，請人工看一下）：`);
  for (const w of warnings) console.log("  - " + w);
}
if (errors.length) {
  console.error(`\n✗ 有 ${errors.length} 個問題：`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("\n✓ 全部通過");
