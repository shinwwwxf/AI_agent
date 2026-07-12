document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initClock();

  const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.opacity = '0';
    toast.style.backgroundColor = isError ? '#ff5f56' : '#e8a33d';
    toast.style.color = isError ? '#fff' : '#121212';
    toast.style.padding = '12px 28px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    toast.style.zIndex = '99999';
    toast.style.fontSize = '0.95rem';
    toast.style.fontWeight = '600';
    toast.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    toast.textContent = message;

    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    }, 50);

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const vocabData = await Vocabulary.load();
  const words = vocabData.words;
  const dateKey = vocabData.dateKey;
  const dayName = vocabData.dayName;

  let studyStartTime = new Date();

  const badgeEl = document.getElementById('vocab-day-badge');
  const subTitleEl = document.querySelector('#panel-vocab .panel-head p.sub');
  
  if (vocabData.isFriday) {
    if (badgeEl) badgeEl.textContent = `週五錯題總複習`;
    if (subTitleEl) subTitleEl.textContent = `今天不抽新單字！系統已自動彙整本週一到週四答錯的單字進行特訓！`;
  } else {
    if (badgeEl) badgeEl.textContent = `${dayName}單字`;
  }

  Vocabulary.renderCards(document.getElementById('vocab-cards'));

  const startQuizBtn = document.getElementById('start-quiz-btn');
  if (startQuizBtn) {
    startQuizBtn.addEventListener('click', () => {
      if (words.length === 0) {
        showToast("今天沒有需要測驗的單字唷！", false);
        return;
      }
      document.getElementById('vocab-learn-view').classList.add('hidden');
      document.getElementById('vocab-result-view').classList.add('hidden');
      document.getElementById('vocab-quiz-view').classList.remove('hidden');
      Quiz.build(words, Vocabulary.getFullBank());
      Quiz.start(onQuizFinish);
    });
  }

  const retryQuizBtn = document.getElementById('retry-quiz-btn');
  if (retryQuizBtn) {
    retryQuizBtn.addEventListener('click', () => {
      studyStartTime = new Date(); 
      document.getElementById('vocab-result-view').classList.add('hidden');
      document.getElementById('vocab-quiz-view').classList.remove('hidden');
      Quiz.build(words, Vocabulary.getFullBank());
      Quiz.start(onQuizFinish);
    });
  }

  function onQuizFinish(correctCount, totalCount, dailyRecord) {
    document.getElementById('vocab-quiz-view').classList.add('hidden');
    document.getElementById('vocab-result-view').classList.remove('hidden');
    
    const endTime = new Date();
    const diffMs = endTime - studyStartTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    const durationText = `${diffMins} 分 ${diffSecs} 秒`;

    Vocabulary.saveDailyLog(dateKey, dayName, dailyRecord, durationText);
    
    const pct = Math.round((correctCount / totalCount) * 100) || 0;
    const scoreRing = document.getElementById('score-ring');
    const scoreText = document.getElementById('score-text');
    if (scoreRing) scoreRing.style.setProperty('--pct', pct);
    if (scoreText) scoreText.textContent = `${correctCount}/${totalCount}`;
    
    let msgs = `<b>🎉 恭喜通關！你已成功把今天的所有錯題重考複習完畢！</b><br>`;
    msgs += `<small style="color:#aaa;">本次共花費時間：${durationText}</small><br><br>`;
    if (pct === 100) {
      msgs += '滿分！第一輪就完全答對，太強了！☀️';
    } else {
      msgs += '太棒了！雖然初測有錯題，但你剛剛已經透過「變換題型」全部複習答對了！💪';
    }
    const resultMsgEl = document.getElementById('result-message');
    if (resultMsgEl) resultMsgEl.innerHTML = msgs;
  }

  const monthSelect = document.getElementById('history-month-select');
  const dateSelect = document.getElementById('history-date-select');
  const navHistoryBtn = document.getElementById('nav-history-btn');

  if (navHistoryBtn) {
    navHistoryBtn.addEventListener('click', () => {
      initCombinedDropdowns();
      renderHistoryPage();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      updateDateDropdownOnly();
      renderHistoryPage();
    });
  }

  if (dateSelect) {
    dateSelect.addEventListener('change', () => {
      renderHistoryPage();
    });
  }

  function initCombinedDropdowns() {
    if (!monthSelect) return;
    const monthsSet = new Set();

    Vocabulary.getAllLogs().forEach(log => {
      if (log.date && log.date.length >= 7) monthsSet.add(log.date.substring(0, 7));
    });

    if (typeof Reminder !== 'undefined' && Reminder.getAllReminderLogs) {
      Reminder.getAllReminderLogs().forEach(log => {
        if (log.date && log.date.length >= 7) monthsSet.add(log.date.substring(0, 7));
      });
    }

    if (monthsSet.size === 0) {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      monthsSet.add(thisMonth);
    }

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    const currentSelected = monthSelect.value;

    monthSelect.innerHTML = sortedMonths.map(m => {
      const parts = m.split('-');
      return `<option value="${m}">${parts[0]}年${parts[1]}月</option>`;
    }).join('');

    if (currentSelected && sortedMonths.includes(currentSelected)) {
      monthSelect.value = currentSelected;
    } else {
      monthSelect.value = sortedMonths[0];
    }

    updateDateDropdownOnly();
  }

  function updateDateDropdownOnly() {
    if (!monthSelect || !dateSelect) return;
    const targetMonth = monthSelect.value;
    if (!targetMonth) return;

    const datesSet = new Set();

    Vocabulary.getAllLogs().forEach(log => {
      if (log.date && log.date.startsWith(targetMonth)) datesSet.add(log.date);
    });

    if (typeof Reminder !== 'undefined' && Reminder.getAllReminderLogs) {
      Reminder.getAllReminderLogs().forEach(log => {
        if (log.date && log.date.startsWith(targetMonth)) datesSet.add(log.date);
      });
    }

    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    let optionsHtml = `<option value="ALL_MONTH">-- 顯示整月所有紀錄 --</option>`;
    
    optionsHtml += sortedDates.map(dt => {
      const dayNum = dt.split('-')[2]; 
      return `<option value="${dt}">${dayNum}日</option>`;
    }).join('');

    dateSelect.innerHTML = optionsHtml;
  }

  function renderHistoryPage() {
    const container = document.getElementById('history-page-container');
    if (!container) return;

    const allLogs = Vocabulary.getAllLogs();
    const targetMonth = monthSelect ? monthSelect.value : '';
    const targetDate = dateSelect ? dateSelect.value : '';

    if (allLogs.length === 0 || !targetMonth) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#666; font-size:0.95rem;">
          📭 目前尚無任何單字測驗歷史紀錄。
        </div>`;
      return;
    }

    let logsToRender = [];
    if (targetDate === "ALL_MONTH" || !targetDate) {
      logsToRender = allLogs.filter(log => log.date && log.date.startsWith(targetMonth));
    } else {
      logsToRender = allLogs.filter(log => log.date === targetDate);
    }

    if (logsToRender.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:#777;">該選擇時段內無單字紀錄。</div>`;
      return;
    }

    container.innerHTML = logsToRender.map(log => `
      <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px;">
        <h3 style="margin-bottom: 12px; font-size: 1.01rem; color: #e8a33d; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <span>📅 日期：${log.date} (${log.dayName || '測驗日'})</span>
          <span style="font-size:0.85em; color:#aaa; font-weight:normal;">⏱️ 總用時：<b style="color:#fff;">${log.duration || '未計時'}</b></span>
        </h3>
        <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); color: #aaa;">
              <th style="padding:6px 4px; width:40%;">單字 (Word)</th>
              <th style="padding:6px 4px; width:30%;">第一輪初測</th>
              <th style="padding:6px 4px; width:30%;">最終狀態</th>
            </tr>
          </thead>
          <tbody>
            ${log.details.map(item => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding:8px 4px;"><strong>${item.word}</strong></td>
                <td style="padding:8px 4px;">
                  ${item.correct 
                    ? '<span style="color:#4caf50; font-weight:600;">✔ (對)</span>' 
                    : '<span style="color:#ff5f56; font-weight:600;">❌ (錯)</span>'}
                </td>
                <td style="padding:8px 4px;">
                  <span style="color:#4caf50;">✔ 已全部重考複習完畢</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

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
      const targetPanel = document.getElementById(btn.dataset.target);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

function initClock() {
  const clockEl = document.getElementById('clock-display');
  const dateEl = document.getElementById('date-display');

  function update() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    
    if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss}`;
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
      });
    }
  }
  update();
  setInterval(update, 1000);
}