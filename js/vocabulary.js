/* ===========================================================
   vocabulary.js
   負責：讀取 data/ielts7000.js 內的 IELTS_WORDS 陣列，依「今天日期」
         決定要教哪 10 個單字。
   規則：把整份單字庫切成每 10 個一組，用「從某個起始日算起的天數」
         對「組數」取餘數，達到「每天不同、循環復習」的效果。

   注意：資料來源改用 <script src="data/ielts7000.js"> 直接載入的
   全域變數 IELTS_WORDS，而不是 fetch('data/ielts7000.json')。
   這是因為使用者若用「直接雙擊 index.html」開啟（file:// 協定），
   瀏覽器會基於安全性擋掉 fetch 讀取本地檔案，畫面就會整個空白。
   改成 <script> 標籤載入就不受此限制，雙擊即可正常運作。
=========================================================== */

const Vocabulary = (() => {
  let wordBank = [];
  let todayWords = [];

  // 開發者可自行調整起始日期（決定 Day 1 是哪一天）
  const EPOCH = new Date('2025-01-01T00:00:00');

  async function load() {
    wordBank = (typeof IELTS_WORDS !== 'undefined') ? IELTS_WORDS : [];
    return computeToday();
  }

  function computeToday() {
    const groupSize = 10;
    const totalGroups = Math.floor(wordBank.length / groupSize) || 1;

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceEpoch = Math.floor((stripTime(now) - stripTime(EPOCH)) / msPerDay);

    const groupIndex = ((daysSinceEpoch % totalGroups) + totalGroups) % totalGroups;
    const dayNumber = daysSinceEpoch + 1; // 顯示用的「第幾天」

    todayWords = wordBank.slice(groupIndex * groupSize, groupIndex * groupSize + groupSize);
    return { words: todayWords, dayNumber, groupIndex, totalGroups };
  }

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getTodayWords() {
    return todayWords;
  }

  function getFullBank() {
    return wordBank;
  }

  function renderCards(containerEl) {
    containerEl.innerHTML = '';
    todayWords.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'vocab-card';
      card.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="word">${item.word}</div>
        <div class="meaning">${item.meaning}</div>
        <div class="example">${item.example}</div>
        <div class="flip-hint">點擊查看中文與例句 →</div>
      `;
      card.addEventListener('click', () => card.classList.toggle('revealed'));
      containerEl.appendChild(card);
    });
  }

  return { load, computeToday, getTodayWords, getFullBank, renderCards };
})();
