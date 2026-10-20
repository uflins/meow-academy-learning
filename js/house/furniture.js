// 喵屋家具：用基本形狀拼出圓角、粉彩配色的家具（設計規格書 11.1.2）。
// 每個 archetype 回傳一個 THREE.Group，底部在 y = 0，中心在 (0, 0)，1 格 = 1 單位。

// 佔地格數（旋轉 90° 時寬深互換）
export const FOOTPRINT = {
  sofa: [2, 1], bed: [2, 1], rug: [2, 2], shelf: [2, 1],
  lamp: [1, 1], plant: [1, 1], tower: [1, 1], table: [1, 1], cushion: [1, 1],
  clock: [1, 1], hatstand: [1, 1], box: [1, 1], basket: [1, 1],
};

export const ICON = {
  sofa: '🛋️', bed: '🛏️', rug: '🟠', shelf: '📚', lamp: '💡', plant: '🪴', tower: '🗼',
  table: '☕', cushion: '🟣', clock: '🕰️', hatstand: '🎩', box: '📦', basket: '🧶',
};

export function makeFurniture(THREE, archetype, colors) {
  const [c1, c2] = colors;
  const mats = new Map();
  const mat = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, extra)));
    return mats.get(key);
  };
  const g = new THREE.Group();

  // 圓角方塊：用圓角矩形擠出，邊緣有斜角，看起來軟軟的
  const rbox = (w, h, d, color, x = 0, y = 0, z = 0, r = 0.08) => {
    r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
    const s = new THREE.Shape();
    const x0 = -w / 2 + r, y0 = -h / 2 + r, x1 = w / 2 - r, y1 = h / 2 - r;
    s.moveTo(x0, -h / 2);
    s.lineTo(x1, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, y0);
    s.lineTo(w / 2, y1); s.quadraticCurveTo(w / 2, h / 2, x1, h / 2);
    s.lineTo(x0, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y1);
    s.lineTo(-w / 2, y0); s.quadraticCurveTo(-w / 2, -h / 2, x0, -h / 2);
    const bevel = Math.min(r * 0.6, d / 4);
    const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 4 });
    geo.center();
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y + h / 2, z);
    g.add(m);
    return m;
  };
  const cyl = (rt, rb, h, color, x = 0, y = 0, z = 0, seg = 24) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    g.add(m);
    return m;
  };
  const ball = (r, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(color));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  switch (archetype) {
    case 'sofa':
      rbox(1.8, 0.4, 0.8, c1, 0, 0.05, 0.02);
      rbox(0.84, 0.18, 0.66, c2, -0.43, 0.42, 0.06, 0.08);
      rbox(0.84, 0.18, 0.66, c2, 0.43, 0.42, 0.06, 0.08);
      rbox(1.8, 0.62, 0.22, c1, 0, 0.3, -0.32, 0.1);
      rbox(0.24, 0.5, 0.8, c1, -0.82, 0.12, 0.02, 0.1);
      rbox(0.24, 0.5, 0.8, c1, 0.82, 0.12, 0.02, 0.1);
      break;
    case 'bed':
      rbox(1.85, 0.32, 0.95, c1, 0, 0.04, 0);
      rbox(1.7, 0.18, 0.88, c2, 0.04, 0.34, 0, 0.08);
      rbox(0.36, 0.12, 0.62, '#FFFFFF', -0.6, 0.52, 0, 0.06);
      rbox(0.9, 0.06, 0.9, c1, 0.4, 0.5, 0, 0.03);
      rbox(0.14, 0.78, 0.95, c1, -0.88, 0.04, 0, 0.07);
      break;
    case 'rug': {
      const outer = cyl(0.95, 0.95, 0.03, c1, 0, 0, 0, 40);
      outer.receiveShadow = true;
      cyl(0.62, 0.62, 0.036, c2, 0, 0, 0, 40);
      cyl(0.3, 0.3, 0.04, c1, 0, 0, 0, 32);
      break;
    }
    case 'lamp': {
      cyl(0.22, 0.24, 0.06, c2);
      cyl(0.035, 0.035, 1.25, c2, 0, 0.06);
      const shade = cyl(0.17, 0.3, 0.34, c1, 0, 1.2);
      shade.material = mat(c1, { emissive: c1, emissiveIntensity: 0.55 });
      break;
    }
    case 'plant':
      cyl(0.24, 0.17, 0.34, c2);
      ball(0.27, c1, 0, 0.6, 0);
      ball(0.2, c1, 0.17, 0.78, 0.05);
      ball(0.18, c1, -0.15, 0.82, -0.04);
      ball(0.15, c1, 0.02, 0.98, 0.02);
      break;
    case 'shelf': {
      rbox(1.6, 1.35, 0.45, c1, 0, 0, -0.2, 0.05);
      const bookColors = [c2, '#F2B5A0', '#A8D0E6', '#FFE08A', '#B9C7B4'];
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 5; i++) {
          rbox(0.16, 0.3, 0.3, bookColors[(i + row) % bookColors.length], -0.55 + i * 0.22 + (row % 2) * 0.12, 0.1 + row * 0.42, 0.07, 0.03);
        }
      }
      break;
    }
    case 'tower':
      cyl(0.06, 0.06, 1.5, '#C8A27A', -0.25, 0, 0);
      cyl(0.06, 0.06, 1.0, '#C8A27A', 0.25, 0, 0.1);
      rbox(0.9, 0.1, 0.8, c1, 0, 0, 0, 0.04);
      rbox(0.7, 0.1, 0.6, c1, 0.15, 0.95, 0.05, 0.04);
      rbox(0.6, 0.1, 0.6, c1, -0.15, 1.45, -0.05, 0.04);
      cyl(0.26, 0.26, 0.12, c2, -0.15, 1.55, -0.05);
      break;
    case 'table':
      cyl(0.45, 0.45, 0.08, c1, 0, 0.42);
      cyl(0.08, 0.12, 0.42, c1);
      cyl(0.07, 0.06, 0.1, c2, 0.12, 0.5, 0.05);
      cyl(0.1, 0.1, 0.02, c2, -0.15, 0.5, -0.05);
      break;
    case 'cushion':
      rbox(0.72, 0.2, 0.72, c1, 0, 0, 0, 0.1);
      ball(0.05, c2, 0, 0.21, 0);
      break;
    case 'clock': {
      rbox(0.55, 1.55, 0.38, c1, 0, 0, -0.1, 0.06);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32), mat(c2));
      face.rotation.x = Math.PI / 2;
      face.position.set(0, 1.22, 0.1);
      g.add(face);
      rbox(0.2, 0.04, 0.03, '#3A2A22', -0.07, 1.2, 0.13, 0.01);
      rbox(0.2, 0.04, 0.03, '#3A2A22', 0.07, 1.2, 0.13, 0.01);
      cyl(0.05, 0.05, 0.3, '#FFD54F', 0, 0.45, 0.1, 12);
      break;
    }
    case 'hatstand':
      cyl(0.22, 0.26, 0.05, c1);
      cyl(0.035, 0.035, 1.45, c1, 0, 0.05);
      cyl(0.16, 0.16, 0.18, c2, 0, 1.5);
      cyl(0.26, 0.26, 0.02, c2, 0, 1.5);
      break;
    case 'box':
      rbox(0.8, 0.5, 0.7, c1, 0, 0, 0, 0.03);
      rbox(0.8, 0.03, 0.3, c2, 0, 0.48, -0.47, 0.01).rotation.x = -0.9;
      rbox(0.8, 0.03, 0.3, c2, 0, 0.48, 0.47, 0.01).rotation.x = 0.9;
      break;
    case 'basket':
      cyl(0.36, 0.3, 0.32, c1);
      ball(0.13, c2, -0.1, 0.38, 0.05);
      ball(0.12, '#F2B5A0', 0.12, 0.37, -0.06);
      ball(0.11, '#FFE08A', 0.02, 0.44, -0.1);
      break;
    default:
      rbox(0.8, 0.6, 0.8, c1);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = archetype !== 'rug'; o.receiveShadow = true; } });
  return g;
}
