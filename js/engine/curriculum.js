// 世界地圖：各年級開放的區域、每個區域的單元與關卡。題目來源見 docs/題目格式.md。

export const BATTLE_SIZE = {
  5: { normal: 5, boss: 10 },
  1: { normal: 3, boss: 5 },
};

export const REGIONS = {
  5: [
    { id: 'chinese', name: '文字森林', subject: 'chinese', color: '#7BC47F', icon: '🌳', status: 'open',
      source: {
        kind: 'bank',
        units: [
          { unit: '一', title: '第一單元 擁夢飛翔', sections: [
            { section: 'L1', title: '第1課 蚊帳大使', file: 'g5/chinese/L1.json' },
            { section: 'L2', title: '第2課 從空中看臺灣', file: 'g5/chinese/L2.json' },
            { section: 'L3', title: '第3課 攀岩高手', file: 'g5/chinese/L3.json' },
            { section: 'M1', title: '學習地圖一', file: 'g5/chinese/M1.json' },
          ], boss: { title: '修辭大魔王（一）', special: 'rhetoric' } },
          { unit: '二', title: '第二單元 生活中的藝術', sections: [
            { section: 'L4', title: '第4課 恆久的美', file: 'g5/chinese/L4.json' },
            { section: 'L5', title: '第5課 它抓得住你', file: 'g5/chinese/L5.json' },
            { section: 'L6', title: '第6課 故事「動」起來', file: 'g5/chinese/L6.json' },
            { section: 'M2', title: '學習地圖二', file: 'g5/chinese/M2.json' },
            { section: 'R1', title: '閱讀階梯一 畫家的天空', file: 'g5/chinese/R1.json' },
          ], boss: { title: '修辭大魔王（二）', special: 'rhetoric' } },
        ],
      } },
    { id: 'math', name: '數字火山', subject: 'math', color: '#F28C6B', icon: '🌋', status: 'open',
      source: { kind: 'gen', module: '../gen/math5.js', bossSpecial: { '4': 'fraction-clones' } } },
    { id: 'science', name: '光之草原', subject: 'science', color: '#F2C14E', icon: '☀️', status: 'open',
      source: {
        kind: 'bank',
        units: [
          { unit: '1', title: '單元 1　太陽與光', sections: [
            { section: '1-1', title: '1-1 太陽和影子', file: 'g5/science/1-1.json' },
            { section: '1-2', title: '1-2 四季的太陽位置', file: 'g5/science/1-2.json' },
            { section: '1-3', title: '1-3 光的折射', file: 'g5/science/1-3.json' },
            { section: '1-4', title: '1-4 美麗的彩虹', file: 'g5/science/1-4.json' },
            { section: '1-5', title: '1-5 放大鏡的聚光與成像', file: 'g5/science/1-5.json' },
          ], boss: { title: '陰影怪', special: 'shadow' } },
          { unit: '2', title: '單元 2　植物世界', sections: [
            { section: '2-1', title: '2-1 根莖葉的功能', file: 'g5/science/2-1.json' },
            { section: '2-2', title: '2-2 花、果實和種子', file: 'g5/science/2-2.json' },
            { section: '2-3', title: '2-3 果實和種子的傳播', file: 'g5/science/2-3.json' },
            { section: '2-4', title: '2-4 營養器官的繁殖', file: 'g5/science/2-4.json' },
            { section: '2-5', title: '2-5 植物與人類生活', file: 'g5/science/2-5.json' },
          ], boss: { title: '枯葉怪' } },
        ],
      } },
    { id: 'social', name: '寶島群島', subject: 'social', color: '#5DADE2', icon: '🏝️', status: 'open',
      source: {
        kind: 'bank',
        units: [
          { unit: '一', title: '單元一　臺灣的位置與先民足跡', sections: [
            { section: '1-1', title: '第1課 從地圖探索位置與發展', file: 'g5/social/1-1.json' },
            { section: '1-2', title: '第2課 史前人們如何善用資源', file: 'g5/social/1-2.json' },
            { section: '1-3', title: '第3課 原住民族的文化與環境', file: 'g5/social/1-3.json' },
          ], boss: { title: '迷路怪', special: 'map' } },
          { unit: '二', title: '單元二　臺灣登上國際舞臺', sections: [
            { section: '2-1', title: '第1課 大航海時代崛起', file: 'g5/social/2-1.json' },
            { section: '2-2', title: '第2課 大航海時代的影響', file: 'g5/social/2-2.json' },
          ], boss: { title: '颱風怪' } },
        ],
      } },
  ],
  1: [
    { id: 'zhuyin', name: '注音森林', subject: 'chinese', color: '#7BC47F', icon: '🌳', status: 'open',
      source: {
        kind: 'bank',
        bubbles: true, // 有注音音檔時，加入「注音泡泡」
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
