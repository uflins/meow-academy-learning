// 五年級數學出題器用的繪圖與幾何工具。只產生 SVG 字串，不用瀏覽器 API（Node 也能跑）。
// 規則：根元素只寫 viewBox；顏色用實色；文字以 600 寬為基準，字級至少 14。

export const FONT = "-apple-system,'PingFang TC','Heiti TC','Noto Sans TC',sans-serif";

export const C = {
  ink: '#333333',
  sub: '#666666',
  grid: '#E2E2E2',
  gridDark: '#BDBDBD',
  axis: '#444444',
  a: '#2F7FC1', // 藍
  b: '#F08A24', // 橘
  green: '#3AA669',
  shape: '#FFE3A3',
  shapeStroke: '#8A5A1F',
  mark: '#D64545',
  axisLine: '#7B5CC4',
  cellA: '#F5A623',
  paper: '#FFF8E7',
  dot: '#9E9E9E',
};

export const r2 = (v) => Math.round(v * 10) / 10;
const r1 = (v) => Math.round(v * 10) / 10;

// 很多條線合成一個 path（檔案比較小，錯題本存起來不佔空間）
export function linesPath(segs, stroke, width = 1) {
  if (!segs.length) return '';
  const d = segs.map(([x1, y1, x2, y2]) => `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`).join('');
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
}

// 很多個圓點合成一個 path（長度幾乎為 0 的線段配圓頭）
export function dotsPath(points, color, r) {
  if (!points.length) return '';
  const d = points.map(([x, y]) => `M${r1(x)} ${r1(y)}h0.01`).join('');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(2 * r)}" stroke-linecap="round"/>`;
}

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 粗估文字寬度：ASCII 約 0.6 字寬，中文 1 字寬
const range1 = (n) => Array.from({ length: n }, (_, i) => i + 1);

export function textW(s, size) {
  let w = 0;
  for (const ch of String(s)) w += /[\x00-\x7F]/.test(ch) ? size * 0.6 : size;
  return w;
}

export function doc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="${FONT}">`
    + `<rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="#FFFFFF"/>${body}</svg>`;
}

export function text(x, y, s, o = {}) {
  const size = o.size ?? 18;
  const anchor = o.anchor ?? 'middle';
  const fill = o.fill ?? C.ink;
  const weight = o.bold ? ' font-weight="bold"' : '';
  const family = o.family ? ` font-family="${o.family}"` : '';
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central" fill="${fill}"${weight}${family}>${esc(s)}</text>`;
}

// 邊長標籤的位置：放在邊的外側，離邊夠遠，白底框不會蓋到邊
export function sideLabelPos(A, B, center, s, size) {
  const m = vmul(vadd(A, B), 0.5);
  const u = vunit(vsub(B, A));
  let nn = [-u[1], u[0]];
  if ((m[0] - center[0]) * nn[0] + (m[1] - center[1]) * nn[1] < 0) nn = vmul(nn, -1);
  const w = textW(s, size) + 8, h = size + 6;
  return vadd(m, vmul(nn, 8 + 0.5 * (Math.abs(nn[0]) * w + Math.abs(nn[1]) * h)));
}

// 有白底的文字（避免被線穿過）
export function labelBox(x, y, s, o = {}) {
  const size = o.size ?? 17;
  const w = textW(s, size) + 8, h = size + 6;
  return `<rect x="${r2(x - w / 2)}" y="${r2(y - h / 2)}" width="${r2(w)}" height="${r2(h)}" rx="4" fill="#FFFFFF" fill-opacity="0.92"/>` + text(x, y, s, o);
}

export function line(x1, y1, x2, y2, stroke = C.axis, width = 2, extra = '') {
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
}

export function dashed(x1, y1, x2, y2, stroke = C.axisLine, width = 3) {
  return line(x1, y1, x2, y2, stroke, width, 'stroke-dasharray="10 7"');
}

export function rect(x, y, w, h, fill, stroke = 'none', sw = 0, extra = '') {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra ? ' ' + extra : ''}/>`;
}

export function circle(cx, cy, r, fill, stroke = 'none', sw = 0) {
  return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export const ptsStr = (points) => points.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ');

export function polygon(points, fill, stroke = 'none', sw = 0, extra = '') {
  return `<polygon points="${ptsStr(points)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`;
}

export function polyline(points, stroke, sw = 2, extra = '') {
  return `<polyline points="${ptsStr(points)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra ? ' ' + extra : ''}/>`;
}

export function path(d, fill, stroke = 'none', sw = 0) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

// ---------- 向量 ----------
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const vmul = (a, k) => [a[0] * k, a[1] * k];
export const vlen = (a) => Math.hypot(a[0], a[1]);
export const vunit = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l]; };
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const deg = (d) => (d * Math.PI) / 180;
export const dirOf = (d) => [Math.cos(deg(d)), Math.sin(deg(d))];

// 把模型座標縮放、置中到 W×H 的畫面裡（等比例）。flipY：模型 y 軸向上。
export function fitter(points, W, H, pad = 40, flipY = false, extra = {}) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sw = maxX - minX || 1, sh = maxY - minY || 1;
  const padT = extra.padTop ?? pad, padB = extra.padBottom ?? pad;
  const s = Math.min((W - 2 * pad) / sw, (H - padT - padB) / sh, extra.maxScale ?? Infinity);
  const ox = (W - s * sw) / 2;
  const oy = padT + (H - padT - padB - s * sh) / 2;
  const f = ([x, y]) => [ox + (x - minX) * s, flipY ? oy + (maxY - y) * s : oy + (y - minY) * s];
  f.scale = s;
  return f;
}

// 角的度數（0–180）
export function angleAt(V, P, Q) {
  const u = vunit(vsub(P, V)), w = vunit(vsub(Q, V));
  const c = Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1]));
  return (Math.acos(c) * 180) / Math.PI;
}

// 在畫面座標畫角的圓弧（取小於 180° 的那個角）
export function angleArc(V, P, Q, r = 26, color = C.mark, width = 2.5) {
  const u = vunit(vsub(P, V)), w = vunit(vsub(Q, V));
  const s = vadd(V, vmul(u, r)), e = vadd(V, vmul(w, r));
  const sweep = cross(u, w) > 0 ? 1 : 0;
  return `<path d="M ${r2(s[0])} ${r2(s[1])} A ${r} ${r} 0 0 ${sweep} ${r2(e[0])} ${r2(e[1])}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
}

export function rightMark(V, P, Q, s = 16, color = C.mark) {
  const u = vunit(vsub(P, V)), w = vunit(vsub(Q, V));
  const a = vadd(V, vmul(u, s)), b = vadd(a, vmul(w, s)), c = vadd(V, vmul(w, s));
  return polyline([a, b, c], color, 2.5);
}

// 角平分線上距離頂點 dist 的點（放角度文字用）
export function bisectorPoint(V, P, Q, dist) {
  const u = vunit(vsub(P, V)), w = vunit(vsub(Q, V));
  let b = vadd(u, w);
  if (vlen(b) < 1e-6) b = [-u[1], u[0]];
  return vadd(V, vmul(vunit(b), dist));
}

// 角度文字離頂點的距離：角越小放越遠，避免擠在一起
export function labelDist(angleDeg, base = 24) {
  const half = deg(Math.max(angleDeg, 8) / 2);
  return Math.min(80, Math.max(44, base / Math.sin(half)));
}

// 線段中點的等長記號
export function ticks(P, Q, count = 1, color = C.mark) {
  const m = vmul(vadd(P, Q), 0.5);
  const u = vunit(vsub(Q, P));
  const n = [-u[1], u[0]];
  let out = '';
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 7;
    const c = vadd(m, vmul(u, off));
    out += line(c[0] - n[0] * 9, c[1] - n[1] * 9, c[0] + n[0] * 9, c[1] + n[1] * 9, color, 2.5);
  }
  return out;
}

// 多邊形頂點往外的方向（標頂點名稱用）
export function outwardDir(points, i) {
  const n = points.length;
  const V = points[i], P = points[(i + n - 1) % n], Q = points[(i + 1) % n];
  const u = vunit(vsub(P, V)), w = vunit(vsub(Q, V));
  let b = vadd(u, w);
  const area = signedArea(points);
  const turn = cross(vsub(V, P), vsub(Q, V));
  const convex = area > 0 ? turn > 0 : turn < 0;
  if (vlen(b) < 1e-6) b = [-u[1], u[0]];
  b = vunit(b);
  return convex ? vmul(b, -1) : b;
}

export function signedArea(points) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function interiorAngles(points) {
  // 回傳每個頂點的內角（度），可處理凹多邊形
  const n = points.length;
  const ccw = signedArea(points) > 0;
  return points.map((V, i) => {
    const P = points[(i + n - 1) % n], Q = points[(i + 1) % n];
    const a = angleAt(V, P, Q);
    const turn = cross(vsub(V, P), vsub(Q, V));
    const convex = ccw ? turn > 0 : turn < 0;
    return convex ? a : 360 - a;
  });
}

// ---------- 點在多邊形內、輪廓比對 ----------
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 把幾個多邊形合起來的「剪影」轉成點陣字串（平移到原點後比較），用來判斷兩個選項圖是否一樣
export function silhouetteKey(polys, step = 0.25) {
  const all = polys.flat();
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
  const nx = Math.round((maxX - minX) / step), ny = Math.round((maxY - minY) / step);
  let s = `${nx}x${ny}:`;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = minX + (i + 0.5) * step, y = minY + (j + 0.5) * step;
      s += polys.some((p) => pointInPoly(x, y, p)) ? '1' : '0';
    }
  }
  return s;
}

// ---------- 圖例 ----------
function marker(kind, cx, cy, color) {
  if (kind === 'dot') return circle(cx, cy, 8, color);
  if (kind === 'box') return rect(cx - 7.5, cy - 7.5, 15, 15, color);
  if (kind === 'circle') return line(cx - 13, cy, cx + 13, cy, color, 3) + circle(cx, cy, 6, color);
  if (kind === 'square') return line(cx - 13, cy, cx + 13, cy, color, 3) + rect(cx - 6, cy - 6, 12, 12, color);
  return rect(cx - 11, cy - 9, 22, 18, color);
}

export function legend(items, xRight, y, size = 17) {
  const widths = items.map((it) => 30 + textW(it.name, size));
  const total = widths.reduce((s, w) => s + w, 0) + 18 * (items.length - 1);
  let x = xRight - total;
  let out = '';
  items.forEach((it, i) => {
    out += marker(it.marker ?? 'rect', x + 11, y, it.color);
    out += text(x + 28, y, it.name, { size, anchor: 'start' });
    x += widths[i] + 18;
  });
  return out;
}

// ---------- 統計圖 ----------

// 雙長條圖（並排）。groups: [{ name, color, values }]
export function doubleBarChart({ title, cats, groups, yMax, unit }) {
  const W = 600, H = 400, L = 64, R = 584, T = 84, B = 350;
  let body = text(W / 2, 24, title, { size: 21, bold: true });
  body += legend(groups.map((g) => ({ name: g.name, color: g.color })), R, 56);
  body += text(L - 8, 56, `(${unit})`, { size: 17 });
  const yOf = (v) => B - (v / yMax) * (B - T);
  body += linesPath(range1(yMax).filter((v) => v % 2).map((v) => [L, yOf(v), R, yOf(v)]), C.grid);
  body += linesPath(range1(yMax).filter((v) => v % 2 === 0).map((v) => [L, yOf(v), R, yOf(v)]), C.gridDark);
  for (let v = 0; v <= yMax; v += 2) body += text(L - 10, yOf(v), String(v), { size: 16, anchor: 'end' });
  const slot = (R - L) / cats.length;
  const bw = Math.min(36, slot * 0.32);
  cats.forEach((c, i) => {
    const cx = L + slot * (i + 0.5);
    groups.forEach((g, j) => {
      const x = j === 0 ? cx - bw - 2 : cx + 2;
      body += rect(x, yOf(g.values[i]), bw, B - yOf(g.values[i]), g.color);
    });
    body += text(cx, B + 24, c, { size: 18 });
  });
  body += line(L, T - 12, L, B, C.axis, 2) + line(L, B, R, B, C.axis, 2);
  return doc(W, H, body);
}

// 堆疊長條圖。stack 依「下→上」或「左→右」的順序；legendOrder 是圖例的順序（可以和疊的順序不同）
export function stackedBarChart({ title, cats, stack, legendOrder, max, unit, horizontal }) {
  const legendItems = legendOrder.map((name) => {
    const g = stack.find((s) => s.name === name);
    return { name, color: g.color };
  });
  if (!horizontal) {
    const W = 600, H = 440, L = 64, R = 584, T = 84, B = 390;
    let body = text(W / 2, 24, title, { size: 21, bold: true });
    body += legend(legendItems, R, 56);
    body += text(L - 8, 56, `(${unit})`, { size: 17 });
    const yOf = (v) => B - (v / max) * (B - T);
    body += linesPath(range1(max).filter((v) => v % 2).map((v) => [L, yOf(v), R, yOf(v)]), C.grid);
    body += linesPath(range1(max).filter((v) => v % 2 === 0).map((v) => [L, yOf(v), R, yOf(v)]), C.gridDark);
    for (let v = 0; v <= max; v += 2) body += text(L - 10, yOf(v), String(v), { size: 15, anchor: 'end' });
    const slot = (R - L) / cats.length;
    const bw = Math.min(56, slot * 0.5);
    cats.forEach((c, i) => {
      const cx = L + slot * (i + 0.5);
      let acc = 0;
      stack.forEach((g) => {
        const v = g.values[i];
        body += rect(cx - bw / 2, yOf(acc + v), bw, yOf(acc) - yOf(acc + v), g.color);
        acc += v;
      });
      body += line(cx - bw / 2, yOf(stack[0].values[i]), cx + bw / 2, yOf(stack[0].values[i]), '#FFFFFF', 2);
      body += text(cx, B + 24, c, { size: 18 });
    });
    body += line(L, T - 12, L, B, C.axis, 2) + line(L, B, R, B, C.axis, 2);
    return doc(W, H, body);
  }
  const rowH = 54;
  const W = 600, L = 96, R = 578, T = 84, B = T + rowH * cats.length, H = B + 70;
  let body = text(W / 2, 24, title, { size: 21, bold: true });
  body += legend(legendItems, R, 56);
  const xOf = (v) => L + (v / max) * (R - L);
  body += linesPath(range1(max).filter((v) => v % 2).map((v) => [xOf(v), T, xOf(v), B]), C.grid);
  body += linesPath(range1(max).filter((v) => v % 2 === 0).map((v) => [xOf(v), T, xOf(v), B]), C.gridDark);
  for (let v = 0; v <= max; v += 2) body += text(xOf(v), B + 18, String(v), { size: 15 });
  body += text(R, B + 46, `(${unit})`, { size: 17, anchor: 'end' });
  cats.forEach((c, i) => {
    const cy = T + rowH * (i + 0.5);
    const bh = 30;
    let acc = 0;
    stack.forEach((g) => {
      const v = g.values[i];
      body += rect(xOf(acc), cy - bh / 2, xOf(acc + v) - xOf(acc), bh, g.color);
      acc += v;
    });
    body += line(xOf(stack[0].values[i]), cy - bh / 2, xOf(stack[0].values[i]), cy + bh / 2, '#FFFFFF', 2);
    body += text(L - 10, cy, c, { size: 18, anchor: 'end' });
  });
  body += line(L, T - 6, L, B, C.axis, 2) + line(L, B, R + 6, B, C.axis, 2);
  return doc(W, H, body);
}

// 折線圖。數值一律用「十分之一」為單位的整數（v10），避免小數誤差。
// series: [{ name, color, marker, values10 }]
// y0: 最下面那條格線的值（v10）；step: 每格（v10）；rows: 格數；brk: 下方有「≈」省略
// labelAt(k): 第 k 條格線要不要標數字；blanks: { k: '甲' } 改成空白圓圈
export function lineChart(o) {
  const compact = !!o.compact;
  const W = o.W ?? (compact ? 300 : 600);
  const H = o.H ?? (compact ? 230 : 400);
  const fs = compact ? 16 : 17;
  const L = compact ? 52 : 74;
  const R = W - (compact ? 14 : 20);
  const T = compact ? 32 : (o.title ? 84 : 40);
  const B = H - (compact ? 40 : 46);
  const gap = o.brk ? (compact ? 26 : 28) : 0;
  const B2 = B - gap;
  const fmt = o.fmt ?? ((v) => String(v / 10));
  const yOf = (v10) => B2 - ((v10 - o.y0) / (o.step * o.rows)) * (B2 - T);
  let body = '';
  if (o.title) body += text(W / 2, 24, o.title, { size: 21, bold: true });
  if (o.series.length > 1) body += legend(o.series.map((s) => ({ name: s.name, color: s.color, marker: s.marker })), R, 56);
  if (o.unit) body += text(compact ? L + 6 : L - 8, compact ? 14 : (o.title ? 56 : 18), o.unit, { size: compact ? 15 : 17, anchor: compact ? 'start' : 'middle' });
  const n = o.xs.length;
  const slot = (R - L) / n;
  const xOf = (i) => L + slot * (i + 0.5);
  const ks = Array.from({ length: o.rows + 1 }, (_, k) => k);
  const strong = (k) => (o.labelAt ? o.labelAt(k) : false);
  body += linesPath([...ks.filter((k) => !strong(k)).map((k) => [L, yOf(o.y0 + o.step * k), R, yOf(o.y0 + o.step * k)]),
    ...Array.from({ length: n }, (_, i) => [xOf(i), T, xOf(i), B2])], C.grid);
  body += linesPath(ks.filter(strong).map((k) => [L, yOf(o.y0 + o.step * k), R, yOf(o.y0 + o.step * k)]), C.gridDark);
  for (let k = 0; k <= o.rows; k++) {
    const y = yOf(o.y0 + o.step * k);
    if (o.blanks && o.blanks[k]) {
      body += circle(L - 20, y, 13, '#FFFFFF', C.mark, 2) + text(L - 20, y, o.blanks[k], { size: 15, fill: C.mark, bold: true });
    } else if (o.labelAt && o.labelAt(k)) {
      body += text(L - 8, y, fmt(o.y0 + o.step * k), { size: compact ? 15 : 16, anchor: 'end' });
    }
  }
  // 縱軸、橫軸、省略符號
  body += line(L, T - 8, L, B, C.axis, 2) + line(L, B, R, B, C.axis, 2);
  if (o.brk) {
    const ym = B - gap / 2;
    body += rect(L - 10, ym - 4, 20, 8, '#FFFFFF');
    body += polyline([[L - 11, ym - 1], [L - 5, ym - 7], [L + 4, ym + 1], [L + 11, ym - 5]], C.axis, 2);
    body += polyline([[L - 11, ym + 6], [L - 5, ym], [L + 4, ym + 8], [L + 11, ym + 2]], C.axis, 2);
    body += text(L - 8, B, '0', { size: compact ? 15 : 16, anchor: 'end' });
  }
  o.xs.forEach((x, i) => { body += text(xOf(i), B + (compact ? 18 : 22), x, { size: compact ? 15 : fs }); });
  if (o.xTitle) body += text(R, B + (compact ? 34 : 40), o.xTitle, { size: 15, anchor: 'end' });
  for (const s of o.series) {
    if (!s.values10) continue;
    const pts = s.values10.map((v, i) => [xOf(i), yOf(v)]);
    body += polyline(pts, s.color, compact ? 2.5 : 3);
    for (const [x, y] of pts) {
      body += s.marker === 'square' ? rect(x - 5.5, y - 5.5, 11, 11, s.color) : circle(x, y, compact ? 5 : 6, s.color);
    }
  }
  return doc(W, H, body);
}

// 一列標題＋一列資料的統計表
export function tableChart({ title, head, row }) {
  const W = 600;
  const cols = head.length;
  const firstW = Math.max(110, textW(row[0], 17) + 24, textW(head[0], 17) + 24);
  const cw = (W - 24 - firstW) / (cols - 1);
  const top = title ? 50 : 14;
  const rh = 50;
  const H = top + rh * 2 + 14;
  let body = title ? text(W / 2, 26, title, { size: 20, bold: true }) : '';
  const xs = [12];
  for (let i = 0; i < cols; i++) xs.push(xs[i] + (i === 0 ? firstW : cw));
  body += rect(12, top, W - 24, rh, '#FFF1D0');
  body += rect(12, top, W - 24, rh * 2, 'none', C.axis, 2);
  body += line(12, top + rh, W - 12, top + rh, C.axis, 1.5);
  for (let i = 1; i < cols; i++) body += line(xs[i], top, xs[i], top + rh * 2, C.axis, 1.5);
  const size = cw < 64 ? 16 : 18;
  for (let i = 0; i < cols; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2;
    body += text(cx, top + rh / 2, head[i], { size: i === 0 ? 17 : size, bold: i === 0 });
    body += text(cx, top + rh * 1.5, row[i], { size: i === 0 ? 17 : size });
  }
  return doc(W, H, body);
}

// 數線：0～max，標出兩種倍數
export function numberLine({ max, marksA, marksB, nameA, nameB }) {
  const W = 600, H = 210, L = 28, R = 572, Y = 112;
  const xOf = (v) => L + (v / max) * (R - L);
  let body = legend([{ name: nameA, color: C.b, marker: 'dot' }, { name: nameB, color: C.a, marker: 'box' }], R, 28, 17);
  body += line(L - 8, Y, R + 8, Y, C.axis, 2.5);
  body += linesPath(Array.from({ length: max + 1 }, (_, v) => [xOf(v), Y - 7, xOf(v), Y + 7]), C.axis, 2);
  for (let v = 0; v <= max; v++) body += text(xOf(v), Y + 24, String(v), { size: 14 });
  body += dotsPath(marksA.map((v) => [xOf(v), Y - 26]), C.b, 8);
  for (const v of marksB) body += rect(xOf(v) - 7.5, Y + 44, 15, 15, C.a);
  return doc(W, H, body);
}

// 分數算式（直式分數）。tokens：數字或符號字串、'□'（空格）、{ n, d, w }（w 是帶分數的整數部分）
export function fracRow(tokens) {
  const W = 600;
  let size = 34;
  const measure = (s) => (s === '□' ? 40 : textW(s, size));
  const widthOf = (t) => {
    if (typeof t === 'object') {
      const fw = Math.max(measure(String(t.n)), measure(String(t.d))) + 16;
      return fw + (t.w != null ? measure(String(t.w)) + 6 : 0);
    }
    return measure(String(t)) + 22;
  };
  let total = tokens.reduce((s, t) => s + widthOf(t), 0);
  if (total > W - 40) {
    size = Math.max(22, Math.floor((size * (W - 40)) / total));
    total = tokens.reduce((s, t) => s + widthOf(t), 0);
  }
  const H = 140, mid = 70;
  let x = (W - total) / 2;
  let body = '';
  const put = (s, cx, cy) => (s === '□'
    ? rect(cx - 17, cy - 20, 34, 40, '#FFFFFF', C.mark, 2.5, 'rx="4"')
    : text(cx, cy, s, { size, bold: true }));
  for (const t of tokens) {
    const w = widthOf(t);
    if (typeof t === 'object') {
      let fx = x;
      if (t.w != null) {
        const ww = measure(String(t.w));
        body += put(String(t.w), fx + ww / 2, mid);
        fx += ww + 6;
      }
      const fw = x + w - fx;
      const cx = fx + fw / 2;
      body += put(String(t.n), cx, mid - size * 0.78);
      body += line(fx + 4, mid, fx + fw - 4, mid, C.ink, 3);
      body += put(String(t.d), cx, mid + size * 0.8);
    } else {
      body += put(String(t), x + w / 2, mid);
    }
    x += w;
  }
  return doc(W, H, body);
}

// 擴分面積圖：長方形直切 b 份、塗 a 份，再橫切成 k 小份
export function areaModel({ b, a, k }) {
  const W = 600, H = 260, X = 60, Y = 26, RW = 480, RH = 200;
  let body = rect(X, Y, RW, RH, '#FFFFFF');
  const cw = RW / b;
  for (let i = 0; i < a; i++) body += rect(X + cw * i, Y, cw, RH, C.cellA);
  for (let j = 1; j < k; j++) body += line(X, Y + (RH / k) * j, X + RW, Y + (RH / k) * j, C.axis, 1.5, 'stroke-dasharray="7 5"');
  for (let i = 1; i < b; i++) body += line(X + cw * i, Y, X + cw * i, Y + RH, C.axis, 3);
  body += rect(X, Y, RW, RH, 'none', C.axis, 3);
  return doc(W, H, body);
}

// 約分彩帶圖：彩帶平分成 b 段、塗 a 段，每 k 段用粗線圍成一份
export function ribbon({ b, a, k }) {
  const W = 600, H = 150, X = 24, Y = 40, RW = 552, RH = 56;
  const sw = RW / b;
  let body = '';
  for (let i = 0; i < b; i++) body += rect(X + sw * i, Y, sw, RH, i < a ? '#F27BA0' : '#FFFFFF');
  for (let i = 1; i < b; i++) body += line(X + sw * i, Y, X + sw * i, Y + RH, C.sub, 1.2);
  for (let i = k; i < b; i += k) body += line(X + sw * i, Y - 10, X + sw * i, Y + RH + 10, C.axis, 4);
  body += rect(X, Y, RW, RH, 'none', C.axis, 3);
  body += text(W / 2, Y + RH + 32, `粗線把每 ${k} 小段圍成 1 份`, { size: 17, fill: C.sub });
  return doc(W, H, body);
}

// 三根小棒子
export function sticks(list) {
  // list: [{ len, label, color }]
  const W = 600, H = 70 + list.length * 56;
  const maxLen = Math.max(...list.map((s) => s.len));
  let body = '';
  list.forEach((s, i) => {
    const y = 40 + i * 56;
    const w = (s.len / maxLen) * 400;
    body += rect(40, y - 9, w, 18, s.color, '#5A3A12', 1.5, 'rx="9"');
    body += text(40 + w + 16, y, s.label, { size: 20, anchor: 'start', bold: true });
  });
  return doc(W, H, body);
}

// 方格紙。cells: [{ c, r, color }]；axis: { dir: 'v'|'h', at }（格線編號）；
// dots: [{ x, y, color, label }]（格點座標）；polys: [{ points, fill, stroke }]；dotGrid: 只畫點子
export function gridFigure(o) {
  const W = o.W ?? 600, H = o.H ?? 400, pad = o.pad ?? 24;
  const cell = Math.min((W - 2 * pad) / o.cols, (H - 2 * pad) / o.rows);
  const ox = (W - cell * o.cols) / 2, oy = (H - cell * o.rows) / 2;
  const P = (x, y) => [ox + x * cell, oy + y * cell];
  let body = '';
  if (o.cells && o.cells.length) {
    const d = o.cells.map((c) => `M${r1(ox + c.c * cell)} ${r1(oy + c.r * cell)}h${r1(cell)}v${r1(cell)}h${r1(-cell)}z`).join('');
    body += `<path d="${d}" fill="${C.cellA}"/>`;
  }
  if (o.dotGrid) {
    const pts = [];
    for (let x = 0; x <= o.cols; x++) for (let y = 0; y <= o.rows; y++) pts.push(P(x, y));
    body += dotsPath(pts, C.dot, Math.max(2.2, cell * 0.06));
  } else {
    const segs = [];
    for (let x = 0; x <= o.cols; x++) segs.push([...P(x, 0), ...P(x, o.rows)]);
    for (let y = 0; y <= o.rows; y++) segs.push([...P(0, y), ...P(o.cols, y)]);
    body += linesPath(segs, '#C8C8C8', 1.2);
  }
  for (const p of o.polys ?? []) {
    const pts = p.points.map(([x, y]) => P(x, y));
    body += p.open ? polyline(pts, p.stroke ?? C.shapeStroke, p.sw ?? 3.5)
      : polygon(pts, p.fill ?? C.shape, p.stroke ?? C.shapeStroke, p.sw ?? 3);
  }
  if (o.axis) {
    const ext = cell * 0.4;
    if (o.axis.dir === 'v') {
      const [x1, y1] = P(o.axis.at, 0), [, y2] = P(o.axis.at, o.rows);
      body += dashed(x1, y1 - ext, x1, y2 + ext, C.axisLine, 3.5);
    } else {
      const [x1, y1] = P(0, o.axis.at), [x2] = P(o.cols, o.axis.at);
      body += dashed(x1 - ext, y1, x2 + ext, y1, C.axisLine, 3.5);
    }
  }
  for (const d of o.dots ?? []) {
    const [px, py] = P(d.x, d.y);
    body += circle(px, py, Math.max(6, cell * 0.16), d.color ?? C.mark);
    if (d.label) body += text(px + (d.dx ?? 0) * cell, py + (d.dy ?? -0.45) * cell, d.label, { size: d.size ?? 18, bold: true, fill: d.color ?? C.mark });
  }
  return doc(W, H, body);
}
