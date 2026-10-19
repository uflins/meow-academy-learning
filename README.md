# 喵喵學園大冒險

給國小孩子用的期中考複習遊戲：帶著學科貓咪到各區域冒險，每一招都要答一題，答對就攻擊「糊塗怪」。答錯的題目會收進錯題本，之後再出現。

- 平板（iPad 橫向）為主，電腦也能玩
- 不需要帳號；進度存在這台裝置的瀏覽器裡，家長區可以匯出、匯入存檔
- 題目依各節重點自行出題，不收錄課本或參考書原文

## 在本機執行

不需要安裝套件，任何靜態伺服器都可以：

```bash
python3 -m http.server 8123
```

再打開 <http://localhost:8123>。

## 檔案結構

```
index.html          遊戲主頁
css/style.css       樣式
js/main.js          換頁
js/scenes/          首頁、世界地圖、區域、戰鬥、錯題本、家長區
js/engine/          戰鬥與進度規則、抽題、題目畫面、語音、音效
js/gen/             數學出題器（每次產生不同數字）
js/save/            存檔層（目前是瀏覽器 localStorage）
js/art/             貓咪與糊塗怪的 SVG
data/questions/     題庫 JSON
docs/題目格式.md     題目格式與出題器介面
tools/              出題器與題庫的檢查腳本（Node）
```

## 檢查題目

```bash
node tools/test-math5.mjs
node tools/test-math1.mjs
node tools/test-g1-chinese.mjs
```
