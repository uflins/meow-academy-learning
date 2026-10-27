// 角色美術：用 SVG 畫的學科貓（四腳側面、頭轉 3/4）和糊塗怪。
// 貓咪是「方案一 絨毛玩偶」風（2026/10/21 家長選定）：大頭短腿、低位大眼、
// 頭身耳朵連成一條外輪廓（用底色的深色）、柔和漸層上色、臉頰胸口有毛流、每隻有自己的花紋。

// pattern：tabby 虎斑、ink 耳朵腳掌沾墨、socks 白襪子、calico 三花、cap 背上和頭頂一塊色、none 純色
// bib：嘴邊和胸口白毛
export const CATS = {
  momo: {
    name: '墨墨貓', subject: 'chinese', desc: '尾巴是一支毛筆',
    base: '#F6EDE0', shade: '#E3D3BE', light: '#FFFFFF', outline: '#8A6E58', stripe: '#4A4352', white: '#FFFFFF', iris: '#5A6E9A', accent: '#3B3B4F', pattern: 'ink',
  },
  abacus: {
    name: '算盤貓', subject: 'math', desc: '尾巴上串著算盤珠',
    base: '#F8BC7E', shade: '#EA9A5C', light: '#FFE6C7', outline: '#A35A2D', stripe: '#E2884A', white: '#FFF6EA', iris: '#9A6A2E', accent: '#7E57C2', pattern: 'tabby', bib: true,
  },
  leaf: {
    name: '葉葉貓', subject: 'science', desc: '頭上長了一片葉子',
    base: '#C9D6DD', shade: '#A9BAC4', light: '#EEF4F7', outline: '#56656E', stripe: '#9AAAB4', white: '#FFFFFF', iris: '#6E9A4A', accent: '#6CC77A', pattern: 'socks', bib: true,
  },
  explorer: {
    name: '探險貓', subject: 'social', desc: '戴著探險帽',
    base: '#D3AC86', shade: '#B88E68', light: '#F1DCC6', outline: '#6E4B2E', stripe: '#A87A52', white: '#FFF4E8', iris: '#5E8A54', accent: '#8D6E4A', pattern: 'tabby', bib: true,
  },
  bubble: {
    name: '泡泡貓', subject: 'english', desc: '會吹字母泡泡',
    base: '#FBFBFD', shade: '#DDE2EE', light: '#FFFFFF', outline: '#858BA3', stripe: '#C9D3EA', white: '#FFFFFF', iris: '#4FA3E0', accent: '#8EC9F5', pattern: 'none',
  },
  // 以下是要收集的特別貓（取得條件見 js/engine/rewards.js）
  brave: {
    name: '勇氣貓', desc: '綁著紅頭巾，不怕錯題',
    base: '#FFF8F0', shade: '#EADBCB', light: '#FFFFFF', outline: '#8A5A3C', stripe: '#F2A35E', stripe2: '#4A3B36', white: '#FFFFFF', iris: '#B07A2E', accent: '#E5484D', pattern: 'calico',
  },
  star: {
    name: '星星貓', desc: '額頭有一顆星星',
    base: '#6A7CC6', shade: '#5162A8', light: '#9FAEE6', outline: '#2E3770', stripe: '#5566AE', white: '#E8ECFF', iris: '#E0B43A', accent: '#FFD54F', pattern: 'none',
  },
  king: {
    name: '魔王貓', desc: '打倒很多大魔王，披著紫色披風',
    base: '#4A4458', shade: '#363142', light: '#76708A', outline: '#1E1A26', stripe: '#363142', white: '#6E6782', iris: '#F2C14E', accent: '#8E5BD6', pattern: 'none', bib: true,
  },
  fishy: {
    name: '小魚乾貓', desc: '尾巴上叼著一條小魚乾',
    base: '#FBF7EF', shade: '#E8DFCF', light: '#FFFFFF', outline: '#7E7468', stripe: '#9BAEC2', white: '#FFFFFF', iris: '#4E8FC0', accent: '#6FB3E0', pattern: 'cap',
  },
};

// 換裝配件（價格見 js/engine/rewards.js）
export const GEAR = {
  party: { name: '派對帽', slot: 'hat', icon: '🎉' },
  beret: { name: '畫家帽', slot: 'hat', icon: '🎨' },
  crown: { name: '小皇冠', slot: 'hat', icon: '👑' },
  scarf: { name: '紅圍巾', slot: 'neck', icon: '🧣' },
  bowtie: { name: '紳士領結', slot: 'neck', icon: '🎀' },
  bell: { name: '鈴鐺項圈', slot: 'neck', icon: '🔔' },
  glasses: { name: '圓眼鏡', slot: 'eyes', icon: '👓' },
  shades: { name: '酷酷墨鏡', slot: 'eyes', icon: '🕶️' },
};

export const SUBJECT_CAT = { chinese: 'momo', math: 'abacus', science: 'leaf', social: 'explorer', english: 'bubble' };

let uid = 0;
const INK = '#3A2A22';

// ── 形狀（240×180，面向右）──
const SHAPE = {
  tail: 'M66 126 C 40 128, 24 110, 28 86 C 31 68, 44 58, 38 40',
  body: 'M58 116 C 58 94, 80 80, 112 79 C 142 78, 168 92, 170 114 C 172 138, 146 152, 112 153 C 80 154, 58 140, 58 116 Z',
  // 胸口毛（輪廓有鋸齒）
  chest: 'M146 108 C 160 108, 172 114, 174 124 Q 180 127 176 131 Q 179 137 173 139 Q 175 145 166 146 C 156 150, 146 146, 142 136 Z',
  // 頭：下緣兩頰有毛流
  head: `M174 35 C 205 35, 227 55, 227 81 C 227 96, 222 106, 214 112
         Q 221 114 224 112 Q 220 120 210 119
         C 199 126, 187 127, 174 127 C 160 127, 147 123, 137 116
         Q 132 121 125 119 Q 129 115 128 111
         Q 121 111 118 106 Q 123 103 123 98
         C 121 92, 121 87, 121 81 C 121 55, 143 35, 174 35 Z`,
  earL: 'M128 68 C 122 46, 122 28, 130 18 C 137 14, 150 26, 164 40 Z',
  earR: 'M186 38 C 198 26, 210 15, 218 16 C 225 22, 226 44, 223 64 Z',
  earLin: 'M134 52 C 131 40, 131 30, 135 25 C 140 25, 148 33, 154 40 Z',
  earRin: 'M196 38 C 203 31, 210 25, 214 25 C 218 30, 218 40, 216 50 Z',
  // [x, y, 寬, 高]
  legsFar: [[68, 128, 22, 35], [150, 128, 22, 34]],
  legsNear: [[82, 130, 25, 36], [134, 130, 25, 36]],
};
const EYE_L = [156, 90];
const EYE_R = [198, 89];
const MOUTH = [180, 105];
const LW = 3; // 外輪廓看得到的寬度

function starPath(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// ── 表情：開心、驚訝（咦？）、努力、得意、睡覺，加上平常 ──
function eyes(mood, c, n) {
  if (mood === 'happy') {
    return [EYE_L, EYE_R].map(([x, y]) => `<path d="M${x - 9} ${y + 2} q9 -12 18 0" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>`).join('');
  }
  if (mood === 'sleep') {
    return [EYE_L, EYE_R].map(([x, y]) => `<path d="M${x - 9} ${y} q9 7 18 0" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/>`).join('');
  }
  if (mood === 'effort') { // ＞ ＜
    const [lx, ly] = EYE_L, [rx, ry] = EYE_R;
    return `<path d="M${lx - 7} ${ly - 7} L${lx + 6} ${ly} L${lx - 7} ${ly + 7}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M${rx + 6} ${ry - 7} L${rx - 6} ${ry} L${rx + 6} ${ry + 7}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const big = mood === 'surprised' ? 1.18 : 1;
  const one = ([x, y], rx, ry) => {
    rx *= big; ry *= big;
    let s = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#eye${n})"/>
      <circle cx="${x + rx * 0.32}" cy="${y - ry * 0.38}" r="${rx * 0.42}" fill="#fff"/>
      <circle cx="${x - rx * 0.38}" cy="${y + ry * 0.36}" r="${rx * 0.2}" fill="#fff" opacity=".9"/>`;
    if (mood === 'proud') { // 得意：上眼皮蓋一半
      s += `<path d="M${x - rx - 2} ${y - ry - 2} H${x + rx + 2} V${y - 1} Q${x} ${y - 5} ${x - rx - 2} ${y + 1} Z" fill="url(#hd${n})"/>
            <path d="M${x - rx - 1} ${y + 1} Q${x} ${y - 5} ${x + rx + 1} ${y - 1}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    return s;
  };
  return one(EYE_L, 10, 12.5) + one(EYE_R, 8.6, 12);
}

function mouth(mood, c) {
  const [x, y] = MOUTH;
  if (mood === 'surprised') return `<ellipse cx="${x}" cy="${y + 6}" rx="4.2" ry="5.2" fill="#C2606A" stroke="${c.outline}" stroke-width="2"/>`;
  if (mood === 'happy' || mood === 'proud') return `<path d="M${x - 7} ${y + 1} q7 11 14 0 z" fill="#EE8C98" stroke="${c.outline}" stroke-width="2" stroke-linejoin="round"/>`;
  if (mood === 'effort') return `<path d="M${x - 6} ${y + 5} h12" stroke="${c.outline}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `<path d="M${x - 7} ${y + 1} q3.5 5 7 0 q3.5 5 7 0" fill="none" stroke="${c.outline}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function moodExtras(mood, c) {
  if (mood === 'sleep') return `<text x="214" y="30" font-size="22" fill="${c.outline}" font-weight="700">z</text><text x="228" y="16" font-size="15" fill="${c.outline}" font-weight="700">z</text>`;
  if (mood === 'effort') return `<path d="M128 60 q -6 9 0 12 q 6 -3 0 -12 z" fill="#8EC9F5" stroke="#4E90C8" stroke-width="1.5"/>`;
  return '';
}

// ── 學科配件 ──
function tailAccessory(id, c) {
  switch (id) {
    case 'momo': // 毛筆尾巴：尾巴尖端是沾墨的筆頭
      return `<path d="M38 44 C 26 34, 28 14, 38 4 C 48 14, 50 34, 38 44 Z" fill="${c.accent}" stroke="#24242F" stroke-width="2.4"/>
              <path d="M33 30 C 35 22, 37 16, 38 10" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/>
              <rect x="31" y="42" width="14" height="8" rx="2" fill="#C89B5E" stroke="#7A5C45" stroke-width="2"/>`;
    case 'abacus': // 算盤珠
      return [['#8E6AD8', 40, 118], ['#4FB3BF', 28, 96], ['#F27BA0', 30, 72]].map(([col, x, y]) =>
        `<ellipse cx="${x}" cy="${y}" rx="11" ry="7.5" fill="${col}" stroke="${c.outline}" stroke-width="2"/>
         <ellipse cx="${x - 3}" cy="${y - 2.5}" rx="4" ry="2" fill="#fff" opacity=".5"/>`).join('');
    case 'fishy': // 尾巴叼著小魚乾
      return `<ellipse cx="38" cy="30" rx="13" ry="7.5" fill="${c.accent}" stroke="#3A7BB8" stroke-width="2"/>
              <path d="M26 30 L 13 21 L 15 39 Z" fill="${c.accent}" stroke="#3A7BB8" stroke-width="2" stroke-linejoin="round"/>
              <path d="M32 26 q 3 4 0 8" fill="none" stroke="#3A7BB8" stroke-width="1.5"/>
              <circle cx="44" cy="28" r="2" fill="#24496B"/>`;
    default: return '';
  }
}

function headAccessory(id, c) {
  switch (id) {
    case 'leaf':
      return `<path d="M178 38 C 168 14, 184 2, 206 6 C 206 26, 196 40, 178 38 Z" fill="${c.accent}" stroke="#3E8A4A" stroke-width="2.5"/>
              <path d="M180 36 C 188 26, 194 18, 202 10" fill="none" stroke="#3E8A4A" stroke-width="2" stroke-linecap="round"/>
              <path d="M176 40 q -4 -6 -2 -12" fill="none" stroke="#3E8A4A" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'explorer':
      return `<path d="M126 46 Q 174 30 226 46 L 220 54 Q 174 42 132 54 Z" fill="${c.accent}" stroke="${c.outline}" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M142 44 Q 146 10 176 8 Q 206 10 208 42 Q 174 33 142 44 Z" fill="#B08A60" stroke="${c.outline}" stroke-width="2.5"/>
              <path d="M144 37 Q 174 29 207 35 L 207 42 Q 174 34 143 43 Z" fill="#E5574F"/>`;
    case 'bubble': // 字母泡泡
      return `<circle cx="227" cy="46" r="11" fill="rgba(142,201,245,.35)" stroke="#5FA8DE" stroke-width="2"/>
              <text x="227" y="51" font-size="13" text-anchor="middle" fill="#3A7BB8" font-weight="700">A</text>
              <circle cx="233" cy="24" r="5" fill="rgba(142,201,245,.35)" stroke="#5FA8DE" stroke-width="1.6"/>
              <circle cx="231.5" cy="22.5" r="1.4" fill="#fff"/>`;
    case 'brave': // 紅頭巾，結打在後腦
      return `<path d="M126 62 Q 174 44 225 60 L 223 71 Q 174 55 128 73 Z" fill="${c.accent}" stroke="#9E2A2E" stroke-width="2"/>
              <path d="M129 66 L 108 58 L 112 78 Z M130 69 L 111 84 L 124 88 Z" fill="${c.accent}" stroke="#9E2A2E" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="160" cy="58" r="2" fill="#fff" opacity=".8"/><circle cx="196" cy="56" r="2" fill="#fff" opacity=".8"/>`;
    case 'star': // 額頭的星星
      return `<path d="${starPath(176, 52, 9, 4)}" fill="${c.accent}" stroke="#C99A1F" stroke-width="1.5"/>`;
    default: return '';
  }
}
const TAIL_ACC = new Set(['momo', 'abacus', 'fishy']);

// 披風（魔王貓、進化後）：披在背上
function cape(color, outline) {
  return `<g class="cape">
    <path d="M156 98 Q 122 70 76 82 Q 54 102 60 140 Q 84 128 106 134 Q 126 116 158 108 Z" fill="${color}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M150 94 Q 120 78 82 88" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
  </g>`;
}

// ── 換裝 ──
function gearHat(id) {
  switch (id) {
    case 'party':
      return `<path d="M154 42 L 178 2 L 199 40 Z" fill="#FF8FB1" stroke="#B5476B" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M163 26 L 191 24 M158 35 L 196 33" stroke="#FFE066" stroke-width="4"/>
              <circle cx="178" cy="5" r="5" fill="#FFE066" stroke="#C99A1F" stroke-width="2"/>`;
    case 'beret':
      return `<ellipse cx="172" cy="40" rx="40" ry="13" fill="#E5484D" stroke="#9E2A2E" stroke-width="2.5"/>
              <path d="M170 28 l 4 -9" stroke="#9E2A2E" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown':
      return `<path d="M150 42 L 154 15 L 166 31 L 176 9 L 186 31 L 198 15 L 200 42 Z" fill="#FFD54F" stroke="#B8860B" stroke-width="2.5" stroke-linejoin="round"/>
              <circle cx="176" cy="34" r="4" fill="#E5574F"/>`;
    default: return '';
  }
}

function gearNeck(id) {
  switch (id) {
    case 'scarf':
      return `<path d="M136 120 Q 176 138 214 118 L 212 130 Q 174 150 136 132 Z" fill="#E5484D" stroke="#9E2A2E" stroke-width="2"/>
              <path d="M150 134 l -6 24 l 12 -1 l 3 -21 z" fill="#E5484D" stroke="#9E2A2E" stroke-width="2" stroke-linejoin="round"/>`;
    case 'bowtie':
      return `<path d="M178 134 L 160 124 L 160 144 Z M178 134 L 196 124 L 196 144 Z" fill="#7A2E3B" stroke="#4A1A24" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="178" cy="134" r="5" fill="#9E3B4C" stroke="#4A1A24" stroke-width="2"/>`;
    case 'bell':
      return `<path d="M140 122 Q 176 138 212 120" fill="none" stroke="#E5484D" stroke-width="6" stroke-linecap="round"/>
              <circle cx="178" cy="138" r="8" fill="#FFD54F" stroke="#B8860B" stroke-width="2"/>
              <path d="M174 140 h8" stroke="#B8860B" stroke-width="2"/>`;
    default: return '';
  }
}

function gearEyes(id) {
  const [lx, ly] = EYE_L, [rx, ry] = EYE_R;
  switch (id) {
    case 'glasses':
      return `<circle cx="${lx}" cy="${ly}" r="14" fill="rgba(255,255,255,.15)" stroke="#3A2A22" stroke-width="2.5"/>
              <circle cx="${rx}" cy="${ry}" r="13" fill="rgba(255,255,255,.15)" stroke="#3A2A22" stroke-width="2.5"/>
              <path d="M170 89 q 7 -5 15 0 M142 88 L 128 84" fill="none" stroke="#3A2A22" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'shades':
      return `<path d="M141 80 h30 q0 20 -15 20 q-15 0 -15 -20 Z M184 79 h29 q0 19 -14.5 19 q-14.5 0 -14.5 -19 Z" fill="#222" stroke="#000" stroke-width="2"/>
              <path d="M171 82 h13 M141 82 L 128 80" stroke="#000" stroke-width="3" stroke-linecap="round"/>
              <path d="M147 85 l 8 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    default: return '';
  }
}

// 顯示名稱（進化後加「超級」）
export function catName(id, evolved = false) {
  const c = CATS[id] || CATS.abacus;
  return evolved ? `超級${c.name}` : c.name;
}

function legRect([x, y, w, h], fill, stroke, sw) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
}

// evolved：Lv.5 進化後的外型（披風、星星光點、額頭星星）
// gear：{ hat, neck, eyes } 換裝配件
// mood：normal、happy、surprised、effort、proud、sleep
export function catSVG(id = 'abacus', { mood = 'normal', className = '', evolved = false, gear = {} } = {}) {
  const c = CATS[id] || CATS.abacus;
  const n = ++uid;
  const S = SHAPE;
  const isInk = c.pattern === 'ink';
  const earFill = isInk ? c.stripe : (c.pattern === 'cap' ? c.stripe : `url(#hd${n})`);
  const pawFill = isInk ? c.stripe : (c.pattern === 'socks' ? c.white : null);

  // 漸層用畫面座標，讓眼皮、胸毛等小零件的顏色和頭、身體接得起來
  const defs = `
    <radialGradient id="bd${n}" gradientUnits="userSpaceOnUse" cx="106" cy="99" r="82"><stop offset="0" stop-color="${c.light}"/><stop offset=".5" stop-color="${c.base}"/><stop offset="1" stop-color="${c.shade}"/></radialGradient>
    <radialGradient id="hd${n}" gradientUnits="userSpaceOnUse" cx="164" cy="63" r="80"><stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.shade}"/></radialGradient>
    <linearGradient id="eye${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1E1A"/><stop offset=".55" stop-color="#2A1E1A"/><stop offset="1" stop-color="${c.iris}"/></linearGradient>
    <linearGradient id="ein${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B3C0"/><stop offset="1" stop-color="#F4C9CF"/></linearGradient>
    <clipPath id="cb${n}"><path d="${S.body}"/></clipPath>
    <clipPath id="ch${n}"><path d="${S.head}"/></clipPath>`;

  // 尾巴：外框＋底色＋花紋
  const tailColor = c.pattern === 'cap' ? c.stripe : c.base;
  let tail = `<path d="${S.tail}" fill="none" stroke="${c.outline}" stroke-width="${16 + LW * 2}" stroke-linecap="round"/>
              <path d="${S.tail}" fill="none" stroke="${tailColor}" stroke-width="16" stroke-linecap="round"/>`;
  if (c.pattern === 'tabby') tail += `<path d="${S.tail}" pathLength="100" fill="none" stroke="${c.stripe}" stroke-width="16" stroke-dasharray="7 13" stroke-dashoffset="-6"/>`;
  if (c.pattern === 'calico') tail += `<path d="${S.tail}" pathLength="100" fill="none" stroke="${c.stripe}" stroke-width="16" stroke-dasharray="30 70" stroke-dashoffset="-10"/>`;
  tail += `<path d="${S.tail}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".28" transform="translate(3 -2)"/>`;
  if (TAIL_ACC.has(id)) tail += tailAccessory(id, c);

  const farLegs = S.legsFar.map((r) => legRect(r, c.shade, c.outline, LW)).join('');

  // 外輪廓：耳朵、頭、身體、胸毛、前面兩隻腳合成一條線
  const outline = [S.earL, S.earR, S.body, S.chest, S.head]
    .map((d) => `<path d="${d}" fill="${c.outline}" stroke="${c.outline}" stroke-width="${LW * 2}" stroke-linejoin="round"/>`).join('')
    + S.legsNear.map((r) => legRect(r, c.outline, c.outline, LW * 2)).join('');

  // 前面兩隻腳（在身體後面，只露出下半段）
  const nearLegs = S.legsNear.map((r) => {
    let s = legRect(r, c.base) + `<rect x="${r[0]}" y="${r[1] + r[3] - 9}" width="${r[2]}" height="9" rx="4.5" fill="${c.shade}" opacity=".5"/>`;
    if (pawFill) {
      s += `<rect x="${r[0]}" y="${r[1] + r[3] - 14}" width="${r[2]}" height="14" rx="${r[2] / 2}" fill="${pawFill}"/>
            <rect x="${r[0]}" y="${r[1] + r[3] - 14}" width="${r[2]}" height="8" fill="${pawFill}"/>`;
    }
    const by = r[1] + r[3];
    return s + `<path d="M${r[0] + r[2] * 0.36} ${by - 6} v4 M${r[0] + r[2] * 0.64} ${by - 6} v4" stroke="${isInk ? '#fff' : c.outline}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`;
  }).join('');

  // 身體
  let bodyIn = '';
  if (c.pattern === 'tabby') {
    bodyIn += [[86, 80, 82, 98], [104, 79, 102, 100], [122, 80, 122, 98]].map(([x1, y1, x2, y2]) =>
      `<path d="M${x1} ${y1 - 4} Q ${x1 - 4} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${c.stripe}" stroke-width="6" stroke-linecap="round" fill="none"/>`).join('');
  }
  if (c.pattern === 'calico') {
    bodyIn += `<ellipse cx="84" cy="96" rx="26" ry="20" fill="${c.stripe}"/><ellipse cx="128" cy="86" rx="18" ry="12" fill="${c.stripe2}"/>`;
  }
  if (c.pattern === 'cap') bodyIn += `<ellipse cx="104" cy="82" rx="54" ry="22" fill="${c.stripe}"/>`;
  if (c.bib) bodyIn += `<ellipse cx="158" cy="148" rx="20" ry="12" fill="${c.white}" opacity=".9"/>`;
  bodyIn += `<ellipse cx="160" cy="112" rx="30" ry="11" fill="${c.shade}" opacity=".55"/>`; // 頭在身上的影子
  const body = `<path d="${S.body}" fill="url(#bd${n})"/><g clip-path="url(#cb${n})">${bodyIn}</g>
    <path d="M78 92 Q 96 82 118 82" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".4"/>
    <path d="M74 142 C 72 124, 90 112, 108 118" fill="none" stroke="${c.outline}" stroke-width="2" stroke-linecap="round" opacity=".35"/>
    <path d="${S.chest}" fill="${c.bib ? c.white : `url(#bd${n})`}"/>`;

  // 耳朵（畫在頭前面，耳根和頭融在一起）
  const ears = `<path d="${S.earL}" fill="${earFill}"/><path d="${S.earR}" fill="${earFill}"/>
    <path d="${S.earLin}" fill="url(#ein${n})"/><path d="${S.earRin}" fill="url(#ein${n})"/>
    <path d="M140 46 l -4 -9 M145 44 l -2 -10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M206 44 l 3 -9 M211 46 l 3 -8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;

  // 頭
  let headIn = '';
  if (c.pattern === 'tabby') {
    headIn += `<path d="M168 36 q 2 8 0 16 M178 35 q 0 9 0 18 M188 37 q -2 8 0 15" stroke="${c.stripe}" stroke-width="4.5" stroke-linecap="round" fill="none"/>
               <path d="M122 84 q 8 2 14 -1 M122 94 q 7 2 12 0" stroke="${c.stripe}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  }
  if (c.pattern === 'calico') headIn += `<ellipse cx="136" cy="62" rx="26" ry="30" fill="${c.stripe}"/><ellipse cx="214" cy="52" rx="16" ry="20" fill="${c.stripe2}"/>`;
  if (c.pattern === 'cap') headIn += `<path d="M110 30 H 240 V 58 Q 200 52 176 66 Q 150 52 110 66 Z" fill="${c.stripe}"/>`;
  headIn += `<ellipse cx="160" cy="50" rx="30" ry="10" fill="${c.light}" opacity=".5"/>`;
  if (c.bib) headIn += `<ellipse cx="184" cy="114" rx="30" ry="18" fill="${c.white}"/>`;
  const head = `<path d="${S.head}" fill="url(#hd${n})"/><g clip-path="url(#ch${n})">${headIn}</g>`;

  const face = eyes(mood, c, n)
    + `<ellipse cx="146" cy="107" rx="10" ry="5.5" fill="#F58FA0" opacity="${mood === 'happy' || mood === 'effort' ? '.65' : '.45'}"/>
       <ellipse cx="210" cy="106" rx="7" ry="4.5" fill="#F58FA0" opacity="${mood === 'happy' || mood === 'effort' ? '.65' : '.45'}"/>
       <path d="M175 101 q 5 -4 10 0 q -5 6 -10 0 z" fill="#F08A9A" stroke="${c.outline}" stroke-width="1.6" stroke-linejoin="round"/>`
    + mouth(mood, c)
    + `<path d="M214 103 L 236 99 M214 109 L 234 113" stroke="${c.outline}" stroke-width="1.5" stroke-linecap="round" opacity=".45"/>`;

  const hideHeadAcc = gear.hat && (id === 'explorer' || id === 'leaf');
  const headAcc = TAIL_ACC.has(id) || hideHeadAcc ? '' : headAccessory(id, c);
  const evoStar = evolved && id !== 'star' ? `<path d="${starPath(174, 62, 7, 3)}" fill="#FFD54F" stroke="#C99A1F" stroke-width="1.2"/>` : '';

  return `
<svg class="cat-svg ${className}" viewBox="0 0 240 180" role="img" aria-label="${c.name}">
  <defs>${defs}</defs>
  <ellipse cx="118" cy="168" rx="72" ry="7" fill="rgba(80,50,30,.15)"/>
  <g class="cat-tail">${tail}</g>
  <g class="cat-legs-far">${farLegs}</g>
  ${outline}
  <g class="cat-legs-near">${nearLegs}</g>
  <g class="cat-body">${body}</g>
  ${id === 'king' || evolved ? cape(c.accent, c.outline) : ''}
  <g class="cat-head">
    ${ears}${head}${face}${headAcc}${evoStar}
    ${gearNeck(gear.neck)}
    ${gearEyes(gear.eyes)}
    ${gearHat(gear.hat)}
    ${moodExtras(mood, c)}
  </g>
  ${evolved ? `<g class="sparkles"><path d="${starPath(18, 120, 7, 2.5)}" fill="#FFE066"/><path d="${starPath(228, 146, 6, 2)}" fill="#FFE066"/><path d="${starPath(100, 40, 5, 2)}" fill="#FFE066"/></g>` : ''}
</svg>`;
}

// 糊塗怪：圓軟的史萊姆，頭上冒問號
export const MONSTER_COLORS = {
  chinese: ['#A8DCA0', '#4E8F55'],
  math: ['#FFB199', '#B5583A'],
  science: ['#FFE08A', '#B08A1E'],
  social: ['#9ED3F2', '#3A7EAA'],
  english: ['#CDB8F0', '#7559A8'],
};

export function monsterSVG(subject = 'math', { boss = false, mood = 'normal', className = '' } = {}) {
  const [fill, dark] = MONSTER_COLORS[subject] || MONSTER_COLORS.math;
  const n = ++uid;
  const eyesSvg = mood === 'dizzy'
    ? `<path d="M64 94 l12 12 M76 94 l-12 12 M104 94 l12 12 M116 94 l-12 12" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`
    : `<circle cx="70" cy="100" r="11" fill="#fff" stroke="${dark}" stroke-width="2.5"/><circle cx="73" cy="102" r="5.5" fill="#33261F"/><circle cx="75" cy="99" r="2" fill="#fff"/>
       <circle cx="110" cy="100" r="11" fill="#fff" stroke="${dark}" stroke-width="2.5"/><circle cx="113" cy="102" r="5.5" fill="#33261F"/><circle cx="115" cy="99" r="2" fill="#fff"/>`;
  const crown = boss
    ? `<path d="M62 52 L 70 26 L 84 44 L 92 20 L 100 44 L 114 26 L 120 52 Z" fill="#FFD54F" stroke="#B8860B" stroke-width="2.5" stroke-linejoin="round"/>
       <circle cx="92" cy="38" r="4" fill="#E5574F"/>`
    : '';
  return `
<svg class="monster-svg ${boss ? 'is-boss' : ''} ${className}" viewBox="0 0 180 170" role="img" aria-label="糊塗怪">
  <ellipse cx="90" cy="160" rx="62" ry="8" fill="rgba(60,40,30,.16)"/>
  <defs><radialGradient id="mg${n}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity=".22"/></radialGradient></defs>
  <path d="M28 150 C 16 110, 38 52, 90 50 C 142 52, 164 110, 152 150 Q 122 162 90 157 Q 58 162 28 150 Z" fill="${fill}" stroke="${dark}" stroke-width="3"/>
  <path d="M28 150 C 16 110, 38 52, 90 50 C 142 52, 164 110, 152 150 Q 122 162 90 157 Q 58 162 28 150 Z" fill="url(#mg${n})"/>
  <ellipse cx="62" cy="80" rx="15" ry="9" fill="#fff" opacity=".55" transform="rotate(-25 62 80)"/>
  ${eyesSvg}
  <path d="M78 126 q6 6 12 0 q6 6 12 0" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="54" cy="118" rx="8" ry="4.5" fill="#F28B9B" opacity=".45"/>
  <ellipse cx="126" cy="118" rx="8" ry="4.5" fill="#F28B9B" opacity=".45"/>
  ${crown}
  <text class="monster-q" x="${boss ? 140 : 128}" y="${boss ? 40 : 46}" font-size="34" font-weight="900" fill="${dark}">?</text>
</svg>`;
}

// 頭像：玩家選自己的頭像
export const AVATARS = ['🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐯', '🐨', '🐸', '🐧', '🦄', '🐹'];

// 一年級的圖片密碼
export const PICTURE_KEYS = ['🐱', '🐟', '⭐', '🍎', '🌈', '🚗'];
