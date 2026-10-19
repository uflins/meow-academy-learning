// 一年級數學出題器（上學期期中：單元 1–5）
// 依 範圍整理/一年級數學.md 第 4 節、設計規格書 4.5 和 9.2。
// - 數字一律 0–10；還沒教算式，不出 + − =，分與合一律用分合圖（splitDiagram）。
// - 每題都有 speak（給 iPad 朗讀）：畫面文字用阿拉伯數字，朗讀文字用國字（兩條、第二個）。
// - 常見錯誤要多練：問「比較短」時要念清楚、長短隨機互換；9 和 10 的分與合；擠在一起的東西要數。

import { randInt, pick, shuffle, sample, makeId } from "./util.js";

export const subject = "math";
export const grade = 1;

/* ================================================================
 * 共用工具
 * ================================================================ */

const ZH = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const zhNum = (n) => ZH[n]; // 數字名稱、第幾、幾號：二
const zhQty = (n) => (n === 2 ? "兩" : ZH[n]); // 數量：兩條、兩隻
const range = (a, b) => {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
};

// 數字前後加空白後，清掉標點旁和行首尾多餘的空白
function tidy(s) {
  return s
    .split("\n")
    .map((line) =>
      line
        .replace(/ {2,}/g, " ")
        .replace(/ ([，。？！、：；」』）])/g, "$1")
        .replace(/([「『（，。？！、：；]) /g, "$1")
        .trim()
    )
    .join("\n");
}

// tpl(Q, N)：Q(x) 念成數量（兩條），N(x) 念成數字名稱（第二）。
// 回傳 [畫面文字, 朗讀文字]，畫面文字用阿拉伯數字。
function say(tpl) {
  const show = (x) => ` ${x} `;
  return [tidy(tpl(show, show)), tidy(tpl(zhQty, zhNum))];
}

// 依權重挑一個；權重可以是數字或 [難1, 難2, 難3]
function weighted(rng, list, d) {
  const items = list
    .map(([w, v]) => [Array.isArray(w) ? w[d - 1] : w, v])
    .filter(([w]) => w > 0);
  const total = items.reduce((s, [w]) => s + w, 0);
  let r = rng() * total;
  for (const [w, v] of items) {
    r -= w;
    if (r < 0) return v;
  }
  return items[items.length - 1][1];
}

// n 個 lo–hi 之間的整數，兩兩至少差 gap（回傳順序是隨機的）
function spreadInts(rng, n, lo, hi, gap) {
  for (let t = 0; t < 300; t++) {
    const v = Array.from({ length: n }, () => randInt(rng, lo, hi));
    const s = [...v].sort((a, b) => a - b);
    if (s.every((x, i) => i === 0 || x - s[i - 1] >= gap)) return v;
  }
  return shuffle(rng, range(0, n - 1).map((i) => lo + i * gap));
}

const argMax = (a) => a.indexOf(Math.max(...a));
const argMin = (a) => a.indexOf(Math.min(...a));

function build(ctx, o) {
  const [prompt, speak] = o.text;
  const [explanation, explainSpeak] = o.explain;
  const q = {
    id: makeId(`math1-${ctx.section}`),
    grade: 1,
    subject: "math",
    unit: ctx.unit,
    section: ctx.section,
    type: o.type,
    prompt,
    speak,
    visual: o.visual || null,
  };
  if (o.type === "choice") {
    q.options = o.options;
    q.answer = o.answer;
  } else if (o.type === "input") {
    q.keypad = "digits";
    q.answer = String(o.answer);
  } else if (o.type === "order") {
    q.items = o.items.map(String);
  }
  q.explanation = explanation;
  q.explainSpeak = explainSpeak;
  q.difficulty = ctx.d;
  q.tags = [...new Set(o.tags)];
  return q;
}

function opt(label, image, speak) {
  const o = { label };
  if (image) o.image = image;
  if (speak) o.speak = speak;
  return o;
}
const yesNo = (yes, no) => [opt(yes, "⭕", yes), opt(no, "❌", no)];

const KEYCAP = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const numOpt = (n) => opt(String(n), KEYCAP[n], `${zhNum(n)}`);

// 用顏色分辨圖裡的東西：選項是同色的圓點（形狀題用愛心、框框題用方塊）
const COLORS = [
  { name: "紅色", fill: "#ef5350", dot: "🔴", sq: "🟥", heart: "❤️" },
  { name: "藍色", fill: "#42a5f5", dot: "🔵", sq: "🟦", heart: "💙" },
  { name: "綠色", fill: "#66bb6a", dot: "🟢", sq: "🟩", heart: "💚" },
  { name: "黃色", fill: "#ffca28", dot: "🟡", sq: "🟨", heart: "💛" },
  { name: "紫色", fill: "#ab47bc", dot: "🟣", sq: "🟪", heart: "💜" },
];

function section(unit, id, title, makers) {
  return {
    section: id,
    title,
    make(rng, difficulty) {
      const d = Math.min(3, Math.max(1, Math.round(Number(difficulty) || 1)));
      const fn = weighted(rng, makers, d);
      return fn(rng, d, { unit, section: id, d });
    },
  };
}

/* ---------------- SVG 小工具 ---------------- */

const r1 = (v) => Math.round(v * 10) / 10;
const LINE = `stroke="#555" stroke-width="2"`;

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="14" fill="#fffaf0"/>${body}</svg>`;
}
function emo(x, y, e, size = 36) {
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;
}
function svgText(x, y, s, size = 20, fill = "#444") {
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" font-weight="bold" fill="${fill}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">${s}</text>`;
}
// 圓形小牌子，例如「前」「左」
function badge(x, y, s, fill = "#ffcc80") {
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="18" fill="${fill}" ${LINE}/>` + svgText(x, y, s, 20, "#333");
}
function pathOf(pts) {
  return "M " + pts.map((p) => `${r1(p.x)} ${r1(p.y)}`).join(" L ");
}
function polyLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return s;
}
function wavePts(x0, y0, span, amp, wl, steps = 90) {
  return range(0, steps).map((i) => {
    const x = x0 + (span * i) / steps;
    return { x, y: y0 + amp * Math.sin((2 * Math.PI * (x - x0)) / wl) };
  });
}
// 二次貝茲曲線：起點 (x0,y0)、終點 (x1,y1)，中間往上（h>0）或往下（h<0）凸
function arcPts(x0, y0, x1, y1, h, steps = 60) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 - 2 * h;
  return range(0, steps).map((i) => {
    const t = i / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * t * (1 - t);
    const c = t * t;
    return { x: a * x0 + b * cx + c * x1, y: a * y0 + b * cy + c * y1 };
  });
}

// 在 cols×rows 的格子裡隨機放 n 個點（每格最多一個，加一點抖動）
function gridSpots(rng, n, cols, rows, cell, x0, y0, jitter) {
  const idx = sample(rng, range(0, cols * rows - 1), n);
  return idx.map((c) => ({
    x: x0 + ((c % cols) + 0.5) * cell + (rng() * 2 - 1) * jitter,
    y: y0 + (Math.floor(c / cols) + 0.5) * cell + (rng() * 2 - 1) * jitter,
  }));
}

// 散放：groups = [{ e, count }]，合計最多 18 個
function scatterSvg(rng, groups) {
  const all = groups.flatMap((g) => Array(g.count).fill(g.e));
  const spots = gridSpots(rng, all.length, 6, 3, 62, 14, 14, 9);
  return svgDoc(400, 214, spots.map((p, i) => emo(p.x, p.y, all[i], 40)).join(""));
}

// 擠在一起的一小團（最多 12 個），排成錯開的三排；彼此貼著但不重疊，才數得出來
function crowdBody(rng, e, n, cx, cy, size = 36) {
  const slots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) slots.push({ x: c * 40 + (r % 2) * 20, y: r * 36 });
  const x0 = cx - 70;
  const y0 = cy - 36;
  return sample(rng, slots, n)
    .map((p) => emo(x0 + p.x + (rng() * 2 - 1) * 2, y0 + p.y + (rng() * 2 - 1) * 2, e, size))
    .join("");
}

/* ================================================================
 * 單元 1　10以內的數
 * ================================================================ */

// g：外形或顏色相近的放同一組，混在一起數的時候不會同時出現
const THINGS = [
  { e: "🐟", name: "小魚乾", m: "條", g: "fish" },
  { e: "🐱", name: "貓咪", m: "隻", g: "cat" },
  { e: "🍎", name: "蘋果", m: "顆", g: "red" },
  { e: "🍓", name: "草莓", m: "顆", g: "red" },
  { e: "🎈", name: "氣球", m: "顆", g: "red" },
  { e: "🍌", name: "香蕉", m: "根", g: "banana" },
  { e: "🐤", name: "小雞", m: "隻", g: "chick" },
  { e: "🌸", name: "花", m: "朵", g: "flower" },
  { e: "⭐", name: "星星", m: "顆", g: "star" },
  { e: "🍩", name: "甜甜圈", m: "個", g: "sweet" },
  { e: "🧁", name: "杯子蛋糕", m: "個", g: "sweet" },
  { e: "🍪", name: "餅乾", m: "片", g: "sweet" },
  { e: "🐞", name: "瓢蟲", m: "隻", g: "bug" },
  { e: "🐝", name: "蜜蜂", m: "隻", g: "bug" },
  { e: "🦋", name: "蝴蝶", m: "隻", g: "bug" },
  { e: "🐸", name: "青蛙", m: "隻", g: "frog" },
  { e: "🚗", name: "小汽車", m: "輛", g: "car" },
  { e: "🐢", name: "烏龜", m: "隻", g: "turtle" },
];

// G1-1 點數。難 1 排一排；難 2 散放或擠在一起；難 3 混好幾種東西只數一種，或擠在一起
function makeCount(lo, hi) {
  return (rng, d, ctx) => {
    const t = pick(rng, THINGS);
    const mode = d === 1 ? "row" : d === 2 ? (rng() < 0.65 ? "scatter" : "crowded") : rng() < 0.6 ? "mixed" : "crowded";
    const n = randInt(rng, mode === "crowded" ? Math.max(lo, 4) : lo, hi); // 擠在一起至少 4 個才像一團
    let visual;
    if (mode === "row") visual = { emojiGroups: [{ emoji: t.e, count: n }] };
    else if (mode === "crowded") visual = { svg: svgDoc(400, 200, crowdBody(rng, t.e, n, 200, 100)) };
    else {
      const others =
        mode === "mixed"
          ? sample(rng, THINGS.filter((o) => o.g !== t.g), rng() < 0.5 ? 1 : 2).map((o) => ({ e: o.e, count: randInt(rng, 1, 4) }))
          : [];
      visual = { svg: scatterSvg(rng, [{ e: t.e, count: n }, ...others]) };
    }
    const one = `一${t.m}一${t.m}`;
    const text =
      mode === "mixed"
        ? say(() => `畫裡有好多東西，只數${t.name}喔！有幾${t.m}${t.name}？`)
        : mode === "crowded"
          ? say(() => `${t.name}擠在一起了！${one}數，數過的做記號。有幾${t.m}${t.name}？`)
          : say(() => `數數看，有幾${t.m}${t.name}？`);
    const explain =
      mode === "mixed"
        ? say((Q) => `只數${t.name}，別的不要數。一共有${Q(n)}${t.m}${t.name}。`)
        : say((Q) => `${one}點著數，數過的做記號，一共有${Q(n)}${t.m}${t.name}。`);
    return build(ctx, { type: "input", text, visual, answer: n, explain, tags: [`count-${mode}`, "count"] });
  };
}

// G1-2 國字 → 數字
function makeZhNumeral(lo, hi) {
  return (rng, d, ctx) => {
    const n = randInt(rng, lo, hi);
    const body =
      `<rect x="55" y="15" width="150" height="150" rx="18" fill="#ffffff" stroke="#f0a04b" stroke-width="5"/>` +
      svgText(130, 92, ZH[n], 104, "#333");
    return build(ctx, {
      type: "input",
      text: [`「${ZH[n]}」是數字幾？`, "看看卡片上的國字，它是數字幾？點一點數字按鈕。"],
      visual: { svg: svgDoc(260, 180, body) },
      answer: n,
      explain: [`「${ZH[n]}」就是 ${n}。`, `卡片上的字念${ZH[n]}，就是數字${ZH[n]}。`],
      tags: ["zh-numeral", "numeral"],
    });
  };
}

// 長得像、容易看錯的數字
const LOOKALIKE = {
  0: [6, 8, 9], 1: [7, 4, 10], 2: [5, 3, 7], 3: [8, 5, 2], 4: [1, 9, 7], 5: [2, 3, 6],
  6: [9, 0, 8], 7: [1, 4, 2], 8: [3, 0, 6], 9: [6, 4, 0], 10: [1, 0, 7],
};
const DIGIT_TIP = {
  0: "0 是一個圓圓的圈圈。", 1: "1 是直直的一條線。", 2: "2 下面是平平的一橫。",
  3: "3 是兩個彎彎，開口在左邊。", 4: "4 有一個尖尖的角。", 5: "5 上面戴著一頂平平的帽子。",
  6: "6 的圈圈在下面。", 7: "7 上面有一條橫線，再往下斜。", 8: "8 是上下兩個圈圈。",
  9: "9 的圈圈在上面。", 10: "10 是 1 和 0 站在一起。",
};
const DIGIT_TIP_SPEAK = {
  0: "零是一個圓圓的圈圈。", 1: "一是直直的一條線。", 2: "二的下面是平平的一橫。",
  3: "三是兩個彎彎，開口在左邊。", 4: "四有一個尖尖的角。", 5: "五的上面戴著一頂平平的帽子。",
  6: "六的圈圈在下面。", 7: "七的上面有一條橫線，再往下斜。", 8: "八是上下兩個圈圈。",
  9: "九的圈圈在上面。", 10: "十是一和零站在一起。",
};

// 認數字：聽數字，點出長得對的那一個（選項不念出來，才不會變成聽音配對）
function makeNumeralPick(lo, hi) {
  return (rng, d, ctx) => {
    const n = randInt(rng, lo, hi);
    const distract = sample(rng, LOOKALIKE[n], d === 1 ? 1 : 2);
    return build(ctx, {
      type: "choice",
      text: say((Q, N) => `哪一個是數字${N(n)}？`),
      options: shuffle(rng, [n, ...distract]).map((v) => opt(String(v), KEYCAP[v])),
      answer: String(n),
      explain: [DIGIT_TIP[n], DIGIT_TIP_SPEAK[n]],
      tags: ["numeral-pick", "numeral"],
    });
  };
}

/* ---- 手指 ---- */
const SKIN = "#ffd7b5";
const SKIN_LINE = `stroke="#c58b5f" stroke-width="2"`;
// 一隻手，伸出 k 根手指（0–5）；手掌左上角在 (0,0)，大拇指在左邊
function handBody(k) {
  const fingers = [[2, 56], [21, 64], [40, 58], [59, 46]]; // 食指、中指、無名指、小指
  let s = "";
  fingers.forEach(([x, h], i) => {
    const hh = i < Math.min(k, 4) ? h : 8;
    s += `<rect x="${x}" y="${-hh}" width="17" height="${hh + 16}" rx="8.5" fill="${SKIN}" ${SKIN_LINE}/>`;
  });
  if (k >= 5) s += `<rect x="0" y="10" width="17" height="56" rx="8.5" fill="${SKIN}" ${SKIN_LINE} transform="rotate(-35 8.5 66)"/>`; // 大拇指根部藏在手掌後面
  s += `<rect x="0" y="0" width="78" height="84" rx="22" fill="${SKIN}" ${SKIN_LINE}/>`;
  if (k < 5) s += `<rect x="6" y="38" width="50" height="17" rx="8.5" fill="${SKIN}" ${SKIN_LINE}/>`;
  return s;
}
function handsSvg(counts) {
  if (counts.length === 1) return svgDoc(300, 200, `<g transform="translate(111 96)">${handBody(counts[0])}</g>`);
  return svgDoc(
    420,
    200,
    `<g transform="translate(168 96) scale(-1 1)">${handBody(counts[0])}</g><g transform="translate(252 96)">${handBody(counts[1])}</g>`
  );
}

// G1-3 數手指。one：只用一隻手（1–5）；否則兩隻手合計 lo–hi
function makeFingers(lo, hi) {
  return (rng, d, ctx) => {
    const n = randInt(rng, lo, hi);
    let counts;
    if (hi <= 5 && (d === 1 || n < 2 || rng() < 0.4)) counts = [n];
    else {
      const aLo = Math.max(hi <= 5 && d === 3 ? 0 : 1, n - 5);
      const aHi = Math.min(5, n - (hi <= 5 && d === 3 ? 0 : 1));
      let a = randInt(rng, aLo, aHi);
      if (hi > 5 && d === 1) a = 5; // 難 1：一隻手是滿滿 5 根
      counts = shuffle(rng, [a, n - a]);
    }
    const two = counts.length === 2;
    const text = two
      ? say(() => "數數看，兩隻手一共伸出幾根手指？兩隻手都要數喔！")
      : say(() => "數數看，這隻手伸出幾根手指？");
    let explain;
    if (two && counts.includes(5) && n > 5) {
      explain = say((Q, N) => `一隻手是滿滿${Q(5)}根，再接著數另一隻手：${range(6, n).map(N).join("、")}，一共${Q(n)}根。`);
    } else {
      explain = say((Q, N) => `${two ? "兩隻手一起" : ""}一根一根數：${range(1, n).map(N).join("、")}，一共${Q(n)}根手指。`);
    }
    return build(ctx, {
      type: "input",
      text,
      visual: { svg: handsSvg(counts) },
      answer: n,
      explain,
      tags: [two ? "fingers-two-hands" : "fingers-one-hand", "count"],
    });
  };
}

/* ---- 容器（碗、盤子、花盆、魚缸）：認識 0 ---- */
const CONTAINERS = {
  bowl: { name: "碗", e: "🐟", item: "小魚乾", m: "條" },
  plate: { name: "盤子", e: "🍪", item: "餅乾", m: "片" },
  pot: { name: "花盆", e: "🌷", item: "花", m: "朵" },
  tank: { name: "魚缸", e: "🐠", item: "小魚", m: "條" },
};

// 畫一個容器，裡面有 k 個東西。cx 中心、baseY 桌面、w 寬度
function containerBody(rng, kind, cx, baseY, w, color, k) {
  const c = CONTAINERS[kind];
  const spots = (y, size) => {
    const gap = Math.min(size, (w - 30) / Math.max(k, 1));
    return range(0, k - 1).map((i) => emo(cx + (i - (k - 1) / 2) * gap, y, c.e, size)).join("");
  };
  const size = w >= 140 ? 30 : 26;
  if (kind === "bowl") {
    const rimY = baseY - 52;
    return (
      `<ellipse cx="${cx}" cy="${rimY}" rx="${w / 2}" ry="10" fill="#efe6da" ${LINE}/>` +
      spots(rimY - 8, size) +
      `<path d="M ${cx - w / 2} ${rimY} Q ${cx} ${rimY + 100} ${cx + w / 2} ${rimY} Z" fill="${color}" ${LINE}/>` +
      `<rect x="${cx - 18}" y="${baseY - 6}" width="36" height="8" rx="3" fill="${color}" ${LINE}/>`
    );
  }
  if (kind === "plate") {
    return `<ellipse cx="${cx}" cy="${baseY - 8}" rx="${w / 2}" ry="13" fill="#ffffff" stroke="${color}" stroke-width="6"/>` + spots(baseY - 24, size);
  }
  if (kind === "pot") {
    const top = baseY - 62;
    const a = w * 0.4;
    const b = w * 0.27;
    return (
      spots(top - 14, size) +
      `<polygon points="${cx - a},${top} ${cx + a},${top} ${cx + b},${baseY} ${cx - b},${baseY}" fill="${color}" ${LINE}/>` +
      `<rect x="${cx - a - 6}" y="${top - 4}" width="${2 * a + 12}" height="14" rx="4" fill="${color}" ${LINE}/>`
    );
  }
  // tank
  const top = baseY - 112;
  const fish = gridSpots(rng, k, 3, 2, (w - 20) / 3, cx - w / 2 + 10, top + 14, 4)
    .map((p) => emo(p.x, p.y, c.e, size))
    .join("");
  return (
    `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="112" rx="10" fill="#e1f5fe" stroke="${color}" stroke-width="5"/>` +
    `<rect x="${cx - w / 2 + 4}" y="${top + 10}" width="${w - 8}" height="98" rx="8" fill="#b3e5fc"/>` +
    fish
  );
}

// G1-4 碗裡還剩幾個（常常是 0）；難 3 容器外面多放一個陷阱
function genZeroCount(rng, d, ctx) {
  const kind = pick(rng, d === 3 ? ["bowl", "plate", "pot"] : ["bowl", "plate", "pot", "tank"]);
  const c = CONTAINERS[kind];
  const k = rng() < (d === 1 ? 0.6 : 0.45) ? 0 : randInt(rng, 1, d === 1 ? 3 : 5);
  const trap = d === 3;
  let body = `<line x1="10" y1="172" x2="390" y2="172" stroke="#c8b49a" stroke-width="4"/>`;
  body += containerBody(rng, kind, 170, 170, 150, pick(rng, COLORS).fill, k);
  if (trap) body += emo(318, 150, c.e, 30);
  const eat = kind === "bowl" && rng() < 0.5;
  const text = eat
    ? say(() => `小貓吃了好多${c.item}，碗裡還剩幾${c.m}？${trap ? "只數碗裡面的喔！" : ""}`)
    : say(() => `看看${c.name}裡面，有幾${c.m}${c.item}？${trap ? `只數${c.name}裡面的喔！` : ""}`);
  const outside = trap ? `${c.name}外面的不算。` : "";
  const explain =
    k === 0
      ? say((Q) => `${c.name}裡面空空的，一${c.m}也沒有，就是${Q(0)}${c.m}。${outside}`)
      : say((Q) => `${c.name}裡面有${Q(k)}${c.m}${c.item}。${outside}`);
  return build(ctx, {
    type: "input",
    text,
    visual: { svg: svgDoc(400, 190, body) },
    answer: k,
    explain,
    tags: [k === 0 ? "zero-empty" : "zero-count", "zero"],
  });
}

// G1-5 找 0：哪一個容器裡面是 0 個
function genFindZero(rng, d, ctx) {
  const kind = pick(rng, ["bowl", "plate", "pot"]);
  const c = CONTAINERS[kind];
  const n = d === 1 ? 2 : 3;
  const colors = sample(rng, COLORS, n);
  const nonZero = d === 3 ? [1, ...sample(rng, [2, 3, 4], n - 2)] : sample(rng, [2, 3, 4], n - 1); // 難 3 一定有 1（常被誤選）
  const counts = shuffle(rng, [0, ...nonZero]);
  const zi = counts.indexOf(0);
  const xs = n === 2 ? [120, 300] : [75, 210, 345];
  let body = `<line x1="10" y1="172" x2="410" y2="172" stroke="#c8b49a" stroke-width="4"/>`;
  xs.forEach((x, i) => {
    body += containerBody(rng, kind, x, 170, 110, colors[i].fill, counts[i]);
  });
  const trap = d === 3;
  if (trap) body += emo(xs[zi] + 42, 190, c.e, 24); // 陷阱：放在空容器的外面
  const text = say((Q) => `哪一個${c.name}裡面是${Q(0)}${c.m}${c.item}？${trap ? `外面的不算喔！` : ""}`);
  return build(ctx, {
    type: "choice",
    text,
    visual: { svg: svgDoc(420, 205, body) },
    options: colors.map((col) => opt(col.name, col.dot, `${col.name}的${c.name}`)),
    answer: colors[zi].name,
    explain: say((Q) => `${colors[zi].name}的${c.name}裡面一${c.m}也沒有，就是${Q(0)}${c.m}。${trap ? `${c.name}外面的不算。` : ""}`),
    tags: ["zero-find", "zero"],
  });
}

/* ---- 十格框 ---- */
function tenFrameBody(x, y, cell, filled) {
  let s = `<rect x="${x}" y="${y}" width="${cell * 5}" height="${cell * 2}" fill="#ffffff" stroke="#555" stroke-width="3"/>`;
  for (let i = 1; i < 5; i++) s += `<line x1="${x + i * cell}" y1="${y}" x2="${x + i * cell}" y2="${y + 2 * cell}" ${LINE}/>`;
  s += `<line x1="${x}" y1="${y + cell}" x2="${x + 5 * cell}" y2="${y + cell}" ${LINE}/>`;
  filled.forEach((f, i) => {
    if (f) s += `<circle cx="${x + ((i % 5) + 0.5) * cell}" cy="${y + (Math.floor(i / 5) + 0.5) * cell}" r="${r1(cell * 0.32)}" fill="#ef5350"/>`;
  });
  return s;
}
const topFirst = (n) => range(0, 9).map((i) => i < n);

// G1-7 十格框讀數
function genTenFrameRead(rng, d, ctx) {
  const n = d === 1 ? randInt(rng, 1, 5) : d === 2 ? randInt(rng, 6, 10) : randInt(rng, 0, 10);
  const scrambled = d === 3 && n > 0 && n < 10 && rng() < 0.5;
  const filled = scrambled ? shuffle(rng, topFirst(n)) : topFirst(n);
  let explain;
  if (n === 0) explain = say((Q) => `十格框裡一個圈圈也沒有，就是${Q(0)}個。`);
  else if (n === 10) explain = say((Q) => `兩排都滿滿的，就是${Q(10)}個。`);
  else if (scrambled) explain = say((Q) => `一個一個數，數過的做記號，一共${Q(n)}個。`);
  else if (n <= 5) explain = say((Q, N) => `一個一個數：${range(1, n).map(N).join("、")}，一共${Q(n)}個。`);
  else explain = say((Q, N) => `上面一排滿滿是${Q(5)}個，再接著數下面：${range(6, n).map(N).join("、")}，一共${Q(n)}個。`);
  return build(ctx, {
    type: "input",
    text: say(() => "十格框裡有幾個圈圈？"),
    visual: { svg: svgDoc(360, 160, tenFrameBody(30, 20, 60, filled)) },
    answer: n,
    explain,
    tags: [scrambled ? "ten-frame-scrambled" : "ten-frame-read", "ten-frame"],
  });
}

function itemsRowBody(e, n, cy, size = 32, w = 420) {
  const gap = Math.min(38, (w - 40) / Math.max(n, 1));
  return range(0, n - 1).map((i) => emo(w / 2 + (i - (n - 1) / 2) * gap, cy, e, size)).join("");
}

// G1-6 一樣多嗎？上面的東西和十格框的圈圈比一比
function genTenFrameSame(rng, d, ctx) {
  const t = pick(rng, THINGS);
  const n = d === 1 ? randInt(rng, 2, 5) : randInt(rng, 5, 10);
  const same = rng() < 0.5;
  const diffs = (d === 3 ? [-1, 1] : [-2, -1, 1, 2]).filter((x) => n + x >= 0 && n + x <= 10);
  const m = same ? n : n + pick(rng, diffs);
  const body = itemsRowBody(t.e, n, 42) + tenFrameBody(100, 110, 44, topFirst(m));
  const explain = same
    ? say((Q) => `${t.name}有${Q(n)}${t.m}，圈圈也有${Q(m)}個，一個對一個，一樣多。`)
    : say((Q) => `${t.name}有${Q(n)}${t.m}，圈圈有${Q(m)}個，一個對一個會${m > n ? "多出圈圈" : `多出${t.name}`}，不一樣多。`);
  return build(ctx, {
    type: "choice",
    text: say(() => `上面的${t.name}和十格框裡的圈圈，一樣多嗎？`),
    visual: { svg: svgDoc(420, 215, body) },
    options: [opt("一樣多", "⭕", "一樣多"), opt("不一樣多", "❌", "不一樣多")],
    answer: same ? "一樣多" : "不一樣多",
    explain,
    tags: ["ten-frame-same", "ten-frame"],
  });
}

// G1-6 要在十格框畫幾個圈圈
function genTenFrameDraw(rng, d, ctx) {
  const t = pick(rng, THINGS);
  const n = d === 1 ? randInt(rng, 1, 5) : randInt(rng, 5, 10);
  let top;
  if (d === 3) top = crowdBody(rng, t.e, n, 210, 62, 34);
  else top = itemsRowBody(t.e, n, 42);
  const h = d === 3 ? 250 : 215;
  const body = top + tenFrameBody(100, h - 105, 44, topFirst(0));
  return build(ctx, {
    type: "input",
    text: say(() => `有幾${t.m}${t.name}，就在十格框畫幾個圈圈。要畫幾個圈圈？`),
    visual: { svg: svgDoc(420, h, body) },
    answer: n,
    explain: say((Q) => `一${t.m}${t.name}畫一個圈圈。${t.name}有${Q(n)}${t.m}，就畫${Q(n)}個圈圈，先畫滿上面一排再畫下面。`),
    tags: ["ten-frame-draw", "ten-frame"],
  });
}

/* ================================================================
 * 單元 2　比長短
 * ================================================================ */

function ribbon(x, y, len, c) {
  return `<rect x="${r1(x)}" y="${y - 10}" width="${r1(len)}" height="20" rx="4" fill="${c}" ${LINE}/>`;
}
function pencil(x, y, len, c) {
  const tip = 26;
  const er = 12;
  return (
    `<rect x="${r1(x)}" y="${y - 11}" width="${er}" height="22" rx="3" fill="#f48fb1" ${LINE}/>` +
    `<rect x="${r1(x + er)}" y="${y - 11}" width="${r1(len - er - tip)}" height="22" fill="${c}" ${LINE}/>` +
    `<polygon points="${r1(x + len - tip)},${y - 11} ${r1(x + len)},${y} ${r1(x + len - tip)},${y + 11}" fill="#f5d7a1" ${LINE}/>` +
    `<polygon points="${r1(x + len - 9)},${y - 4} ${r1(x + len)},${y} ${r1(x + len - 9)},${y + 4}" fill="#444"/>`
  );
}
function rope(x, y, len, c) {
  return `<line x1="${r1(x + 6)}" y1="${y}" x2="${r1(x + len - 6)}" y2="${y}" stroke="${c}" stroke-width="12" stroke-linecap="round"/>`;
}
function straw(x, y, len, c) {
  let s = `<rect x="${r1(x)}" y="${y - 6}" width="${r1(len)}" height="12" rx="6" fill="${c}" ${LINE}/>`;
  for (let sx = x + 14; sx < x + len - 10; sx += 22) s += `<line x1="${r1(sx)}" y1="${y - 5}" x2="${r1(sx + 8)}" y2="${y + 5}" stroke="#ffffff" stroke-width="3"/>`;
  return s;
}
function trainBody(x, y, cars, c) {
  let s = "";
  for (let i = 0; i < cars; i++) {
    const cx = x + i * 44;
    s +=
      `<rect x="${r1(cx)}" y="${y - 16}" width="40" height="26" rx="5" fill="${c}" ${LINE}/>` +
      `<rect x="${r1(cx + 8)}" y="${y - 11}" width="24" height="10" rx="2" fill="#ffffff"/>` +
      `<circle cx="${r1(cx + 10)}" cy="${y + 12}" r="5" fill="#444"/><circle cx="${r1(cx + 30)}" cy="${y + 12}" r="5" fill="#444"/>`;
  }
  return s;
}
const LEN_THINGS = [
  { name: "緞帶", m: "條", draw: ribbon, min: 50 },
  { name: "鉛筆", m: "枝", draw: pencil, min: 64 },
  { name: "繩子", m: "條", draw: rope, min: 40 },
  { name: "吸管", m: "根", draw: straw, min: 40 },
];

// G2-1 誰比較長／比較短（最長／最短）。長、短隨機互換，短的稍多一點
function genLength(rng, d, ctx) {
  const isTrain = rng() < 0.2;
  const thing = isTrain ? { name: "火車", m: "列" } : pick(rng, LEN_THINGS);
  const askLong = rng() < 0.45;
  const n = d === 1 ? 2 : 3;
  const unaligned = d === 3 && rng() < 0.5;
  let cars = null;
  let lens;
  if (isTrain) {
    cars = spreadInts(rng, n, 2, 7, d === 1 ? 3 : d === 2 ? 2 : 1);
    lens = cars.map((c) => c * 44 - 4);
  } else if (d === 1) lens = spreadInts(rng, 2, 80, 340, 110);
  else lens = spreadInts(rng, 3, 70, unaligned ? 290 : 340, unaligned ? 60 : d === 2 ? 55 : 36);
  const ans = askLong ? argMax(lens) : argMin(lens);
  // 起點：對齊在 x=20；沒對齊時故意讓答案不是「最凸出來」的那個
  let xs = lens.map(() => 20);
  if (unaligned) {
    for (let t = 0; t < 80; t++) {
      xs = lens.map((L) => randInt(rng, 20, Math.max(20, 380 - L)));
      const ends = lens.map((L, i) => xs[i] + L);
      const naive = askLong ? argMax(ends) : argMin(ends);
      if (naive !== ans && Math.max(...xs) - Math.min(...xs) >= 30) break;
    }
  }
  const colors = sample(rng, COLORS, n);
  const h = 30 + n * 56;
  let body = unaligned ? "" : `<line x1="20" y1="10" x2="20" y2="${h - 10}" stroke="#999" stroke-width="2" stroke-dasharray="6 5"/>`;
  lens.forEach((L, i) => {
    const y = 42 + i * 56;
    body += isTrain ? trainBody(xs[i], y, cars[i], colors[i].fill) : thing.draw(xs[i], y, L, colors[i].fill);
  });
  const word = n === 2 ? (askLong ? "比較長" : "比較短") : askLong ? "最長" : "最短";
  const c = colors[ans];
  let explain;
  if (isTrain) explain = say((Q) => `數數車廂：${c.name}的火車有${Q(cars[ans])}節，${word}。`);
  else if (unaligned) explain = say(() => `沒有對齊，不能只看哪一邊凸出來，要從頭看到尾：${c.name}的${thing.name}${word}。`);
  else explain = say(() => `一頭對齊了，看另一頭：${c.name}的${thing.name}${word}。`);
  return build(ctx, {
    type: "choice",
    text: [`哪一${thing.m}${thing.name}${word}？`, `哪一${thing.m}${thing.name}${word}？要找${word}的那一${thing.m}喔！`],
    visual: { svg: svgDoc(400, h, body) },
    options: colors.map((col) => opt(col.name, col.dot, `${col.name}的${thing.name}`)),
    answer: c.name,
    explain,
    tags: [unaligned ? "length-unaligned" : "length-compare", askLong ? "ask-longer" : "ask-shorter", "length"],
  });
}

// G2-2 對齊才公平：哪一個框框裡擺得對
function genAlign(rng, d, ctx) {
  const thing = pick(rng, LEN_THINGS);
  const L1 = randInt(rng, 72, 95);
  const L2 = L1 + randInt(rng, 20, 30);
  const [ca, cb] = sample(rng, COLORS.slice(2), 2); // 東西用綠黃紫，框框用紅藍
  const frames = shuffle(rng, COLORS.slice(0, 2));
  const goodLeft = rng() < 0.5;
  const tilted = d >= 2 && rng() < 0.4;
  const panel = (px, good, frame) => {
    let s = `<rect x="${px}" y="8" width="195" height="150" rx="14" fill="#ffffff" stroke="${frame.fill}" stroke-width="6"/>`;
    if (good) {
      s += `<line x1="${px + 22}" y1="24" x2="${px + 22}" y2="142" stroke="#bbb" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += thing.draw(px + 22, 58, L1, ca.fill) + thing.draw(px + 22, 108, L2, cb.fill);
    } else if (tilted) {
      s += thing.draw(px + 22, 58, L1, ca.fill);
      s += `<g transform="rotate(-24 ${px + 22} 118)">${thing.draw(px + 22, 118, L2, cb.fill)}</g>`;
    } else {
      const off = L2 - L1 + randInt(rng, 15, 25); // 短的往右挪，看起來反而凸出來
      s += thing.draw(px + 22 + off, 58, L1, ca.fill) + thing.draw(px + 22, 108, L2, cb.fill);
    }
    return s;
  };
  const goodFrame = goodLeft ? frames[0] : frames[1];
  const body = panel(10, goodLeft, frames[0]) + panel(215, !goodLeft, frames[1]);
  return build(ctx, {
    type: "choice",
    text: [`要比哪一${thing.m}${thing.name}比較長，哪一個框框裡擺得對？`, `要比哪一${thing.m}${thing.name}比較長，哪一個框框裡擺得對？`],
    visual: { svg: svgDoc(420, 166, body) },
    options: frames.map((f) => opt(`${f.name}框框`, f.sq, `${f.name}框框`)),
    answer: `${goodFrame.name}框框`,
    explain: say(() => `比長短要擺直，一頭要對齊。${goodFrame.name}框框裡一頭有對齊，才看得出誰比較長。`),
    tags: ["length-align", "length"],
  });
}

/* ---- 高矮 ---- */
function catFigure(cx, footY, h, shirt) {
  const headR = 20;
  const bodyH = h - 2 * headR - 6;
  const bodyTop = footY - bodyH;
  const hy = bodyTop - headR + 6;
  return (
    `<path d="M ${cx + 20} ${footY - 14} q 26 -8 22 -40" fill="none" stroke="#e0a060" stroke-width="7" stroke-linecap="round"/>` +
    `<rect x="${cx - 22}" y="${r1(bodyTop)}" width="44" height="${r1(bodyH)}" rx="16" fill="${shirt}" ${LINE}/>` +
    `<polygon points="${cx - 18},${r1(hy - 10)} ${cx - 14},${r1(hy - headR - 6)} ${cx - 4},${r1(hy - headR + 2)}" fill="#f6c28b" ${LINE}/>` +
    `<polygon points="${cx + 18},${r1(hy - 10)} ${cx + 14},${r1(hy - headR - 6)} ${cx + 4},${r1(hy - headR + 2)}" fill="#f6c28b" ${LINE}/>` +
    `<circle cx="${cx}" cy="${r1(hy)}" r="${headR}" fill="#f6c28b" ${LINE}/>` +
    `<circle cx="${cx - 7}" cy="${r1(hy - 2)}" r="2.6" fill="#333"/><circle cx="${cx + 7}" cy="${r1(hy - 2)}" r="2.6" fill="#333"/>` +
    `<circle cx="${cx}" cy="${r1(hy + 5)}" r="2" fill="#e57373"/>`
  );
}
function boxBody(cx, footY, bh) {
  return (
    `<rect x="${cx - 36}" y="${footY - bh}" width="72" height="${bh}" fill="#c8a165" ${LINE}/>` +
    `<line x1="${cx - 36}" y1="${footY - bh + 12}" x2="${cx + 36}" y2="${footY - bh + 12}" stroke="#8d6e3f" stroke-width="2"/>`
  );
}
function buildingBody(cx, footY, w, h, c) {
  let s = `<rect x="${cx - w / 2}" y="${footY - h}" width="${w}" height="${h}" fill="${c}" ${LINE}/>`;
  for (let y = footY - h + 12; y + 16 < footY - 6; y += 28) {
    s += `<rect x="${cx - w / 2 + 12}" y="${y}" width="16" height="16" fill="#ffffff"/><rect x="${cx + w / 2 - 28}" y="${y}" width="16" height="16" fill="#ffffff"/>`;
  }
  return s;
}

// G2-3、G2-5 誰比較高／比較矮。難 2–3 有貓站在箱子上（墊高的陷阱）
function genHeight(rng, d, ctx) {
  const useBuilding = rng() < 0.25;
  const askTall = rng() < 0.5;
  const trap = !useBuilding && d >= 2 && rng() < 0.55;
  const n = d === 1 ? 2 : d === 2 ? (trap ? 2 : 3) : 3;
  let hs;
  if (trap) {
    if (n === 2) {
      const lo = randInt(rng, 100, 130);
      hs = shuffle(rng, [lo, lo + randInt(rng, 30, 50)]);
    } else {
      const lo = randInt(rng, 100, 120);
      const mid = lo + randInt(rng, 25, 30);
      hs = shuffle(rng, [lo, mid, mid + randInt(rng, 25, 30)]);
    }
  } else hs = spreadInts(rng, n, 80, 190, d === 1 ? 50 : d === 2 ? 35 : 25);
  const colors = sample(rng, COLORS, n);
  const xs = n === 2 ? [130, 270] : [80, 200, 320];
  const footY = 232;
  let boxIdx = -1;
  let bh = 0;
  if (trap) {
    boxIdx = argMin(hs); // 最矮的貓站在箱子上，頭頂變成最高
    bh = Math.max(...hs) - hs[boxIdx] + randInt(rng, 22, 34);
  }
  let body = `<line x1="10" y1="${footY}" x2="390" y2="${footY}" stroke="#8d6e63" stroke-width="4"/>`;
  hs.forEach((h, i) => {
    if (useBuilding) body += buildingBody(xs[i], footY, 76, h, colors[i].fill);
    else {
      if (i === boxIdx) body += boxBody(xs[i], footY, bh);
      body += catFigure(xs[i], i === boxIdx ? footY - bh : footY, h, colors[i].fill);
    }
  });
  const word = n === 2 ? (askTall ? "比較高" : "比較矮") : askTall ? "最高" : "最矮";
  const ans = askTall ? argMax(hs) : argMin(hs);
  const c = colors[ans];
  const who = useBuilding ? `${c.name}的大樓` : `穿${c.name}衣服的貓`;
  let text;
  if (useBuilding) text = [`哪一棟大樓${word}？`, `哪一棟大樓${word}？要找${word}的那一棟喔！`];
  else if (trap) text = [`有一隻貓站在箱子上。不算箱子，哪一隻貓${word}？`, `小心！有一隻貓站在箱子上。不算箱子，哪一隻貓${word}？要找${word}的那一隻喔！`];
  else text = [`哪一隻貓${word}？`, `哪一隻貓${word}？要找${word}的那一隻喔！`];
  let explain;
  if (trap && ans === boxIdx) explain = say(() => `${who}是被箱子墊高的，箱子不能算，牠本身${word}。`);
  else if (trap) explain = say(() => `箱子不能算。${who}站在地上，本身就${word}。`);
  else explain = say(() => `大家都站在同一個地面上，看頭頂：${who}${word}。`);
  return build(ctx, {
    type: "choice",
    text,
    visual: { svg: svgDoc(400, 245, body) },
    options: colors.map((col) => opt(col.name, col.dot, useBuilding ? `${col.name}的大樓` : `穿${col.name}衣服的貓`)),
    answer: c.name,
    explain,
    tags: [trap ? "height-box-trap" : "height-compare", askTall ? "ask-taller" : "ask-shorter-height", "height"],
  });
}

/* ---- 厚薄 ---- */
function bookBody(cx, footY, w, t, c) {
  let s =
    `<rect x="${r1(cx - w / 2)}" y="${r1(footY - t)}" width="${w}" height="${t}" rx="3" fill="${c}" ${LINE}/>` +
    `<rect x="${r1(cx - w / 2 + 8)}" y="${r1(footY - t + 4)}" width="${w - 10}" height="${t - 8}" fill="#fffdf5"/>`;
  for (let y = footY - t + 9; y < footY - 6; y += 5) s += `<line x1="${r1(cx - w / 2 + 10)}" y1="${r1(y)}" x2="${r1(cx + w / 2 - 4)}" y2="${r1(y)}" stroke="#ddd" stroke-width="1"/>`;
  return s;
}
// 每層料一樣厚，層數越多就越厚
const FILLINGS = [
  ["#f48fb1", 12], // 火腿
  ["#81c784", 12], // 生菜
  ["#ffe082", 12], // 起司
  ["#ef5350", 12], // 番茄
  ["#fff59d", 12], // 蛋
];
function sandwichBody(rng, cx, footY, layers, plate) {
  let s = `<ellipse cx="${cx}" cy="${footY}" rx="62" ry="11" fill="${plate}" ${LINE}/>`;
  let y = footY - 6;
  const parts = [["#e8c07a", 14], ...range(1, layers).map(() => pick(rng, FILLINGS)), ["#e8c07a", 14]];
  parts.forEach(([col, th]) => {
    s += `<rect x="${cx - 48}" y="${r1(y - th)}" width="96" height="${th}" rx="5" fill="${col}" stroke="#8d6e63" stroke-width="1.5"/>`;
    y -= th;
  });
  return { s, thick: footY - 6 - y };
}

// G2-4 誰比較厚／比較薄（書、三明治）。難 3：最厚的書反而最短（不要看長短）
function genThick(rng, d, ctx) {
  const askThick = rng() < 0.5;
  const useSandwich = rng() < 0.35;
  const n = d === 1 ? 2 : d === 2 ? pick(rng, [2, 3]) : 3;
  const colors = sample(rng, COLORS, n);
  const xs = n === 2 ? [120, 300] : [75, 210, 345];
  const footY = 175;
  let body = `<rect x="0" y="${footY}" width="420" height="40" fill="#d7b98e"/>`;
  let thick;
  let trap = false;
  if (useSandwich) {
    const layers = spreadInts(rng, n, 1, 5, d === 1 ? 3 : d === 2 ? 2 : 1);
    thick = [];
    layers.forEach((L, i) => {
      const { s, thick: t } = sandwichBody(rng, xs[i], footY, L, colors[i].fill);
      body += s;
      thick.push(t);
    });
  } else {
    thick = spreadInts(rng, n, 14, 72, d === 1 ? 30 : d === 2 ? 18 : 14);
    trap = d === 3;
    const maxW = n === 2 ? 160 : 125;
    const widths = trap
      ? thick.map((t) => maxW - Math.round(((t - 14) / 58) * 45)) // 越厚越短
      : thick.map(() => randInt(rng, maxW - 30, maxW));
    thick.forEach((t, i) => {
      body += bookBody(xs[i], footY, widths[i], t, colors[i].fill);
    });
  }
  const word = n === 2 ? (askThick ? "比較厚" : "比較薄") : askThick ? "最厚" : "最薄";
  const ans = askThick ? argMax(thick) : argMin(thick);
  const c = colors[ans];
  const noun = useSandwich ? "三明治" : "書";
  const who = useSandwich ? `${c.name}盤子上的三明治` : `${c.name}的書`;
  const m = useSandwich ? "個" : "本";
  let explain;
  if (useSandwich) explain = say(() => `看夾了幾層料：${who}夾得${n === 2 ? "比較" : "最"}${askThick ? "多" : "少"}層，${word}。`);
  else if (trap) explain = say(() => `比厚薄要看上下有多厚，不是比長短：${who}${word}。`);
  else explain = say(() => `從側面看上下有多厚：${who}${word}。`);
  return build(ctx, {
    type: "choice",
    text: [`哪一${m}${noun}${word}？`, `哪一${m}${noun}${word}？要找${word}的那一${m}喔！`],
    visual: { svg: svgDoc(420, 215, body) },
    options: colors.map((col) => opt(col.name, col.dot, useSandwich ? `${col.name}盤子上的三明治` : `${col.name}的書`)),
    answer: c.name,
    explain,
    tags: [trap ? "thick-trap" : "thick-compare", askThick ? "ask-thicker" : "ask-thinner", "thickness"],
  });
}

/* ---- 直線和曲線 ---- */
function lineShape(kind, y) {
  const x0 = 60;
  const x1 = 340;
  switch (kind) {
    case "flat":
      return `M ${x0} ${y} L ${x1} ${y}`;
    case "slant-up":
      return `M ${x0} ${y + 20} L ${x1} ${y - 20}`;
    case "slant-down":
      return `M ${x0} ${y - 20} L ${x1} ${y + 20}`;
    case "wave":
      return pathOf(wavePts(x0, y, x1 - x0, 15, 70));
    case "wave-gentle":
      return pathOf(wavePts(x0, y, x1 - x0, 9, 140));
    case "arc":
      return pathOf(arcPts(x0, y + 14, x1, y + 14, 26));
    case "arc-gentle":
      return pathOf(arcPts(x0, y + 8, x1, y + 8, 13));
    default: // "s"
      return `M ${x0} ${y} C ${x0 + 90} ${y - 50} ${x1 - 90} ${y + 50} ${x1} ${y}`;
  }
}
const isStraight = (k) => k === "flat" || k.startsWith("slant");

// G2-6 找直線／找曲線（斜斜的直線也是直線）
function genStraightCurve(rng, d, ctx) {
  const askStraight = rng() < 0.5;
  const n = d === 1 ? 2 : 3;
  const curves = d === 3 ? ["wave-gentle", "arc-gentle", "s", "wave"] : ["wave", "arc", "s"];
  const straights = d === 1 ? ["flat"] : ["flat", "slant-up", "slant-down"];
  let kinds;
  if (askStraight) {
    const a = d === 3 ? pick(rng, ["slant-up", "slant-down", "flat"]) : pick(rng, straights);
    kinds = [a, ...sample(rng, curves, n - 1)];
  } else {
    kinds = [pick(rng, curves), ...sample(rng, straights, Math.min(n - 1, straights.length))];
  }
  kinds = shuffle(rng, kinds);
  const colors = sample(rng, COLORS, kinds.length);
  const h = 20 + kinds.length * 70;
  const body = kinds
    .map((k, i) => `<path d="${lineShape(k, 45 + i * 70)}" fill="none" stroke="${colors[i].fill}" stroke-width="7" stroke-linecap="round"/>`)
    .join("");
  const ans = kinds.findIndex((k) => isStraight(k) === askStraight);
  const c = colors[ans];
  const word = askStraight ? "直線" : "曲線";
  const slant = askStraight && kinds[ans].startsWith("slant");
  const explain = askStraight
    ? say(() => `${c.name}的線直直的，沒有彎，是直線。${slant ? "斜斜的也是直線喔！" : ""}`)
    : say(() => `${c.name}的線彎彎的，是曲線。其他的線都是直直的。`);
  return build(ctx, {
    type: "choice",
    text: [`哪一條是${word}？`, `哪一條是${word}？${askStraight ? "直直的" : "彎彎的"}那一條喔！`],
    visual: { svg: svgDoc(400, h, body) },
    options: colors.map((col) => opt(col.name, col.dot, `${col.name}的線`)),
    answer: c.name,
    explain,
    tags: [askStraight ? "find-straight" : "find-curve", "straight-curve"],
  });
}

// G2-7 彎的繩子拉直再比：問「比較短」多一點（常見錯誤：問短選長）
function genCurveLength(rng, d, ctx) {
  const askLong = rng() < 0.4;
  const mode = d === 1 ? pick(rng, ["wavyLong", "wavyShort"]) : d === 2 ? pick(rng, ["wavyLong", "wavyShort", "wavyShort"]) : pick(rng, ["wavyShort", "hiddenLong", "hiddenLong"]);
  let Ls;
  let pts;
  let Lw;
  for (let t = 0; t < 100; t++) {
    let span;
    let amp;
    let wl;
    if (mode === "wavyLong") {
      Ls = randInt(rng, 100, 170);
      span = randInt(rng, Ls + 30, 320);
      amp = randInt(rng, 10, 18);
      wl = randInt(rng, 50, 70);
    } else if (mode === "wavyShort") {
      Ls = randInt(rng, 270, 330);
      span = randInt(rng, 90, 140);
      amp = randInt(rng, 8, 14);
      wl = randInt(rng, 40, 60);
    } else {
      Ls = randInt(rng, 170, 230);
      span = Ls - randInt(rng, 20, 50);
      amp = randInt(rng, 20, 26);
      wl = randInt(rng, 30, 40);
    }
    pts = wavePts(40, 0, span, amp, wl);
    Lw = polyLen(pts);
    const ok = mode === "wavyShort" ? Lw * 1.3 <= Ls : Lw >= Ls * 1.35;
    if (ok) break;
  }
  const wavyLonger = Lw > Ls;
  const [cw, cs] = sample(rng, COLORS, 2);
  const wavyTop = rng() < 0.5;
  const yW = wavyTop ? 60 : 145;
  const yS = wavyTop ? 145 : 60;
  const body =
    `<line x1="40" y1="20" x2="40" y2="185" stroke="#999" stroke-width="2" stroke-dasharray="6 5"/>` +
    `<path d="${pathOf(pts.map((p) => ({ x: p.x, y: p.y + yW })))}" fill="none" stroke="${cw.fill}" stroke-width="8" stroke-linecap="round"/>` +
    `<line x1="40" y1="${yS}" x2="${40 + Ls}" y2="${yS}" stroke="${cs.fill}" stroke-width="8" stroke-linecap="round"/>`;
  const order = wavyTop ? [cw, cs] : [cs, cw];
  const ansC = askLong === wavyLonger ? cw : cs;
  const word = askLong ? "比較長" : "比較短";
  let extra = "";
  if (mode === "hiddenLong") extra = "彎彎的繩子看起來短短的，拉直以後其實很長。";
  else if (mode === "wavyShort") extra = "彎彎的不一定比較長喔！";
  return build(ctx, {
    type: "choice",
    text: [`彎彎的繩子拉直以後，哪一條${word}？`, `把彎彎的繩子拉直，再和直直的繩子比。哪一條${word}？要找${word}的那一條喔！`],
    visual: { svg: svgDoc(400, 200, body) },
    options: order.map((col) => opt(col.name, col.dot, `${col.name}的繩子`)),
    answer: ansC.name,
    explain: say(() => `把彎彎的繩子拉直，一頭對齊再比：${ansC.name}的繩子${word}。${extra}`),
    tags: [`curve-${mode}`, askLong ? "ask-longer" : "ask-shorter", "curve-length"],
  });
}

// G2-8 哪一條路最近（或最遠）：直直的路最近
function genPath(rng, d, ctx) {
  const askNear = d === 1 ? rng() < 0.6 : d === 2 ? true : rng() < 0.55;
  const y0 = 125;
  let paths;
  let lens;
  for (let t = 0; t < 100; t++) {
    const arc = arcPts(50, y0, 350, y0, randInt(rng, 45, 90));
    const teeth = randInt(rng, 3, 5);
    const amp = randInt(rng, 45, 85);
    const zig = [{ x: 50, y: y0 }];
    for (let i = 1; i < 2 * teeth; i++) zig.push({ x: 50 + (i * 300) / (2 * teeth), y: i % 2 ? y0 + amp : y0 + amp * 0.3 });
    zig.push({ x: 350, y: y0 });
    const straight = [{ x: 50, y: y0 }, { x: 350, y: y0 }];
    paths = d === 1 ? [straight, pick(rng, [arc, zig])] : [straight, arc, zig];
    lens = paths.map(polyLen);
    const s = [...lens].sort((a, b) => b - a);
    if (askNear || s[0] >= s[1] * 1.12) break;
  }
  const colors = sample(rng, COLORS, paths.length);
  let body = paths
    .map((p, i) => `<path d="${pathOf(p)}" fill="none" stroke="${colors[i].fill}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  body += emo(30, y0, "🐱", 34) + emo(372, y0, "🐟", 34);
  const two = paths.length === 2;
  const word = askNear ? (two ? "比較近" : "最近") : two ? "比較遠" : "最遠";
  const ans = askNear ? argMin(lens) : argMax(lens);
  const c = colors[ans];
  const order = shuffle(rng, range(0, paths.length - 1));
  const explain = askNear
    ? say(() => `兩個點之間，直直的路${two ? "比較近" : "最近"}。${c.name}的路是直的。`)
    : say(() => `${c.name}的路彎來彎去，拉直以後${two ? "比較長" : "最長"}，所以${word}。`);
  return build(ctx, {
    type: "choice",
    text: [`小貓要去吃魚乾，哪一條路${word}？`, `小貓要去吃魚乾，走哪一條路${word}？要找${word}的那一條喔！`],
    visual: { svg: svgDoc(400, 240, body) },
    options: order.map((i) => opt(colors[i].name, colors[i].dot, `${colors[i].name}的路`)),
    answer: c.name,
    explain,
    tags: [askNear ? "path-nearest" : "path-farthest", "path"],
  });
}

/* ================================================================
 * 單元 3　排順序、比多少
 * ================================================================ */

// 一排數字卡；values 裡的 "?" 會畫成黃色問號卡；hi 是要特別標出來的位置
function cardsSvg(values, hi = -1) {
  const n = values.length;
  const w = 20 + n * 52;
  const body = values
    .map((v, i) => {
      const x = 14 + i * 52;
      const q = v === "?";
      const fill = q ? "#fff3c4" : i === hi ? "#c8e6c9" : "#ffffff";
      const stroke = q ? "#f0a04b" : i === hi ? "#43a047" : "#777";
      return `<rect x="${x}" y="12" width="44" height="60" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` + svgText(x + 22, 42, v, 28, q ? "#e65100" : "#333");
    })
    .join("");
  return svgDoc(w, 84, body);
}

// G3-1 數列填空
function genSeqGap(rng, d, ctx) {
  const desc = d === 3 && rng() < 0.4;
  let vals;
  if (d === 1) {
    vals = rng() < 0.5 ? range(1, 5) : range(1, 10);
  } else if (d === 2) {
    const len = randInt(rng, 5, 7);
    const s = randInt(rng, 1, 11 - len);
    vals = range(s, s + len - 1);
  } else {
    const len = randInt(rng, 6, 8);
    const s = rng() < 0.35 ? 0 : randInt(rng, 0, 11 - len);
    vals = range(s, s + len - 1);
  }
  if (desc) vals.reverse();
  const gap = randInt(rng, d === 1 ? 1 : 0, vals.length - (d === 1 ? 2 : 1));
  const ans = vals[gap];
  const shown = vals.map((v, i) => (i === gap ? "?" : String(v)));
  return build(ctx, {
    type: "input",
    text: desc
      ? say(() => "數字卡從大排到小，問號是數字幾？")
      : say(() => "數字卡照順序排好了，問號是數字幾？"),
    visual: { svg: cardsSvg(shown) },
    answer: ans,
    explain: say((Q, N) => `照順序念：${vals.map(N).join("、")}。問號是${N(ans)}。`),
    tags: [desc ? "sequence-desc" : "sequence-gap", "sequence"],
  });
}

// G3-2 前一個／後一個
function genBeforeAfter(rng, d, ctx) {
  const before = rng() < 0.5;
  const n = d === 1 ? randInt(rng, 2, 6) : d === 2 ? randInt(rng, 2, 9) : before ? randInt(rng, 1, 9) : randInt(rng, 1, 9);
  const ans = before ? n - 1 : n + 1;
  let visual;
  if (d === 1) {
    const vals = range(1, 10).map((v) => (v === ans ? "?" : String(v)));
    visual = { svg: cardsSvg(vals, n - 1) };
  } else if (d === 2) {
    visual = { svg: cardsSvg(before ? ["?", String(n)] : [String(n), "?"], before ? 1 : 0) };
  } else {
    visual = { svg: cardsSvg([String(n)], 0) };
  }
  const word = before ? "前一個" : "後一個";
  const lo = Math.max(0, n - 1);
  const hi = Math.min(10, n + 1);
  return build(ctx, {
    type: "input",
    text: [say((Q, N) => `數字${N(n)}的${word}是數字幾？`)[0], say((Q, N) => `數字${N(n)}的${word}，是數字幾？注意聽，是${word}喔！`)[1]],
    visual,
    answer: ans,
    explain: say((Q, N) => `照順序數：${range(lo, hi).map(N).join("、")}。${N(n)}的${word}是${N(ans)}。`),
    tags: [before ? "number-before" : "number-after", "sequence"],
  });
}

// 排數字卡（order）
function genOrderCards(rng, d, ctx) {
  let vals;
  if (d === 1) {
    const s = randInt(rng, 0, 8);
    vals = [s, s + 1, s + 2];
  } else if (d === 2) vals = sample(rng, range(0, 10), 4).sort((a, b) => a - b);
  else vals = sample(rng, range(0, 10), pick(rng, [4, 5])).sort((a, b) => a - b);
  const desc = d === 3 && rng() < 0.5;
  if (desc) vals.reverse();
  return build(ctx, {
    type: "order",
    text: desc
      ? say(() => "把數字卡從大排到小，最大的先點。")
      : say(() => "把數字卡從小排到大，最小的先點。"),
    items: vals,
    explain: say((Q, N) => `${desc ? "從大到小" : "從小到大"}：${vals.map(N).join("、")}。`),
    tags: [desc ? "order-desc" : "order-asc", "sequence"],
  });
}

// 哪一個數字比較大／比較小
function genCompareNum(rng, d, ctx) {
  const askBig = rng() < 0.5;
  let vals;
  if (d === 1) vals = spreadInts(rng, 2, 0, 10, 2);
  else if (d === 2) vals = spreadInts(rng, 3, 0, 10, 2);
  else {
    const s = randInt(rng, 0, 7);
    vals = shuffle(rng, sample(rng, range(s, s + 3), 3));
  }
  const two = vals.length === 2;
  const word = two ? (askBig ? "比較大" : "比較小") : askBig ? "最大" : "最小";
  const ans = askBig ? Math.max(...vals) : Math.min(...vals);
  const sorted = [...vals].sort((a, b) => a - b);
  return build(ctx, {
    type: "choice",
    text: [`哪一個數字${word}？`, `哪一個數字${word}？要找${word}的喔！`],
    options: vals.map((v) => numOpt(v)),
    answer: String(ans),
    explain: say((Q, N) => `從小排到大：${sorted.map(N).join("、")}。排在越後面的越大，${word}的是${N(ans)}。`),
    tags: [askBig ? "compare-bigger" : "compare-smaller", "sequence"],
  });
}

const ANIMALS = [
  { e: "🐱", n: "小貓" }, { e: "🐶", n: "小狗" }, { e: "🐰", n: "小兔子" }, { e: "🐻", n: "小熊" },
  { e: "🐼", n: "熊貓" }, { e: "🐷", n: "小豬" }, { e: "🐸", n: "青蛙" }, { e: "🐵", n: "猴子" },
  { e: "🦊", n: "狐狸" }, { e: "🐯", n: "老虎" }, { e: "🐨", n: "無尾熊" }, { e: "🐮", n: "小牛" },
  { e: "🐧", n: "企鵝" }, { e: "🐭", n: "老鼠" },
];
const FRUITS = [
  { e: "🍎", n: "蘋果" }, { e: "🍌", n: "香蕉" }, { e: "🍇", n: "葡萄" }, { e: "🍉", n: "西瓜" },
  { e: "🍓", n: "草莓" }, { e: "🍒", n: "櫻桃" }, { e: "🍑", n: "桃子" }, { e: "🍍", n: "鳳梨" },
  { e: "🥝", n: "奇異果" }, { e: "🍋", n: "檸檬" }, { e: "🍊", n: "橘子" },
];

// 排隊：list[0] 排最前面；frontLeft 時前面在左邊
function queueSvg(list, frontLeft = true) {
  const n = list.length;
  const w = 130 + n * 50;
  let body = "";
  const fx = frontLeft ? 34 : w - 34;
  const bx = frontLeft ? w - 30 : 30;
  body += emo(fx, 34, "🚩", 30) + badge(fx, 82, "前");
  body += badge(bx, 82, "後", "#b3e5fc");
  list.forEach((a, i) => {
    const x = frontLeft ? 90 + i * 50 : w - 90 - i * 50;
    body += emo(x, 60, a.e, 40);
  });
  return svgDoc(w, 112, body);
}

// 一排東西，兩端標「左」「右」；list[0] 在最左邊
function leftRightSvg(list) {
  const n = list.length;
  const w = 120 + n * 52;
  let body = badge(30, 56, "左") + badge(w - 30, 56, "右", "#b3e5fc");
  list.forEach((a, i) => {
    body += `<rect x="${64 + i * 52}" y="30" width="48" height="52" rx="8" fill="#fff3e0" stroke="#d7a86e" stroke-width="2"/>` + emo(88 + i * 52, 56, a.e, 34);
  });
  return svgDoc(w, 112, body);
}

// G3-3 從前面／後面數第幾隻（選誰，或答第幾）
function genQueue(rng, d, ctx) {
  const n = d === 1 ? 5 : d === 2 ? randInt(rng, 5, 7) : randInt(rng, 6, 8);
  const list = sample(rng, ANIMALS, n);
  const fromFront = d === 1 ? true : rng() < 0.5;
  const frontLeft = d === 3 ? rng() < 0.5 : true;
  const dir = fromFront ? "前" : "後";
  const k = randInt(rng, 1, d === 1 ? 4 : n);
  const idx = fromFront ? k - 1 : n - k; // 在 list 裡的位置（0 是最前面）
  const target = list[idx];
  const visual = { svg: queueSvg(list, frontLeft) };
  const remind = fromFront ? "" : "要從後面開始數喔！";
  const askWho = rng() < 0.5;
  if (askWho) {
    const cand = new Set([n - 1 - idx, idx - 1, idx + 1].filter((i) => i >= 0 && i < n && i !== idx));
    const others = sample(rng, [...cand], d === 1 ? 1 : 2);
    const options = shuffle(rng, [idx, ...others]).map((i) => opt(list[i].n, list[i].e, list[i].n));
    return build(ctx, {
      type: "choice",
      text: [say((Q, N) => `從${dir}面數來，第${N(k)}隻是誰？`)[0], say((Q, N) => `從${dir}面數來，第${N(k)}隻是誰？${remind}`)[1]],
      visual,
      options,
      answer: target.n,
      explain: say((Q, N) => `從${dir}面開始數：第${range(1, k).map(N).join("、第")}隻，第${N(k)}隻是${target.n}。`),
      tags: [fromFront ? "queue-front-who" : "queue-back-who", "ordinal"],
    });
  }
  return build(ctx, {
    type: "input",
    text: [say((Q, N) => `${target.n}從${dir}面數來，是第幾隻？`)[0], say(() => `${target.n}從${dir}面數來，是第幾隻？${remind}`)[1]],
    visual,
    answer: k,
    explain: say((Q, N) => `從${dir}面開始數：${range(1, k).map(N).join("、")}，${target.n}是第${N(k)}隻。`),
    tags: [fromFront ? "queue-front-pos" : "queue-back-pos", "ordinal"],
  });
}

// G3-4 從左邊／右邊數第幾個
function genLeftRight(rng, d, ctx) {
  const n = d === 1 ? 5 : d === 2 ? randInt(rng, 5, 6) : randInt(rng, 6, 7);
  const list = sample(rng, FRUITS, n);
  const fromLeft = d === 1 ? rng() < 0.7 : rng() < 0.5;
  const side = fromLeft ? "左" : "右";
  const k = randInt(rng, 1, d === 1 ? 4 : n);
  const idx = fromLeft ? k - 1 : n - k;
  const target = list[idx];
  const visual = { svg: leftRightSvg(list) };
  if (rng() < 0.5) {
    const cand = new Set([n - 1 - idx, idx - 1, idx + 1].filter((i) => i >= 0 && i < n && i !== idx));
    const others = sample(rng, [...cand], d === 1 ? 1 : 2);
    return build(ctx, {
      type: "choice",
      text: say((Q, N) => `從${side}邊數來，第${N(k)}個是什麼？`),
      visual,
      options: shuffle(rng, [idx, ...others]).map((i) => opt(list[i].n, list[i].e, list[i].n)),
      answer: target.n,
      explain: say((Q, N) => `從${side}邊開始數：${range(1, k).map(N).join("、")}，第${N(k)}個是${target.n}。`),
      tags: [fromLeft ? "left-who" : "right-who", "ordinal-left-right", "ordinal"],
    });
  }
  return build(ctx, {
    type: "input",
    text: say(() => `${target.n}從${side}邊數來，是第幾個？`),
    visual,
    answer: k,
    explain: say((Q, N) => `從${side}邊開始數：${range(1, k).map(N).join("、")}，${target.n}是第${N(k)}個。`),
    tags: [fromLeft ? "left-pos" : "right-pos", "ordinal-left-right", "ordinal"],
  });
}

// G3-5 貓跳台：從上面／下面數第幾層。難 3 同一隻問兩個方向
function genUpDown(rng, d, ctx) {
  const n = d === 3 ? 5 : 4;
  const list = sample(rng, ANIMALS, n); // list[0] 在最上層
  const shelfY = (i) => 96 + i * 66;
  const h = shelfY(n - 1) + 40;
  let body = `<rect x="70" y="${h - 20}" width="100" height="12" rx="4" fill="#8d6e63" ${LINE}/>`;
  body += `<rect x="112" y="20" width="16" height="${h - 40}" fill="#bcaaa4" ${LINE}/>`;
  list.forEach((a, i) => {
    const y = shelfY(i);
    body += `<rect x="45" y="${y}" width="150" height="12" rx="4" fill="#a1887f" ${LINE}/>` + emo(120, y - 24, a.e, 40);
  });
  body += badge(24, 34, "上") + badge(24, h - 24, "下", "#b3e5fc");
  const visual = { svg: svgDoc(240, h, body) };
  const kTop = randInt(rng, 1, n); // 從上面數第幾層
  const target = list[kTop - 1];
  const kBottom = n - kTop + 1;
  if (d === 3 && rng() < 0.5) {
    return build(ctx, {
      type: "input",
      text: say((Q, N) => `${target.n}從上面數來是第${N(kTop)}層，從下面數來是第幾層？`),
      visual,
      answer: kBottom,
      explain: say((Q, N) => `換從下面開始數：${range(1, kBottom).map(N).join("、")}，${target.n}是第${N(kBottom)}層。`),
      tags: ["updown-both", "ordinal-up-down", "ordinal"],
    });
  }
  const fromTop = rng() < 0.5;
  const side = fromTop ? "上" : "下";
  const k = fromTop ? kTop : kBottom;
  if (rng() < 0.5) {
    const idx = kTop - 1;
    const cand = new Set([n - 1 - idx, idx - 1, idx + 1].filter((i) => i >= 0 && i < n && i !== idx));
    const others = sample(rng, [...cand], d === 1 ? 1 : 2);
    return build(ctx, {
      type: "choice",
      text: say((Q, N) => `從${side}面數來，第${N(k)}層是誰？`),
      visual,
      options: shuffle(rng, [idx, ...others]).map((i) => opt(list[i].n, list[i].e, list[i].n)),
      answer: target.n,
      explain: say((Q, N) => `從${side}面開始數：${range(1, k).map(N).join("、")}，第${N(k)}層是${target.n}。`),
      tags: [fromTop ? "top-who" : "bottom-who", "ordinal-up-down", "ordinal"],
    });
  }
  return build(ctx, {
    type: "input",
    text: say(() => `${target.n}從${side}面數來，是第幾層？`),
    visual,
    answer: k,
    explain: say((Q, N) => `從${side}面開始數：${range(1, k).map(N).join("、")}，${target.n}在第${N(k)}層。`),
    tags: [fromTop ? "top-pos" : "bottom-pos", "ordinal-up-down", "ordinal"],
  });
}

// G3-6 賽跑第幾名：離終點越近名次越前面
function genRace(rng, d, ctx) {
  const n = d === 1 ? 3 : 4;
  const list = sample(rng, ANIMALS, n);
  const xs = spreadInts(rng, n, 70, 310, 45);
  const rankOf = xs.map((x) => xs.filter((y) => y > x).length + 1);
  let body = `<line x1="355" y1="8" x2="355" y2="${20 + n * 56}" stroke="#333" stroke-width="5" stroke-dasharray="8 6"/>` + emo(380, 26, "🏁", 30);
  list.forEach((a, i) => {
    const y = 40 + i * 56;
    body += `<line x1="20" y1="${y + 24}" x2="350" y2="${y + 24}" stroke="#e0c9a6" stroke-width="2"/>` + emo(xs[i], y, a.e, 40);
  });
  const visual = { svg: svgDoc(400, 30 + n * 56, body) };
  const r = randInt(rng, 1, n);
  const ti = rankOf.indexOf(r);
  const byRank = range(1, n).map((k) => list[rankOf.indexOf(k)].n);
  const explain = say((Q, N) => `離終點最近的是第${N(1)}名。照順序是：${byRank.join("、")}，${list[ti].n}是第${N(r)}名。`);
  if (rng() < 0.5) {
    const cand = range(0, n - 1).filter((i) => i !== ti && Math.abs(rankOf[i] - r) <= 1);
    const fill = range(0, n - 1).filter((i) => i !== ti && !cand.includes(i));
    const others = [...sample(rng, cand, cand.length), ...fill].slice(0, d === 1 ? 1 : 2);
    return build(ctx, {
      type: "choice",
      text: say((Q, N) => `小動物在賽跑，誰跑第${N(r)}名？`),
      visual,
      options: shuffle(rng, [ti, ...others]).map((i) => opt(list[i].n, list[i].e, list[i].n)),
      answer: list[ti].n,
      explain,
      tags: ["race-who", "ordinal"],
    });
  }
  return build(ctx, {
    type: "input",
    text: say(() => `小動物在賽跑，${list[ti].n}跑第幾名？`),
    visual,
    answer: r,
    explain,
    tags: ["race-rank", "ordinal"],
  });
}

// G3-7 「第幾個」和「幾個」：哪一個框框圈對了
function genOrdinalVsCount(rng, d, ctx) {
  const n = randInt(rng, 6, 8);
  let k;
  do k = randInt(rng, 2, Math.min(5, n - 2));
  while (2 * k === n + 1); // 從左數和從右數第 k 個不能是同一個
  const food = pick(rng, THINGS.filter((t) => t.g !== "cat" && t.g !== "car"));
  const m = food.m;
  const kinds = d === 3 ? ["ord", "count", "ordRight"] : ["ord", "count"];
  const order = shuffle(rng, kinds);
  const frames = sample(rng, COLORS.slice(0, 3), order.length);
  const w = 64 + n * 46;
  let body = "";
  order.forEach((kind, p) => {
    const y0 = 8 + p * 84;
    body += `<rect x="6" y="${y0}" width="${w - 12}" height="76" rx="12" fill="#ffffff" stroke="${frames[p].fill}" stroke-width="6"/>`;
    body += svgText(30, y0 + 38, "左", 18, "#888");
    for (let i = 0; i < n; i++) body += emo(68 + i * 46, y0 + 38, food.e, 32);
    const ring = `fill="none" stroke="#ff6f00" stroke-width="4"`;
    if (kind === "ord") body += `<circle cx="${68 + (k - 1) * 46}" cy="${y0 + 38}" r="22" ${ring}/>`;
    else if (kind === "ordRight") body += `<circle cx="${68 + (n - k) * 46}" cy="${y0 + 38}" r="22" ${ring}/>`;
    else body += `<rect x="${68 - 23}" y="${y0 + 15}" width="${(k - 1) * 46 + 46}" height="46" rx="22" ${ring}/>`;
  });
  const askOrd = rng() < 0.5;
  const ans = frames[order.indexOf(askOrd ? "ord" : "count")];
  const text = askOrd
    ? [say((Q, N) => `從左邊數，圈出「第${N(k)}${m}」${food.name}，是哪一個框框？`)[0], say((Q, N) => `從左邊數，圈出第${N(k)}${m}${food.name}，是哪一個框框？注意聽，是第${N(k)}${m}喔！`)[1]]
    : [say((Q) => `從左邊數，圈出「${Q(k)}${m}」${food.name}，是哪一個框框？`)[0], say((Q) => `從左邊開始，圈出${Q(k)}${m}${food.name}，是哪一個框框？注意聽，是${Q(k)}${m}喔！`)[1]];
  const explain = askOrd
    ? say((Q, N) => `「第${N(k)}${m}」只有${Q(1)}${m}，就是從左邊數到${N(k)}的那一${m}。`)
    : say((Q, N) => `「${Q(k)}${m}」要從第${N(1)}${m}一直圈到第${N(k)}${m}，一共${Q(k)}${m}。`);
  return build(ctx, {
    type: "choice",
    text,
    visual: { svg: svgDoc(w, 8 + order.length * 84, body) },
    options: frames.map((f) => opt(`${f.name}框框`, f.sq, `${f.name}框框`)),
    answer: `${ans.name}框框`,
    explain,
    tags: [askOrd ? "ordinal-vs-count-ord" : "ordinal-vs-count-count", "ordinal-vs-count"],
  });
}

// G3-8 排第幾個、前面有幾個、後面有幾個（不要把自己算進去）
function genFrontBehind(rng, d, ctx) {
  const n = d === 1 ? randInt(rng, 5, 6) : d === 2 ? randInt(rng, 5, 8) : randInt(rng, 6, 10);
  const k = d === 3 ? randInt(rng, 1, n) : randInt(rng, 2, n - 1);
  const sp = pick(rng, ANIMALS.filter((a) => a.e !== "🐱"));
  const cat = ANIMALS[0];
  const list = range(1, n).map((i) => (i === k ? sp : cat));
  const frontLeft = d === 3 ? rng() < 0.5 : true;
  const ask = d === 1 ? (rng() < 0.6 ? "pos" : "before") : weighted(rng, [[1, "pos"], [2, "before"], [2, "after"]], 1);
  const visual = { svg: queueSvg(list, frontLeft) };
  if (ask === "pos") {
    return build(ctx, {
      type: "input",
      text: say(() => `從前面數來，${sp.n}排第幾個？`),
      visual,
      answer: k,
      explain: say((Q, N) => `從前面開始數：${range(1, k).map(N).join("、")}，${sp.n}排第${N(k)}個。`),
      tags: ["queue-position", "ordinal-vs-count"],
    });
  }
  if (ask === "before") {
    return build(ctx, {
      type: "input",
      text: say(() => `${sp.n}的前面有幾隻小貓？`),
      visual,
      answer: k - 1,
      explain:
        k === 1
          ? say((Q) => `${sp.n}排第一個，前面沒有小貓，是${Q(0)}隻。`)
          : say((Q, N) => `${sp.n}排第${N(k)}個，前面有${Q(k - 1)}隻小貓。不要把${sp.n}自己算進去喔！`),
      tags: ["queue-count-before", "ordinal-vs-count"],
    });
  }
  return build(ctx, {
    type: "input",
    text: say(() => `${sp.n}的後面有幾隻小貓？`),
    visual,
    answer: n - k,
    explain:
      n === k
        ? say((Q) => `${sp.n}排最後一個，後面沒有小貓，是${Q(0)}隻。`)
        : say((Q, N) => `從${sp.n}後面那一隻開始數：${range(1, n - k).map(N).join("、")}，一共${Q(n - k)}隻。不要把${sp.n}自己算進去喔！`),
    tags: ["queue-count-after", "ordinal-vs-count"],
  });
}

// 前 k 名和第 k 名
function genMedal(rng, d, ctx) {
  const n = randInt(rng, 5, 8);
  const k = randInt(rng, 2, Math.min(5, n - 1));
  const list = sample(rng, ANIMALS, n);
  const w = 30 + n * 52;
  let body = "";
  list.forEach((a, i) => {
    const x = 40 + i * 52;
    body += emo(x, 44, a.e, 38) + `<rect x="${x - 17}" y="74" width="34" height="30" rx="6" fill="#fff3c4" stroke="#f0a04b" stroke-width="2"/>` + svgText(x, 89, String(i + 1), 18, "#333");
  });
  const visual = { svg: svgDoc(w, 116, body) };
  const askTop = d === 1 ? true : rng() < 0.6;
  if (askTop) {
    return build(ctx, {
      type: "input",
      text: say((Q) => `賽跑比完了，前${Q(k)}名都可以拿到獎牌。有幾隻拿到獎牌？`),
      visual,
      answer: k,
      explain: say((Q, N) => `前${Q(k)}名是第${range(1, k).map(N).join("、第")}名，一共${Q(k)}隻。`),
      tags: ["top-k-count", "ordinal-vs-count"],
    });
  }
  return build(ctx, {
    type: "input",
    text: say((Q, N) => `賽跑比完了，第${N(k)}名的有幾隻？`),
    visual,
    answer: 1,
    explain: say((Q, N) => `第${N(k)}名只有${Q(1)}隻。「前${Q(k)}名」才是${Q(k)}隻。`),
    tags: ["kth-place-count", "ordinal-vs-count"],
  });
}

// G3-9 夠不夠
const ENOUGH = [
  { a: { e: "🐱", n: "貓咪" }, b: { e: "🐟", n: "小魚乾", m: "條" }, verb: "每隻貓咪吃一條小魚乾" },
  { a: { e: "🐰", n: "小兔子" }, b: { e: "🥕", n: "紅蘿蔔", m: "根" }, verb: "每隻小兔子拿一根紅蘿蔔" },
  { a: { e: "🐶", n: "小狗" }, b: { e: "🦴", n: "骨頭", m: "根" }, verb: "每隻小狗要一根骨頭" },
  { a: { e: "🐵", n: "猴子" }, b: { e: "🍌", n: "香蕉", m: "根" }, verb: "每隻猴子吃一根香蕉" },
  { a: { e: "🐭", n: "老鼠" }, b: { e: "🧀", n: "起司", m: "塊" }, verb: "每隻老鼠吃一塊起司" },
  { a: { e: "🐻", n: "小熊" }, b: { e: "🍯", n: "蜂蜜", m: "罐" }, verb: "每隻小熊拿一罐蜂蜜" },
];
function genEnough(rng, d, ctx) {
  const p = pick(rng, ENOUGH);
  const m = d === 1 ? randInt(rng, 2, 5) : randInt(rng, 5, 10);
  let n;
  do n = m + randInt(rng, -2, 2);
  while (n < 1 || n > 10);
  const ok = n >= m;
  let tail;
  if (n === m) tail = `一隻配一${p.b.m}，剛剛好一樣多，所以夠。`;
  else if (n > m) tail = `一隻配一${p.b.m}，還有多的，所以夠。`;
  else tail = `一隻配一${p.b.m}，有${p.a.n}沒有拿到，所以不夠。`;
  return build(ctx, {
    type: "choice",
    text: say(() => `${p.verb}，${p.b.n}夠不夠？`),
    visual: { emojiGroups: [{ emoji: p.a.e, count: m, label: p.a.n }, { emoji: p.b.e, count: n, label: p.b.n }] },
    options: [opt("夠", "⭕", "夠"), opt("不夠", "❌", "不夠")],
    answer: ok ? "夠" : "不夠",
    explain: say((Q) => `${p.a.n}有${Q(m)}隻，${p.b.n}有${Q(n)}${p.b.m}。${tail}`),
    tags: [n === m ? "enough-equal" : "enough", "more-less"],
  });
}

// G3-10 誰的比較多／比較少（含一樣多）
function genMoreLess(rng, d, ctx) {
  const t = pick(rng, THINGS.filter((x) => x.g !== "cat"));
  const [A, B] = sample(rng, ANIMALS, 2);
  const askMore = rng() < 0.5;
  let a;
  let b;
  if (d === 1) {
    [a, b] = spreadInts(rng, 2, 1, 5, 2);
  } else {
    const diff = d === 2 ? weighted(rng, [[1, 0], [1.4, 1], [1.4, 2], [1.2, 3]], 1) : weighted(rng, [[1, 0], [2, 1]], 1);
    a = randInt(rng, d === 2 ? 2 : 4, 10 - diff);
    b = a + diff;
    if (rng() < 0.5) [a, b] = [b, a];
  }
  const word = askMore ? "比較多" : "比較少";
  const options = [opt(A.n, A.e, A.n), opt(B.n, B.e, B.n)];
  if (d >= 2) options.push(opt("一樣多", "⚖️", "一樣多"));
  let answer;
  let explain;
  if (a === b) {
    answer = "一樣多";
    explain = say((Q) => `${A.n}有${Q(a)}${t.m}，${B.n}也有${Q(b)}${t.m}，一個對一個剛剛好，一樣多。`);
  } else {
    const more = a > b ? A : B;
    const less = a > b ? B : A;
    answer = askMore ? more.n : less.n;
    explain = say(
      (Q) =>
        `${A.n}有${Q(a)}${t.m}，${B.n}有${Q(b)}${t.m}。一個對一個排好，${askMore ? `${more.n}的還有多出來，比較多` : `${less.n}的先用完，比較少`}。`
    );
  }
  return build(ctx, {
    type: "choice",
    text: [`誰的${t.name}${word}？`, `誰的${t.name}${word}？要找${word}的喔！`],
    visual: { emojiGroups: [{ emoji: t.e, count: a, label: `${A.e} ${A.n}` }, { emoji: t.e, count: b, label: `${B.e} ${B.n}` }] },
    options,
    answer,
    explain,
    tags: [a === b ? "more-less-equal" : askMore ? "ask-more" : "ask-less", "more-less"],
  });
}

// G3-11 視覺陷阱：一排擠在一起、一排散開。不能看誰排得長
function genMoreLessTrap(rng, d, ctx) {
  const t = pick(rng, [THINGS[0], THINGS[13], THINGS[12], THINGS[3], THINGS[9]]);
  const [A, B] = sample(rng, ANIMALS, 2);
  const diff = weighted(rng, [[1, 0], [2, 1]], 1);
  const big = randInt(rng, d === 1 ? 5 : 6, 10);
  const crowdN = big;
  const spreadN = big - diff; // 散開的那排比較少（或一樣多），看起來卻比較長
  const crowdTop = rng() < 0.5;
  const rows = crowdTop ? [["crowd", crowdN], ["spread", spreadN]] : [["spread", spreadN], ["crowd", crowdN]];
  const owners = [A, B];
  let body = "";
  rows.forEach(([kind, cnt], i) => {
    const y = 55 + i * 100;
    body += emo(32, y, owners[i].e, 40) + `<line x1="62" y1="${y - 40}" x2="62" y2="${y + 40}" stroke="#ddd" stroke-width="2"/>`;
    if (kind === "spread") {
      const gap = 310 / cnt;
      for (let j = 0; j < cnt; j++) body += emo(82 + gap * (j + 0.5), y, t.e, 30);
    } else {
      const cols = Math.ceil(cnt / 2);
      for (let j = 0; j < cnt; j++) {
        const c = j % cols;
        const r = Math.floor(j / cols);
        body += emo(92 + c * 28 + r * 14 + (rng() * 2 - 1) * 1.5, y - 14 + r * 28 + (rng() * 2 - 1) * 1.5, t.e, 27);
      }
    }
  });
  const counts = rows.map(([, c]) => c);
  const askMore = rng() < 0.5;
  const word = askMore ? "比較多" : "比較少";
  let answer;
  let explain;
  if (diff === 0) {
    answer = "一樣多";
    explain = say((Q) => `不能看誰排得比較長，要一個一個數：兩邊都是${Q(counts[0])}${t.m}，一樣多。`);
  } else {
    const iMore = counts[0] > counts[1] ? 0 : 1;
    const ai = askMore ? iMore : 1 - iMore;
    answer = owners[ai].n;
    explain = say(
      (Q) => `不能看誰排得比較長，要一個一個數：${owners[0].n}有${Q(counts[0])}${t.m}，${owners[1].n}有${Q(counts[1])}${t.m}，${owners[ai].n}的${word}。`
    );
  }
  return build(ctx, {
    type: "choice",
    text: [`誰的${t.name}${word}？`, `誰的${t.name}${word}？要找${word}的喔！一個一個數，不要用看的。`],
    visual: { svg: svgDoc(400, 210, body) },
    options: [opt(A.n, A.e, A.n), opt(B.n, B.e, B.n), opt("一樣多", "⚖️", "一樣多")],
    answer,
    explain,
    tags: [diff === 0 ? "trap-equal" : "trap-crowded", "more-less-trap", "more-less"],
  });
}

// 擠在一起的東西有幾個（常見錯誤：擠在一起時數錯）
function genCrowdCount(rng, d, ctx) {
  const t = pick(rng, [THINGS[13], THINGS[12], THINGS[0], THINGS[6], THINGS[14]]);
  const n = d === 1 ? randInt(rng, 4, 6) : d === 2 ? randInt(rng, 6, 8) : randInt(rng, 7, 10);
  return build(ctx, {
    type: "input",
    text: say(() => `${t.name}擠在一起了！有幾${t.m}？一${t.m}一${t.m}數，數過的做記號。`),
    visual: { svg: svgDoc(400, 200, crowdBody(rng, t.e, n, 200, 100)) },
    answer: n,
    explain: say((Q) => `擠在一起的東西容易數錯，數一${t.m}就做一個記號：一共${Q(n)}${t.m}。`),
    tags: ["count-crowded", "count"],
  });
}

/* ================================================================
 * 單元 4　分與合（只用分合圖，不出算式）
 * ================================================================ */

const split = (total, a, b) => ({ splitDiagram: { total, parts: [a, b] } });

// 分的故事：T 是總數、A 是看得到的那一份
const SPLIT_STORIES = [
  { m: "條", f: (Q, T, A) => `${Q(T)}條小魚乾分給兩隻貓，一隻拿${Q(A)}條，另一隻拿幾條？` },
  { m: "顆", f: (Q, T, A) => `${Q(T)}顆糖果裝進兩個盒子，一盒有${Q(A)}顆，另一盒有幾顆？` },
  { m: "條", f: (Q, T, A) => `${Q(T)}條小魚乾放在兩個碗裡，一個碗蓋起來了。看得到${Q(A)}條，蓋住的碗裡有幾條？` },
  { m: "顆", f: (Q, T, A) => `${Q(T)}顆氣球，${Q(A)}顆是紅色的，其他是藍色的。藍色的有幾顆？`, noZero: true },
  { m: "隻", f: (Q, T, A) => `${Q(T)}隻小鳥，${Q(A)}隻在樹上，其他在地上。地上有幾隻？`, noZero: true },
  { m: "隻", f: (Q, T, A) => `${Q(T)}隻小貓玩躲貓貓，${Q(A)}隻被找到了，還有幾隻躲著？` },
];

const joinSay = (...pairs) => [pairs.map((p) => p[0]).join(""), pairs.map((p) => p[1]).join("")];

// 分成兩份的說明（不用算式）：另一份小的用「接著數」，大的用書上的「畫圈圈」
function countOnExplain(T, A, m = "個") {
  const B = T - A;
  if (B === 0) return say((Q, N) => `${N(T)}可以分成${N(A)}和${N(0)}。一份已經是全部了，另一份就是${N(0)}。`);
  if (A === 0) return say((Q, N) => `${N(T)}可以分成${N(0)}和${N(T)}。一份是${N(0)}，另一份就是全部${Q(T)}${m}。`);
  const tip = (T === 9 && A === 6) || (T === 10 && A === 3) ? "數完再檢查一次喔！" : "";
  if (B >= 5) return say((Q, N) => `畫${Q(T)}個圈圈，先圈起${Q(A)}個，剩下的一個一個數，是${Q(B)}個。所以${N(T)}可以分成${N(A)}和${N(B)}。${tip}`);
  return say((Q, N) => `從${N(A)}接著數到${N(T)}：${range(A + 1, T).map(N).join("、")}，數了${Q(B)}個。所以${N(T)}可以分成${N(A)}和${N(B)}。${tip}`);
}

// 依難度挑總數；9（和 10）的出現率提高
function pickTotal(rng, d) {
  if (d === 1) return randInt(rng, 2, 5);
  if (d === 2) return weighted(rng, [[1, 5], [1, 6], [1, 7], [1.3, 8], [2.6, 9]], 1);
  return weighted(rng, [[1, 6], [1, 7], [1.5, 8], [3.5, 9]], 1);
}

// G4-1、G4-2 分魚乾（一份看不到）
function genSplit(rng, d, ctx) {
  const T = pickTotal(rng, d);
  let A;
  if (d === 3 && rng() < 0.25) A = pick(rng, [0, T]);
  else if (T === 9 && rng() < 0.3) A = 6; // 常見錯誤：9 分成 6 和 ?
  else A = randInt(rng, 1, T - 1);
  const story = pick(rng, SPLIT_STORIES.filter((s) => !(s.noZero && (A === 0 || A === T))));
  const left = rng() < 0.5;
  return build(ctx, {
    type: "input",
    text: say((Q) => story.f(Q, T, A)),
    visual: split(T, left ? A : null, left ? null : A),
    answer: T - A,
    explain: countOnExplain(T, A, story.m),
    tags: [T === 9 ? "split-9" : "split", A === 0 || A === T ? "split-zero" : "split-part", "split"],
  });
}

// 迷你分合圖（選項用）
function miniSplitSvg(T, a, b) {
  const box = (x, y, v) => `<rect x="${x - 22}" y="${y - 18}" width="44" height="36" rx="8" fill="#ffffff" stroke="#555" stroke-width="2.5"/>` + svgText(x, y, String(v), 22, "#333");
  return svgDoc(
    140,
    112,
    `<line x1="70" y1="34" x2="36" y2="76" ${LINE}/><line x1="70" y1="34" x2="104" y2="76" ${LINE}/>` + box(70, 24, T) + box(36, 86, a) + box(104, 86, b)
  );
}

// 算錯了嗎？小怪物的分合圖作業，找出寫錯的那一張（用常見的錯誤）
function makeFindMistake(mode) {
  return (rng, d, ctx) => {
    const T = mode === "ten" ? 10 : pickTotal(rng, Math.max(2, d));
    const n = d === 1 ? 2 : 3;
    // 錯的那一張
    let wa;
    let wb;
    if (T === 9 && rng() < 0.5) [wa, wb] = [6, 4];
    else if (T === 10 && rng() < 0.4) [wa, wb] = [3, 9];
    else {
      wa = randInt(rng, 1, T - 1);
      const off = T - wa >= 10 ? -1 : T - wa <= 0 ? 1 : pick(rng, [-1, 1]);
      wb = T - wa + off;
    }
    if (rng() < 0.5) [wa, wb] = [wb, wa];
    const goodAs = sample(rng, range(0, T).filter((a) => a !== wa && a !== wb), n - 1);
    const pairs = shuffle(rng, [[wa, wb, false], ...goodAs.map((a) => [a, T - a, true])]);
    const labels = ["甲", "乙", "丙"];
    const compose = mode === "compose";
    const speakOf = (a, b) => (compose ? `${zhNum(a)}和${zhNum(b)}合起來是${zhNum(T)}` : `${zhNum(T)}可以分成${zhNum(a)}和${zhNum(b)}`);
    const options = pairs.map(([a, b], i) => ({ label: labels[i], svg: miniSplitSvg(T, a, b), speak: `${labels[i]}：${speakOf(a, b)}` }));
    const wi = pairs.findIndex((p) => !p[2]);
    const right = T - wa;
    return build(ctx, {
      type: "choice",
      text: say(() => "小怪物寫了分合圖作業，哪一張寫錯了？"),
      options,
      answer: labels[wi],
      explain: say((Q, N) => `${labels[wi]}寫錯了。${N(wa)}和${N(wb)}合起來不是${N(T)}；${N(T)}要分成${N(wa)}和${N(right)}才對。`),
      tags: [`find-mistake-${mode}`, T === 9 || T === 10 ? "split-9-10" : "split", "split"],
    });
  };
}

// G4-4 合起來（總數看不到）
function genCompose(rng, d, ctx) {
  const T = d === 1 ? randInt(rng, 2, 5) : d === 2 ? randInt(rng, 5, 9) : weighted(rng, [[1, 6], [1, 7], [1, 8], [2, 9]], 1);
  let a = d === 3 && rng() < 0.2 ? 0 : randInt(rng, 1, T - 1);
  let b = T - a;
  if (rng() < 0.5) [a, b] = [b, a];
  const stories = [
    (Q) => `左邊的盤子有${Q(a)}條小魚乾，右邊的盤子有${Q(b)}條，合起來有幾條？`,
    (Q) => `小白有${Q(a)}顆彈珠，小花有${Q(b)}顆彈珠，合起來有幾顆？`,
    (Q) => `一盒有${Q(a)}塊餅乾，另一盒有${Q(b)}塊，兩盒合起來有幾塊？`,
  ];
  if (a > 0 && b > 0) stories.push((Q) => `樹上有${Q(a)}隻小鳥，又飛來${Q(b)}隻，合起來有幾隻？`);
  const story = pick(rng, stories);
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const explain =
    small === 0
      ? say((Q, N) => `${N(big)}和${N(0)}合起來，還是${N(big)}。`)
      : say((Q, N) => `從大的${N(big)}接著數${Q(small)}個：${range(big + 1, T).map(N).join("、")}，合起來是${N(T)}。`);
  return build(ctx, {
    type: "input",
    text: say(story),
    visual: split(null, a, b),
    answer: T,
    explain,
    tags: [T === 9 ? "compose-9" : "compose", "compose"],
  });
}

// G4-6 盒子裡還要幾個（合成，一份不知道）
function genComposeMissing(rng, d, ctx) {
  const T = pickTotal(rng, d);
  const A = d === 3 && rng() < 0.2 ? pick(rng, [0, T]) : randInt(rng, 1, T - 1);
  const left = rng() < 0.5;
  const story = pick(rng, [
    { m: "顆", f: (Q) => `兩個盒子合起來要有${Q(T)}顆糖果，一盒已經有${Q(A)}顆，另一盒要放幾顆？` },
    { m: "條", f: (Q) => `兩隻貓合起來要吃${Q(T)}條小魚乾，小白吃了${Q(A)}條，小花吃了幾條？` },
    { m: "個", f: (Q) => `兩個籃子合起來有${Q(T)}個蘋果，一籃有${Q(A)}個，另一籃有幾個？` },
  ]);
  return build(ctx, {
    type: "input",
    text: say(story.f),
    visual: split(T, left ? A : null, left ? null : A),
    answer: T - A,
    explain: countOnExplain(T, A, story.m),
    tags: [T === 9 ? "compose-missing-9" : "compose-missing", "compose"],
  });
}

// G4-7 湊對：a 和哪一個數合起來是 T（選項放差 1 和抄成看得到的數）
function makePairChoice(ten) {
  return (rng, d, ctx) => {
    const T = ten ? 10 : pickTotal(rng, Math.max(2, d));
    const A = ten && rng() < 0.35 ? 3 : randInt(rng, 1, T - 1);
    const B = T - A;
    const pool = [B + 1, B - 1, A, B + 2].filter((v) => v >= 0 && v <= 10 && v !== B);
    const distract = [...new Set(pool)].slice(0, 3);
    const others = sample(rng, distract, d === 1 ? 1 : 2);
    return build(ctx, {
      type: "choice",
      text: say((Q, N) => `${N(T)}可以分成${N(A)}和幾？`),
      visual: split(T, A, null),
      options: shuffle(rng, [B, ...others]).map((v) => numOpt(v)),
      answer: String(B),
      explain: countOnExplain(T, A),
      tags: [ten ? "ten-pair" : "pair-choice", ten ? "split-10" : "split"],
    });
  };
}

// G4-8 10 分兩份
function genTenSplit(rng, d, ctx) {
  const A = d === 1 ? randInt(rng, 1, 9) : d === 3 && rng() < 0.2 ? pick(rng, [0, 10]) : rng() < 0.25 ? 3 : randInt(rng, 1, 9);
  const story = pick(rng, SPLIT_STORIES.filter((s) => !(s.noZero && (A === 0 || A === 10))));
  const left = rng() < 0.5;
  return build(ctx, {
    type: "input",
    text: say((Q) => story.f(Q, 10, A)),
    visual: split(10, left ? A : null, left ? null : A),
    answer: 10 - A,
    explain: countOnExplain(10, A, story.m),
    tags: ["ten-split", "split-10"],
  });
}

// G4-9 合成 10：給兩份問合起來，或問「合起來是不是 10」
function genTenCompose(rng, d, ctx) {
  const A = randInt(rng, 1, 9);
  if (d === 1 || rng() < 0.4) {
    const B = 10 - A;
    return build(ctx, {
      type: "input",
      text: say((Q) => `左手有${Q(A)}顆氣球，右手有${Q(B)}顆氣球，合起來有幾顆？`),
      visual: split(null, A, B),
      answer: 10,
      explain: say((Q, N) => `從${N(Math.max(A, B))}接著數${Q(Math.min(A, B))}個：${range(Math.max(A, B) + 1, 10).map(N).join("、")}，合起來是${N(10)}。`),
      tags: ["ten-compose", "split-10"],
    });
  }
  const yes = rng() < 0.5;
  const B = yes ? 10 - A : Math.max(0, 10 - A - pick(rng, [1, 2]));
  const S = A + B;
  return build(ctx, {
    type: "choice",
    text: say((Q) => `${Q(A)}顆和${Q(B)}顆合起來，是不是${Q(10)}顆？`),
    visual: split(null, A, B),
    options: [opt("是", "⭕", "是"), opt("不是", "❌", "不是")],
    answer: yes ? "是" : "不是",
    explain: yes
      ? say((Q, N) => `${N(A)}和${N(B)}合起來剛好是${N(10)}，是！`)
      : say((Q, N) => `${N(A)}和${N(B)}合起來是${N(S)}，不是${N(10)}。${N(A)}要和${N(10 - A)}合起來才是${N(10)}。`),
    tags: ["ten-is-ten", "split-10"],
  });
}

// G4-10 山洞火車、G4-11 布幕後的貓：一共 10 個，看得到一部分
function genTenHidden(rng, d, ctx) {
  const v = d === 1 ? randInt(rng, 5, 9) : rng() < 0.3 ? 3 : randInt(rng, 1, 9);
  const hide = 10 - v;
  if (rng() < 0.5) {
    let body = `<line x1="0" y1="134" x2="440" y2="134" stroke="#8d6e63" stroke-width="4"/>`;
    const col = pick(rng, COLORS).fill;
    for (let i = 0; i < v; i++) {
      const x = 300 - (v - i) * 32;
      body +=
        `<rect x="${x}" y="98" width="28" height="26" rx="4" fill="${col}" ${LINE}/>` +
        `<rect x="${x + 6}" y="104" width="16" height="9" rx="2" fill="#ffffff"/>` +
        `<circle cx="${x + 7}" cy="128" r="4" fill="#444"/><circle cx="${x + 21}" cy="128" r="4" fill="#444"/>`;
    }
    body += `<path d="M 292 134 Q 330 0 440 24 L 440 134 Z" fill="#81c784" ${LINE}/>`;
    body += `<path d="M 296 134 L 296 96 Q 318 70 340 96 L 340 134 Z" fill="#37474f"/>`;
    return build(ctx, {
      type: "input",
      text: [
        `火車一共有 10 節車廂，一部分開進山洞了。山洞裡有幾節？`,
        `貓咪火車一共有十節車廂，有一些開進山洞裡了。山洞外面看得到幾節，數一數，山洞裡面有幾節？`,
      ],
      visual: { svg: svgDoc(440, 150, body) },
      answer: hide,
      explain: joinSay(say((Q) => `外面看得到${Q(v)}節。`), countOnExplain(10, v), say((Q) => `山洞裡有${Q(hide)}節。`)),
      tags: ["ten-tunnel", "split-10"],
    });
  }
  let body = `<rect x="0" y="160" width="440" height="30" fill="#a1887f"/>`;
  const perRow = 5;
  for (let i = 0; i < v; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    body += emo(40 + c * 46, 132 - r * 62, "🐱", 38);
  }
  body += `<rect x="262" y="10" width="170" height="152" fill="#c62828" ${LINE}/>`;
  for (let x = 282; x < 432; x += 24) body += `<line x1="${x}" y1="12" x2="${x}" y2="160" stroke="#8e0000" stroke-width="3"/>`;
  return build(ctx, {
    type: "input",
    text: [
      `舞台上一共有 10 隻貓，有幾隻躲在布幕後面？`,
      `舞台上一共有十隻貓，有一些躲在布幕後面。數數看外面的貓，布幕後面躲了幾隻？`,
    ],
    visual: { svg: svgDoc(440, 190, body) },
    answer: hide,
    explain: joinSay(say((Q) => `外面看得到${Q(v)}隻。`), countOnExplain(10, v), say((Q) => `布幕後面有${Q(hide)}隻。`)),
    tags: ["ten-curtain", "split-10"],
  });
}

/* ================================================================
 * 單元 5　方盒、圓罐、球
 * ================================================================ */

const SOLIDS = {
  box: [{ e: "📦", n: "紙箱" }, { e: "🎁", n: "禮物盒" }, { e: "🧊", n: "冰塊" }, { e: "🧃", n: "鋁箔包" }],
  can: [{ e: "🥫", n: "罐頭" }, { e: "🥁", n: "鼓" }, { e: "🧻", n: "衛生紙捲" }, { e: "🪵", n: "木頭" }],
  ball: [{ e: "⚽", n: "足球" }, { e: "🏀", n: "籃球" }, { e: "🎾", n: "網球" }, { e: "🏐", n: "排球" }, { e: "🧶", n: "毛線球" }],
};
const CAT_LIST = ["box", "can", "ball"];
const FACE_DESC = { box: "只有平平的面", can: "有平平的面，也有彎彎的面", ball: "只有彎彎的面" };
function solidExplain(cat, name) {
  if (cat === "box") return `${name}的面都是平平的，可以疊高高，推了不會滾。`;
  if (cat === "can") return `${name}有平平的面，也有彎彎的面：立起來可以疊高高，躺下來會滾。`;
  return `${name}全部都是彎彎的面，很會滾，可是疊不高。`;
}
const objOpt = (o) => opt(o.n, o.e, o.n);

// G5-1 會滾嗎？能疊高嗎？
function genRollStack(rng, d, ctx) {
  const cat = d === 1 ? pick(rng, ["box", "ball"]) : pick(rng, ["box", "can", "can", "ball"]);
  const o = pick(rng, SOLIDS[cat]);
  const roll = rng() < 0.5;
  const yes = roll ? cat !== "box" : cat !== "ball";
  const options = roll ? yesNo("會", "不會") : yesNo("可以", "不可以");
  const text = roll ? say(() => `推一推${o.n}，它會滾來滾去嗎？`) : say(() => `${o.n}可以一個一個疊得高高的嗎？`);
  const e = solidExplain(cat, o.n);
  return build(ctx, {
    type: "choice",
    text,
    visual: { emojiGroups: [{ emoji: o.e, count: 1, label: o.n }] },
    options,
    answer: yes ? options[0].label : options[1].label,
    explain: [e, e],
    tags: [roll ? "can-roll" : "can-stack", `solid-${cat}`, "solid"],
  });
}

// 哪一個不會滾／不能疊高／會滾也能疊；只有平平的面……
const WHICH_SOLID = [
  { ans: "box", q: "哪一個推了不會滾？", tag: "which-not-roll" },
  { ans: "ball", q: "哪一個沒辦法疊得高高的？", tag: "which-not-stack" },
  { ans: "can", q: "哪一個會滾，也可以疊得高高的？", tag: "which-both", minD: 2 },
  { ans: "box", q: "哪一個的面都是平平的？", tag: "which-flat" },
  { ans: "ball", q: "哪一個的面都是彎彎的？", tag: "which-curved" },
  { ans: "can", q: "哪一個有平平的面，也有彎彎的面？", tag: "which-mixed", minD: 2 },
];
function genWhichSolid(rng, d, ctx) {
  const w = pick(rng, WHICH_SOLID.filter((x) => !x.minD || d >= x.minD));
  const others = sample(rng, CAT_LIST.filter((c) => c !== w.ans), d === 1 ? 1 : 2);
  const objs = shuffle(rng, [w.ans, ...others].map((c) => ({ c, o: pick(rng, SOLIDS[c]) })));
  const ans = objs.find((x) => x.c === w.ans).o;
  const e = solidExplain(w.ans, ans.n);
  return build(ctx, {
    type: "choice",
    text: [w.q, w.q],
    options: objs.map((x) => objOpt(x.o)),
    answer: ans.n,
    explain: [e, e],
    tags: [w.tag, "solid"],
  });
}

// G5-3 摸摸猜
function genTouch(rng, d, ctx) {
  const cat = pick(rng, CAT_LIST);
  const desc = {
    box: "摸起來每一面都是平平的",
    can: "摸起來有平平的面，也有彎彎的面",
    ball: "摸起來全部都是彎彎的，沒有平平的面",
  }[cat];
  const others = sample(rng, CAT_LIST.filter((c) => c !== cat), d === 1 ? 1 : 2);
  const objs = shuffle(rng, [cat, ...others].map((c) => ({ c, o: pick(rng, SOLIDS[c]) })));
  const ans = objs.find((x) => x.c === cat).o;
  return build(ctx, {
    type: "choice",
    text: say(() => `小貓把手伸進神秘箱子裡摸一摸，${desc}。可能是哪一個？`),
    visual: { emojiGroups: [{ emoji: "✋", count: 1, label: "摸一摸" }] },
    options: objs.map((x) => objOpt(x.o)),
    answer: ans.n,
    explain: say(() => `${ans.n}${FACE_DESC[cat]}，所以是${ans.n}。`),
    tags: ["touch-guess", "solid"],
  });
}

// 哪一個和它是同一類
function genSameGroup(rng, d, ctx) {
  const cat = pick(rng, CAT_LIST);
  const [given, mate] = sample(rng, SOLIDS[cat], 2);
  const others = sample(rng, CAT_LIST.filter((c) => c !== cat), d === 1 ? 1 : 2).map((c) => pick(rng, SOLIDS[c]));
  return build(ctx, {
    type: "choice",
    text: say(() => `哪一個和${given.n}的形狀是同一類？`),
    visual: { emojiGroups: [{ emoji: given.e, count: 1, label: given.n }] },
    options: shuffle(rng, [mate, ...others]).map(objOpt),
    answer: mate.n,
    explain: say(() => `${given.n}和${mate.n}都是${FACE_DESC[cat]}，是同一類。`),
    tags: ["same-group", "solid"],
  });
}

/* ---- 平面圖形 ---- */
const SHAPE_NAME = { circle: "圓形", triangle: "三角形", square: "正方形", rect: "長方形" };
const SHAPES = ["circle", "triangle", "square", "rect"];
const SHAPE_EXPLAIN = {
  circle: "圓圓的，沒有角，是圓形。",
  triangle: "有 3 個角、3 條邊，是三角形。",
  square: "有 4 個角，4 條邊一樣長，是正方形。",
  rect: "有 4 個角，2 條長長的邊、2 條短短的邊，是長方形。",
};
const SHAPE_EXPLAIN_SPEAK = {
  circle: "圓圓的，沒有角，是圓形。",
  triangle: "有三個角、三條邊，是三角形。",
  square: "有四個角，四條邊一樣長，是正方形。",
  rect: "有四個角，兩條長長的邊、兩條短短的邊，是長方形。",
};

function shapeEl(kind, cx, cy, size, fill, angle = 0, variant = 0) {
  const rot = angle ? ` transform="rotate(${angle} ${cx} ${cy})"` : "";
  const st = `stroke="#444" stroke-width="3"`;
  if (kind === "circle") return `<circle cx="${cx}" cy="${cy}" r="${r1(size * 0.48)}" fill="${fill}" ${st}/>`;
  if (kind === "square") {
    const s = size * 0.78;
    return `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2)}" width="${r1(s)}" height="${r1(s)}" fill="${fill}" ${st}${rot}/>`;
  }
  if (kind === "rect") {
    const w = size * 1.1;
    const h = size * 0.5;
    return `<rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${r1(w)}" height="${r1(h)}" fill="${fill}" ${st}${rot}/>`;
  }
  const s = size / 2;
  const tri = [
    [[0, -s], [s * 0.95, s * 0.7], [-s * 0.95, s * 0.7]], // 正三角形
    [[-s * 0.8, -s * 0.8], [s * 0.8, s * 0.7], [-s * 0.8, s * 0.7]], // 直角三角形
    [[-s * 0.3, -s], [s, s * 0.7], [-s, s * 0.7]], // 歪歪的三角形
  ][variant % 3];
  return `<polygon points="${tri.map(([x, y]) => `${r1(cx + x)},${r1(cy + y)}`).join(" ")}" fill="${fill}" ${st}${rot}/>`;
}
// 正方形配長方形最容易搞混，優先當干擾
function shapeDistractors(rng, kind, k) {
  const partner = { square: "rect", rect: "square", circle: "triangle", triangle: "circle" }[kind];
  const rest = shuffle(rng, SHAPES.filter((s) => s !== kind && s !== partner));
  return [partner, ...rest].slice(0, k);
}
const shapeOpt = (k) => opt(SHAPE_NAME[k], null, SHAPE_NAME[k]);

// G5-6 這是什麼形狀（大小、顏色、角度隨機；斜放的正方形還是正方形）
function genShapeName(rng, d, ctx) {
  const kind = pick(rng, SHAPES);
  let angle = 0;
  if (d === 2) angle = kind === "square" && rng() < 0.5 ? 45 : kind === "circle" ? 0 : pick(rng, [0, 0, 90, 30]);
  if (d === 3) angle = kind === "circle" ? 0 : kind === "square" && rng() < 0.5 ? 45 : randInt(rng, 0, 359);
  const size = randInt(rng, 100, 140);
  const body = shapeEl(kind, 150, 110, size, pick(rng, COLORS).fill, angle, randInt(rng, 0, 2));
  const tilted = angle % 90 !== 0;
  const extra = tilted && (kind === "square" || kind === "rect") ? `斜斜放著也還是${SHAPE_NAME[kind]}喔！` : "";
  return build(ctx, {
    type: "choice",
    text: say(() => "這是什麼形狀？"),
    visual: { svg: svgDoc(300, 220, body) },
    options: shuffle(rng, [kind, ...shapeDistractors(rng, kind, d === 1 ? 1 : 2)]).map(shapeOpt),
    answer: SHAPE_NAME[kind],
    explain: [SHAPE_EXPLAIN[kind] + extra, SHAPE_EXPLAIN_SPEAK[kind] + extra],
    tags: [tilted && kind === "square" ? "shape-name-tilted-square" : "shape-name", `shape-${kind}`, "shape"],
  });
}

// 哪一個是○○形（幾個圖形排一排，用愛心顏色回答）
function genFindShape(rng, d, ctx) {
  const kind = pick(rng, SHAPES);
  const n = d === 1 ? 2 : 3;
  const kinds = shuffle(rng, [kind, ...shapeDistractors(rng, kind, n - 1)]);
  const colors = sample(rng, COLORS, n);
  const xs = n === 2 ? [120, 300] : [75, 210, 345];
  const body = kinds
    .map((k, i) => shapeEl(k, xs[i], 95, 100, colors[i].fill, d === 3 && k !== "circle" ? pick(rng, [0, 45, 20, 70]) : 0, randInt(rng, 0, 2)))
    .join("");
  const ai = kinds.indexOf(kind);
  return build(ctx, {
    type: "choice",
    text: say(() => `哪一個是${SHAPE_NAME[kind]}？`),
    visual: { svg: svgDoc(420, 190, body) },
    options: colors.map((c) => opt(c.name, c.heart, `${c.name}的`)),
    answer: colors[ai].name,
    explain: [`${colors[ai].name}的${SHAPE_EXPLAIN[kind]}`, `${colors[ai].name}的${SHAPE_EXPLAIN_SPEAK[kind]}`],
    tags: ["find-shape", `shape-${kind}`, "shape"],
  });
}

// 立體積木（斜斜看過去），前面那一面塗顏色
function blockSvg(kind, color) {
  const dx = 46;
  const dy = -34;
  const g1 = `fill="#eceff1" stroke="#555" stroke-width="2.5"`;
  const g2 = `fill="#cfd8dc" stroke="#555" stroke-width="2.5"`;
  const front = `fill="${color}" stroke="#333" stroke-width="3"`;
  const pts = (arr) => arr.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
  const prism = (x, y, w, h) =>
    `<polygon points="${pts([[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]])}" ${g1}/>` +
    `<polygon points="${pts([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]])}" ${g2}/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${front}/>`;
  let body;
  if (kind === "cube") body = prism(60, 80, 110, 110);
  else if (kind === "cuboid") body = prism(40, 105, 160, 78);
  else if (kind === "longcube") {
    const ldx = 110;
    const ldy = -60;
    const x = 40;
    const y = 110;
    const s = 74;
    body =
      `<polygon points="${pts([[x, y], [x + ldx, y + ldy], [x + s + ldx, y + ldy], [x + s, y]])}" ${g1}/>` +
      `<polygon points="${pts([[x + s, y], [x + s + ldx, y + ldy], [x + s + ldx, y + s + ldy], [x + s, y + s]])}" ${g2}/>` +
      `<rect x="${x}" y="${y}" width="${s}" height="${s}" ${front}/>`;
  } else if (kind === "triprism") {
    const A = [50, 190];
    const B = [170, 190];
    const C = [110, 86];
    const sh = ([x, y]) => [x + dx, y + dy];
    body =
      `<polygon points="${pts([C, sh(C), sh(B), B])}" ${g2}/>` +
      `<polygon points="${pts([A, sh(A), sh(C), C])}" ${g1}/>` +
      `<polygon points="${pts([A, B, C])}" ${front}/>`;
  } else {
    // cylinder：躺著，圓圓的那一面朝前
    const cx = 100;
    const cy = 135;
    const r = 56;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * r;
    const ny = (dx / len) * r;
    body =
      `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" ${g2}/>` +
      `<polygon points="${pts([[cx + nx, cy + ny], [cx + nx + dx, cy + ny + dy], [cx - nx + dx, cy - ny + dy], [cx - nx, cy - ny]])}" fill="#eceff1"/>` +
      `<line x1="${r1(cx + nx)}" y1="${r1(cy + ny)}" x2="${r1(cx + nx + dx)}" y2="${r1(cy + ny + dy)}" stroke="#555" stroke-width="2.5"/>` +
      `<line x1="${r1(cx - nx)}" y1="${r1(cy - ny)}" x2="${r1(cx - nx + dx)}" y2="${r1(cy - ny + dy)}" stroke="#555" stroke-width="2.5"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" ${front}/>`;
  }
  return svgDoc(260, 220, body);
}
const BLOCK_FACE = { cube: "square", cuboid: "rect", longcube: "square", triprism: "triangle", cylinder: "circle" };

// G5-4 積木塗顏色的那一面蓋印章，會印出什麼形狀
function genStamp(rng, d, ctx) {
  const kind = pick(rng, d === 3 ? ["cube", "cuboid", "longcube", "triprism", "cylinder"] : ["cube", "cuboid", "triprism", "cylinder"]);
  const face = BLOCK_FACE[kind];
  return build(ctx, {
    type: "choice",
    text: say(() => "用積木塗顏色的那一面蓋印章，會印出什麼形狀？"),
    visual: { svg: blockSvg(kind, pick(rng, COLORS).fill) },
    options: shuffle(rng, [face, ...shapeDistractors(rng, face, d === 1 ? 1 : 2)]).map(shapeOpt),
    answer: SHAPE_NAME[face],
    explain: say(() => `塗顏色的那一面是${SHAPE_NAME[face]}，蓋下去就印出${SHAPE_NAME[face]}。`),
    tags: [kind === "longcube" ? "stamp-long-square" : "stamp-face", "shape"],
  });
}

// G5-5 用哪一個可以描出○○（球沒有平平的面，描不出圓形）
function genTraceWhich(rng, d, ctx) {
  const wantCircle = rng() < 0.6;
  const good = wantCircle ? pick(rng, [SOLIDS.can[0], SOLIDS.can[1]]) : pick(rng, [{ e: "🎲", n: "骰子" }, SOLIDS.box[2]]);
  const ball = pick(rng, SOLIDS.ball);
  const third = wantCircle ? { e: "🎲", n: "骰子" } : pick(rng, [SOLIDS.can[0], SOLIDS.can[1]]);
  const list = d === 1 ? [good, ball] : [good, ball, third];
  const target = wantCircle ? "圓形" : "正方形";
  return build(ctx, {
    type: "choice",
    text: say(() => `沿著哪一個東西的邊描一圈，可以畫出${target}？`),
    options: shuffle(rng, list).map(objOpt),
    answer: good.n,
    explain: say(() => `${good.n}有一面是平平的${target}，可以描出${target}。${ball.n}沒有平平的面，描不出來。`),
    tags: [wantCircle ? "trace-circle" : "trace-square", "shape"],
  });
}

// G5-7 生活中的圖形
const LIFE_SHAPES = [
  { e: "🪙", n: "硬幣", k: "circle" },
  { e: "🕐", n: "時鐘", k: "circle" },
  { e: "🍪", n: "餅乾", k: "circle" },
  { e: "💵", n: "紙鈔", k: "rect" },
  { e: "🚪", n: "門", k: "rect" },
  { e: "📱", n: "手機", k: "rect" },
  { e: "🍕", n: "一片披薩", k: "triangle" },
  { e: "⚠️", n: "小心標誌", k: "triangle" },
  { e: "🍙", n: "飯糰", k: "triangle" },
  { e: "🎲", n: "骰子的一面", k: "square" },
  { e: "🧧", n: "斗方春聯", k: "square", svg: true },
];
function genLifeShape(rng, d, ctx) {
  const it = pick(rng, LIFE_SHAPES);
  let visual;
  if (it.svg) {
    visual = {
      svg: svgDoc(
        260,
        220,
        `<rect x="70" y="50" width="120" height="120" fill="#d32f2f" stroke="#8e0000" stroke-width="4" transform="rotate(45 130 110)"/>` + svgText(130, 112, "福", 64, "#ffd54f")
      ),
    };
  } else visual = { emojiGroups: [{ emoji: it.e, count: 1, label: it.n }] };
  const extra = it.svg ? "斜斜貼著也還是正方形喔！" : "";
  return build(ctx, {
    type: "choice",
    text: say(() => `${it.n}是什麼形狀？`),
    visual,
    options: shuffle(rng, [it.k, ...shapeDistractors(rng, it.k, d === 1 ? 1 : 2)]).map(shapeOpt),
    answer: SHAPE_NAME[it.k],
    explain: [`${it.n}是${SHAPE_NAME[it.k]}。${extra}`, `${it.n}是${SHAPE_NAME[it.k]}。${extra}`],
    tags: [it.svg ? "life-shape-tilted" : "life-shape", "shape"],
  });
}

/* ---- 做造型：用圖形拼成的圖 ---- */
const ST = `stroke="#444" stroke-width="2.5"`;
const SH = {
  circle: (cx, cy, r, f) => ({ k: "circle", s: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${ST}/>` }),
  square: (x, y, s, f, rot = 0) => ({
    k: "square",
    s: `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${f}" ${ST}${rot ? ` transform="rotate(${rot} ${x + s / 2} ${y + s / 2})"` : ""}/>`,
  }),
  rect: (x, y, w, h, f) => ({ k: "rect", s: `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${ST}/>` }),
  tri: (p, f) => ({ k: "triangle", s: `<polygon points="${p.map((q) => q.join(",")).join(" ")}" fill="${f}" ${ST}/>` }),
};

function pictureHouse(rng, d) {
  const out = [SH.square(110, 130, 140, "#ffe0b2"), SH.tri([[95, 130], [265, 130], [180, 55]], "#e57373")];
  if (rng() < 0.5) out.push(SH.rect(214, 68, 22, 44, "#a1887f"));
  out.push(SH.rect(163, 206, 34, 64, "#8d6e63"));
  const spots = [[122, 148], [208, 148], [122, 200], [208, 200]];
  sample(rng, spots, randInt(rng, d === 1 ? 1 : 0, d === 1 ? 2 : 4)).forEach(([x, y]) => out.push(SH.square(x, y, 30, "#bbdefb")));
  if (rng() < 0.6) out.push(SH.circle(345, 55, 26, "#ffd54f"));
  if (rng() < 0.6) {
    out.push(SH.rect(321, 228, 18, 42, "#8d6e63"));
    out.push(SH.tri([[290, 232], [370, 232], [330, 172]], "#81c784"));
    if (rng() < 0.5) out.push(SH.tri([[300, 172], [360, 172], [330, 122]], "#66bb6a"));
  }
  const extra = [];
  if (d === 3 && rng() < 0.5) {
    extra.push(`<path d="M 62 81 Q 80 150 58 210" fill="none" stroke="#888" stroke-width="2"/>`);
    out.push(SH.square(45, 40, 34, "#ce93d8", 45)); // 斜放的正方形風箏
  }
  if (rng() < 0.4) out.push(SH.circle(60, 254, 14, "#4fc3f7"));
  return { name: "房子", w: 400, h: 290, ground: 270, shapes: out, extra };
}
function pictureRobot(rng, d) {
  const out = [SH.square(160, 40, 80, "#b0bec5")];
  if (rng() < 0.6) out.push(SH.tri([[188, 40], [212, 40], [200, 14]], "#ffb74d"));
  out.push(SH.circle(182, 72, 10, "#263238"), SH.circle(218, 72, 10, "#263238"));
  out.push(SH.rect(178, 94, 44, 18, "#ef9a9a"));
  out.push(SH.rect(125, 130, 150, 80, "#90caf9"));
  const btnKind = rng() < 0.5 ? "circle" : "square";
  const nb = randInt(rng, 1, d === 1 ? 2 : 4);
  for (let i = 0; i < nb; i++) {
    const x = 156 + i * 30;
    out.push(btnKind === "circle" ? SH.circle(x, 170, 9, "#ffeb3b") : SH.square(x - 9, 161, 18, "#ffeb3b"));
  }
  out.push(SH.rect(63, 140, 62, 22, "#90a4ae"), SH.rect(275, 140, 62, 22, "#90a4ae"));
  if (rng() < 0.5) out.push(SH.circle(50, 151, 13, "#b0bec5"), SH.circle(350, 151, 13, "#b0bec5"));
  out.push(SH.rect(158, 210, 24, 56, "#90a4ae"), SH.rect(218, 210, 24, 56, "#90a4ae"));
  if (rng() < 0.5) out.push(SH.rect(148, 266, 44, 20, "#78909c"), SH.rect(208, 266, 44, 20, "#78909c"));
  return { name: "機器人", w: 400, h: 296, shapes: out, extra: [] };
}
function pictureCar(rng, d) {
  const out = [];
  const extra = [];
  out.push(SH.square(150, 60, 80, "#81d4fa"));
  out.push(SH.rect(60, 140, 280, 70, pick(rng, ["#ef5350", "#ffca28", "#66bb6a"])));
  const nw = randInt(rng, 0, 2);
  [[162, 74], [194, 74]].slice(0, nw).forEach(([x, y]) => out.push(SH.square(x, y, 24, "#ffffff")));
  const wheels = d === 1 ? [115, 285] : pick(rng, [[115, 285], [105, 200, 295]]);
  wheels.forEach((x) => out.push(SH.circle(x, 212, 24, "#424242")));
  if (rng() < 0.5) out.push(SH.circle(326, 160, 9, "#fff59d"));
  if (rng() < 0.4) {
    extra.push(`<line x1="96" y1="140" x2="96" y2="78" stroke="#555" stroke-width="3"/>`);
    out.push(SH.tri([[96, 78], [96, 102], [128, 90]], "#ab47bc"));
  }
  return { name: "汽車", w: 400, h: 250, shapes: out, extra };
}
function pictureCat(rng) {
  const out = [SH.circle(200, 160, 80, "#ffcc80")];
  out.push(SH.tri([[132, 118], [150, 52], [188, 84]], "#ffb74d"), SH.tri([[268, 118], [250, 52], [212, 84]], "#ffb74d"));
  out.push(SH.circle(170, 145, 12, "#3e2723"), SH.circle(230, 145, 12, "#3e2723"));
  out.push(SH.tri([[190, 172], [210, 172], [200, 186]], "#e57373"));
  if (rng() < 0.5) out.push(SH.circle(148, 186, 11, "#f8bbd0"), SH.circle(252, 186, 11, "#f8bbd0"));
  if (rng() < 0.5) out.push(SH.tri([[200, 250], [168, 234], [168, 266]], "#42a5f5"), SH.tri([[200, 250], [232, 234], [232, 266]], "#42a5f5"));
  const extra = [
    `<line x1="120" y1="176" x2="168" y2="182" stroke="#5d4037" stroke-width="2"/><line x1="120" y1="194" x2="168" y2="190" stroke="#5d4037" stroke-width="2"/>`,
    `<line x1="280" y1="176" x2="232" y2="182" stroke="#5d4037" stroke-width="2"/><line x1="280" y1="194" x2="232" y2="190" stroke="#5d4037" stroke-width="2"/>`,
  ];
  return { name: "貓咪", w: 400, h: 280, shapes: out, extra: [], after: extra };
}
function pictureForest(rng, d) {
  const out = [];
  const t = randInt(rng, 2, d === 1 ? 3 : 4);
  const xs = range(0, t - 1).map((i) => 60 + (i * 280) / Math.max(1, t - 1));
  xs.forEach((x) => {
    x = Math.round(x);
    out.push(SH.rect(x - 9, 222, 18, 40, "#8d6e63"));
    out.push(SH.tri([[x - 40, 226], [x + 40, 226], [x, 166]], "#81c784"));
    if (rng() < 0.5) out.push(SH.tri([[x - 30, 166], [x + 30, 166], [x, 116]], "#66bb6a"));
  });
  if (rng() < 0.6) out.push(SH.circle(200, 50, 24, "#ffd54f"));
  if (d >= 2 && rng() < 0.5) {
    sample(rng, xs, Math.min(2, xs.length)).forEach((x) => out.push(SH.circle(Math.round(x) + 12, 208, 7, "#e53935")));
  }
  return { name: "森林", w: 400, h: 272, shapes: out, extra: [] };
}

function makePicture(rng, d) {
  const which = weighted(rng, [[[1, 1, 1], "cat"], [[1, 1, 1], "forest"], [[1, 1, 1], "car"], [[0, 1, 1.4], "house"], [[0, 1, 1.4], "robot"]], d);
  const p =
    which === "cat" ? pictureCat(rng) : which === "forest" ? pictureForest(rng, d) : which === "car" ? pictureCar(rng, d) : which === "house" ? pictureHouse(rng, d) : pictureRobot(rng, d);
  const counts = { circle: 0, triangle: 0, square: 0, rect: 0 };
  p.shapes.forEach((s) => (counts[s.k] += 1));
  let body = p.extra.join("") + p.shapes.map((s) => s.s).join("") + (p.after || []).join("");
  if (p.ground) body = `<line x1="0" y1="${p.ground}" x2="${p.w}" y2="${p.ground}" stroke="#a5d6a7" stroke-width="4"/>` + body;
  return { ...p, counts, svg: svgDoc(p.w, p.h, body) };
}

// G5-9 數一數造型裡有幾個○○
function genCountShapes(rng, d, ctx) {
  const limit = d === 1 ? 5 : d === 2 ? 8 : 10;
  let p;
  let kind;
  for (let t = 0; t < 50; t++) {
    p = makePicture(rng, d);
    const ok = SHAPES.filter((k) => p.counts[k] >= 1 && p.counts[k] <= limit);
    if (ok.length) {
      const prefer = d === 3 ? ok.filter((k) => k === "square" || k === "rect") : [];
      kind = pick(rng, prefer.length ? prefer : ok);
      break;
    }
  }
  const n = p.counts[kind];
  const nm = SHAPE_NAME[kind];
  let tip = "";
  if (kind === "square") tip = "四條邊一樣長的才是正方形。";
  if (kind === "rect") tip = "細細長長、兩條長邊兩條短邊的是長方形。";
  return build(ctx, {
    type: "input",
    text: say(() => `這個${p.name}的圖裡，有幾個${nm}？`),
    visual: { svg: p.svg },
    answer: n,
    explain: say((Q) => `一個一個找，大的小的都要算，數過的做記號：一共${Q(n)}個${nm}。${tip}`),
    tags: [`count-${kind}`, "shape-count", "shape"],
  });
}

// G5-8 這幅畫有用到／沒有用到哪一種形狀
function genUsedShapes(rng, d, ctx) {
  for (let t = 0; t < 50; t++) {
    const p = makePicture(rng, d);
    const present = SHAPES.filter((k) => p.counts[k] > 0);
    const absent = SHAPES.filter((k) => p.counts[k] === 0);
    if (!absent.length || !present.length) continue;
    const askNot = d >= 2 && rng() < 0.5;
    const want = d === 1 ? 1 : 2;
    let ans;
    let others;
    if (askNot) {
      ans = pick(rng, absent);
      others = sample(rng, present, Math.min(want, present.length));
    } else {
      ans = pick(rng, present);
      others = sample(rng, absent, Math.min(want, absent.length));
    }
    const names = present.map((k) => SHAPE_NAME[k]).join("、");
    return build(ctx, {
      type: "choice",
      text: askNot
        ? [`這個${p.name}的圖，沒有用到哪一種形狀？`, `這個${p.name}的圖，沒有用到哪一種形狀？要找沒有用到的喔！`]
        : say(() => `這個${p.name}的圖，有用到哪一種形狀？`),
      visual: { svg: p.svg },
      options: shuffle(rng, [ans, ...others]).map(shapeOpt),
      answer: SHAPE_NAME[ans],
      explain: say(() => `這幅畫用了${names}。${askNot ? `沒有${SHAPE_NAME[ans]}。` : `${SHAPE_NAME[ans]}有用到。`}`),
      tags: [askNot ? "shape-not-used" : "shape-used", "shape"],
    });
  }
  return genCountShapes(rng, d, ctx);
}

/* ================================================================
 * 單元與節
 * ================================================================ */

export const units = [
  {
    unit: "1",
    title: "10以內的數",
    sections: [
      section("1", "1-1", "認識1～5", [
        [[5, 4, 4], makeCount(1, 5)],
        [2, makeZhNumeral(1, 5)],
        [2, makeNumeralPick(1, 5)],
        [2, makeFingers(1, 5)],
      ]),
      section("1", "1-2", "認識6～10", [
        [[5, 4, 4], makeCount(6, 10)],
        [[0, 1, 2], genCrowdCount],
        [2, makeZhNumeral(6, 10)],
        [2, makeNumeralPick(6, 10)],
        [2.5, makeFingers(6, 10)],
      ]),
      section("1", "1-3", "認識0", [
        [4, genZeroCount],
        [3, genFindZero],
        [1, makeNumeralPick(0, 0)],
        [1, makeZhNumeral(0, 0)],
      ]),
      section("1", "1-4", "表示數量", [
        [4, genTenFrameRead],
        [2.5, genTenFrameSame],
        [2.5, genTenFrameDraw],
      ]),
    ],
  },
  {
    unit: "2",
    title: "比長短",
    sections: [
      section("2", "2-1", "比長短", [
        [6, genLength],
        [[1, 2, 2], genAlign],
      ]),
      section("2", "2-2", "比高矮和比厚薄", [
        [1, genHeight],
        [1, genThick],
      ]),
      section("2", "2-3", "直線和曲線", [
        [3, genStraightCurve],
        [4, genCurveLength],
        [3, genPath],
      ]),
    ],
  },
  {
    unit: "3",
    title: "排順序、比多少",
    sections: [
      section("3", "3-1", "排數字", [
        [3, genSeqGap],
        [3, genBeforeAfter],
        [2, genOrderCards],
        [1.5, genCompareNum],
      ]),
      section("3", "3-2", "排在第幾個", [
        [3, genQueue],
        [3, genLeftRight],
        [2, genUpDown],
        [[0, 1.5, 1.5], genRace],
      ]),
      section("3", "3-3", "第幾個和幾個", [
        [3, genOrdinalVsCount],
        [3, genFrontBehind],
        [2, genMedal],
      ]),
      section("3", "3-4", "比多少", [
        [3, genEnough],
        [4, genMoreLess],
        [[1, 3, 4], genMoreLessTrap],
        [2, genCrowdCount],
      ]),
    ],
  },
  {
    unit: "4",
    title: "分與合",
    sections: [
      section("4", "4-1", "分一分", [
        [6, genSplit],
        [[1, 2, 2], makePairChoice(false)],
        [[1, 2, 2.5], makeFindMistake("split")],
      ]),
      section("4", "4-2", "合一合", [
        [4, genCompose],
        [3, genComposeMissing],
        [[1, 1.5, 2], makeFindMistake("compose")],
      ]),
      section("4", "4-3", "10的分與合", [
        [4, genTenSplit],
        [2, genTenCompose],
        [3, genTenHidden],
        [2, makePairChoice(true)],
        [[1, 2, 2.5], makeFindMistake("ten")],
      ]),
    ],
  },
  {
    unit: "5",
    title: "方盒、圓罐、球",
    sections: [
      section("5", "5-1", "堆疊與分類", [
        [3, genRollStack],
        [3, genWhichSolid],
        [2, genTouch],
        [[1, 2, 2], genSameGroup],
      ]),
      section("5", "5-2", "認識平面圖形", [
        [3, genShapeName],
        [2, genFindShape],
        [2, genStamp],
        [1.5, genTraceWhich],
        [2, genLifeShape],
      ]),
      section("5", "5-3", "做造型", [
        [3, genCountShapes],
        [2, genUsedShapes],
      ]),
    ],
  },
];
