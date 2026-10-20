// 角色美術：用 SVG 畫的學科貓（四腳側面、頭轉 3/4）和糊塗怪。
// 規格見設計規格書 11.1.1：細輪廓線用底色的深色、底色＋一層陰影＋一層亮部。

export const CATS = {
  momo: {
    name: '墨墨貓', subject: 'chinese', desc: '尾巴是一支毛筆',
    base: '#F3E6D3', outline: '#7A5C45', shade: '#DEC9AB', light: '#FFF9F0', accent: '#3B3B4F',
  },
  abacus: {
    name: '算盤貓', subject: 'math', desc: '尾巴上串著算盤珠',
    base: '#F6B26B', outline: '#9C5426', shade: '#E39550', light: '#FFD9AE', accent: '#7E57C2',
  },
  leaf: {
    name: '葉葉貓', subject: 'science', desc: '頭上長了一片葉子',
    base: '#D5DDE1', outline: '#5D6B73', shade: '#B6C4CB', light: '#F4F7F8', accent: '#5DBB6A',
  },
  explorer: {
    name: '探險貓', subject: 'social', desc: '戴著探險帽',
    base: '#CFA67E', outline: '#6E4B2E', shade: '#B48A63', light: '#EBD6C0', accent: '#8D6E4A',
  },
  bubble: {
    name: '泡泡貓', subject: 'english', desc: '會吹字母泡泡',
    base: '#FBFBFD', outline: '#8A8FA3', shade: '#E2E5EE', light: '#FFFFFF', accent: '#8EC9F5',
  },
  // 以下是要收集的特別貓（取得條件見 js/engine/rewards.js）
  brave: {
    name: '勇氣貓', desc: '綁著紅頭巾，不怕錯題',
    base: '#F4A261', outline: '#93461F', shade: '#DD8443', light: '#FFD3A8', accent: '#E5484D',
  },
  star: {
    name: '星星貓', desc: '額頭有一顆星星',
    base: '#5B6BB5', outline: '#2E3770', shade: '#4A5899', light: '#8D9AD8', accent: '#FFD54F',
  },
  king: {
    name: '魔王貓', desc: '打倒很多大魔王，披著紫色披風',
    base: '#3F3A4A', outline: '#1E1A26', shade: '#2F2A38', light: '#6B6478', accent: '#8E5BD6',
  },
  fishy: {
    name: '小魚乾貓', desc: '尾巴上叼著一條小魚乾',
    base: '#F7F2E8', outline: '#8C7A62', shade: '#E4DACB', light: '#FFFFFF', accent: '#6FB3E0',
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

function eyes(mood, ink) {
  if (mood === 'happy') {
    return `<path d="M151 79 q7 -9 14 0" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
            <path d="M184 78 q7 -10 15 0" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (mood === 'sleep') {
    return `<path d="M151 80 q7 5 14 0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M184 80 q7 5 15 0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  const big = mood === 'surprised' ? 1.25 : 1;
  const eye = (cx, cy, rx, ry) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * big}" ry="${ry * big}" fill="${ink}"/>
    <circle cx="${cx + 2.2}" cy="${cy - 3.2}" r="${2.8 * big}" fill="#fff"/>
    <circle cx="${cx - 2}" cy="${cy + 3}" r="${1.4 * big}" fill="#fff"/>`;
  return eye(158, 78, 6, 8) + eye(191, 78, 7, 9);
}

function mouth(mood, c) {
  if (mood === 'surprised') return `<ellipse cx="203" cy="100" rx="4" ry="5" fill="#B85C5C" stroke="${c.outline}" stroke-width="2"/>`;
  if (mood === 'happy') return `<path d="M197 93 q5 9 11 0" fill="#E9868F" stroke="${c.outline}" stroke-width="2" stroke-linejoin="round"/>`;
  return `<path d="M203 93 q-4 6 -9 2 M203 93 q3 6 8 2" fill="none" stroke="${c.outline}" stroke-width="2.2" stroke-linecap="round"/>`;
}

function accessory(id, c) {
  switch (id) {
    case 'momo': // 毛筆尾巴：尾巴尖端是沾墨的筆頭
      return `<path d="M28 46 C 18 36, 20 18, 30 10 C 40 18, 42 36, 32 46 Z" fill="${c.accent}" stroke="${c.outline}" stroke-width="2.5"/>
              <path d="M26 50 h10 v6 h-10 z" fill="#C89B5E" stroke="${c.outline}" stroke-width="2"/>`;
    case 'abacus': // 算盤珠
      return ['#7E57C2', '#4FB3BF', '#F06292'].map((col, i) => {
        const pts = [[44, 96], [30, 76], [28, 54]][i];
        return `<ellipse cx="${pts[0]}" cy="${pts[1]}" rx="9" ry="7" fill="${col}" stroke="${c.outline}" stroke-width="2"/>`;
      }).join('');
    case 'leaf':
      return `<path d="M170 30 C 160 6, 176 -4, 196 2 C 196 22, 186 34, 170 30 Z" fill="${c.accent}" stroke="#3E8A4A" stroke-width="2.5"/>
              <path d="M172 28 C 180 18, 186 12, 192 6" fill="none" stroke="#3E8A4A" stroke-width="2"/>`;
    case 'explorer':
      return `<path d="M128 44 Q 172 30 220 44 L 214 50 Q 172 40 132 50 Z" fill="${c.accent}" stroke="${c.outline}" stroke-width="2.5"/>
              <path d="M142 42 Q 146 10 174 8 Q 202 10 204 40 Q 172 32 142 42 Z" fill="#A9845C" stroke="${c.outline}" stroke-width="2.5"/>
              <path d="M144 36 Q 172 28 203 34 L 203 40 Q 172 33 143 42 Z" fill="#E5574F"/>`;
    case 'bubble':
      return `<circle cx="226" cy="40" r="11" fill="rgba(142,201,245,.35)" stroke="#5FA8DE" stroke-width="2"/>
              <text x="226" y="45" font-size="13" text-anchor="middle" fill="#3A7BB8" font-weight="700">A</text>`;
    case 'brave': // 紅頭巾
      return `<path d="M128 58 Q 172 44 218 60 L 216 70 Q 172 54 130 68 Z" fill="${c.accent}" stroke="#9E2A2E" stroke-width="2"/>
              <path d="M130 64 L 112 58 L 116 74 Z M131 66 L 114 76 L 124 82 Z" fill="${c.accent}" stroke="#9E2A2E" stroke-width="2" stroke-linejoin="round"/>`;
    case 'star': // 額頭的星星
      return `<path d="${starPath(176, 50, 9, 4)}" fill="${c.accent}" stroke="#C99A1F" stroke-width="1.5"/>`;
    case 'fishy': // 尾巴叼著小魚乾
      return `<path d="M30 56 q -14 -10 -4 -24 q 12 4 10 18 z" fill="${c.accent}" stroke="#3A7BB8" stroke-width="2"/>
              <path d="M22 30 l -8 -6 l 2 10 z" fill="${c.accent}" stroke="#3A7BB8" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="31" cy="42" r="1.8" fill="#24496B"/>`;
    default:
      return '';
  }
}

function starPath(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const TAIL_ACC = new Set(['momo', 'abacus', 'fishy']);

// 披風（魔王貓、進化後）
function cape(color, outline) {
  return `<g class="cape">
    <path d="M154 92 Q 118 70 72 88 Q 56 112 64 142 Q 88 128 110 134 Q 128 118 156 108 Z" fill="${color}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M150 96 Q 118 80 80 94" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
  </g>`;
}

function gearHat(id) {
  switch (id) {
    case 'party':
      return `<path d="M154 38 L 176 -6 L 196 36 Z" fill="#FF8FB1" stroke="#B5476B" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M161 24 L 189 22 M157 32 L 194 30" stroke="#FFE066" stroke-width="4"/>
              <circle cx="176" cy="-6" r="6" fill="#FFE066" stroke="#C99A1F" stroke-width="2"/>`;
    case 'beret':
      return `<ellipse cx="170" cy="36" rx="38" ry="13" fill="#E5484D" stroke="#9E2A2E" stroke-width="2.5"/>
              <path d="M168 24 l 4 -9" stroke="#9E2A2E" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown':
      return `<path d="M148 38 L 152 12 L 164 28 L 174 6 L 184 28 L 196 12 L 198 38 Z" fill="#FFD54F" stroke="#B8860B" stroke-width="2.5" stroke-linejoin="round"/>
              <circle cx="174" cy="30" r="4" fill="#E5574F"/>`;
    default: return '';
  }
}

function gearNeck(id) {
  switch (id) {
    case 'scarf':
      return `<path d="M136 108 Q 172 126 206 112 L 204 124 Q 170 138 134 120 Z" fill="#E5484D" stroke="#9E2A2E" stroke-width="2"/>
              <path d="M150 122 l -6 26 l 12 -2 l 2 -22 z" fill="#E5484D" stroke="#9E2A2E" stroke-width="2" stroke-linejoin="round"/>`;
    case 'bowtie':
      return `<path d="M172 120 L 154 110 L 154 132 Z M172 120 L 190 110 L 190 132 Z" fill="#7A2E3B" stroke="#4A1A24" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="172" cy="121" r="5" fill="#9E3B4C" stroke="#4A1A24" stroke-width="2"/>`;
    case 'bell':
      return `<path d="M138 112 Q 172 128 206 114" fill="none" stroke="#E5484D" stroke-width="6" stroke-linecap="round"/>
              <circle cx="172" cy="128" r="8" fill="#FFD54F" stroke="#B8860B" stroke-width="2"/>
              <path d="M168 130 h8" stroke="#B8860B" stroke-width="2"/>`;
    default: return '';
  }
}

function gearEyes(id) {
  switch (id) {
    case 'glasses':
      return `<circle cx="158" cy="78" r="12" fill="rgba(255,255,255,.15)" stroke="#3A2A22" stroke-width="2.5"/>
              <circle cx="192" cy="78" r="13" fill="rgba(255,255,255,.15)" stroke="#3A2A22" stroke-width="2.5"/>
              <path d="M170 78 q 5 -4 9 0" fill="none" stroke="#3A2A22" stroke-width="2.5"/>`;
    case 'shades':
      return `<path d="M144 70 h 28 q 0 18 -14 18 q -14 0 -14 -18 Z M178 70 h 30 q 0 19 -15 19 q -15 0 -15 -19 Z" fill="#222" stroke="#000" stroke-width="2"/>
              <path d="M172 72 h 6" stroke="#000" stroke-width="3"/>
              <path d="M150 74 l 6 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    default: return '';
  }
}

// 顯示名稱（進化後加「超級」）
export function catName(id, evolved = false) {
  const c = CATS[id] || CATS.abacus;
  return evolved ? `超級${c.name}` : c.name;
}

// evolved：Lv.5 進化後的外型（披風、星星光點、額頭星星）
// gear：{ hat, neck, eyes } 換裝配件
export function catSVG(id = 'abacus', { mood = 'normal', className = '', evolved = false, gear = {} } = {}) {
  const c = CATS[id] || CATS.abacus;
  const n = ++uid;
  const ink = '#3A2A22';
  const tailPath = 'M62 110 C 34 108, 22 86, 30 56';
  return `
<svg class="cat-svg ${className}" viewBox="0 0 240 180" role="img" aria-label="${c.name}">
  <defs>
    <clipPath id="cb${n}"><ellipse cx="112" cy="112" rx="58" ry="38"/></clipPath>
    <clipPath id="ch${n}"><circle cx="172" cy="76" r="46"/></clipPath>
  </defs>
  <ellipse cx="120" cy="170" rx="74" ry="8" fill="rgba(80,50,30,.16)"/>
  <g class="cat-tail">
    <path d="${tailPath}" fill="none" stroke="${c.outline}" stroke-width="17" stroke-linecap="round"/>
    <path d="${tailPath}" fill="none" stroke="${c.base}" stroke-width="11" stroke-linecap="round"/>
    ${TAIL_ACC.has(id) ? accessory(id, c) : ''}
  </g>
  <g class="cat-legs-far">
    <rect x="72" y="120" width="18" height="42" rx="9" fill="${c.shade}" stroke="${c.outline}" stroke-width="2.5"/>
    <rect x="140" y="120" width="18" height="42" rx="9" fill="${c.shade}" stroke="${c.outline}" stroke-width="2.5"/>
  </g>
  <g class="cat-body">
    <ellipse cx="112" cy="112" rx="58" ry="38" fill="${c.base}" stroke="${c.outline}" stroke-width="3"/>
    <g clip-path="url(#cb${n})">
      <ellipse cx="112" cy="140" rx="62" ry="20" fill="${c.shade}"/>
      <ellipse cx="98" cy="88" rx="32" ry="9" fill="${c.light}" opacity=".8"/>
    </g>
    <ellipse cx="112" cy="112" rx="58" ry="38" fill="none" stroke="${c.outline}" stroke-width="3"/>
  </g>
  ${id === 'king' || evolved ? cape(c.accent, c.outline) : ''}
  <g class="cat-legs-near">
    <rect x="86" y="124" width="20" height="44" rx="10" fill="${c.base}" stroke="${c.outline}" stroke-width="2.5"/>
    <rect x="154" y="124" width="20" height="44" rx="10" fill="${c.base}" stroke="${c.outline}" stroke-width="2.5"/>
    <ellipse cx="96" cy="162" rx="7" ry="3.5" fill="${c.light}"/>
    <ellipse cx="164" cy="162" rx="7" ry="3.5" fill="${c.light}"/>
  </g>
  <g class="cat-head">
    <path d="M136 50 L 138 10 L 168 36 Z" fill="${c.base}" stroke="${c.outline}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M142 42 L 143 21 L 159 36 Z" fill="#F4A9B5"/>
    <path d="M184 34 L 210 4 L 216 46 Z" fill="${c.base}" stroke="${c.outline}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M192 34 L 207 16 L 210 40 Z" fill="#F4A9B5"/>
    <circle cx="172" cy="76" r="46" fill="${c.base}"/>
    <g clip-path="url(#ch${n})">
      <ellipse cx="176" cy="114" rx="44" ry="18" fill="${c.shade}"/>
      <ellipse cx="160" cy="46" rx="22" ry="8" fill="${c.light}" opacity=".85"/>
    </g>
    <circle cx="172" cy="76" r="46" fill="none" stroke="${c.outline}" stroke-width="3"/>
    ${eyes(mood, ink)}
    <ellipse cx="146" cy="94" rx="8" ry="4.5" fill="#F28B9B" opacity=".5"/>
    <ellipse cx="208" cy="96" rx="5.5" ry="3.8" fill="#F28B9B" opacity=".5"/>
    <path d="M199 87 q4 -4 8 0 q-4 5 -8 0 z" fill="#F28B9B" stroke="${c.outline}" stroke-width="1.5" stroke-linejoin="round"/>
    ${mouth(mood, c)}
    <path d="M214 92 L 236 88 M214 98 L 234 101" stroke="${c.outline}" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>
    ${!TAIL_ACC.has(id) && !(gear.hat && (id === 'explorer' || id === 'leaf')) ? accessory(id, c) : ''}
    ${evolved && id !== 'star' ? `<path d="${starPath(174, 50, 7, 3)}" fill="#FFD54F" stroke="#C99A1F" stroke-width="1.2"/>` : ''}
    ${gearNeck(gear.neck)}
    ${gearEyes(gear.eyes)}
    ${gearHat(gear.hat)}
  </g>
  ${evolved ? `<g class="sparkles"><path d="${starPath(24, 120, 7, 2.5)}" fill="#FFE066"/><path d="${starPath(226, 140, 6, 2)}" fill="#FFE066"/><path d="${starPath(120, 40, 5, 2)}" fill="#FFE066"/></g>` : ''}
  ${mood === 'sleep' ? `<text x="214" y="30" font-size="22" fill="${c.outline}" font-weight="700">z</text>` : ''}
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
  <path d="M28 150 C 16 110, 38 52, 90 50 C 142 52, 164 110, 152 150 Q 122 162 90 157 Q 58 162 28 150 Z" fill="${fill}" stroke="${dark}" stroke-width="3.5"/>
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
