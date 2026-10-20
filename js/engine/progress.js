// 遊戲進度規則：經驗值、等級、小魚乾、星星、錯題本。
import * as store from '../save/store.js';

export const XP_PER_CORRECT = 10;
export const XP_PER_LEVEL = 100;
export const WRONG_GRADUATE_STREAK = 2; // 錯題連續答對 2 次才畢業

export function levelOf(xp) {
  return 1 + Math.floor((xp || 0) / XP_PER_LEVEL);
}

export function levelProgress(xp) {
  return ((xp || 0) % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function catOf(player, catId) {
  if (!player.cats[catId]) player.cats[catId] = { xp: 0 };
  return player.cats[catId];
}

export function starsFor(correct, total, defeated) {
  if (!defeated) return 0;
  const rate = total ? correct / total : 0;
  if (rate >= 0.9) return 3;
  if (rate >= 0.7) return 2;
  return 1;
}

export function progressKey(regionId, nodeId) {
  return `${regionId}:${nodeId}`;
}

export function nodeProgress(player, key) {
  return player.progress[key] || null;
}

// 錯題本裡、屬於這個科目（可再限定單元）的題目
export function wrongFor(player, subject, unit) {
  return player.wrongBook.filter((w) => w.q.subject === subject && (unit == null || String(w.q.unit) === String(unit)));
}

// 一場戰鬥結束後寫入進度。results: [{ q, correct }]
export function recordBattle(player, { regionId, nodeId, subject, catId, results, defeated, isBoss, isDrill = false }) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const stars = starsFor(correct, total, defeated);
  const key = progressKey(regionId, nodeId);

  // 錯題特訓不算關卡，不記星星
  const prev = player.progress[key] || { stars: 0, plays: 0, bestRate: 0 };
  const firstThreeStars = !isDrill && stars === 3 && prev.stars < 3;
  if (!isDrill) {
    player.progress[key] = {
      stars: Math.max(prev.stars, stars),
      plays: prev.plays + 1,
      bestRate: Math.max(prev.bestRate, total ? correct / total : 0),
      lastAt: Date.now(),
    };
  }

  // 統計：科目、節
  for (const r of results) {
    for (const k of [subject, `${subject}:${r.q.section}`]) {
      const s = player.stats[k] || (player.stats[k] = { correct: 0, total: 0 });
      s.total += 1;
      if (r.correct) s.correct += 1;
    }
    if (!r.correct && r.q.tags) {
      for (const t of r.q.tags) {
        const k = `tag:${subject}:${t}`;
        player.stats[k] = (player.stats[k] || 0) + 1;
      }
    }
  }

  // 錯題本
  let graduated = 0;
  for (const r of results) {
    const idx = player.wrongBook.findIndex((w) => w.q.id === r.q.id);
    if (r.correct) {
      if (idx >= 0) {
        const w = player.wrongBook[idx];
        w.streak = (w.streak || 0) + 1;
        if (w.streak >= WRONG_GRADUATE_STREAK) { player.wrongBook.splice(idx, 1); graduated += 1; }
      }
    } else if (idx >= 0) {
      player.wrongBook[idx].streak = 0;
      player.wrongBook[idx].wrongAt = Date.now();
      player.wrongBook[idx].times = (player.wrongBook[idx].times || 1) + 1;
    } else {
      const q = Object.assign({}, r.q);
      delete q.fromWrongBook;
      player.wrongBook.push({ q, streak: 0, wrongAt: Date.now(), times: 1 });
    }
  }
  if (player.wrongBook.length > 150) player.wrongBook.splice(0, player.wrongBook.length - 150);

  // 經驗值與小魚乾
  const xp = correct * XP_PER_CORRECT;
  const levelBefore = levelOf(catOf(player, catId).xp);
  catOf(player, catId).xp += xp;
  player.xp += xp;
  const levelAfter = levelOf(catOf(player, catId).xp);
  let fish = correct + stars;
  if (isBoss && defeated) fish += 5;
  player.fish += fish;

  player.history.push({ at: Date.now(), key, correct, total, stars });
  if (player.history.length > 300) player.history.splice(0, player.history.length - 300);

  store.save();
  return { correct, total, stars, xp, fish, levelBefore, levelAfter, firstThreeStars, graduated };
}
