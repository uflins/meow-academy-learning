// 家長區：家長 PIN 保護。玩家管理、各科答對率、存檔備份、語音設定。
import { h, modal, toast } from '../ui/dom.js';
import { askPin, createPin } from '../ui/pinpad.js';
import * as store from '../save/store.js';
import { AVATARS, CATS, SUBJECT_CAT } from '../art/art.js';
import { regionsFor } from '../engine/curriculum.js';
import { levelOf } from '../engine/progress.js';
import { speak, voiceInfo, available as speechAvailable } from '../engine/speech.js';
import { loadRegionUnits } from '../engine/pool.js';
import { formatAnswer, richText } from '../engine/question-view.js';

const SUBJECT_NAME = { chinese: '國語', math: '數學', science: '自然', social: '社會', english: '英語' };
const SUPPORTED_GRADES = [1, 5];

function pct(s) {
  return s && s.total ? `${Math.round((s.correct / s.total) * 100)}%（${s.correct}/${s.total}）` : '還沒玩';
}

function fmtDate(t) {
  if (!t) return '從來沒有';
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function gate() {
  if (!store.hasParentPin()) {
    await modal({ title: '設定家長 PIN', body: '家長區用 6 位數 PIN 保護，請設定一組孩子不知道的數字。', actions: [{ label: '開始設定', value: true, kind: 'primary' }], dismissible: false });
    const pin = await createPin({ title: '設定家長 PIN', length: 6 });
    if (pin == null) return false;
    store.setParentPinHash(await store.hashPin('parent:' + pin));
    toast('家長 PIN 設定好了');
    return true;
  }
  const ok = await askPin({
    title: '家長區', subtitle: '輸入 6 位數家長 PIN', length: 6,
    check: async (v) => (await store.hashPin('parent:' + v)) === store.parentPinHash(),
  });
  return ok != null;
}

export default function parent(root, params, { go }) {
  let tab = params.tab || 'players';
  const body = h('div', { class: 'parent-body' });
  const tabs = h('div', { class: 'tabs' });

  const renderTabs = () => {
    tabs.replaceChildren(...[['players', '玩家'], ['report', '成績'], ['backup', '存檔'], ['settings', '設定'], ['help', '使用說明']].map(([id, label]) =>
      h('button', { class: `tab ${tab === id ? 'on' : ''}`, onclick: () => { tab = id; render(); } }, label)));
  };

  const render = () => {
    renderTabs();
    body.replaceChildren(...({ players, report, backup, settings, help })[tab]().filter(Boolean));
  };

  // ---------- 玩家 ----------
  function players() {
    const list = store.listPlayers();
    return [
      h('div', { class: 'panel-actions' }, h('button', { class: 'btn primary', onclick: addPlayer }, '＋ 新增玩家')),
      list.length ? h('div', { class: 'plist' }, list.map((p) => h('div', { class: 'prow' },
        h('span', { class: 'player-avatar small' }, p.avatar),
        h('div', { class: 'prow-main' }, h('b', {}, p.name), h('span', {}, `${p.grade} 年級．${p.pinKind === 'pictures' ? '圖片密碼' : '數字密碼'}．🐟 ${p.fish}`)),
        h('button', { class: 'btn small', onclick: () => resetPin(p) }, '重設密碼'),
        h('button', { class: 'btn small', onclick: () => changeGrade(p) }, '改年級'),
        h('button', { class: 'btn small danger', onclick: () => removePlayer(p) }, '刪除'),
      ))) : h('p', { class: 'muted' }, '還沒有玩家。'),
    ];
  }

  async function addPlayer() {
    const form = { name: '', avatar: AVATARS[0], grade: 5 };
    const nameInput = h('input', { class: 'text-input', maxlength: 8, placeholder: '暱稱（不要用真實姓名）', oninput: (e) => { form.name = e.target.value.trim(); } });
    const avatarGrid = h('div', { class: 'avatar-grid' });
    const renderAvatars = () => avatarGrid.replaceChildren(...AVATARS.map((a) => h('button', {
      class: `avatar-pick ${form.avatar === a ? 'on' : ''}`, onclick: () => { form.avatar = a; renderAvatars(); },
    }, a)));
    renderAvatars();
    const gradeRow = h('div', { class: 'grade-row' });
    const renderGrades = () => gradeRow.replaceChildren(...SUPPORTED_GRADES.map((g) => h('button', {
      class: `btn ${form.grade === g ? 'primary' : ''}`, onclick: () => { form.grade = g; renderGrades(); },
    }, `${g} 年級`)));
    renderGrades();
    const ok = await modal({
      title: '新增玩家',
      body: h('div', { class: 'form' },
        h('label', {}, '暱稱'), nameInput,
        h('label', {}, '頭像'), avatarGrid,
        h('label', {}, '年級'), gradeRow,
        h('p', { class: 'muted' }, '一年級用「圖片密碼」（依序點 3 張圖），其他年級用 4 位數密碼。'),
      ),
      actions: [{ label: '取消', value: false }, { label: '下一步：設定密碼', value: true, kind: 'primary' }],
    });
    if (!ok) return;
    if (!form.name) { toast('請輸入暱稱'); return; }
    const pinKind = form.grade <= 2 ? 'pictures' : 'digits';
    const pin = await createPin({ title: `${form.avatar} ${form.name} 的密碼`, kind: pinKind, length: pinKind === 'pictures' ? 3 : 4 });
    if (pin == null) return;
    store.addPlayer({ name: form.name, avatar: form.avatar, grade: form.grade, pinKind, pinHash: await store.hashPin(pin) });
    toast(`${form.name} 加入了！`);
    render();
  }

  async function resetPin(p) {
    const pin = await createPin({ title: `重設 ${p.name} 的密碼`, kind: p.pinKind, length: p.pinKind === 'pictures' ? 3 : 4 });
    if (pin == null) return;
    store.updatePlayer(p.id, { pinHash: await store.hashPin(pin) });
    toast('密碼已重設');
  }

  async function changeGrade(p) {
    const g = await modal({ title: `${p.name} 的年級`, body: '換年級後，地圖會換成該年級的範圍；舊進度會保留。',
      actions: SUPPORTED_GRADES.map((x) => ({ label: `${x} 年級`, value: x, kind: x === p.grade ? 'primary' : '' })) });
    if (!g || g === p.grade) return;
    const pinKind = g <= 2 ? 'pictures' : 'digits';
    if (pinKind !== p.pinKind) {
      const pin = await createPin({ title: `設定 ${p.name} 的新密碼`, kind: pinKind, length: pinKind === 'pictures' ? 3 : 4 });
      if (pin == null) return;
      store.updatePlayer(p.id, { grade: g, pinKind, pinHash: await store.hashPin(pin) });
    } else {
      store.updatePlayer(p.id, { grade: g });
    }
    render();
  }

  async function removePlayer(p) {
    const ok = await modal({ title: `刪除 ${p.name}？`, body: '這位玩家的所有進度都會刪除，而且不能復原。建議先到「存檔」匯出備份。',
      actions: [{ label: '取消', value: false, kind: 'primary' }, { label: '刪除', value: true, kind: 'danger' }] });
    if (!ok) return;
    store.removePlayer(p.id);
    render();
  }

  // ---------- 成績 ----------
  // 關卡標題（例如「2-4 倍數」「第三課 河馬和河狸」），依年級載入一次
  const titleCache = {};
  async function sectionTitles(grade) {
    if (!titleCache[grade]) {
      titleCache[grade] = (async () => {
        const map = {};
        for (const r of regionsFor(grade).filter((x) => x.status === 'open')) {
          try {
            for (const u of await loadRegionUnits(r)) {
              for (const n of u.nodes) if (!n.isBoss && n.sections) map[`${r.subject}:${n.sections[0]}`] = n.title;
            }
          } catch (e) { /* 載入失敗就用節的代號 */ }
        }
        return map;
      })();
    }
    return titleCache[grade];
  }

  function report() {
    const list = store.listPlayers();
    if (!list.length) return [h('p', { class: 'muted' }, '還沒有玩家。')];
    return list.map((p) => {
      const subjects = [...new Set(regionsFor(p.grade).map((r) => r.subject))];
      const weak = h('div', { class: 'muted' }, '載入中…');
      const recent = h('div');
      sectionTitles(p.grade).then((titles) => {
        const label = (q) => `${SUBJECT_NAME[q.subject]} ${titles[`${q.subject}:${q.section}`] || q.section}`;
        // 錯題最多的關卡
        const count = {};
        for (const w of p.wrongBook) {
          if (w.q.grade !== p.grade) continue;
          const k = `${w.q.subject}:${w.q.section}`;
          count[k] = count[k] || { n: 0, q: w.q };
          count[k].n += 1;
        }
        const top = Object.entries(count).sort((x, y) => y[1].n - x[1].n).slice(0, 5);
        weak.replaceChildren(top.length
          ? h('div', {}, h('b', {}, '最需要加強的關卡：'), h('ul', { class: 'weak-list' }, top.map(([k, v]) =>
              h('li', {}, `${label(v.q)}：錯題 ${v.n} 題（答對率 ${pct(p.stats[k])}）`))))
          : '目前沒有錯題。');
        const recentWrong = p.wrongBook.slice(-10).reverse();
        recent.replaceChildren(recentWrong.length ? h('details', {}, h('summary', {}, '最近答錯的題目'),
          recentWrong.map((w) => h('div', { class: 'wrong-item' },
            h('div', { class: 'wrong-tag' }, label(w.q)),
            h('div', { class: 'wrong-q' }, richText(w.q, w.q.prompt)),
            h('div', { class: 'wrong-a' }, '答案：', richText(w.q, formatAnswer(w.q)))))) : '');
      });
      return h('div', { class: 'report-card' },
        h('h3', {}, `${p.avatar} ${p.name}（${p.grade} 年級）`),
        h('table', { class: 'report-table' },
          h('tr', {}, h('th', {}, '科目'), h('th', {}, '答對率'), h('th', {}, '夥伴貓')),
          subjects.map((s) => h('tr', {},
            h('td', {}, SUBJECT_NAME[s]),
            h('td', {}, pct(p.stats[s])),
            h('td', {}, `${CATS[SUBJECT_CAT[s]].name} Lv.${levelOf(p.cats[SUBJECT_CAT[s]]?.xp || 0)}`)))),
        weak,
        h('div', { class: 'muted' }, `錯題本：${p.wrongBook.length} 題`),
        recent,
      );
    });
  }

  // ---------- 存檔 ----------
  function backup() {
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await modal({ title: '匯入存檔？', body: '匯入後，這台 iPad 上現在的進度會被檔案裡的進度取代。',
        actions: [{ label: '取消', value: false }, { label: '匯入', value: true, kind: 'primary' }] });
      if (!ok) return;
      try {
        store.importData(await file.text());
        toast('匯入完成');
        render();
      } catch (err) {
        modal({ title: '匯入失敗', body: err.message });
      }
    } });
    return [
      h('p', {}, '進度只存在這台 iPad 的這個瀏覽器裡。清除瀏覽資料、換 iPad 之前，請先匯出備份。'),
      h('p', { class: 'muted' }, `上次匯出：${fmtDate(store.lastBackupAt())}`),
      h('div', { class: 'panel-actions' },
        h('button', { class: 'btn primary', onclick: exportSave }, '⬇️ 匯出存檔'),
        h('button', { class: 'btn', onclick: () => fileInput.click() }, '⬆️ 匯入存檔'),
        fileInput),
      !store.isStorageOk() ? h('div', { class: 'warn' }, '⚠️ 這個瀏覽器目前不能存檔（可能是無痕模式）。') : null,
    ];
  }

  async function exportSave() {
    const text = store.exportData();
    const d = new Date();
    const name = `喵喵學園存檔-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        store.markBackedUp();
        toast('已匯出');
        render();
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    store.markBackedUp();
    toast('已匯出');
    render();
  }

  // ---------- 使用說明 ----------
  function help() {
    const standalone = window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
    return [
      standalone ? null : h('div', { class: 'warn' }, '目前不是從主畫面開啟。建議照下面第 1 點加入主畫面，全螢幕比較好玩，存檔也比較穩。'),
      h('h3', {}, '1. 加入 iPad 主畫面'),
      h('ol', { class: 'help-list' },
        h('li', {}, '用 Safari 打開遊戲網址'),
        h('li', {}, '按網址列旁邊的「分享」按鈕（方框加向上箭頭）'),
        h('li', {}, '選「加入主畫面」，再按「新增」'),
        h('li', {}, '之後從主畫面的「喵喵學園」圖示開啟')),
      h('h3', {}, '2. 存檔要定期備份'),
      h('p', {}, '進度只存在這台 iPad 的這個瀏覽器裡。清除 Safari 資料、換 iPad 前，請到「存檔」分頁按「匯出存檔」，把檔案存到「檔案」App 或傳給自己。'),
      h('h3', {}, '3. 小孩怎麼玩'),
      h('ul', { class: 'help-list' },
        h('li', {}, '在首頁點自己的頭像，輸入密碼（一年級是依序點 3 張圖）'),
        h('li', {}, '每一招都要答一題；答錯的題目會收進錯題本，之後再出現'),
        h('li', {}, '打倒大魔王、拿到三顆星、完成每日任務可以得到家具，到「我的喵屋」擺放'),
        h('li', {}, '五年級的大魔王可以選「限時挑戰」，每題 40 秒')),
      h('h3', {}, '4. 需要網路的地方'),
      h('p', {}, '打開遊戲和「我的喵屋」的 3D 畫面需要網路；答題、存檔不需要。'),
    ];
  }

  // ---------- 設定 ----------
  function settings() {
    const s = store.settings();
    return [
      h('div', { class: 'setting-row' }, h('span', {}, '聲音（語音和音效）'),
        h('button', { class: `btn ${s.muted ? '' : 'primary'}`, onclick: () => { s.muted = !s.muted; store.save(); render(); } }, s.muted ? '已關閉' : '開啟中')),
      h('div', { class: 'setting-row' }, h('span', {}, '朗讀速度'),
        h('div', { class: 'grade-row' }, [[0.75, '慢'], [0.9, '中'], [1.05, '快']].map(([v, l]) =>
          h('button', { class: `btn small ${s.voiceRate === v ? 'primary' : ''}`, onclick: () => { s.voiceRate = v; store.save(); render(); } }, l)))),
      h('div', { class: 'setting-row' }, h('span', {}, `語音：${speechAvailable() ? voiceInfo() : '這個瀏覽器不支援'}`),
        h('button', { class: 'btn small', onclick: () => speak('哪一個是，貓咪的注音？ㄇㄠ，貓。') }, '🔊 測試')),
      h('div', { class: 'setting-row' }, h('span', {}, '存檔狀態'), h('span', {}, store.isStorageOk() ? '✅ 可以存檔' : '⚠️ 不能存檔')),
      h('div', { class: 'setting-row' }, h('span', {}, '家長 PIN'),
        h('button', { class: 'btn small', onclick: async () => {
          const pin = await createPin({ title: '設定新的家長 PIN', length: 6 });
          if (pin == null) return;
          store.setParentPinHash(await store.hashPin('parent:' + pin));
          toast('家長 PIN 已更新');
        } }, '更改')),
    ];
  }

  root.append(h('div', { class: 'parent' },
    h('div', { class: 'topbar' },
      h('button', { class: 'btn icon', 'aria-label': '返回', onclick: () => go('home') }, '◀'),
      h('div', { class: 'who' }, '👪 家長區'),
    ),
    tabs, body));

  gate().then((ok) => {
    if (!ok) return go('home');
    render();
    if (params.setup && !store.listPlayers().length) addPlayer();
  });
}
