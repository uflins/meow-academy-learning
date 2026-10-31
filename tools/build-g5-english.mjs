// 五年級英語（Here We Go 第 5 冊，期中考：Starter、Unit 1、Unit 2、Review 1）題庫產生器
// 用法：node tools/build-g5-english.mjs → 寫出 data/questions/g5/english/{ST,U1,U2,R1}.json
// 範圍依 範圍整理/五年級英語.md；題目、課表、短文都是自己出的，不照抄課本。
// 改題目請改這個檔再重跑，不要直接改 JSON。

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data/questions/g5/english");

const UNIT = { ST: "A", U1: "A", U2: "B", R1: "B" };

function bank(section) {
  const list = [];
  const add = (q) => {
    const id = `g5eng-${section}-${String(list.length + 1).padStart(3, "0")}`;
    list.push(Object.assign({ id, grade: 5, subject: "english", unit: UNIT[section], section }, q, { difficulty: q.difficulty || 1 }));
  };
  return { list, add };
}

// ---------- 題型小工具 ----------

// 聽音選字：自動念一次英文，選出聽到的字
function listen(word, others, explanation, tags = [], difficulty = 1) {
  return {
    type: "choice", prompt: "🎧 聽一聽，選出你聽到的字", speak: word, speakLang: "en", autoSay: true, answerSpeak: word,
    options: [word, ...others], answer: word, explanation, difficulty, tags: ["listen", ...tags],
  };
}

// 聽句子，選出最適合的回答
function listenReply(sentence, answer, others, explanation, tags = [], difficulty = 2) {
  return {
    type: "choice", prompt: "🎧 聽一聽問題，選出最適合的回答", speak: sentence, speakLang: "en", autoSay: true, answerSpeak: `${sentence} ${answer}`,
    options: [answer, ...others], answer, explanation, difficulty, tags: ["listen", "reply", ...tags],
  };
}

// 字母排序拼字：聽單字，把字母依序排好
function spell(word, zh, explanation, difficulty = 2) {
  return {
    type: "order", prompt: `🎧 聽一聽，把字母排成「${zh}」的英文`, speak: word, speakLang: "en", autoSay: true, answerSpeak: word,
    items: word.split(""), explanation, difficulty, tags: ["spell", word],
  };
}

// 聽單字，選出拼對的寫法
function spellChoice(word, wrongs, explanation, tags = [], difficulty = 2) {
  return {
    type: "choice", prompt: "🎧 聽一聽，哪一個拼法才對？", speak: word, speakLang: "en", autoSay: true, answerSpeak: word,
    options: [word, ...wrongs], answer: word, explanation, difficulty, tags: ["spell", ...tags],
  };
}

// 句子重組
function sentence(words, zh, explanation, difficulty = 2) {
  const text = words.join(" ");
  return {
    type: "order", prompt: `把句子排好：「${zh}」`, speak: text, speakLang: "en", answerSpeak: text,
    items: words, explanation, difficulty, tags: ["sentence"],
  };
}

// 看圖／看中文選字
function picture(prompt, image, answer, others, explanation, tags = [], difficulty = 1) {
  return {
    type: "choice", prompt, visual: image ? { emojiGroups: [{ emoji: image, count: 1 }] } : undefined,
    answerSpeak: /[\u4e00-\u9fff]/.test(answer) ? undefined : answer,
    options: [answer, ...others], answer, explanation, difficulty, tags: ["picture", ...tags],
  };
}

// 文法、對話選擇
function pick(prompt, answer, others, explanation, kind, tags = [], difficulty = 2, extra = {}) {
  return Object.assign({ type: "choice", prompt, options: [answer, ...others], answer, explanation, difficulty, tags: [kind, ...tags] }, extra);
}

// ---------- 附圖：課表、營業時間 ----------

const FONT = "-apple-system,'Helvetica Neue','PingFang TC',sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function scheduleSVG(title, rows) {
  const days = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri."];
  const cw = 104, c0 = 56, rh = 56, top = 54;
  const W = c0 + cw * 5 + 10, H = top + rh * (rows.length + 1) + 10;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  s += `<rect width="${W}" height="${H}" rx="14" fill="#FFFDF7" stroke="#C9B7E8" stroke-width="3"/>`;
  s += `<text x="${W / 2}" y="34" font-size="22" font-weight="800" text-anchor="middle" fill="#5B4391">${esc(title)}</text>`;
  s += `<rect x="5" y="${top}" width="${W - 10}" height="${rh}" fill="#E7DDF8"/>`;
  s += `<text x="${c0 / 2 + 3}" y="${top + 35}" font-size="17" font-weight="700" text-anchor="middle" fill="#4A3B32">Class</text>`;
  days.forEach((d, i) => { s += `<text x="${c0 + cw * i + cw / 2}" y="${top + 36}" font-size="24" font-weight="800" text-anchor="middle" fill="#4A3B32">${d}</text>`; });
  rows.forEach((r, ri) => {
    const y = top + rh * (ri + 1);
    if (ri % 2) s += `<rect x="5" y="${y}" width="${W - 10}" height="${rh}" fill="#F6F1FC"/>`;
    s += `<text x="${c0 / 2 + 3}" y="${y + 36}" font-size="24" font-weight="800" text-anchor="middle" fill="#7559A8">${ri + 1}</text>`;
    r.forEach((c, i) => {
      const x = c0 + cw * i + cw / 2;
      // social studies 太長，分兩行
      if (c.includes(" ")) s += `<text x="${x}" y="${y + 25}" font-size="19" text-anchor="middle" fill="#4A3B32">${c.split(" ").map((w, k) => `<tspan x="${x}" dy="${k ? 21 : 0}">${esc(w)}</tspan>`).join("")}</text>`;
      else s += `<text x="${x}" y="${y + 36}" font-size="23" text-anchor="middle" fill="#4A3B32">${esc(c)}</text>`;
    });
  });
  for (let i = 0; i <= 5; i++) s += `<line x1="${c0 + cw * i}" y1="${top}" x2="${c0 + cw * i}" y2="${H - 10}" stroke="#D8CDEE" stroke-width="2"/>`;
  return s + "</svg>";
}

function signSVG(place, daysText, hoursText, note) {
  const W = 520, H = note ? 250 : 210;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  s += `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="18" fill="#3E5C76" stroke="#22384B" stroke-width="5"/>`;
  s += `<text x="${W / 2}" y="52" font-size="28" font-weight="800" text-anchor="middle" fill="#FFE08A">${esc(place)}</text>`;
  s += `<text x="40" y="110" font-size="21" font-weight="700" fill="#FFFFFF">Opening Days</text><text x="${W - 40}" y="110" font-size="21" text-anchor="end" fill="#FFFFFF">${esc(daysText)}</text>`;
  s += `<text x="40" y="160" font-size="21" font-weight="700" fill="#FFFFFF">Opening Hours</text><text x="${W - 40}" y="160" font-size="21" text-anchor="end" fill="#FFFFFF">${esc(hoursText)}</text>`;
  if (note) s += `<text x="${W / 2}" y="212" font-size="19" text-anchor="middle" fill="#FFB4A2">${esc(note)}</text>`;
  return s + "</svg>";
}

// ---------- 共用字表 ----------

const DAYS = [
  ["Sunday", "星期日", "Sun."], ["Monday", "星期一", "Mon."], ["Tuesday", "星期二", "Tue."], ["Wednesday", "星期三", "Wed."],
  ["Thursday", "星期四", "Thu."], ["Friday", "星期五", "Fri."], ["Saturday", "星期六", "Sat."],
];
const SUBJECTS = [
  ["art", "美術", "🎨"], ["Chinese", "國語", "📖"], ["English", "英語", "🔤"], ["math", "數學", "🔢"],
  ["music", "音樂", "🎵"], ["PE", "體育", "⚽"], ["science", "自然", "🔬"], ["social studies", "社會", "🌏"],
];

// ================= Starter =================
function starter() {
  const { list, add } = bank("ST");
  // 數字
  add(listen("seventy", ["seventeen", "seven"], "seventy 是 70，字尾是 -ty；seventeen 是 17，字尾是 -teen。", ["number"]));
  add(listen("eighty", ["eighteen", "eight"], "eighty 是 80（-ty 結尾）；eighteen 是 18。", ["number"]));
  add(listen("ninety", ["nineteen", "nine"], "ninety 是 90；nineteen 是 19。", ["number"]));
  add(listen("sixty", ["sixteen", "fifty"], "sixty 是 60；sixteen 是 16；fifty 是 50。", ["number"]));
  add(listen("one hundred", ["ninety", "eleven"], "one hundred 是 100。", ["number"]));
  add(listen("forty", ["fourteen", "fifty"], "forty 是 40；fourteen 是 14；fifty 是 50。", ["number"], 2));
  add(picture("「80」的英文是哪一個？", null, "eighty", ["eighteen", "aighty"], "80 是 eighty，開頭是 e-i-g-h，和 eight 一樣。", ["number"], 2));
  add(picture("「90」的英文是哪一個？", null, "ninety", ["ninty", "nineteen"], "90 是 ninety，要留著 nine 的 e，再加 -ty。", ["number"], 2));
  add(picture("「40」的英文是哪一個？", null, "forty", ["fourty", "fourteen"], "40 是 forty，沒有 u！four（4）才有 u。", ["number"], 3));
  add(picture("「70」的英文是哪一個？", null, "seventy", ["seventeen", "sevendy"], "70 是 seventy。", ["number"]));
  add(spell("forty", "40", "40 是 f-o-r-t-y，沒有 u。", 3));
  add(spell("eighty", "80", "80 是 e-i-g-h-t-y。", 3));
  add(spell("ninety", "90", "90 是 n-i-n-e-t-y，nine 的 e 要留著。", 3));
  add(spell("sixty", "60", "60 是 s-i-x-t-y。", 2));
  add(pick("小明的存錢筒有 50 元，又放進 30 元。現在一共有多少元？", "eighty", ["eighteen", "seventy"], "50 + 30 = 80，80 是 eighty。", "number", ["math"], 2));
  add(pick("「twenty + forty」等於多少？", "sixty", ["sixteen", "fifty"], "20 + 40 = 60，60 是 sixty。", "number", ["math"], 2));
  // a_e / ai / ay
  add(listen("tape", ["tap"], "tape 的 a 念長音（和字母 A 一樣），因為後面有 e（a_e）。tap 是短音。", ["phonics", "a_e"]));
  add(listen("made", ["mad"], "made 是 a_e，a 念長音；mad 是短音。", ["phonics", "a_e"]));
  add(listen("plane", ["plan"], "plane 是 a_e，a 念長音；plan 是短音。", ["phonics", "a_e"], 2));
  add(listen("rain", ["ran"], "rain 的 ai 念長音 a；ran 是短音。", ["phonics", "ai"], 2));
  add(listen("pail", ["pal"], "pail 的 ai 念長音 a；pal 是短音。", ["phonics", "ai"], 2));
  add(listen("day", ["dad"], "day 的 ay 念長音 a。", ["phonics", "ay"]));
  add(spellChoice("rain", ["rane", "rayn"], "rain 的長音 a 在字中間，用 ai。", ["ai"], 2));
  add(spellChoice("cake", ["caik", "cayk"], "cake 是 a_e：a＋子音＋e，e 不發音。", ["a_e"], 2));
  add(spellChoice("today", ["todai", "todae"], "today 的長音 a 在字尾，用 ay。", ["ay"], 2));
  add(spellChoice("lake", ["laik", "layk"], "lake 是 a_e。", ["a_e"], 2));
  add(spellChoice("maid", ["mayd", "mad"], "maid 的長音 a 在字中間，用 ai；mad 是短音（生氣的）。", ["ai"], 3));
  add(pick("哪一個字的 a 念長音（和字母 A 的名字一樣）？", "cake", ["cat", "hat"], "cake 是 a_e，a 念長音；cat、hat 都是短音。", "phonics", ["a_e"], 1));
  add(pick("ai、ay 都念長音 a。哪一個字的長音 a 通常放在「字尾」？", "ay（例如 day、May）", ["ai（例如 rain、mail）", "a_e（例如 cake）"], "ay 通常在字尾，ai 通常在字中間。", "phonics", ["ay"], 2));
  // 句型：位置和正在做的事
  add(sentence(["He's", "sleeping", "under", "the", "table."], "他正在桌子下面睡覺。", "He's（他是）＋ sleeping（正在睡）＋ under the table（在桌子下面）。"));
  add(sentence(["She's", "reading", "in", "the", "bedroom."], "她正在臥室裡看書。", "She's ＋ reading（正在看書）＋ in the bedroom（在臥室裡）。"));
  add(sentence(["Where's", "my", "bag?"], "我的包包在哪裡？", "問東西在哪裡：Where's ＋ 東西？"));
  add(listenReply("Where's Rocky?", "He's sleeping under the table.", ["It's Friday.", "It's four o'clock."], "問「在哪裡」，要回答位置：He's … under the table。", ["where"]));
  add(listenReply("What's she doing?", "She's swimming.", ["She's in the kitchen.", "Yes, she is."], "問「正在做什麼」，要回答動作 -ing：She's swimming。", ["doing"]));
  add(picture("貓咪在桌子「下面」睡覺，要用哪一個字？", "🐱", "under", ["on", "by"], "under 是「在…下面」；on 是在上面；by 是在旁邊。", ["position"]));
  add(picture("包包在椅子「旁邊」，要用哪一個字？", "🎒", "by", ["under", "in"], "by 是「在…旁邊」。", ["position"], 2));
  add(pick("見面時是下午，要說什麼？", "Good afternoon!", ["Good morning!", "Good night!"], "下午見面說 Good afternoon!", "talk", [], 1, { answerSpeak: "Good afternoon!" }));
  add(pick("想約大家一起出去玩，要說什麼？", "Let's go out!", ["Watch out!", "See you later!"], "Let's go out! 是「我們出去吧！」；Watch out! 是「小心！」。", "talk", [], 1, { answerSpeak: "Let's go out!" }));
  return list;
}

// ================= Unit 1 What Day Is Today? =================
function unit1() {
  const { list, add } = bank("U1");
  const others = (i, k = 2) => [DAYS[(i + 1) % 7][0], DAYS[(i + 5) % 7][0], DAYS[(i + 3) % 7][0]].slice(0, k);
  // 看中文選英文
  DAYS.forEach(([en, zh], i) => add(picture(`「${zh}」的英文是哪一個？`, null, en, others(i), `${zh}是 ${en}。`, ["day"], en === "Tuesday" || en === "Thursday" ? 2 : 1)));
  add(picture("「Thu.」是哪一天的縮寫？", null, "Thursday", ["Tuesday", "Wednesday"], "Thu. 是 Thursday（星期四）；Tue. 是 Tuesday（星期二）。", ["day", "abbr"], 2));
  add(picture("「Tue.」是哪一天的縮寫？", null, "Tuesday", ["Thursday", "Saturday"], "Tue. 是 Tuesday（星期二）。", ["day", "abbr"], 2));
  add(picture("一個星期的第一天（日曆最左邊）是哪一天？", null, "Sunday", ["Monday", "Saturday"], "英文日曆從 Sunday（星期日）開始。", ["day"], 2));
  // 聽音
  add(listen("Thursday", ["Tuesday", "Saturday"], "Thursday（星期四）開頭是 th，咬舌頭念。", ["day"], 2));
  add(listen("Tuesday", ["Thursday", "Sunday"], "Tuesday 是星期二。", ["day"], 2));
  add(listen("Wednesday", ["Monday", "Friday"], "Wednesday 是星期三，中間的 d 不發音。", ["day"]));
  add(listen("Saturday", ["Sunday", "Thursday"], "Saturday 是星期六。", ["day"]));
  add(listen("Friday", ["Monday", "Sunday"], "Friday 是星期五。", ["day"]));
  // 拼字
  add(spell("Wednesday", "星期三", "W-e-d-n-e-s-d-a-y。念的時候聽不到 d，寫的時候要記得 Wed-nes-day。", 3));
  add(spell("Thursday", "星期四", "T-h-u-r-s-d-a-y，開頭是 Th。", 3));
  add(spell("Tuesday", "星期二", "T-u-e-s-d-a-y。", 2));
  add(spell("Friday", "星期五", "F-r-i-d-a-y。", 2));
  add(spell("Saturday", "星期六", "S-a-t-u-r-d-a-y。", 2));
  add(spellChoice("Wednesday", ["Wentsday", "Wensday"], "Wednesday 念起來像 Wens-day，但寫成 Wed-nes-day：W-e-d-n-e-s-d-a-y。", ["day"], 3));
  add(spellChoice("Thursday", ["Thusday", "Tursday"], "Thursday：T-h-u-r-s-d-a-y。", ["day"], 3));
  add(pick("星期的英文，第一個字母要怎麼寫？", "大寫，例如 Monday", ["小寫，例如 monday", "全部大寫，例如 MONDAY"], "星期是專有名詞，第一個字母一定大寫。", "spell", ["capital"], 2));
  // 文法：What day / time / color
  add(pick("A: What ____ is it?　B: It's Sunday.", "day", ["time", "color"], "回答是星期，所以問 What day。", "grammar", ["what"], 2, { answerSpeak: "What day is it? It's Sunday." }));
  add(pick("A: What ____ is it?　B: It's nine thirty.", "time", ["day", "color"], "回答是幾點，所以問 What time。", "grammar", ["what"], 2, { answerSpeak: "What time is it? It's nine thirty." }));
  add(pick("A: What ____ is it?　B: It's yellow.", "color", ["day", "time"], "回答是顏色，所以問 What color。", "grammar", ["what"], 2, { answerSpeak: "What color is it? It's yellow." }));
  add(pick("A: What day is today?　B: ____", "It's Wednesday.", ["It's six o'clock.", "It's blue."], "問星期幾，要回答星期。", "grammar", ["what"], 1, { answerSpeak: "What day is today? It's Wednesday." }));
  add(pick("A: Is it Monday today?　B: No, it ____. It's Tuesday.", "isn't", ["is", "not"], "否定要用 isn't（= is not）。", "grammar", ["isnt"], 2, { answerSpeak: "Is it Monday today? No, it isn't. It's Tuesday." }));
  add(pick("A: ____ it Friday today?　B: Yes, it is.", "Is", ["Are", "Am"], "Is it …? 問「今天是…嗎？」", "grammar", ["isnt"], 2, { answerSpeak: "Is it Friday today? Yes, it is." }));
  add(pick("isn't 是哪兩個字縮起來的？", "is not", ["it not", "is it"], "isn't = is not。", "grammar", ["isnt"], 1));
  // 日曆推理：今天不是問的那一天，要回答 No, it isn't.
  add(pick("今天是星期四（Thursday）。A: Is it Tuesday today?　B: ____", "No, it isn't. It's Thursday.", ["Yes, it is.", "No, it isn't. It's Tuesday."], "今天不是星期二，所以說 No, it isn't.，再說出今天是 Thursday。", "grammar", ["calendar"], 3, { answerSpeak: "Is it Tuesday today? No, it isn't. It's Thursday." }));
  add(pick("今天是星期六（Saturday）。A: Is it Saturday today?　B: ____", "Yes, it is.", ["No, it isn't.", "Yes, it isn't."], "今天就是星期六，回答 Yes, it is.", "grammar", ["calendar"], 2, { answerSpeak: "Is it Saturday today? Yes, it is." }));
  add(pick("昨天是星期一（Monday）。A: What day is today?　B: ____", "It's Tuesday.", ["It's Sunday.", "It's Monday."], "星期一的下一天是星期二 Tuesday。", "grammar", ["calendar"], 3, { answerSpeak: "What day is today? It's Tuesday." }));
  add(pick("明天是星期日（Sunday）。今天是哪一天？", "Saturday", ["Monday", "Friday"], "星期日的前一天是星期六 Saturday。", "grammar", ["calendar"], 3, { answerSpeak: "Saturday" }));
  // 聽句子選回答
  add(listenReply("What day is today?", "It's Friday.", ["Yes, it is.", "It's nine o'clock."], "問星期幾，回答 It's ＋星期。", ["day"]));
  add(listenReply("Is it Sunday today?", "No, it isn't. It's Monday.", ["No, it is.", "Yes, it isn't."], "No 後面要接 isn't；Yes 後面接 is。", ["isnt"], 3));
  add(listenReply("Is it Wednesday today?", "Yes, it is.", ["Yes, it isn't.", "It's Friday."], "Is it …? 用 Yes, it is. 或 No, it isn't. 回答。", ["isnt"]));
  // 句子重組
  add(sentence(["What", "day", "is", "today?"], "今天星期幾？", "疑問句 What day 放最前面，再接 is today?"));
  add(sentence(["Is", "it", "Monday", "today?"], "今天是星期一嗎？", "問「是不是」，Is 放最前面。"));
  add(sentence(["No,", "it", "isn't.", "It's", "Tuesday."], "不，不是。今天是星期二。", "先說 No, it isn't.，再說 It's Tuesday.", 3));
  add(sentence(["Let's", "book", "the", "tickets."], "我們來訂票吧。", "Let's ＋動作：我們一起…吧。"));
  // 對話用語
  add(pick("朋友要去看足球比賽，你想祝他玩得開心，要說什麼？", "Have a good time.", ["Good job!", "Sorry, I'm late."], "Have a good time. 是「祝你玩得愉快」。", "talk", [], 1, { answerSpeak: "Have a good time." }));
  add(pick("「TGIF!」是什麼意思？", "謝天謝地，今天星期五！", ["今天星期一，好累！", "我們去看足球吧！"], "TGIF = Thank goodness it's Friday.", "talk", [], 2));
  add(pick("「It's awesome!」是什麼意思？", "太棒了！（令人讚嘆）", ["太可怕了！", "我好累！"], "awesome 是「令人讚嘆的、超棒的」。", "talk", [], 2, { answerSpeak: "It's awesome!" }));
  add(pick("在西班牙，「Hola!」是什麼意思？", "嗨！", ["再見！", "謝謝！"], "hola 是西班牙文的「嗨」。", "talk", [], 1));
  // e_e / ee / ea
  add(listen("Pete", ["pet"], "Pete 是 e_e，e 念長音（和字母 E 一樣）；pet 是短音。寫的時候別忘了字尾的 e。", ["phonics", "e_e"], 2));
  add(listen("feed", ["fed"], "feed 的 ee 念長音 e；fed 是短音。", ["phonics", "ee"], 2));
  add(listen("seat", ["set"], "seat 的 ea 念長音 e；set 是短音。", ["phonics", "ea"], 2));
  add(listen("meat", ["met"], "meat 的 ea 念長音 e。", ["phonics", "ea"], 2));
  add(listen("sheep", ["ship"], "sheep 的 ee 念長音 e；ship 是短音 i。", ["phonics", "ee"], 2));
  add(spellChoice("tree", ["trea", "tre"], "tree 的長音 e 用 ee。", ["ee"], 2));
  add(spellChoice("these", ["theese", "theas"], "these 是 e_e：e＋子音＋e。", ["e_e"], 3));
  add(spellChoice("sleep", ["sleap", "slepe"], "sleep 的長音 e 用 ee。", ["ee"], 2));
  add(pick("哪一個字的 e 念長音（和字母 E 的名字一樣）？", "bee", ["bed", "ten"], "bee 的 ee 念長音 e；bed、ten 是短音。", "phonics", ["ee"], 1));
  // 營業時間
  const cafe = signSVG("Cat Café", "Wednesday - Sunday", "10:00 a.m. - 8:00 p.m.", "Closed on Monday and Tuesday");
  add(pick("看看貓咪咖啡館的牌子。A: Is it open on Monday?　B: ____", "No, it isn't.", ["Yes, it is.", "Yes, it does."], "Monday 休息（Closed），所以 No, it isn't.", "table", ["hours"], 2, { visual: { svg: cafe }, answerSpeak: "Is it open on Monday? No, it isn't." }));
  add(pick("看看貓咪咖啡館的牌子。A: Is it open on Friday?　B: ____", "Yes, it is.", ["No, it isn't.", "No, it is."], "Wednesday 到 Sunday 都有開，Friday 在中間，所以 Yes, it is.", "table", ["hours"], 2, { visual: { svg: cafe }, answerSpeak: "Is it open on Friday? Yes, it is." }));
  add(pick("看看貓咪咖啡館的牌子。它早上幾點開門？", "10:00 a.m.", ["8:00 a.m.", "10:00 p.m."], "Opening Hours 寫 10:00 a.m. - 8:00 p.m.，早上 10 點開、晚上 8 點關。a.m. 是上午，p.m. 是下午和晚上。", "table", ["hours"], 2, { visual: { svg: cafe } }));
  // 閱讀
  const passage1 = "Today is Saturday. Ben and his sister go to the Cat Museum. The museum is open from Tuesday to Sunday. They book the tickets on the phone. After that, they see many cat models. \"It's awesome!\" Ben says.";
  add(pick(`讀一讀：\n${passage1}\n\nWhat day is today?`, "It's Saturday.", ["It's Sunday.", "It's Tuesday."], "第一句就說 Today is Saturday.", "reading", [], 2));
  add(pick(`讀一讀：\n${passage1}\n\nIs the museum open on Monday?`, "No, it isn't.", ["Yes, it is.", "Yes, they do."], "博物館從 Tuesday 開到 Sunday，Monday 沒有開。", "reading", [], 3));
  add({ type: "truefalse", prompt: `讀一讀：\n${passage1}\n\nBen and his sister book the tickets at the museum.`, answer: false, explanation: "他們是 on the phone（用手機）訂票，不是在博物館。", difficulty: 3, tags: ["reading"] });
  return list;
}

// ================= Unit 2 Do You Have PE Class on Monday? =================
function unit2() {
  const { list, add } = bank("U2");
  const names = SUBJECTS.map((s) => s[0]);
  const near = (i) => [names[(i + 3) % 8], names[(i + 5) % 8]];
  SUBJECTS.forEach(([en, zh, emoji], i) => add(picture(`看圖選科目：這是什麼課？（${zh}）`, emoji, en, near(i), `${zh}課是 ${en}。`, ["subject"], en === "social studies" || en === "science" ? 2 : 1)));
  add(picture("「社會課」的英文是哪一個？", null, "social studies", ["science", "PE"], "社會是 social studies，兩個字。", ["subject"], 2));
  add(picture("「PE」是哪一科？", null, "體育", ["美術", "音樂"], "PE = Physical Education，體育。", ["subject"], 1));
  add(listen("science", ["social studies", "music"], "science 是自然科。", ["subject"]));
  add(listen("music", ["math", "art"], "music 是音樂。", ["subject"]));
  add(listen("social studies", ["science", "Chinese"], "social studies 是社會。", ["subject"]));
  add(listen("math", ["music", "PE"], "math 是數學。", ["subject"]));
  add(spell("music", "音樂", "m-u-s-i-c。", 2));
  add(spell("science", "自然", "s-c-i-e-n-c-e，sc 開頭，念 /s/。", 3));
  add(spell("English", "英語", "E-n-g-l-i-s-h，語言的第一個字母要大寫。", 2));
  add(spell("Chinese", "國語", "C-h-i-n-e-s-e，語言的第一個字母要大寫。", 3));
  add(spellChoice("science", ["sience", "scince"], "science 的開頭是 sc，c 不另外發音。", ["subject"], 3));
  add(pick("哪一個科目的第一個字母一定要大寫？", "English", ["math", "music"], "English、Chinese 是語言，第一個字母要大寫。", "spell", ["capital"], 2, { answerSpeak: "English" }));
  // do / does
  add(pick("____ you have art class on Monday?", "Do", ["Does", "Is"], "主詞是 you，用 Do。", "grammar", ["do"], 1, { answerSpeak: "Do you have art class on Monday?" }));
  add(pick("____ she have math class on Friday?", "Does", ["Do", "Is"], "主詞是 she（她），用 Does。", "grammar", ["do"], 2, { answerSpeak: "Does she have math class on Friday?" }));
  add(pick("____ Tom have PE class on Tuesday?", "Does", ["Do", "Are"], "Tom 是一個人（他），用 Does。", "grammar", ["do"], 2, { answerSpeak: "Does Tom have PE class on Tuesday?" }));
  add(pick("____ they have music class today?", "Do", ["Does", "Is"], "主詞是 they（他們），用 Do。", "grammar", ["do"], 2, { answerSpeak: "Do they have music class today?" }));
  add(pick("A: Does he have English class on Thursday?　B: Yes, he ____.", "does", ["do", "is"], "Does he …? 回答 Yes, he does.", "grammar", ["do"], 2, { answerSpeak: "Does he have English class on Thursday? Yes, he does." }));
  add(pick("A: Do you have PE class today?　B: No, I ____.", "don't", ["doesn't", "isn't"], "Do you …? 回答 No, I don't.", "grammar", ["do"], 2, { answerSpeak: "Do you have PE class today? No, I don't." }));
  add(pick("A: Does your sister have art class on Wednesday?　B: No, she ____.", "doesn't", ["don't", "isn't"], "your sister 是「她」，回答 No, she doesn't.", "grammar", ["do"], 3, { answerSpeak: "Does your sister have art class on Wednesday? No, she doesn't." }));
  add(pick("doesn't 是哪兩個字縮起來的？", "does not", ["do not", "is not"], "doesn't = does not；don't = do not。", "grammar", ["do"], 1));
  add(pick("哪一句是對的？", "Does she have science class?", ["Does she has science class?", "Do she have science class?"], "Does 後面的動詞用原形 have，不用 has。", "grammar", ["do"], 3, { answerSpeak: "Does she have science class?" }));
  add(pick("哪一個主詞要用 Does 來問？", "he", ["you", "they"], "he、she、一個人的名字用 Does；I、you、we、they 用 Do。", "grammar", ["do"], 2));
  // 聽句子選回答
  add(listenReply("Do you have science class on Friday?", "Yes, I do.", ["Yes, it is.", "Yes, he does."], "Do you …? 用 Yes, I do. 或 No, I don't. 回答。", ["do"]));
  add(listenReply("Does he have PE class on Monday?", "No, he doesn't.", ["No, I don't.", "No, it isn't."], "Does he …? 用 Yes, he does. 或 No, he doesn't. 回答。", ["do"], 3));
  add(listenReply("Does Amy have art class today?", "Yes, she does.", ["Yes, he does.", "Yes, I do."], "Amy 是女生，用 she：Yes, she does.", ["do"], 3));
  // 句子重組
  add(sentence(["Do", "you", "have", "math", "class", "on", "Monday?"], "你星期一有數學課嗎？", "Do you have ＋科目＋ class on ＋星期？", 3));
  add(sentence(["Does", "she", "have", "art", "class", "on", "Wednesday?"], "她星期三有美術課嗎？", "主詞是 she，用 Does 開頭。", 3));
  add(sentence(["No,", "she", "doesn't."], "不，她沒有。", "No, she doesn't."));
  add(sentence(["Sure!", "Follow", "me."], "當然！跟我來。", "Sure! 當然；Follow me. 跟我來。"));
  // 對話用語
  add(pick("走路不小心撞到別人，要說什麼？", "Oops, sorry!", ["Good job!", "Follow me."], "撞到人要說 Oops, sorry!", "talk", [], 1, { answerSpeak: "Oops, sorry!" }));
  add(pick("上學遲到了，進教室要說什麼？", "Sorry, I'm late.", ["It's time to go.", "Have a good time."], "Sorry, I'm late. 是「抱歉，我遲到了」。", "talk", [], 1, { answerSpeak: "Sorry, I'm late." }));
  add(pick("朋友問：「Can we go and watch?」你想答應，要說什麼？", "Sure! Follow me.", ["Watch out!", "Oops, sorry!"], "Sure! 是「當然」，再請他們跟你來。", "talk", [], 2, { answerSpeak: "Sure! Follow me." }));
  add(pick("「Watch out!」是什麼意思？", "小心！", ["看我！", "跟我來！"], "Watch out! 是提醒別人「小心」。Look at me! 才是「看我」。", "talk", [], 2, { answerSpeak: "Watch out!" }));
  add(pick("「I'm in a hurry.」是什麼意思？", "我在趕時間。", ["我遲到了。", "我很開心。"], "in a hurry 是「匆忙、趕時間」。", "talk", [], 3, { answerSpeak: "I'm in a hurry." }));
  add(pick("「teammate」是什麼意思？", "隊友", ["老師", "同學"], "teammate 是一起比賽的隊友。", "talk", [], 2, { answerSpeak: "teammate" }));
  // i_e / ie / y
  add(listen("kite", ["kit"], "kite 是 i_e，i 念長音（和字母 I 一樣）；kit 是短音。", ["phonics", "i_e"], 2));
  add(listen("time", ["Tim"], "time 是 i_e，i 念長音。", ["phonics", "i_e"], 2));
  add(listen("ride", ["rid"], "ride 是 i_e，i 念長音。", ["phonics", "i_e"], 2));
  add(listen("fine", ["fin"], "fine 是 i_e，i 念長音。", ["phonics", "i_e"], 2));
  add(spellChoice("pie", ["pye", "pi"], "pie 的長音 i 用 ie。", ["ie"], 2));
  add(spellChoice("fly", ["flie", "fli"], "fly 的長音 i 在字尾，用 y。", ["y"], 2));
  add(spellChoice("nine", ["nin", "nain"], "nine 是 i_e：i＋子音＋e。", ["i_e"], 2));
  add(spellChoice("sky", ["skie", "skai"], "sky 的長音 i 在字尾，用 y。", ["y"], 2));
  add(pick("哪一個字的 y 念長音 i（和字母 I 一樣）？", "my", ["yes", "yellow"], "y 在字尾時常念長音 i，例如 my、fly、sky；在開頭念 /j/，例如 yes。", "phonics", ["y"], 3));
  // 課表
  const sch = scheduleSVG("Class 5-2", [
    ["math", "English", "Chinese", "PE", "music"],
    ["Chinese", "science", "math", "art", "English"],
    ["PE", "math", "social studies", "Chinese", "science"],
  ]);
  add(pick("看課表。A: Do they have PE class on Monday?　B: ____", "Yes, they do.", ["No, they don't.", "Yes, it is."], "Mon. 的第 3 節是 PE，所以 Yes, they do.", "table", ["schedule"], 2, { visual: { svg: sch }, answerSpeak: "Do they have PE class on Monday? Yes, they do." }));
  add(pick("看課表。A: Do they have art class on Tuesday?　B: ____", "No, they don't.", ["Yes, they do.", "No, it isn't."], "Tue. 是 English、science、math，沒有 art。", "table", ["schedule"], 2, { visual: { svg: sch }, answerSpeak: "Do they have art class on Tuesday? No, they don't." }));
  add(pick("看課表：星期五（Fri.）第 1 節是什麼課？", "music", ["math", "science"], "Fri. 那一行的第 1 節是 music。", "table", ["schedule"], 1, { visual: { svg: sch }, answerSpeak: "music" }));
  add(pick("看課表：哪一天有 social studies？", "Wednesday", ["Monday", "Thursday"], "social studies 在 Wed.（星期三）第 3 節。", "table", ["schedule"], 2, { visual: { svg: sch }, answerSpeak: "Wednesday" }));
  // 閱讀
  const passage2 = "Today is Monday. Lily is late for school. \"Sorry, I'm late,\" she says. Lily has music class and PE class today. She likes PE very much. After school, she plays basketball with her teammates.";
  add(pick(`讀一讀：\n${passage2}\n\nDoes Lily have music class today?`, "Yes, she does.", ["No, she doesn't.", "Yes, I do."], "文章說 Lily has music class and PE class today.", "reading", [], 2));
  add(pick(`讀一讀：\n${passage2}\n\nWhat does Lily like?`, "PE", ["music", "math"], "She likes PE very much.", "reading", [], 2));
  add({ type: "truefalse", prompt: `讀一讀：\n${passage2}\n\nLily is late for school.`, answer: true, explanation: "Lily is late for school. 她遲到了。", difficulty: 2, tags: ["reading"] });
  return list;
}

// ================= Review 1 Class Schedule =================
function review1() {
  const { list, add } = bank("R1");
  const sch = scheduleSVG("Class 506", [
    ["English", "art", "math", "science", "Chinese"],
    ["math", "Chinese", "PE", "math", "English"],
    ["music", "social studies", "English", "art", "PE"],
    ["Chinese", "math", "science", "music", "math"],
  ]);
  const v = { svg: sch };
  add(pick("看課表：星期三（Wed.）第 2 節是什麼課？", "PE", ["math", "English"], "Wed. 那一行第 2 節是 PE。", "table", ["schedule"], 1, { visual: v, answerSpeak: "PE" }));
  add(pick("看課表：星期四（Thu.）第 1 節是什麼課？", "science", ["art", "music"], "Thu. 那一行第 1 節是 science。", "table", ["schedule"], 1, { visual: v, answerSpeak: "science" }));
  add(pick("看課表。A: Do they have art class on Tuesday?　B: ____", "Yes, they do.", ["No, they don't.", "Yes, it is."], "Tue. 第 1 節是 art。", "table", ["schedule"], 2, { visual: v, answerSpeak: "Do they have art class on Tuesday? Yes, they do." }));
  add(pick("看課表。A: Do they have music class on Friday?　B: ____", "No, they don't.", ["Yes, they do.", "No, it isn't."], "Fri. 是 Chinese、English、PE、math，沒有 music。", "table", ["schedule"], 2, { visual: v, answerSpeak: "Do they have music class on Friday? No, they don't." }));
  add(pick("看課表：哪兩天有 PE？", "Wednesday 和 Friday", ["Monday 和 Friday", "Tuesday 和 Thursday"], "PE 在 Wed. 第 2 節、Fri. 第 3 節。", "table", ["schedule"], 3, { visual: v }));
  add(pick("看課表：星期一（Mon.）一共有幾節課？", "four", ["three", "five"], "Mon. 有 English、math、music、Chinese 四節。", "table", ["schedule"], 2, { visual: v, answerSpeak: "four" }));
  add(pick("看課表：Tom 最喜歡 science。他最喜歡哪兩天？", "Wednesday 和 Thursday", ["Monday 和 Tuesday", "Thursday 和 Friday"], "science 在 Wed. 第 4 節、Thu. 第 1 節。", "table", ["schedule", "favorite"], 3, { visual: v }));
  const passage = "My name is Grace. My favorite subject is art. I have art class on Tuesday and Thursday. They're my favorite days. My brother likes music. He has music class on Monday.";
  add(pick(`讀一讀：\n${passage}\n\nWhat is Grace's favorite subject?`, "art", ["music", "math"], "My favorite subject is art.", "reading", [], 2, { answerSpeak: "art" }));
  add(pick(`讀一讀：\n${passage}\n\nWhat are Grace's favorite days?`, "Tuesday and Thursday", ["Monday and Tuesday", "Thursday and Friday"], "她 Tuesday 和 Thursday 有 art 課，所以是她最喜歡的日子。", "reading", [], 3));
  add(pick(`讀一讀：\n${passage}\n\nDoes her brother have music class on Monday?`, "Yes, he does.", ["No, he doesn't.", "Yes, she does."], "He has music class on Monday. 哥哥是 he，用 Yes, he does.", "reading", [], 3));
  add(sentence(["My", "favorite", "subject", "is", "science."], "我最喜歡的科目是自然。", "My favorite subject is ＋科目。", 2));
  add(sentence(["I", "have", "art", "class", "on", "Friday."], "我星期五有美術課。", "I have ＋科目＋ class on ＋星期。", 3));
  // 長母音對比（Phonics Land）
  add(listen("seed", ["side"], "seed 的 ee 念長音 e；side 的 i_e 念長音 i。", ["phonics", "contrast"], 2));
  add(listen("tail", ["tile"], "tail 的 ai 念長音 a；tile 的 i_e 念長音 i。", ["phonics", "contrast"], 2));
  add(listen("by", ["bay"], "by 的 y 念長音 i；bay 的 ay 念長音 a。", ["phonics", "contrast"], 2));
  add(listen("peel", ["pail"], "peel 的 ee 念長音 e；pail 的 ai 念長音 a。", ["phonics", "contrast"], 3));
  add(listen("sail", ["seal"], "sail 的 ai 念長音 a；seal 的 ea 念長音 e。", ["phonics", "contrast"], 3));
  add(listen("ride", ["read"], "ride 的 i_e 念長音 i；read 的 ea 念長音 e。", ["phonics", "contrast"], 3));
  add(pick("哪一個字的母音和 rain 一樣（長音 a）？", "day", ["tea", "pie"], "rain 的 ai 和 day 的 ay 都念長音 a。", "phonics", ["contrast"], 2, { answerSpeak: "rain, day" }));
  add(pick("哪一個字的母音和 tree 一樣（長音 e）？", "sea", ["sky", "cake"], "tree 的 ee 和 sea 的 ea 都念長音 e。", "phonics", ["contrast"], 2, { answerSpeak: "tree, sea" }));
  add(pick("哪一個字的母音和 kite 一樣（長音 i）？", "fly", ["feet", "May"], "kite 的 i_e 和 fly 的 y 都念長音 i。", "phonics", ["contrast"], 2, { answerSpeak: "kite, fly" }));
  add(pick("長母音 e 可以怎麼拼？", "e_e、ee、ea", ["a_e、ai、ay", "i_e、ie、y"], "長音 e：Pete（e_e）、bee（ee）、tea（ea）。", "phonics", ["contrast"], 2));
  // 對話用語
  add(pick("朋友很緊張，你想安慰他，要說什麼？", "Don't worry.", ["Watch out!", "Oh, no!"], "Don't worry. 是「別擔心」。", "talk", [], 1, { answerSpeak: "Don't worry." }));
  add(pick("跟朋友說「待會見！」要說什麼？", "See you later!", ["Good idea!", "Follow me!"], "See you later! 是「待會見」。", "talk", [], 1, { answerSpeak: "See you later!" }));
  add(pick("你想到一個好方法，要說什麼？", "I have an idea.", ["Good idea!", "I'm late."], "I have an idea. 是「我有一個主意」；Good idea! 是稱讚別人的主意。", "talk", [], 2, { answerSpeak: "I have an idea." }));
  // 綜合
  add(listenReply("What day is today?", "It's Thursday.", ["Yes, I do.", "It's math."], "問星期幾，回答 It's ＋星期。", ["day"]));
  add(listenReply("Do you have English class today?", "No, I don't.", ["No, it isn't.", "No, she doesn't."], "Do you …? 用 Yes, I do. 或 No, I don't.", ["do"], 2));
  add(pick("A: Is it Friday today?　B: No, it ____. It's Thursday.", "isn't", ["doesn't", "don't"], "Is it …? 的否定回答用 isn't。", "grammar", ["isnt"], 3, { answerSpeak: "Is it Friday today? No, it isn't. It's Thursday." }));
  add(pick("A: ____ Ken have science class on Monday?　B: Yes, he does.", "Does", ["Do", "Is"], "Ken 是一個人（他），用 Does。", "grammar", ["do"], 2, { answerSpeak: "Does Ken have science class on Monday? Yes, he does." }));
  return list;
}

mkdirSync(OUT, { recursive: true });
const all = { ST: starter(), U1: unit1(), U2: unit2(), R1: review1() };
for (const [sec, list] of Object.entries(all)) {
  writeFileSync(join(OUT, `${sec}.json`), JSON.stringify(list, null, 1) + "\n");
  console.log(`${sec}: ${list.length} 題`);
}
