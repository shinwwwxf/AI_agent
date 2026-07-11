/* ===========================================================
   script.js — App 進入點
   負責：導覽列切換、時鐘顯示、連結各功能模組與獨立渲染歷史紀錄頁面（支援月份與日期分離篩選、學習總時長、星期顯示）。
=========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initClock();

  // ---- 1. 單字學習與計時核心 ----
  const vocabData = await Vocabulary.load();
  const words = vocabData.words;
  const dateKey = vocabData.dateKey;
  const dayName = vocabData.dayName;

  // 記錄開始讀單字的時間點（App 打開即開始計時）
  let studyStartTime = new Date();

  if (vocabData.isFriday) {
    document.getElementById('vocab-day-badge').textContent = `週五錯題總複習`;
    document.querySelector('#panel-vocab .panel-head p.sub').textContent = `今天不抽新單字！系統已自動彙整本週一到週四答錯的單字進行特訓！`;
  } else {
    document.getElementById('vocab-day-badge').textContent = `${dayName}單字`;
  }

  Vocabulary.renderCards(document.getElementById('vocab-cards'));

  // 開始今日測驗
  document.getElementById('start-quiz-btn').addEventListener('click', () => {
    if (words.length === 0) {
      alert("今天沒有需要測驗的單字唷！");
      return;
    }
    document.getElementById('vocab-learn-view').classList.add('hidden');
    document.getElementById('vocab-result-view').classList.add('hidden');
    document.getElementById('vocab-quiz-view').classList.remove('hidden');
    Quiz.build(words, Vocabulary.getFullBank());
    Quiz.start(onQuizFinish);
  });

  // 重新測驗：時間計時重新歸零算起
  document.getElementById('retry-quiz-btn').addEventListener('click', () => {
    studyStartTime = new Date(); // 重新計時
    document.getElementById('vocab-result-view').classList.add('hidden');
    document.getElementById('vocab-quiz-view').classList.remove('hidden');
    Quiz.build(words, Vocabulary.getFullBank());
    Quiz.start(onQuizFinish);
  });

  // 測驗徹底全部通關
  function onQuizFinish(correctCount, totalCount, dailyRecord) {
    document.getElementById('vocab-quiz-view').classList.add('hidden');
    document.getElementById('vocab-result-view').classList.remove('hidden');
    
    // 計算所耗費的時間
    const endTime = new Date();
    const diffMs = endTime - studyStartTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    const durationText = `${diffMins} 分 ${diffSecs} 秒`;

    // 儲存至 LocalStorage (包含星期與時間)
    Vocabulary.saveDailyLog(dateKey, dayName, dailyRecord, durationText);
    
    const pct = Math.round((correctCount / totalCount) * 100) || 0;
    document.getElementById('score-ring').style.setProperty('--pct', pct);
    document.getElementById('score-text').textContent = `${correctCount}/${totalCount}`;
    
    let msgs = `<b>🎉 恭喜通過！你已成功把今天的所有錯題重考複習完畢！</b><br>`;
    msgs += `<small style="color:#aaa;">本次學習測驗共花費時間：${durationText}</small><br><br>`;
    if (pct === 100) {
      msgs += '滿分！第一輪就完全記住了，表現完美！☀️';
    } else {
      msgs += '太棒了！雖然初測有不小心的錯題，但你剛剛已經透過變換題型全對修正完畢了！紀錄已更新。💪';
    }
    document.getElementById('result-message').innerHTML = msgs;
  }

  // ---- 5. 歷史紀錄雙選單分開篩選邏輯 ----
  const monthSelect = document.getElementById('history-month-select');
  const dateSelect = document.getElementById('history-date-select');

  document.getElementById('nav-history-btn').addEventListener('click', () => {
    initMonthDropdown(); // 1. 初始化月份
    updateDateDropdown(); // 2. 聯動產生該月份的日期
    renderHistoryPage();  // 3. 渲染報表
  });

  // 月份更換時，日期選單要聯動刷新
  monthSelect.addEventListener('change', () => {
    updateDateDropdown();
    renderHistoryPage();
  });

  // 日期更換時，刷新畫面
  dateSelect.addEventListener('change', () => {
    renderHistoryPage();
  });

  // 初始化月份選單 (僅擷取 YYYY-MM)
  function initMonthDropdown() {
    const allLogs = Vocabulary.getAllLogs();
    const monthsSet = new Set();

    allLogs.forEach(log => {
      if (log.date && log.date.length >= 7) {
        monthsSet.add(log.date.substring(0, 7)); // 取得 YYYY-MM
      }
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    const currentSelected = monthSelect.value;

    if (sortedMonths.length === 0) {
      monthSelect.innerHTML = `<option value="">尚無資料</option>`;
      return;
    }

    monthSelect.innerHTML = sortedMonths.map(m => {
      const parts = m.split('-');
      return `<option value="${m}">${parts[0]}年${parts[1]}月</option>`;
    }).join('');

    if (currentSelected && sortedMonths.includes(currentSelected)) {
      monthSelect.value = currentSelected;
    } else {
      monthSelect.value = sortedMonths[0];
    }
  }

  // 依據選定的月份，動態填入該月有紀錄的具體天數
  function updateDateDropdown() {
    const allLogs = Vocabulary.getAllLogs();
    const targetMonth = monthSelect.value;

    if (!targetMonth) {
      dateSelect.innerHTML = `<option value="">尚無資料</option>`;
      return;
    }

    // 篩選出該月份的所有紀錄天數
    const monthlyLogs = allLogs.filter(log => log.date && log.date.startsWith(targetMonth));
    
    // 第一個選項為「顯示整月份的所有天數」
    let optionsHtml = `<option value="ALL_MONTH">-- 顯示整月紀錄 --</option>`;
    
    optionsHtml += monthlyLogs.map(log => {
      const dayNum = log.date.split('-')[2]; // 取得 DD
      return `<option value="${log.date}">${dayNum}日 (${log.dayName || '學習日'})</option>`;
    }).join('');

    dateSelect.innerHTML = optionsHtml;
  }

  // 渲染歷史紀錄大表（支援秀出整月或單日紀錄）
  function renderHistoryPage() {
    const container = document.getElementById('history-page-container');
    const allLogs = Vocabulary.getAllLogs();
    const targetMonth = monthSelect.value;
    const targetDate = dateSelect.value;

    if (allLogs.length === 0 || !targetMonth) {
      container.innerHTML = `
        <div style="text-align:center; padding:50px; color:#666; font-size:1.1rem;">
          📭 目前還沒有任何測驗歷史紀錄。<br>當你完成每日單字測驗後，對錯報表會自動存於此處！
        </div>`;
      return;
    }

    let logsToRender = [];

    // 判斷是要秀整個月還是特定單日
    if (targetDate === "ALL_MONTH" || !targetDate) {
      // 撈出該月份所有資料
      logsToRender = allLogs.filter(log => log.date && log.date.startsWith(targetMonth));
    } else {
      // 只抽精準單日資料
      const singleLog = allLogs.find(l => l.date === targetDate);
      if (singleLog) logsToRender.push(singleLog);
    }

    if (logsToRender.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#777;">查無對應紀錄。</div>`;
      return;
    }

    // 巡迴渲染符合條件的所有報表
    container.innerHTML = logsToRender.map(log => `
      <div style="margin-bottom: 30px; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 1.05rem; color: #e8a33d; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <span>📅 日期：${log.date} (${log.dayName || '未知'})</span>
          <span style="font-size:0.85em; color:#aaa; font-weight:normal;">⏱️ 總花費時間：<b style="color:#fff;">${log.duration || '未計時'}</b></span>
        </h3>
        <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(255,255,255,0.15); color: #aaa;">
              <th style="padding:10px 8px; width:40%;">單字 (Word)</th>
              <th style="padding:10px 8px; width:30%;">第一輪初測</th>
              <th style="padding:10px 8px; width:30%;">最終狀態</th>
            </tr>
          </thead>
          <tbody>
            ${log.details.map(item => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding:12px 8px;"><strong>${item.word}</strong></td>
                <td style="padding:12px 8px;">
                  ${item.correct 
                    ? '<span style="color:#4caf50; font-weight:600;">✔ (對)</span>' 
                    : '<span style="color:#f44336; font-weight:600;">❌ (錯)</span>'}
                </td>
                <td style="padding:12px 8px;">
                  <span style="color:#4caf50;">✔ 通過</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

  // ---- 其他舊有模組初始化 ----
  if (typeof Reminder !== 'undefined') Reminder.init();
  if (typeof Exchange !== 'undefined') Exchange.init();
  if (typeof Music !== 'undefined') Music.init();
});

function initNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      navItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
}

function initClock() {
  const clockEl = document.getElementById('clock-display');
  const dateEl = document.getElementById('date-display');

  function update() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
    });
  }
  update();
  setInterval(update, 1000);
}