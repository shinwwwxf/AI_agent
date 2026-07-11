/* ===========================================================
   vocabulary.js
   負責：依日期輪替 10 個單字、週五自動抓取本週錯字、儲存每日對錯紀錄表。
=========================================================== */

const Vocabulary = (() => {
  let wordBank = [];
  let todayWords = [];
  let currentDayOfWeek = 0; 

  const EPOCH = new Date('2025-01-01T00:00:00');
  const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  async function load() {
    wordBank = (typeof IELTS_WORDS !== 'undefined') ? IELTS_WORDS : [];
    return computeToday();
  }

  function computeToday() {
    const now = new Date();
    currentDayOfWeek = now.getDay(); 
    const dateKey = now.toISOString().split('T')[0];
    const dayName = dayNames[currentDayOfWeek];

    // 判斷是否為星期五 (5)
    if (currentDayOfWeek === 5) {
      todayWords = getWeeklyWrongWords(now);
      return { words: todayWords, isFriday: true, dateKey, dayName };
    } else {
      todayWords = getRandomWordsByDate(now);
      return { words: todayWords, isFriday: false, dateKey, dayName };
    }
  }

  function getRandomWordsByDate(date) {
    const groupSize = 10;
    const totalGroups = Math.floor(wordBank.length / groupSize) || 1;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceEpoch = Math.floor((stripTime(date) - stripTime(EPOCH)) / msPerDay);
    const groupIndex = ((daysSinceEpoch % totalGroups) + totalGroups) % totalGroups;
    
    return wordBank.slice(groupIndex * groupSize, groupIndex * groupSize + groupSize);
  }

  function getWeeklyWrongWords(currentDate) {
    const wrongWordsMap = new Map();
    const currentMs = currentDate.getTime();
    
    for (let i = 1; i <= 4; i++) {
      const checkDate = new Date(currentMs - i * 24 * 60 * 60 * 1000);
      const key = checkDate.toISOString().split('T')[0];
      const log = JSON.parse(localStorage.getItem(`vocab_log_${key}`)) || {};
      
      if (log.details) {
        log.details.forEach(item => {
          if (!item.correct) {
            const fullWord = wordBank.find(w => w.word === item.word);
            if (fullWord) wrongWordsMap.set(fullWord.word, fullWord);
          }
        });
      }
    }
    return Array.from(wrongWordsMap.values());
  }

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 儲存當日紀錄表，包含新增的星期、以及花費總時間
  function saveDailyLog(dateKey, dayName, quizResults, durationText) {
    localStorage.setItem(`vocab_log_${dateKey}`, JSON.stringify({
      date: dateKey,
      dayName: dayName,
      duration: durationText,
      details: quizResults
    }));
  }

  function getDailyLog(dateKey) {
    return JSON.parse(localStorage.getItem(`vocab_log_${dateKey}`)) || null;
  }

  function getAllLogs() {
    const logs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vocab_log_')) {
        try {
          const logData = JSON.parse(localStorage.getItem(key));
          if (logData && logData.date) {
            logs.push(logData);
          }
        } catch (e) {
          console.error("解析紀錄失敗", e);
        }
      }
    }
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderCards(containerEl) {
    containerEl.innerHTML = '';
    if (todayWords.length === 0) {
      containerEl.innerHTML = `
        <div style="text-align:center; padding:40px; color:#aaa; font-size:1.1rem;">
          🎉 太棒了！本週一到週四沒有任何錯字紀錄，今天不需要複習！
        </div>`;
      return;
    }
    
    todayWords.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'vocab-card';
      card.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="word">${item.word} <span style="font-size:0.7em; color:#e8a33d; margin-left:5px;">[${item.pos || '單字'}]</span></div>
        <div class="meaning">${item.meaning}</div>
        <div class="example">
          <div style="margin-bottom: 5px;"><strong>英：</strong>${item.example || 'No example.'}</div>
          <div><strong>中：</strong>${item.example_cn || '（暫無中譯）'}</div>
        </div>
        <div class="flip-hint">點擊查看中文與例句 →</div>
      `;
      card.addEventListener('click', () => card.classList.toggle('revealed'));
      containerEl.appendChild(card);
    });
  }

  return { load, computeToday, getTodayWords: () => todayWords, getFullBank: () => wordBank, renderCards, saveDailyLog, getDailyLog, getAllLogs };
})();