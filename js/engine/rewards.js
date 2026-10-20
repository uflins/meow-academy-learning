// 獎勵機制（設計規格書第 5 節）：進化、換裝、收集貓咪、家具。
import * as store from '../save/store.js';
import { CATS, GEAR, SUBJECT_CAT } from '../art/art.js';
import { levelOf, catOf } from './progress.js';

export const EVOLVE_LEVEL = 5;

// 換裝配件價格（小魚乾）
export const GEAR_PRICE = { party: 15, bell: 15, beret: 20, scarf: 20, glasses: 25, bowtie: 30, shades: 35, crown: 60 };

// 特別貓的取得條件
export const SPECIAL_CATS = {
  brave: { hint: '錯題本累積畢業 10 題', check: (p) => p.counters.graduated >= 10 },
  star: { hint: '把任一個單元的關卡全部拿到三顆星', check: (p) => p.counters.fullStarUnits >= 1 },
  king: { hint: '打倒 5 隻大魔王', check: (p) => p.counters.bossWins >= 5 },
  fishy: { hint: '累積得到 150 條小魚乾', check: (p) => p.counters.fishEarned >= 150 },
};

// 家具：archetype 決定 3D 造型，colors 決定配色（js/house/furniture.js）
// set：套組（設計規格書 5.2.1）；price：可以用小魚乾買
export const FURNITURE = {
  // 喵喵商店的一般家具
  sofa: { name: '小沙發', archetype: 'sofa', colors: ['#F2B5A0', '#E08E77'], price: 30 },
  bed: { name: '貓咪小床', archetype: 'bed', colors: ['#A8D0E6', '#FFFFFF'], price: 40 },
  rug: { name: '圓地毯', archetype: 'rug', colors: ['#F7D9A8', '#E8B96F'], price: 20 },
  lamp: { name: '立燈', archetype: 'lamp', colors: ['#FFF1C1', '#B08968'], price: 15 },
  plant: { name: '盆栽', archetype: 'plant', colors: ['#7BC47F', '#C98A4B'], price: 15 },
  shelf: { name: '書櫃', archetype: 'shelf', colors: ['#C49A6C', '#8FB8DE'], price: 35 },
  tower: { name: '貓跳台', archetype: 'tower', colors: ['#D9C2A3', '#F2B5A0'], price: 50 },
  table: { name: '小茶几', archetype: 'table', colors: ['#D4A373', '#FAEDCD'], price: 25 },
  cushion: { name: '坐墊', archetype: 'cushion', colors: ['#FFB4C6', '#FFE0E9'], price: 10 },
  // 鬍子紳士貓之家：每個關卡第一次拿到三星
  g_clock: { name: '翹鬍子時鐘', archetype: 'clock', colors: ['#7A4E2D', '#FFF8E7'], set: 'gentleman' },
  g_hatstand: { name: '紳士禮帽衣帽架', archetype: 'hatstand', colors: ['#5C3D2E', '#2B2B2B'], set: 'gentleman' },
  g_armchair: { name: '格紋單人沙發', archetype: 'sofa', colors: ['#8C2F39', '#2E4A7D'], set: 'gentleman' },
  g_pillow: { name: '領結抱枕', archetype: 'cushion', colors: ['#2E4A7D', '#8C2F39'], set: 'gentleman' },
  g_cabinet: { name: '木頭收納櫃', archetype: 'shelf', colors: ['#9C6B3E', '#E9D8C4'], set: 'gentleman' },
  g_walllamp: { name: '翹鬍子壁燈', archetype: 'lamp', colors: ['#FFE7A3', '#5C3D2E'], set: 'gentleman' },
  g_teacart: { name: '紅茶點心推車', archetype: 'table', colors: ['#B5835A', '#F4E1C1'], set: 'gentleman' },
  g_rug: { name: '格紋地毯', archetype: 'rug', colors: ['#2E4A7D', '#8C2F39'], set: 'gentleman' },
  // 冒險訓練師：打倒大魔王
  t_bed: { name: '貓掌膠囊床', archetype: 'bed', colors: ['#E5484D', '#FFFFFF'], set: 'trainer' },
  t_mat: { name: '屬性地墊', archetype: 'rug', colors: ['#5DBB6A', '#5DADE2'], set: 'trainer' },
  t_desk: { name: '圖鑑電腦桌', archetype: 'table', colors: ['#5DADE2', '#E5E5E5'], set: 'trainer' },
  t_badge: { name: '徽章展示盒', archetype: 'shelf', colors: ['#E5484D', '#FFD54F'], set: 'trainer' },
  t_arena: { name: '對戰場地毯', archetype: 'rug', colors: ['#E5E5E5', '#E5484D'], set: 'trainer' },
  t_heal: { name: '回復機', archetype: 'tower', colors: ['#FFFFFF', '#F28B9B'], set: 'trainer' },
  t_bag: { name: '冒險背包掛架', archetype: 'hatstand', colors: ['#C98A4B', '#E5484D'], set: 'trainer' },
  t_board: { name: '地區地圖看板', archetype: 'clock', colors: ['#8FB8DE', '#FFF8E7'], set: 'trainer' },
  // 角落小夥伴：錯題本畢業
  c_cushion: { name: '牆角靠墊', archetype: 'cushion', colors: ['#D8CFC4', '#B9C7B4'], set: 'corner' },
  c_box: { name: '紙箱小窩', archetype: 'box', colors: ['#C8A27A', '#E9D8C4'], set: 'corner' },
  c_yarn: { name: '毛線球籃', archetype: 'basket', colors: ['#B9A38A', '#9DB4C0'], set: 'corner' },
  c_lamp: { name: '牆角小燈', archetype: 'lamp', colors: ['#FFF4D6', '#9DB4C0'], set: 'corner' },
  c_table: { name: '小茶几', archetype: 'table', colors: ['#CDBBA7', '#EFE7DC'], set: 'corner' },
  c_plant: { name: '角落小盆栽', archetype: 'plant', colors: ['#9DBF9E', '#CDBBA7'], set: 'corner' },
  c_blanket: { name: '毛毯堆', archetype: 'cushion', colors: ['#B9C7B4', '#D8CFC4'], set: 'corner' },
  c_shelf: { name: '矮書架', archetype: 'shelf', colors: ['#CDBBA7', '#9DB4C0'], set: 'corner' },
  // 軟綿綿小日子：每日任務全部完成
  s_bed: { name: '圓圓小被窩', archetype: 'bed', colors: ['#FFF3D6', '#FFD6E0'], set: 'soft' },
  s_sofa: { name: '布丁沙發', archetype: 'sofa', colors: ['#FFE08A', '#C98A4B'], set: 'soft' },
  s_rug: { name: '鬆餅地毯', archetype: 'rug', colors: ['#E8B96F', '#FFF3D6'], set: 'soft' },
  s_table: { name: '點心盤小桌', archetype: 'table', colors: ['#FFFFFF', '#FFB4C6'], set: 'soft' },
  s_cart: { name: '拉麵小推車', archetype: 'box', colors: ['#F2B5A0', '#FFF3D6'], set: 'soft' },
  s_light: { name: '星星夜燈', archetype: 'lamp', colors: ['#FFF1A8', '#FFD6E0'], set: 'soft' },
  s_garden: { name: '小菜園盆栽', archetype: 'plant', colors: ['#9DD69F', '#E8B96F'], set: 'soft' },
  s_sign: { name: '手寫木牌', archetype: 'hatstand', colors: ['#C49A6C', '#FFF3D6'], set: 'soft' },
};

export const SETS = {
  gentleman: { name: '鬍子紳士貓之家', how: '每個關卡第一次拿到三顆星' },
  trainer: { name: '冒險訓練師', how: '打倒大魔王' },
  corner: { name: '角落小夥伴', how: '錯題本畢業（每畢業 3 題得 1 件）' },
  soft: { name: '軟綿綿小日子', how: '每日任務全部完成' },
};

// ---------- 每日任務（設計規格書 5.3）----------
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function dailyTasks(p) {
  ensureRewards(p);
  if (!p.daily || p.daily.date !== today()) {
    const low = p.grade <= 2;
    const hasWrong = p.wrongBook.some((w) => w.q.grade === p.grade);
    p.daily = {
      date: today(),
      bonus: false,
      tasks: [
        { id: 'correct', label: `答對 ${low ? 6 : 10} 題`, goal: low ? 6 : 10, n: 0, claimed: false, fish: 5 },
        { id: 'battles', label: `打完 ${low ? 2 : 3} 場戰鬥`, goal: low ? 2 : 3, n: 0, claimed: false, fish: 5 },
        hasWrong
          ? { id: 'wrong', label: '錯題答對 2 題', goal: 2, n: 0, claimed: false, fish: 8 }
          : { id: 'stars', label: '拿到 1 次三顆星', goal: 1, n: 0, claimed: false, fish: 8 },
      ],
    };
    store.save();
  }
  return p.daily;
}

// 戰鬥結束後更新每日任務進度
export function trackDaily(p, { rec, results }) {
  const d = dailyTasks(p);
  for (const t of d.tasks) {
    if (t.id === 'correct') t.n += rec.correct;
    if (t.id === 'battles') t.n += 1;
    if (t.id === 'wrong') t.n += results.filter((r) => r.correct && r.q.fromWrongBook).length;
    if (t.id === 'stars' && rec.stars === 3) t.n += 1;
    t.n = Math.min(t.n, t.goal);
  }
  store.save();
}

// 領任務獎勵；三個都領完再送一件「軟綿綿小日子」家具。回傳 { fish, furniture }
export function claimDaily(p, id) {
  const d = dailyTasks(p);
  const t = d.tasks.find((x) => x.id === id);
  if (!t || t.claimed || t.n < t.goal) return null;
  t.claimed = true;
  p.fish += t.fish;
  let furniture = null;
  if (!d.bonus && d.tasks.every((x) => x.claimed)) {
    d.bonus = true;
    furniture = giveFurniture(p, pickFromSet(p, 'soft'));
  }
  store.save();
  return { fish: t.fish, furniture };
}

export function ensureRewards(p) {
  p.counters = Object.assign({ graduated: 0, bossWins: 0, fullStarUnits: 0, fishEarned: 0, gradToward: 0 }, p.counters || {});
  p.collection = p.collection || {};
  p.gearOwned = p.gearOwned || [];
  p.furniture = p.furniture || {}; // kind -> 數量（含已擺放的）
  p.house = p.house || { placed: [] };
  p.battleCat = p.battleCat || {}; // 科目 -> 出戰的貓
  // 舊存檔：已經有經驗值的貓補進圖鑑
  for (const [id, c] of Object.entries(p.cats || {})) if (c && c.xp > 0 && !p.collection[id]) p.collection[id] = Date.now();
  return p;
}

export function catGear(p, catId) {
  const c = catOf(p, catId);
  c.gear = c.gear || {};
  return c.gear;
}

export function isEvolved(p, catId) {
  return levelOf(catOf(p, catId).xp) >= EVOLVE_LEVEL;
}

export function catLook(p, catId) {
  return { evolved: isEvolved(p, catId), gear: Object.assign({}, catGear(p, catId)) };
}

export function ownedCats(p) {
  ensureRewards(p);
  return Object.keys(CATS).filter((id) => p.collection[id]);
}

// 這個科目要出戰的貓：玩家選的，沒有就用該科夥伴貓
export function battleCatFor(p, subject) {
  ensureRewards(p);
  const chosen = p.battleCat[subject];
  if (chosen && p.collection[chosen]) return chosen;
  return SUBJECT_CAT[subject] || 'abacus';
}

function giveFurniture(p, kind) {
  p.furniture[kind] = (p.furniture[kind] || 0) + 1;
  return kind;
}

// 從某個套組挑一件還沒有的（都有了就挑一件給重複的）
function pickFromSet(p, set) {
  const kinds = Object.keys(FURNITURE).filter((k) => FURNITURE[k].set === set);
  const missing = kinds.filter((k) => !p.furniture[k]);
  const pool = missing.length ? missing : kinds;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 戰鬥結束後發獎勵。回傳 { newCats, furniture }
export function afterBattle(p, { subject, catId, rec, defeated, isBoss, unitNodeKeys }) {
  ensureRewards(p);
  const newCats = [];
  const furniture = [];

  // 夥伴貓：第一次在這一科戰鬥就加入
  const partner = SUBJECT_CAT[subject];
  if (partner && !p.collection[partner]) { p.collection[partner] = Date.now(); newCats.push(partner); }

  p.counters.fishEarned += rec.fish || 0;
  if (isBoss && defeated) {
    p.counters.bossWins += 1;
    furniture.push(giveFurniture(p, pickFromSet(p, 'trainer')));
  }
  if (rec.firstThreeStars) furniture.push(giveFurniture(p, pickFromSet(p, 'gentleman')));
  if (rec.graduated) {
    p.counters.graduated += rec.graduated;
    p.counters.gradToward += rec.graduated;
    while (p.counters.gradToward >= 3) {
      p.counters.gradToward -= 3;
      furniture.push(giveFurniture(p, pickFromSet(p, 'corner')));
    }
  }
  // 單元全部三星
  if (unitNodeKeys && unitNodeKeys.length && unitNodeKeys.every((k) => (p.progress[k]?.stars || 0) >= 3)) {
    p.counters.fullStarUnits = Math.max(p.counters.fullStarUnits, 1);
  }
  for (const [id, rule] of Object.entries(SPECIAL_CATS)) {
    if (!p.collection[id] && rule.check(p)) { p.collection[id] = Date.now(); newCats.push(id); }
  }
  store.save();
  return { newCats, furniture };
}

// 用小魚乾買東西；成功回傳 true
export function buyGear(p, gearId) {
  ensureRewards(p);
  const price = GEAR_PRICE[gearId];
  if (p.gearOwned.includes(gearId) || p.fish < price) return false;
  p.fish -= price;
  p.gearOwned.push(gearId);
  store.save();
  return true;
}

export function buyFurniture(p, kind) {
  ensureRewards(p);
  const price = FURNITURE[kind]?.price;
  if (!price || p.fish < price) return false;
  p.fish -= price;
  giveFurniture(p, kind);
  store.save();
  return true;
}

export function equip(p, catId, gearId) {
  const slot = GEAR[gearId]?.slot;
  if (!slot) return;
  const g = catGear(p, catId);
  g[slot] = g[slot] === gearId ? null : gearId;
  store.save();
}

export function setBattleCat(p, subject, catId) {
  ensureRewards(p);
  p.battleCat[subject] = catId;
  store.save();
}
