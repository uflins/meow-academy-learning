// 我的喵屋：3D 房間（設計規格書 5.2、11.1.2 考前版本）。
// 地板 8×8 格；點下方家具就放進房間，拖曳移動、對齊格子；選取後可旋轉 90° 或收回倉庫。
// 貓咪是 2D 看板圖片，在屋裡走來走去，點一下會開心地跳。
import { h, modal, toast } from '../ui/dom.js';
import { catSVG, catName } from '../art/art.js';
import { ensureRewards, FURNITURE, ownedCats, catLook, buyFurniture } from '../engine/rewards.js';
import { makeFurniture, FOOTPRINT, ICON } from '../house/furniture.js';
import * as store from '../save/store.js';
import { playerBar } from './world.js';
import { play } from '../engine/sfx.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const N = 8; // 8×8 格
const HALF = N / 2;

function footprint(kind, rot) {
  const [w, d] = FOOTPRINT[FURNITURE[kind].archetype] || [1, 1];
  return rot % 2 ? [d, w] : [w, d];
}
const isRug = (kind) => FURNITURE[kind].archetype === 'rug';

// 貓咪 SVG 轉成貼圖（右向、左向各一張）
function catTextures(THREE, id, look) {
  const svg = catSVG(id, Object.assign({ mood: 'normal' }, look)).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"');
  const img = new Image();
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const make = (flip) => {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 360;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    img.addEventListener('load', () => {
      const ctx = c.getContext('2d');
      ctx.save();
      if (flip) { ctx.translate(480, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, 0, 480, 360);
      ctx.restore();
      tex.needsUpdate = true;
    });
    return tex;
  };
  const right = make(false);
  const left = make(true);
  img.src = url;
  return { right, left };
}

function woodTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const plank = 512 / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#E9C9A0' : '#E2BE92';
    ctx.fillRect(0, i * plank, 512, plank);
    ctx.fillStyle = 'rgba(150,100,60,.25)';
    ctx.fillRect(0, i * plank, 512, 2);
    const off = (i * 137) % 512;
    ctx.fillRect(off, i * plank, 2, plank);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function house(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  ensureRewards(player);

  let alive = true;
  let cleanupFns = [];
  const stage = h('div', { class: 'house-stage' }, h('div', { class: 'loading' }, '小屋準備中…'));
  const tools = h('div', { class: 'house-tools' });
  const inv = h('div', { class: 'house-inv' });
  const bar = h('div');
  const refreshBar = () => bar.replaceChildren(playerBar(player, { go, back: () => go('world') }));
  refreshBar();

  root.append(bar, h('div', { class: 'house' },
    h('div', { class: 'house-head' },
      h('h2', { class: 'scene-title' }, '🏠 我的喵屋'),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn small', onclick: () => openShop() }, '🛍️ 家具店'),
    ),
    stage, tools, inv));

  import(THREE_URL).then((THREE) => { if (alive) start(THREE); })
    .catch(() => { stage.replaceChildren(h('div', { class: 'warn' }, '小屋需要網路才能打開，請確認 iPad 有連上網路。')); });

  let api = null;

  function start(THREE) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 100);
    let yaw = 45; // 只能在 15°–75° 之間轉，不會轉到房間背面
    let zoom = 1;
    const placeCamera = () => {
      const r = 20, pitch = 34 * Math.PI / 180, a = yaw * Math.PI / 180;
      cam.position.set(Math.sin(a) * Math.cos(pitch) * r, Math.sin(pitch) * r, Math.cos(a) * Math.cos(pitch) * r);
      cam.lookAt(0, 0.6, 0);
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    };

    // 燈光：暖色主光從窗戶方向斜照＋柔和環境光
    scene.add(new THREE.HemisphereLight(0xFFF6E8, 0xD9C4A8, 1.25));
    const sun = new THREE.DirectionalLight(0xFFE2B8, 1.6);
    sun.position.set(-3, 9, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
    sun.shadow.radius = 4;
    scene.add(sun);

    // 地板與兩面牆
    const floor = new THREE.Mesh(new THREE.BoxGeometry(N, 0.2, N), new THREE.MeshStandardMaterial({ map: woodTexture(THREE), roughness: 0.9 }));
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xFCE3D3, roughness: 1 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(N + 0.2, 3.2, 0.2), wallMat);
    back.position.set(0, 1.6, -HALF - 0.1);
    back.receiveShadow = true;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, N), new THREE.MeshStandardMaterial({ color: 0xE9F1E4, roughness: 1 }));
    left.position.set(-HALF - 0.1, 1.6, 0);
    left.receiveShadow = true;
    scene.add(back, left);
    // 窗戶
    const win = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.08), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.09), new THREE.MeshStandardMaterial({ color: 0xBFE3F7, emissive: 0xBFE3F7, emissiveIntensity: 0.35 }));
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.1), frame.material);
    win.add(frame, glass, bar1);
    win.position.set(1.2, 1.8, -HALF + 0.01);
    scene.add(win);

    // ---------- 家具 ----------
    const placed = player.house.placed; // [{ uid, kind, x, z, rot }]
    const objs = new Map(); // uid -> group
    let selected = null;

    const cellCenter = (x, z, kind, rot) => {
      const [w, d] = footprint(kind, rot);
      return [x + w / 2 - HALF, z + d / 2 - HALF];
    };

    function blocked(kind, x, z, rot, ignoreUid) {
      const [w, d] = footprint(kind, rot);
      if (x < 0 || z < 0 || x + w > N || z + d > N) return true;
      for (const p of placed) {
        if (p.uid === ignoreUid || isRug(p.kind) !== isRug(kind)) continue; // 地毯和其他家具可以疊
        const [pw, pd] = footprint(p.kind, p.rot);
        if (x < p.x + pw && x + w > p.x && z < p.z + pd && z + d > p.z) return true;
      }
      return false;
    }

    function addObj(p) {
      const f = FURNITURE[p.kind];
      const g = makeFurniture(THREE, f.archetype, f.colors);
      g.userData.uid = p.uid;
      g.traverse((o) => { o.userData.uid = p.uid; });
      objs.set(p.uid, g);
      scene.add(g);
      positionObj(p);
    }
    function positionObj(p) {
      const g = objs.get(p.uid);
      const [cx, cz] = cellCenter(p.x, p.z, p.kind, p.rot);
      g.position.set(cx, isRug(p.kind) ? 0.001 : 0, cz);
      g.rotation.y = -p.rot * Math.PI / 2;
    }
    placed.forEach(addObj);

    const save = () => store.save();

    // 選取時讓家具微微發亮；取消時換回原本的材質
    const originals = new Map();
    function highlight(uid, on) {
      const g = objs.get(uid);
      if (!g) return;
      g.traverse((o) => {
        if (!o.isMesh) return;
        if (on) {
          originals.set(o, o.material);
          const m = o.material.clone();
          m.emissive = new THREE.Color(0xFFE08A);
          m.emissiveIntensity = 0.35;
          o.material = m;
        } else if (originals.has(o)) {
          o.material.dispose();
          o.material = originals.get(o);
          originals.delete(o);
        }
      });
    }

    function select(uid) {
      if (selected) highlight(selected, false);
      selected = uid;
      if (uid) highlight(uid, true);
      renderTools();
    }

    // 地毯和家具有沒有重疊（地毯放上去會被家具蓋住）
    function underFurniture(kind, x, z) {
      const [w, d] = footprint(kind, 0);
      return placed.some((p) => {
        if (isRug(p.kind)) return false;
        const [pw, pd] = footprint(p.kind, p.rot);
        return x < p.x + pw && x + w > p.x && z < p.z + pd && z + d > p.z;
      });
    }

    function nearestFree(kind) {
      const order = [];
      for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) order.push([x, z, Math.hypot(x - 3, z - 3)]);
      order.sort((a, b) => a[2] - b[2]);
      // 地毯先找沒有家具壓著的地方
      if (isRug(kind)) for (const [x, z] of order) if (!blocked(kind, x, z, 0) && !underFurniture(kind, x, z)) return [x, z];
      for (const [x, z] of order) if (!blocked(kind, x, z, 0)) return [x, z];
      return null;
    }

    function placeNew(kind) {
      const spot = nearestFree(kind);
      if (!spot) { toast('房間放不下了，先收起一些家具吧'); return; }
      const p = { uid: 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1000), kind, x: spot[0], z: spot[1], rot: 0 };
      placed.push(p);
      addObj(p);
      save();
      play('pop');
      select(p.uid);
      renderInv();
    }

    function rotateSelected() {
      const p = placed.find((x) => x.uid === selected);
      if (!p) return;
      const rot = (p.rot + 1) % 4;
      if (blocked(p.kind, p.x, p.z, rot, p.uid)) { toast('這裡轉不過去，先移到空一點的地方'); return; }
      p.rot = rot;
      positionObj(p);
      save();
      play('tap');
    }

    function storeSelected() {
      const i = placed.findIndex((x) => x.uid === selected);
      if (i < 0) return;
      highlight(selected, false);
      const g = objs.get(selected);
      scene.remove(g);
      objs.delete(selected);
      placed.splice(i, 1);
      save();
      selected = null;
      renderTools();
      renderInv();
    }

    // ---------- 貓咪 ----------
    const cats = ownedCats(player).slice(0, 3).map((id, i) => {
      const tex = catTextures(THREE, id, catLook(player, id));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.right, transparent: true }));
      sprite.scale.set(1.4, 1.05, 1);
      sprite.center.set(0.5, 0.05);
      const start = [-1.5 + i * 1.5, 1.5 - i];
      sprite.position.set(start[0], 0, start[1]);
      sprite.userData = { cat: id, tex, target: null, wait: 1 + i, jump: 0 };
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x5A3E2B, transparent: true, opacity: 0.18 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      scene.add(sprite, shadow);
      sprite.userData.shadow = shadow;
      return sprite;
    });

    function freeCellCenter() {
      for (let t = 0; t < 20; t++) {
        const x = Math.floor(Math.random() * N), z = Math.floor(Math.random() * N);
        const solid = placed.some((p) => {
          if (isRug(p.kind)) return false;
          const [w, d] = footprint(p.kind, p.rot);
          return x >= p.x && x < p.x + w && z >= p.z && z < p.z + d;
        });
        if (!solid) return [x + 0.5 - HALF, z + 0.5 - HALF];
      }
      return [0, 0];
    }

    // 貓咪的左右要依鏡頭方向判斷：往畫面右邊走用右向圖
    const camRight = new THREE.Vector3();
    function updateCats(dt) {
      cam.matrixWorld.extractBasis(camRight, new THREE.Vector3(), new THREE.Vector3());
      for (const s of cats) {
        const u = s.userData;
        if (u.jump > 0) {
          u.jump = Math.max(0, u.jump - dt);
          s.position.y = Math.sin((1 - u.jump / 0.6) * Math.PI) * 0.6;
        } else s.position.y = 0;
        if (!u.target) {
          u.wait -= dt;
          if (u.wait <= 0) u.target = freeCellCenter();
        } else {
          const dx = u.target[0] - s.position.x, dz = u.target[1] - s.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.05) { u.target = null; u.wait = 1.5 + Math.random() * 3; }
          else {
            const step = Math.min(dist, dt * 0.9);
            s.position.x += (dx / dist) * step;
            s.position.z += (dz / dist) * step;
            const screenDir = dx * camRight.x + dz * camRight.z;
            s.material.map = screenDir >= 0 ? u.tex.right : u.tex.left;
          }
        }
        u.shadow.position.x = s.position.x;
        u.shadow.position.z = s.position.z;
      }
    }

    // ---------- 操作：點選、拖曳 ----------
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    let drag = null;

    function setRay(ev) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
    }

    const onDown = (ev) => {
      setRay(ev);
      const catHit = ray.intersectObjects(cats, false)[0];
      if (catHit) {
        const u = catHit.object.userData;
        u.jump = 0.6;
        play('pop');
        toast(`${catName(u.cat, catLook(player, u.cat).evolved)}：喵～`);
        return;
      }
      const hit = ray.intersectObjects([...objs.values()], true)[0];
      if (hit) {
        const uid = hit.object.userData.uid;
        if (selected !== uid) select(uid);
        drag = { uid, moved: false };
        renderer.domElement.setPointerCapture(ev.pointerId);
        play('tap');
      } else if (selected) {
        select(null);
      }
    };
    const onMove = (ev) => {
      if (!drag) return;
      setRay(ev);
      if (!ray.ray.intersectPlane(floorPlane, hitPoint)) return;
      const p = placed.find((x) => x.uid === drag.uid);
      const [w, d] = footprint(p.kind, p.rot);
      const x = Math.round(hitPoint.x + HALF - w / 2), z = Math.round(hitPoint.z + HALF - d / 2);
      if ((x !== p.x || z !== p.z) && !blocked(p.kind, x, z, p.rot, p.uid)) {
        p.x = x; p.z = z;
        positionObj(p);
        drag.moved = true;
      }
    };
    const onUp = () => { if (drag?.moved) save(); drag = null; };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.style.touchAction = 'none';

    // ---------- 尺寸與繪製 ----------
    function resize() {
      const w = stage.clientWidth, hgt = stage.clientHeight;
      if (!w || !hgt) return;
      renderer.setSize(w, hgt, false);
      const aspect = w / hgt;
      const view = 4.9;
      Object.assign(cam, { left: -view * aspect, right: view * aspect, top: view, bottom: -view });
      placeCamera();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    let last = performance.now();
    let raf = 0;
    const loop = (t) => {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      updateCats(dt);
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    api = {
      placeNew, rotateSelected, storeSelected,
      deselect: () => select(null),
      turn: (d) => { yaw = Math.max(15, Math.min(75, yaw + d)); placeCamera(); },
      zoomBy: (f) => { zoom = Math.max(0.7, Math.min(1.8, zoom * f)); placeCamera(); },
      setQuality: (high) => { renderer.shadowMap.enabled = high; sun.castShadow = high; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
      get selected() { return selected; },
    };

    cleanupFns.push(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); });
    });
    renderTools();
    renderInv();
  }

  let highQuality = true;
  function renderTools() {
    if (!api) return;
    const sel = api.selected ? placedKind(api.selected) : null;
    tools.replaceChildren(...[
      h('button', { class: 'btn small', onclick: () => api.turn(-15) }, '⟲ 轉左邊'),
      h('button', { class: 'btn small', onclick: () => api.turn(15) }, '轉右邊 ⟳'),
      h('button', { class: 'btn small', onclick: () => api.zoomBy(1.15) }, '＋ 放大'),
      h('button', { class: 'btn small', onclick: () => api.zoomBy(1 / 1.15) }, '－ 縮小'),
      h('button', { class: 'btn small', onclick: () => { highQuality = !highQuality; api.setQuality(highQuality); renderTools(); } }, highQuality ? '畫質：高' : '畫質：低'),
      h('div', { class: 'spacer' }),
      sel ? h('span', { class: 'sel-name' }, `已選：${FURNITURE[sel].name}`) : h('span', { class: 'muted' }, '點家具可以移動、旋轉'),
      sel ? h('button', { class: 'btn small primary', onclick: () => api.rotateSelected() }, '⟳ 轉一轉') : null,
      sel ? h('button', { class: 'btn small', onclick: () => api.storeSelected() }, '📦 收起來') : null,
      sel ? h('button', { class: 'btn small', onclick: () => api.deselect() }, '完成') : null,
    ].filter(Boolean));
  }

  function placedKind(uid) {
    return player.house.placed.find((p) => p.uid === uid)?.kind;
  }

  function available() {
    const counts = Object.assign({}, player.furniture);
    for (const p of player.house.placed) counts[p.kind] = (counts[p.kind] || 0) - 1;
    return Object.entries(counts).filter(([, n]) => n > 0);
  }

  function renderInv() {
    const items = available();
    inv.replaceChildren(
      h('div', { class: 'inv-title' }, '倉庫'),
      items.length
        ? h('div', { class: 'inv-list' }, items.map(([kind, n]) => h('button', {
            class: 'btn inv-item', onclick: () => api && api.placeNew(kind),
          }, h('span', { class: 'inv-icon' }, ICON[FURNITURE[kind].archetype] || '🪑'), h('span', {}, FURNITURE[kind].name), n > 1 ? h('span', { class: 'muted' }, ` ×${n}`) : null)))
        : h('div', { class: 'muted' }, Object.keys(player.furniture).length
          ? '家具都擺出來了！打倒大魔王、拿到三顆星可以得到更多家具。'
          : '還沒有家具。打倒大魔王、第一次拿到三顆星、錯題本畢業都可以得到家具，也可以到「家具店」用小魚乾買。'),
    );
  }

  async function openShop() {
    const list = h('div', { class: 'shop-grid' });
    const fishLine = h('p', { class: 'muted' });
    const renderShop = () => { fishLine.textContent = `你有 🐟 ${player.fish} 條小魚乾。`; list.replaceChildren(...Object.entries(FURNITURE).filter(([, f]) => f.price).map(([kind, f]) => h('div', { class: 'shop-item' },
      h('div', { class: 'inv-icon big' }, ICON[f.archetype] || '🪑'),
      h('div', { class: 'shop-name' }, f.name),
      h('button', {
        class: 'btn small primary', disabled: player.fish < f.price,
        onclick: () => { if (buyFurniture(player, kind)) { play('levelup'); toast(`買到了 ${f.name}！放在倉庫裡`); refreshBar(); renderShop(); renderInv(); } },
      }, `🐟 ${f.price}`)))); };
    renderShop();
    await modal({ title: '🛍️ 家具店', body: h('div', {}, fishLine, list), actions: [{ label: '關閉', value: true, kind: 'primary' }] });
  }

  return () => { alive = false; cleanupFns.forEach((f) => f()); };
}
