// 世界地圖：各年級開放的區域、每個區域的單元與關卡。題目來源見 docs/題目格式.md。

export const BATTLE_SIZE = {
  5: { normal: 5, boss: 10 },
  1: { normal: 3, boss: 5 },
};

export const REGIONS = {
  5: [
    { id: 'chinese', name: '文字森林', subject: 'chinese', color: '#7BC47F', icon: '🌳', status: 'soon' },
    { id: 'math', name: '數字火山', subject: 'math', color: '#F28C6B', icon: '🌋', status: 'open',
      source: { kind: 'gen', module: '../gen/math5.js' } },
    { id: 'science', name: '光之草原', subject: 'science', color: '#F2C14E', icon: '☀️', status: 'soon' },
    { id: 'social', name: '寶島群島', subject: 'social', color: '#5DADE2', icon: '🏝️', status: 'soon' },
  ],
  1: [
    { id: 'zhuyin', name: '注音森林', subject: 'chinese', color: '#7BC47F', icon: '🌳', status: 'open',
      source: {
        kind: 'bank',
        units: [
          { unit: '首冊-1', title: '第 1–3 課', sections: [
            { section: '1', title: '第一課 貓咪', file: 'g1/chinese/lesson-1.json' },
            { section: '2', title: '第二課 鵝寶寶', file: 'g1/chinese/lesson-2.json' },
            { section: '3', title: '第三課 河馬和河狸', file: 'g1/chinese/lesson-3.json' },
          ], boss: { title: '複習一', section: 'r1', file: 'g1/chinese/review-1.json' } },
          { unit: '首冊-2', title: '第 4–6 課', sections: [
            { section: '4', title: '第四課 笑嘻嘻', file: 'g1/chinese/lesson-4.json' },
            { section: '5', title: '第五課 蹺蹺板', file: 'g1/chinese/lesson-5.json' },
            { section: '6', title: '第六課 謝謝老師', file: 'g1/chinese/lesson-6.json' },
          ], boss: { title: '複習二', section: 'r2', file: 'g1/chinese/review-2.json' } },
          { unit: '首冊-3', title: '第 7–9 課', sections: [
            { section: '7', title: '第七課 龜兔賽跑', file: 'g1/chinese/lesson-7.json' },
            { section: '8', title: '第八課 拔蘿蔔', file: 'g1/chinese/lesson-8.json' },
            { section: '9', title: '第九課 動物狂歡會', file: 'g1/chinese/lesson-9.json' },
          ], boss: { title: '複習三', section: 'r3', file: 'g1/chinese/review-3.json' } },
        ],
      } },
    { id: 'math', name: '數數火山', subject: 'math', color: '#F28C6B', icon: '🌋', status: 'open',
      source: { kind: 'gen', module: '../gen/math1.js' } },
  ],
};

export function regionsFor(grade) {
  return REGIONS[grade] || [];
}

export function findRegion(grade, id) {
  return regionsFor(grade).find((r) => r.id === id) || null;
}
