const Reminder = (() => {
  let enabled = false;
  let isPaused = false;
  let mode = 'work'; // 'work' | 'ringing' | 'break' | 'waiting'
  let alarmType = null; // 鬧鈴響起時，記錄下一步要進入哪個階段：'toBreak'（開始運動）| 'toWork'（開始上班）
  let remainingSeconds = 0;
  let tickHandle = null;
  let periodStartTime = null;
  let audioInstance = null; // 用於儲存循環播放的鬧鈴音樂實例

  const els = {};

  function cacheEls() {
    els.bigTimer = document.getElementById('reminder-big-timer');
    els.timerLabel = document.getElementById('reminder-timer-label');
    els.statusBadge = document.getElementById('reminder-status-badge');
    
    els.startBtn = document.getElementById('reminder-start-btn');
    els.pauseBtn = document.getElementById('reminder-pause-btn');
    els.stopBtn = document.getElementById('reminder-stop-btn');
    els.testBtn = document.getElementById('reminder-test-btn');
    
    els.logList = document.getElementById('reminder-log-list');
    
    els.startHour = document.getElementById('window-start-hour');
    els.startMin = document.getElementById('window-start-min');
    els.endHour = document.getElementById('window-end-hour');
    els.endMin = document.getElementById('window-end-min');
    
    els.intervalMinutes = document.getElementById('interval-minutes');
    els.exerciseMinutes = document.getElementById('exercise-minutes');
    
    els.monthSelect = document.getElementById('history-month-select');
    els.dateSelect = document.getElementById('history-date-select');
    els.reminderHistoryContainer = document.getElementById('reminder-history-container');
    
    // 停止鬧鈴／開始運動按鈕元素
    els.stopMusicBtn = document.getElementById('reminder-stop-music-btn');
  }

  function init() {
    cacheEls();
    
    buildHourOptions(els.startHour, 9);
    buildMinOptions(els.startMin, 0);
    buildHourOptions(els.endHour, 18);
    buildMinOptions(els.endMin, 0);

    els.startBtn.addEventListener('click', startSystem);
    els.pauseBtn.addEventListener('click', togglePause);
    els.stopBtn.addEventListener('click', stopSystem);
    els.testBtn.addEventListener('click', () => playSound());

    // 綁定「停止鬧鈴，開始運動」按鈕事件
    if (els.stopMusicBtn) {
      els.stopMusicBtn.addEventListener('click', stopMusicAndStartExercise);
      hideStopMusicBtn(); // 預設隱藏，只有鬧鈴響起時才出現
    }

    els.intervalMinutes.addEventListener('input', () => { if (!enabled) renderIdle(); });
    els.exerciseMinutes.addEventListener('input', () => { if (!enabled) renderIdle(); });
    
    if (els.monthSelect) {
      els.monthSelect.addEventListener('change', () => setTimeout(() => renderReminderHistory(), 60));
    }
    if (els.dateSelect) {
      els.dateSelect.addEventListener('change', () => renderReminderHistory());
    }
    
    const navHistoryBtn = document.getElementById('nav-history-btn');
    if (navHistoryBtn) {
      navHistoryBtn.addEventListener('click', () => setTimeout(() => renderReminderHistory(), 120));
    }

    renderIdle();
    syncUIButtons();
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tick, 1000);
  }

  // 顯示「停止鬧鈴」按鈕（鬧鈴響起時），文字依情境切換
  function showStopMusicBtn(label) {
    if (!els.stopMusicBtn) return;
    els.stopMusicBtn.textContent = label;
    els.stopMusicBtn.classList.remove('hidden-btn');
    els.stopMusicBtn.style.display = 'inline-block';
  }

  // 隱藏「停止鬧鈴」按鈕
  function hideStopMusicBtn() {
    if (!els.stopMusicBtn) return;
    els.stopMusicBtn.classList.add('hidden-btn');
    els.stopMusicBtn.style.display = 'none';
  }

  // 播放持續循環的鬧鈴音樂，直到使用者按下停止
  function playContinuousSound() {
    audioInstance = new Audio('audio/ding.mp3');
    audioInstance.loop = true;
    const p = audioInstance.play();
    if (p && p.catch) {
      p.catch(() => {
        // 若瀏覽器阻擋自動播放音檔，改用系統嗶聲持續提醒
        audioInstance = null;
        beep();
      });
    }
  }

  // 進入「鬧鈴響起中」狀態。type: 'toBreak'（工作結束，準備響鈴後開始運動）
  //                                'toWork'（運動結束，準備響鈴後開始上班）
  function ringAlarm(type) {
    alarmType = type;
    mode = 'ringing';
    playContinuousSound();
    if (type === 'toBreak') {
      showStopMusicBtn('🔕 停止鬧鈴，開始運動');
      notify('該起來動一動囉！', '請按下「停止鬧鈴，開始運動」按鈕');
    } else {
      showStopMusicBtn('🔕 停止鬧鈴，開始上班');
      notify('運動時間結束！', '請按下「停止鬧鈴，開始上班」按鈕');
    }
    render();
  }

  // 使用者按下「停止鬧鈴」：停止鬧鈴音樂，並依 alarmType 自動開始下一階段倒數
  function stopMusicAndStartExercise() {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
      audioInstance = null;
    }
    hideStopMusicBtn();

    if (alarmType === 'toBreak') {
      mode = 'break';
      remainingSeconds = getExerciseMinutes() * 60;
      periodStartTime = new Date();
      log(`🏃 已停止鬧鈴，開始運動：持續 ${getExerciseMinutes()} 分鐘`);
    } else if (alarmType === 'toWork') {
      mode = 'work';
      remainingSeconds = getIntervalMinutes() * 60;
      periodStartTime = new Date();
      log(`💼 已停止鬧鈴，開始上班倒數：持續 ${getIntervalMinutes()} 分鐘`);
    }
    alarmType = null;
    render();
  }

  function buildHourOptions(selectEl, defaultValue) {
    if (!selectEl) return;
    let html = '';
    for (let h = 0; h < 24; h++) {
      const pad = h.toString().padStart(2, '0');
      html += `<option value="${pad}">${pad}</option>`;
    }
    selectEl.innerHTML = html;
    selectEl.value = defaultValue.toString().padStart(2, '0');
  }

  function buildMinOptions(selectEl, defaultValue) {
    if (!selectEl) return;
    let html = '';
    for (let m = 0; m < 60; m++) {
      const pad = m.toString().padStart(2, '0');
      html += `<option value="${pad}">${pad}</option>`;
    }
    selectEl.innerHTML = html;
    selectEl.value = defaultValue.toString().padStart(2, '0');
  }

  function syncUIButtons() {
    if (!enabled) {
      els.startBtn.classList.remove('hidden-btn');
      els.startBtn.style.display = 'inline-block';
      els.pauseBtn.classList.add('hidden-btn');
      els.pauseBtn.style.display = 'none';
      els.stopBtn.classList.add('hidden-btn');
      els.stopBtn.style.display = 'none';
      hideStopMusicBtn();
    } else {
      els.startBtn.classList.add('hidden-btn');
      els.startBtn.style.display = 'none';
      els.pauseBtn.classList.remove('hidden-btn');
      els.pauseBtn.style.display = 'inline-block';
      els.stopBtn.classList.remove('hidden-btn');
      els.stopBtn.style.display = 'inline-block';
      els.pauseBtn.textContent = isPaused ? '恢復計時' : '暫停提醒';
    }
  }

  function startSystem() {
    enabled = true;
    isPaused = false;
    mode = 'work';
    alarmType = null;
    remainingSeconds = getIntervalMinutes() * 60;
    periodStartTime = new Date();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    syncUIButtons();
    render();
    log(`⏰ 系統在 ${formatTo24H(periodStartTime)} 啟動`);
  }

  function togglePause() {
    if (!enabled) return;
    isPaused = !isPaused;
    syncUIButtons();
  }

  function stopSystem() {
    enabled = false;
    isPaused = false;
    alarmType = null;
    if (audioInstance) { audioInstance.pause(); audioInstance = null; }
    hideStopMusicBtn();
    renderIdle();
    syncUIButtons();
    log(`⏹️ 提醒系統已關閉`);
  }

  function getIntervalMinutes() { return Math.max(1, parseInt(els.intervalMinutes.value, 10) || 40); }
  function getExerciseMinutes() { return Math.max(1, parseInt(els.exerciseMinutes.value, 10) || 5); }

  function withinWindows(now) {
    if (!els.startHour || !els.startMin || !els.endHour || !els.endMin) return false;
    const cur = now.getHours() * 60 + now.getMinutes();
    const sMinutes = Number(els.startHour.value) * 60 + Number(els.startMin.value);
    const eMinutes = Number(els.endHour.value) * 60 + Number(els.endMin.value);
    return cur >= sMinutes && cur < eMinutes;
  }

  function tick() {
    // 鬧鈴響起中 (ringing) 時，倒數暫停，只等待使用者按下停止鬧鈴
    if (!enabled || isPaused || mode === 'ringing') return;

    const now = new Date();
    if (!withinWindows(now)) {
      mode = 'waiting';
      renderWaiting();
      return;
    }

    if (mode === 'waiting') {
      mode = 'work';
      remainingSeconds = getIntervalMinutes() * 60;
      periodStartTime = new Date();
    }

    remainingSeconds--;

    if (remainingSeconds <= 0) {
      const endTime = new Date();
      if (mode === 'work') {
        commitToStorage('工作專注', periodStartTime, endTime);
        log(`⏰ ${formatTo24H(endTime)} 工作時間到，鬧鈴響起，請按下停止鬧鈴開始運動`);
        ringAlarm('toBreak'); // 進入「鬧鈴響起中」，持續響鈴直到使用者按停止，才開始運動倒數
      } else if (mode === 'break') {
        commitToStorage('起身運動', periodStartTime, endTime);
        log(`⏰ ${formatTo24H(endTime)} 運動時間到，鬧鈴響起，請按下停止鬧鈴開始上班`);
        ringAlarm('toWork'); // 進入「鬧鈴響起中」，持續響鈴直到使用者按停止，才開始上班倒數
      }
      return;
    }
    render();
  }

  function render() {
    els.bigTimer.textContent = formatCountdown(remainingSeconds);
    if (mode === 'ringing') {
      els.bigTimer.textContent = '⏰⏰⏰';
      els.timerLabel.textContent = alarmType === 'toBreak' ? '鬧鈴響起中・請按下停止鬧鈴開始運動' : '鬧鈴響起中・請按下停止鬧鈴開始上班';
      els.statusBadge.textContent = '鬧鈴響起中';
      els.statusBadge.className = 'reminder-status break';
    } else if (mode === 'break') {
      els.timerLabel.textContent = '運動時間倒數中';
      els.statusBadge.textContent = '運動中';
      els.statusBadge.className = 'reminder-status break';
    } else {
      els.timerLabel.textContent = '下一次提醒倒數';
      els.statusBadge.textContent = '工作中・提醒已啟動';
      els.statusBadge.className = 'reminder-status on';
    }
  }

  function renderWaiting() {
    els.bigTimer.textContent = '--:--';
    els.timerLabel.textContent = '目前非設定工作時段，等待中';
    els.statusBadge.textContent = '等待時段';
    els.statusBadge.className = 'reminder-status on';
  }

  function renderIdle() {
    els.bigTimer.textContent = formatCountdown(getIntervalMinutes() * 60);
    els.timerLabel.textContent = '尚未啟動';
    els.statusBadge.textContent = '未啟動';
    els.statusBadge.className = 'reminder-status';
  }

  function formatCountdown(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.max(0, totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatTo24H(d) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  function log(message) {
    if (els.logList.querySelector('.empty')) els.logList.innerHTML = '';
    const li = document.createElement('li');
    li.style.fontFamily = "'IBM Plex Mono', monospace";
    li.textContent = message;
    els.logList.prepend(li);
  }

  function notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch (e) {}
    }
  }

  function getAllReminderLogs() {
    const data = localStorage.getItem('db_reminder_logs');
    return data ? JSON.parse(data) : [];
  }

  function commitToStorage(activityType, startObj, endObj) {
    const logs = getAllReminderLogs();
    const yyyy = startObj.getFullYear();
    const mm = (startObj.getMonth() + 1).toString().padStart(2, '0');
    const dd = startObj.getDate().toString().padStart(2, '0');
    const item = {
      uuid: Date.now() + Math.random().toString(36).substr(2, 4),
      date: `${yyyy}-${mm}-${dd}`,
      month: `${yyyy}-${mm}`,
      type: activityType,
      start24h: formatTo24H(startObj),
      end24h: formatTo24H(endObj),
      spentSeconds: Math.round((endObj - startObj) / 1000)
    };
    logs.push(item);
    localStorage.setItem('db_reminder_logs', JSON.stringify(logs));
  }

  function renderReminderHistory() {
    if (!els.reminderHistoryContainer) return;
    const logs = getAllReminderLogs();
    const selectedMonth = els.monthSelect ? els.monthSelect.value : '';
    const selectedDate = els.dateSelect ? els.dateSelect.value : '';
    if (logs.length === 0 || !selectedMonth) {
      els.reminderHistoryContainer.innerHTML = `<div style="text-align:center; padding:25px; color:#666; font-size:0.95rem;">📭 目前尚無任何紀錄。</div>`;
      return;
    }
    let filtered = (selectedDate === "ALL_MONTH" || !selectedDate) ? logs.filter(x => x.month === selectedMonth) : logs.filter(x => x.date === selectedDate);
    filtered.sort((a, b) => b.uuid.localeCompare(a.uuid));
    if (filtered.length === 0) {
      els.reminderHistoryContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#777;">該選擇區間內無歷史紀錄。</div>`;
      return;
    }
    els.reminderHistoryContainer.innerHTML = `
      <div style="padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px;">
        <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); color: #aaa;">
              <th style="padding:8px 4px; width: 22%;">日期</th>
              <th style="padding:8px 4px; width: 20%;">項目</th>
              <th style="padding:8px 4px; width: 22%;">開始</th>
              <th style="padding:8px 4px; width: 22%;">結束</th>
              <th style="padding:8px 4px; width: 14%;">歷時</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(row => {
              const pillBg = row.type === '起身運動' ? 'background:#4caf50; color:#fff;' : 'background:#e8a33d; color:#121212;';
              return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding:10px 4px; color:#aaa;">${row.date}</td>
                <td style="padding:10px 4px;"><span style="padding:2px 6px; border-radius:4px; font-size:0.82em; font-weight:600; ${pillBg}">${row.type}</span></td>
                <td style="padding:10px 4px; font-family:'IBM Plex Mono', monospace; color:#fff;">${row.start24h}</td>
                <td style="padding:10px 4px; font-family:'IBM Plex Mono', monospace; color:#fff;">${row.end24h}</td>
                <td style="padding:10px 4px; font-weight:500; color:#e8a33d;">${Math.floor(row.spentSeconds / 60) || 1} 分鐘</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function playSound() {
    const audio = new Audio('audio/ding.mp3');
    audio.volume = 0.8;
    const p = audio.play();
    if (p && p.catch) p.catch(() => beep());
    audio.onerror = () => beep();
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [0, 0.22, 0.44].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 2 ? 1046.5 : 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } catch (e) {}
  }

  return { init, getAllReminderLogs };
})();