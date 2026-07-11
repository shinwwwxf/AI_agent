const Vocabulary = (() => {
  let wordBank = [];
  let todayWords = [];
  let currentDayOfWeek = 0; 

  const EPOCH = new Date('2025-01-01T00:00:00');
  const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function seededShuffle(array, seedString) {
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed = (seed * 31 + seedString.charCodeAt(i)) % 2147483647;
    }
    
    // 簡易 LCG 隨機數產生器
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const arrCopy = [...array];
    for (let i = arrCopy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
    }
    return arrCopy;
  }

  async function load() {
    const rawBank = (typeof IELTS_WORDS !== 'undefined') ? IELTS_WORDS : [];
    
    // 清洗資料，過濾如 "←" 等非英文起頭的資料
    wordBank = rawBank.filter(w => w && w.word && /^[a-zA-Z]/.test(w.word.trim()));
    
    return computeToday();
  }

  function computeToday() {
    const now = new Date();
    currentDayOfWeek = now.getDay(); 
    const dateKey = now.toISOString().split('T')[0];
    const dayName = dayNames[currentDayOfWeek];

    // 週五錯題總複習
    if (currentDayOfWeek === 5) {
      todayWords = getWeeklyWrongWords(now);
      return { words: todayWords, isFriday: true, dateKey, dayName };
    } else {
      todayWords = getRandomWordsByDate(now);
      return { words: todayWords, isFriday: false, dateKey, dayName };
    }
  }

  function getRandomWordsByDate(date) {
    const dateKey = date.toISOString().split('T')[0];
    
    // 以當天日期為隨機洗牌 Seed 徹底打亂全字庫
    const shuffledBank = seededShuffle(wordBank, dateKey);
    
    // 取得洗牌後的的前 10 個單字，徹底消除字首擠在同一開頭的死板體驗！
    return shuffledBank.slice(0, 10);
  }

  function getWeeklyWrongWords(currentDate) {
    const wrongWordsMap = new Map();
    const currentMs = currentDate.getTime();
    
    // 往前檢查 4 天 (週一到週四)
    for (let i = 1; i <= 4; i++) {
      const checkDate = new Date(currentMs - i * 24 * 60 * 60 * 1000);
      const key = checkDate.toISOString().split('T')[0];
      const log = JSON.parse(localStorage.getItem(`vocab_log_${key}`)) || {};
      
      if (log.details) {
        log.details.forEach(item => {
          if (!item.correct) {
            const fullWord = wordBank.find(w => w.word.trim().toLowerCase() === item.word.trim().toLowerCase());
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
          console.error("讀取歷史學習日誌解析失敗", e);
        }
      }
    }
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderCards(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    
    if (todayWords.length === 0) {
      containerEl.innerHTML = `
        <div style="text-align:center; padding:40px; color:#aaa; font-size:1.1rem;">
          🎉 太棒了！本週目前沒有任何答錯的單字紀錄，今天不需複習！
        </div>`;
      return;
    }
    
    todayWords.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'vocab-card';
      
      // 相容支援 definition 欄位與 meaning 欄位
      const targetMeaning = item.meaning || item.definition || '（暫無含意）';
      const targetExample = item.example || 'No example available.';
      const posText = item.pos ? ` <span style="font-size:0.7em; color:#e8a33d; margin-left:5px;">[${item.pos}]</span>` : '';
      const exampleCnText = item.example_cn ? `<div><strong>中：</strong>${item.example_cn}</div>` : '';

      card.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="word">${item.word}${posText}</div>
        <div class="meaning">${targetMeaning}</div>
        <div class="example">
          <div style="margin-bottom: 5px;"><strong>英：</strong>${targetExample}</div>
          ${exampleCnText}
        </div>
        <div class="flip-hint" style="color: #e8a33d; margin-top: 10px; font-size:0.8rem;">點擊查看中文與例句 →</div>
      `;
      card.addEventListener('click', () => card.classList.toggle('revealed'));
      containerEl.appendChild(card);
    });
  }

  return { load, computeToday, getTodayWords: () => todayWords, getFullBank: () => wordBank, renderCards, saveDailyLog, getDailyLog, getAllLogs };
})();