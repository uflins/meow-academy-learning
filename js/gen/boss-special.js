// 操作型大魔王的題目（設計規格書 4.4、12.2）：
// 分數大魔王（分身）、影子魔法師（方位盤）、寶島航海王（地圖）。
import { randInt, pick, shuffle, gcd, makeId } from './util.js';

// ---------- 分數大魔王：點出「約到最簡」的分身 ----------
export function fractionClone(rng) {
  let p, q, k;
  do {
    q = randInt(rng, 3, 12);
    p = randInt(rng, 1, q - 1);
  } while (gcd(p, q) !== 1);
  k = randInt(rng, 2, Math.max(2, Math.floor(60 / q)));
  const a = p * k, b = q * k;
  const right = `${p}/${q}`;
  const cands = new Set();
  for (const d of [2, 3, 5]) if (k % d === 0 && k !== d) cands.add(`${a / d}/${b / d}`); // 只約了一半
  cands.add(`${a}/${b}`); // 還沒約
  if (p + 1 < q) cands.add(`${p + 1}/${q}`);
  if (p > 1) cands.add(`${p - 1}/${q}`);
  cands.add(`${p}/${q + 1}`);
  cands.add(`${q}/${p}`); // 分子分母顛倒
  cands.delete(right);
  const options = shuffle(rng, [right, ...shuffle(rng, [...cands]).slice(0, 3)]);
  const g = gcd(a, b);
  return {
    id: makeId('boss-frac'),
    grade: 5, subject: 'math', unit: '4', section: '4-2',
    type: 'choice', style: 'clones',
    prompt: `分數大魔王變出了好多分身！牠的本體是 ${a}/${b}。\n約到最簡分數的那一隻才是本體，打哪一隻？`,
    options,
    answer: right,
    explanation: `${a} 和 ${b} 的最大公因數是 ${g}，分子分母同除以 ${g}，得到 ${right}。`,
    difficulty: 2,
    tags: ['boss-clone', 'reduce-fraction'],
  };
}

// ---------- 影子魔法師：在方位盤上點出影子的方向 ----------
// 嘉義（北回歸線上）四個代表日的太陽方位（依自修資料）
const SUN = {
  春分: { 早上: '正東', 中午: '正南', 傍晚: '正西' },
  秋分: { 早上: '正東', 中午: '正南', 傍晚: '正西' },
  夏至: { 早上: '東偏北', 中午: '頭頂', 傍晚: '西偏北' },
  冬至: { 早上: '東偏南', 中午: '正南', 傍晚: '西偏南' },
};
const OPPOSITE = {
  正東: '正西', 正西: '正東', 正南: '正北', 正北: '正南',
  東偏北: '西偏南', 西偏南: '東偏北', 東偏南: '西偏北', 西偏北: '東偏南',
  頭頂: '幾乎沒有影子',
};
const TIME_SAY = { 早上: '剛日出不久的早上', 中午: '中午', 傍晚: '快要日落的傍晚' };

export const COMPASS_LABELS = ['正北', '東偏北', '正東', '東偏南', '正南', '西偏南', '正西', '西偏北', '幾乎沒有影子'];

export function shadowQuestion(rng) {
  const day = pick(rng, Object.keys(SUN));
  const time = pick(rng, ['早上', '中午', '傍晚']);
  const sun = SUN[day][time];
  const shadow = OPPOSITE[sun];
  const askSun = sun !== '頭頂' && rng() < 0.3;
  const base = {
    id: makeId('boss-shadow'),
    grade: 5, subject: 'science', unit: '1', section: '1-2',
    type: 'choice', style: 'compass',
    options: COMPASS_LABELS.filter((l) => !askSun || l !== '幾乎沒有影子'),
    difficulty: 2,
    tags: ['boss-shadow', 'shadow'],
  };
  if (askSun) {
    return Object.assign(base, {
      prompt: `${day}${TIME_SAY[time]}，在嘉義（北回歸線上）看到竿子的影子在「${shadow}」。\n太陽在哪個方向？點方位盤。`,
      answer: sun,
      explanation: `太陽和影子永遠在相反的方向。影子在${shadow}，太陽就在${sun}。`,
    });
  }
  return Object.assign(base, {
    prompt: `${day}${TIME_SAY[time]}，在嘉義（北回歸線上）立一根竿子。\n影子會落在哪個方向？點方位盤。`,
    answer: shadow,
    explanation: sun === '頭頂'
      ? '嘉義在北回歸線上，夏至中午太陽在正頭頂，所以幾乎沒有影子。'
      : `${day}${time}太陽在${sun}，影子在相反的方向，也就是${shadow}。`,
  });
}

// ---------- 寶島航海王：在地圖上點出位置 ----------
// 示意圖上的位置（依自修的海陸位置圖、離島位置圖，只取相對方位）
export const MAP_SPOTS = {
  臺灣海峽: [228, 232], 巴士海峽: [330, 368], 太平洋: [500, 250], 東海: [330, 70], 南海: [150, 380],
  中國: [80, 170], 日本: [520, 70], 菲律賓: [330, 425], 韓國: [210, 40],
  澎湖群島: [262, 248], 金門: [176, 220], 馬祖: [196, 150], 龜山島: [404, 150], 綠島: [412, 290], 蘭嶼: [410, 334], 琉球嶼: [304, 318],
};
const MAP_FACTS = {
  臺灣海峽: '臺灣和中國之間隔著臺灣海峽。',
  巴士海峽: '臺灣和菲律賓之間隔著巴士海峽。',
  太平洋: '臺灣在太平洋的西側，東邊就是太平洋。',
  東海: '臺灣的北邊是東海。',
  南海: '臺灣的西南邊是南海。',
  中國: '中國在臺灣的西邊，中間隔著臺灣海峽。',
  日本: '日本在臺灣的東北邊。',
  菲律賓: '菲律賓在臺灣的南邊，中間隔著巴士海峽。',
  韓國: '韓國在東北亞，比臺灣更北邊。',
  澎湖群島: '澎湖群島在臺灣海峽中間。',
  金門: '金門在臺灣西邊，靠近中國沿岸。',
  馬祖: '馬祖在最北邊，靠近中國沿岸。',
  龜山島: '龜山島在宜蘭外海，可以賞鯨豚。',
  綠島: '綠島在臺東外海，是潛水勝地。',
  蘭嶼: '蘭嶼在臺東東南方外海，是達悟族居住的地方。',
  琉球嶼: '琉球嶼（小琉球）在高雄、屏東的西南外海。',
};
const GROUPS = [
  ['臺灣海峽', '巴士海峽', '太平洋', '東海', '南海'],
  ['中國', '日本', '菲律賓', '韓國'],
  ['澎湖群島', '金門', '馬祖', '龜山島', '綠島', '蘭嶼', '琉球嶼'],
];
const LETTERS = '甲乙丙丁戊己';

export function mapQuestion(rng) {
  const group = pick(rng, GROUPS);
  const target = pick(rng, group);
  const others = shuffle(rng, group.filter((x) => x !== target)).slice(0, 3);
  const names = shuffle(rng, [target, ...others]);
  const spots = names.map((name, i) => ({ label: LETTERS[i], name, at: MAP_SPOTS[name] }));
  return {
    id: makeId('boss-map'),
    grade: 5, subject: 'social', unit: '一', section: '1-1',
    type: 'choice', style: 'map',
    prompt: `迷路怪把地圖弄亂了！\n「${target}」在地圖上的哪一個位置？點一點地圖。`,
    map: { spots },
    options: spots.map((s) => s.label),
    answer: spots.find((s) => s.name === target).label,
    explanation: MAP_FACTS[target],
    difficulty: 2,
    tags: ['boss-map', 'map'],
  };
}

// 臺灣周邊示意圖（只畫相對位置）
export function mapSVG(spots = []) {
  const dots = spots.map((s) => `
    <g class="map-spot" data-label="${s.label}" style="cursor:pointer">
      <circle cx="${s.at[0]}" cy="${s.at[1]}" r="24" fill="#FFF8EE" stroke="#E07B45" stroke-width="4"/>
      <text x="${s.at[0]}" y="${s.at[1] + 9}" font-size="24" font-weight="800" text-anchor="middle" fill="#B5583A">${s.label}</text>
    </g>`).join('');
  return `<svg viewBox="0 0 600 450">
    <rect width="600" height="450" rx="18" fill="#CFE9F7"/>
    <path d="M0 0 H 130 Q 150 80 120 140 Q 150 200 110 260 Q 90 320 40 360 Q 20 380 0 380 Z" fill="#E9DCC0" stroke="#B9A57A" stroke-width="2"/>
    <path d="M150 0 Q 190 20 250 0 Z" fill="#E9DCC0" stroke="#B9A57A" stroke-width="2"/>
    <path d="M470 20 Q 520 40 590 30 L 600 0 L 450 0 Z M520 90 Q 560 100 600 90 L 600 70 Q 560 80 520 90 Z" fill="#E9DCC0" stroke="#B9A57A" stroke-width="2"/>
    <path d="M300 405 Q 340 395 380 410 Q 370 450 330 450 L 300 450 Z" fill="#E9DCC0" stroke="#B9A57A" stroke-width="2"/>
    <path d="M362 132 Q 392 140 384 188 Q 378 240 352 290 Q 336 320 322 300 Q 300 262 308 214 Q 318 160 362 132 Z" fill="#A8D5A2" stroke="#5E9E58" stroke-width="3"/>
    <text x="345" y="226" font-size="18" font-weight="800" text-anchor="middle" fill="#3E7A3A">臺灣</text>
    ${dots}
  </svg>`;
}
