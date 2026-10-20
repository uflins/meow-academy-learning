// 戰鬥：每一招都要答一題。答對貓咪攻擊；答錯糊塗怪反擊，並顯示正確答案和說明。
// 怪物的血量撐到最後一題：累積傷害達 60% 就在最後一擊打倒它。
import { h, wait, modal } from '../ui/dom.js';
import { findRegion, BATTLE_SIZE } from '../engine/curriculum.js';
import { loadRegionUnits, battleQuestions } from '../engine/pool.js';
import { recordBattle, wrongFor, levelOf, progressKey } from '../engine/progress.js';
import { afterBattle, battleCatFor, catLook, EVOLVE_LEVEL, FURNITURE, trackDaily } from '../engine/rewards.js';
import { renderQuestion, formatAnswer, renderVisual, TONE_NO } from '../engine/question-view.js';
import { speak, stop as stopSpeech } from '../engine/speech.js';
import { playZhuyin, preloadZhuyin } from '../engine/zhuyin-audio.js';
import { play } from '../engine/sfx.js';
import { catSVG, monsterSVG, SUBJECT_CAT, catName } from '../art/art.js';
import { sample } from '../gen/util.js';

const PRAISE = ['答對了！', '好厲害！', '太棒了！', '漂亮！', '完全正確！'];
const LOW_PRAISE = ['答對了！好棒！', '哇，你好厲害！', '太棒了！', '對了，耶！'];
const DEFEAT_AT = 60; // 累積傷害達 60% 就能打倒

function hpBar(kind) {
  const fill = h('div', { class: 'hp-fill' });
  const el = h('div', { class: `hp ${kind}` }, fill);
  return { el, set(v) { fill.style.width = `${Math.max(0, Math.min(100, v))}%`; el.classList.toggle('low', v < 30); } };
}

async function setup(player, params) {
  if (params.mode === 'wrongbook') {
    const subject = params.subject;
    const pool = wrongFor(player, subject).filter((w) => w.q.grade === player.grade);
    const n = Math.min(pool.length, BATTLE_SIZE[player.grade]?.normal || 5);
    const questions = sample(Math.random, pool, n).map((w) => Object.assign({}, w.q, { fromWrongBook: true }));
    return {
      region: { id: 'wrongbook', subject, name: '錯題特訓', color: '#B39DDB' },
      node: { id: `drill-${subject}`, title: '錯題特訓', isBoss: false },
      questions,
      isDrill: true,
      backTo: () => ['wrongbook', {}],
      backLabel: '回錯題本',
    };
  }
  const region = findRegion(player.grade, params.regionId);
  const units = await loadRegionUnits(region);
  const node = units.flatMap((u) => u.nodes).find((n) => n.id === params.nodeId);
  const size = BATTLE_SIZE[player.grade] || BATTLE_SIZE[5];
  const questions = await battleQuestions(player, region, node, node.isBoss ? size.boss : size.normal);
  const unit = units.find((u) => u.nodes.includes(node));
  const unitNodeKeys = unit ? unit.nodes.map((x) => progressKey(region.id, x.id)) : [];
  return { region, node, questions, unitNodeKeys, backTo: () => ['region', { regionId: region.id }], backLabel: '回地圖' };
}

export default function battle(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  const lowGrade = player.grade <= 2;
  let alive = true;

  root.append(h('div', { class: 'loading' }, '糊塗怪出現中…'));

  setup(player, params).then((ctx) => {
    if (!alive) return;
    if (!ctx.questions.length) {
      root.replaceChildren(h('div', { class: 'warn' }, '這裡還沒有題目。'), h('button', { class: 'btn', onclick: () => go(...ctx.backTo()) }, '返回'));
      return;
    }
    run(ctx);
  }).catch((e) => {
    root.replaceChildren(h('div', { class: 'warn' }, `載入失敗：${e.message}`), h('button', { class: 'btn', onclick: () => go('world') }, '回地圖'));
  });

  async function run({ region, node, questions, backTo, backLabel, isDrill, unitNodeKeys }) {
    const catId = battleCatFor(player, region.subject);
    const look = catLook(player, catId);
    const isPartner = catId === SUBJECT_CAT[region.subject];
    const n = questions.length;
    const perHit = (100 / n) * (isPartner ? 1.15 : 1); // 夥伴貓攻擊力加成
    const specialAt = lowGrade ? 2 : 3; // 連對幾題後，下一招變必殺技（一年級題數少，連對 2 題就好）
    let damage = 0;
    let catHp = 100;
    let combo = 0;
    const results = [];

    const catBox = h('div', { class: 'fighter cat idle', html: catSVG(catId, look) });
    const monBox = h('div', { class: `fighter monster ${node.isBoss ? 'boss' : ''}`, html: monsterSVG(region.subject, { boss: node.isBoss }) });
    const catHpBar = hpBar('cat');
    const monHpBar = hpBar('monster');
    const comboEl = h('div', { class: 'combo' });
    const counter = h('div', { class: 'counter' });
    const fx = h('div', { class: 'fx-layer' });
    const qwrap = h('div', { class: 'qwrap' });

    const setCat = (mood) => { catBox.innerHTML = catSVG(catId, Object.assign({ mood }, look)); };
    const setMon = (mood) => { monBox.innerHTML = monsterSVG(region.subject, { boss: node.isBoss, mood }); };
    // 最後一題答完前，怪物至少留 5% 血
    const updateHp = (final = false) => {
      catHpBar.set(catHp);
      monHpBar.set(final ? 100 - damage : Math.max(5, 100 - damage));
    };
    const updateCombo = () => {
      comboEl.textContent = combo >= specialAt ? '✨ 必殺技準備好了！' : combo >= 2 ? `🔥 連擊 ×${combo}` : '';
      comboEl.classList.toggle('ready', combo >= specialAt);
    };

    const quit = async () => {
      const ok = await modal({ title: '要離開這場戰鬥嗎？', body: '這場的進度不會儲存喔。', actions: [
        { label: '繼續戰鬥', value: false, kind: 'primary' }, { label: '離開', value: true },
      ] });
      if (ok) go(...backTo());
    };

    const battleEl = h('div', { class: 'battle', style: { '--region': region.color } },
      h('div', { class: 'battle-top' },
        h('button', { class: 'btn icon', 'aria-label': '離開', onclick: quit }, '✕'),
        h('div', { class: 'battle-title' }, node.title || region.name),
        counter,
      ),
      h('div', { class: 'stage' },
        h('div', { class: 'side left' }, h('div', { class: 'name' }, catName(catId, look.evolved), isPartner ? h('span', { class: 'partner' }, ' 夥伴加成') : null), catHpBar.el, catBox),
        h('div', { class: 'mid' }, comboEl),
        h('div', { class: 'side right' }, h('div', { class: 'name' }, node.isBoss ? '大魔王' : '糊塗怪'), monHpBar.el, monBox),
        fx,
      ),
      qwrap,
    );
    root.replaceChildren(battleEl);
    updateHp();
    updateCombo();

    const burst = async (text, cls) => {
      const el = h('div', { class: `burst ${cls}` }, text);
      fx.append(el);
      await wait(700);
      el.remove();
    };

    if (node.isBoss) {
      burst('👑 大魔王出現了！', 'special');
      if (lowGrade) await speak('大魔王出現了！加油！');
      else await wait(600);
      if (!alive) return;
    }

    // 一年級答對：貓咪跳一下、星星飛出來、大字「答對了」
    const cheer = () => {
      catBox.classList.remove('jump');
      void catBox.offsetWidth;
      catBox.classList.add('jump');
      const big = h('div', { class: 'cheer' }, '答對了！');
      fx.append(big);
      for (let k = 0; k < 6; k++) {
        const s = h('div', { class: 'star-pop', style: { '--dx': `${Math.cos(k * 1.05) * 90}px`, '--dy': `${Math.sin(k * 1.05) * 60 - 30}px` } }, '⭐');
        fx.append(s);
        setTimeout(() => s.remove(), 900);
      }
      setTimeout(() => big.remove(), 1000);
    };

    const catAttack = async (special) => {
      play(special ? 'special' : 'attack');
      catBox.classList.add('attack');
      if (special) burst('✨ 必殺技！✨', 'special');
      await wait(260);
      monBox.classList.add('hit');
      burst(special ? '💥💥' : '💥', 'hit');
      await wait(380);
      catBox.classList.remove('attack');
      monBox.classList.remove('hit');
    };

    const monsterAttack = async () => {
      play('hurt');
      monBox.classList.add('attack');
      await wait(260);
      catBox.classList.add('hit');
      setCat('surprised');
      burst('咦？', 'oops');
      await wait(420);
      monBox.classList.remove('attack');
      catBox.classList.remove('hit');
    };

    // 一年級：念題目；注音泡泡題先念提示，再播注音音檔
    const sayQuestion = async (q) => {
      if (!q.audio) { speak(q.speak || q.prompt); return; }
      preloadZhuyin([q.audio]);
      await speak(q.speak);
      if (alive) playZhuyin(q.audio);
    };

    // 聲調題：貓咪照聲調的路線跳一次（答對時、說明時都會跳，當作動畫示範）
    const toneJump = (q) => {
      const n = q.tags && q.tags[0] === 'tone' ? TONE_NO[q.answer] : 0;
      if (!n) return false;
      catBox.classList.remove('tone1', 'tone2', 'tone3', 'tone4', 'tone5');
      void catBox.offsetWidth;
      catBox.classList.add(`tone${n}`);
      setTimeout(() => catBox.classList.remove(`tone${n}`), 1400);
      return true;
    };

    // 說明放在作答區的位置，題目和附圖保持看得到
    const explain = (view, q) => new Promise((resolve) => {
      toneJump(q);
      const say = q.explainSpeak || q.explanation;
      const panel = h('div', { class: 'explain' },
        h('div', { class: 'explain-title' }, '正確答案'),
        h('div', { class: 'explain-answer' }, formatAnswer(q)),
        q.explanation ? h('div', { class: 'explain-text' }, q.explanation) : null,
        h('div', { class: 'explain-actions' },
          lowGrade && (say || q.audio) ? h('button', { class: 'btn', onclick: () => (q.audio ? playZhuyin(q.audio) : speak(say)) }, '🔊 再聽一次') : null,
          h('button', { class: 'btn primary', onclick: () => { stopSpeech(); resolve(); } }, '我懂了'),
        ),
      );
      view.showExplanation(panel);
      if (lowGrade && q.audio) speak(q.explainSpeak || '').then(() => alive && playZhuyin(q.audio));
      else if (lowGrade && say) speak(say);
    });

    for (let i = 0; i < n && alive; i++) {
      const q = questions[i];
      counter.textContent = `第 ${i + 1} / ${n} 題`;
      setCat('normal');
      const view = renderQuestion(q, { lowGrade });
      qwrap.replaceChildren(view.el);
      if (lowGrade) sayQuestion(q);

      let res = await view.waitAnswer();
      if (!alive) return;
      stopSpeech();

      if (res.correct) {
        play('correct');
        const special = combo >= specialAt;
        combo = special ? 0 : combo + 1;
        damage += special ? perHit * 2 : perHit;
        setCat('happy');
        if (lowGrade) { speak(LOW_PRAISE[i % LOW_PRAISE.length]); cheer(); toneJump(q); }
        else burst(PRAISE[i % PRAISE.length], 'praise');
        await catAttack(special);
        results.push({ q, correct: true });
      } else {
        play('wrong');
        combo = 0;
        catHp = Math.max(12, catHp - (100 / n) * 1.2);
        await monsterAttack();
        updateHp();
        let retried = false;
        // 一年級：先再給一次機會（選項 3 個以上的選擇題、數字題）
        if (lowGrade && (q.type === 'input' || q.type === 'choice' || q.type === 'truefalse')) {
          speak('再想想看');
          setCat('normal');
          res = await view.retry(res.btn);
          if (!alive) return;
          retried = true;
          if (res.correct) {
            play('correct');
            damage += perHit / 2;
            setCat('happy');
            cheer();
            await catAttack(false);
          }
        }
        // 一年級重答之後也說明一次，知道第一次為什麼錯
        view.lock();
        view.highlightCorrect();
        await explain(view, q);
        results.push({ q, correct: false });
      }
      updateHp();
      updateCombo();
      await wait(250);
    }
    if (!alive) return;

    combo = 0;
    updateCombo();
    const defeated = damage >= DEFEAT_AT - 1e-6;
    const rec = recordBattle(player, {
      regionId: region.id, nodeId: node.id, subject: region.subject, catId, results, defeated, isBoss: node.isBoss, isDrill,
    });
    const gifts = afterBattle(player, { subject: region.subject, catId, rec, defeated, isBoss: node.isBoss, unitNodeKeys });
    trackDaily(player, { rec, results });
    if (defeated) {
      // 最後一擊：把剩下的血打完
      burst('最後一擊！', 'special');
      play('attack');
      catBox.classList.add('attack');
      await wait(260);
      damage = 100;
      updateHp(true);
      setMon('dizzy');
      await wait(450);
      catBox.classList.remove('attack');
      play('pop');
      monBox.classList.add('defeated');
      monBox.innerHTML = '<div class="fish-pop">🐟</div>';
      await wait(500);
      play('win');
    } else {
      updateHp();
    }
    showResult(rec, defeated, gifts);

    function showResult(r, won, g) {
      const wrongs = results.filter((x) => !x.correct);
      const levelUp = r.levelAfter > r.levelBefore;
      if (levelUp) setTimeout(() => play('levelup'), 600);
      const evolvedNow = r.levelBefore < EVOLVE_LEVEL && r.levelAfter >= EVOLVE_LEVEL;
      const nowLook = catLook(player, catId);
      const msg = won ? (node.isBoss ? '打倒大魔王了！' : '打倒糊塗怪了！') : `${catName(catId, look.evolved)}累了，休息一下再挑戰！`;
      if (lowGrade) speak(won ? `${msg}你答對了${r.correct}題` : msg);
      battleEl.classList.add('done');
      qwrap.replaceChildren(h('div', { class: 'result' },
        h('div', { class: 'result-scroll' },
          h('div', { class: 'result-cat', html: catSVG(catId, Object.assign({ mood: won ? 'happy' : 'sleep' }, nowLook)) }),
          h('h2', { class: 'result-title' }, msg),
          h('div', { class: 'result-stars' }, [0, 1, 2].map((k) => h('span', { class: k < r.stars ? 'on' : '', style: { animationDelay: `${k * 0.25}s` } }, '★'))),
          h('div', { class: 'result-line' }, `答對 ${r.correct} / ${r.total} 題`),
          lowGrade
            ? h('div', { class: 'result-gains low' }, '🐟'.repeat(Math.min(r.fish, 12)))
            : h('div', { class: 'result-gains' },
                h('span', { class: 'chip' }, `+${r.xp} 經驗值`),
                h('span', { class: 'chip' }, `+${r.fish} 🐟`)),
          evolvedNow ? h('div', { class: 'levelup big' }, `✨ ${catName(catId)}進化成「${catName(catId, true)}」了！`) : null,
          levelUp && !evolvedNow ? h('div', { class: 'levelup' }, `🎉 ${catName(catId, nowLook.evolved)}升到 Lv.${levelOf(player.cats[catId].xp)} 了！`) : null,
          g.newCats.length ? h('div', { class: 'gift-row' }, g.newCats.map((id) => h('div', { class: 'gift' },
            h('div', { class: 'gift-cat', html: catSVG(id, { mood: 'happy' }) }),
            h('div', {}, `${catName(id)}加入了！`)))) : null,
          g.furniture.length ? h('div', { class: 'gift-row' }, g.furniture.map((k) => h('div', { class: 'gift' },
            h('div', { class: 'gift-icon' }, '🎁'),
            h('div', {}, `得到家具：${FURNITURE[k].name}`)))) : null,
          r.graduated ? h('div', { class: 'levelup' }, `🎓 有 ${r.graduated} 題從錯題本畢業了！`) : null,
          wrongs.length ? h('details', { class: 'result-wrongs' },
            h('summary', {}, `看看答錯的題目（${wrongs.length}）`),
            wrongs.map((w) => h('div', { class: 'wrong-item' },
              h('div', { class: 'wrong-q' }, w.q.prompt),
              renderVisual(w.q.visual, 'small'),
              h('div', { class: 'wrong-a' }, '答案：', formatAnswer(w.q)),
              w.q.explanation ? h('div', { class: 'wrong-e' }, w.q.explanation) : null))) : null,
        ),
        h('div', { class: 'result-actions' },
          h('button', { class: 'btn', onclick: () => go(...backTo()) }, backLabel),
          h('button', { class: 'btn primary', onclick: () => go('battle', params) }, isDrill ? '再特訓一次' : '再挑戰一次'),
        ),
      ));
    }
  }

  return () => { alive = false; stopSpeech(); };
}
