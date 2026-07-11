/* ===========================================================
   reminder.js
   負責：在設定的工作時段內，每隔 N 分鐘提醒起來運動 X 分鐘
         提醒時會播放聲音（優先播放 audio/ding.mp3，若沒有該檔案
         則自動用瀏覽器 Web Audio API 產生提示音，不需要額外檔案）
         並嘗試跳出瀏覽器通知。
   注意：此為「網頁分頁計時」，分頁需保持開啟才能持續運作。
=========================================================== */

const Reminder = (() => {
  let enabled = false;
  let mode = 'work'; // 'work' | 'break' | 'waiting'
  let remainingSeconds = 0;
  let tickHandle = null;

  const els = {};

  function cacheEls() {
    els.bigTimer = document.getElementById('reminder-big-timer');
    els.timerLabel = document.getElementById('reminder-timer-label');
    els.statusBadge = document.getElementById('reminder-status-badge');
    els.toggleBtn = document.getElementById('reminder-toggle-btn');
    els.testBtn = document.getElementById('reminder-test-btn');
    els.logList = document.getElementById('reminder-log-list');
    els.morningStart = document.getElementById('morning-start');
    els.morningEnd = document.getElementById('morning-end');
    els.afternoonStart = document.getElementById('afternoon-start');
    els.afternoonEnd = document.getElementById('afternoon-end');
    els.intervalMinutes = document.getElementById('interval-minutes');
    els.exerciseMinutes = document.getElementById('exercise-minutes');
  }

  function init() {
    cacheEls();
    els.toggleBtn.addEventListener('click', toggle);
    els.testBtn.addEventListener('click', () => playSound());
    if ('Notification' in window && Notification.permission === 'default') {
      // 先不主動跳權限視窗打擾使用者，等啟動時才要求
    }
    renderIdle();
    tickHandle = setInterval(tick, 1000);
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      mode = 'work';
      remainingSeconds = getIntervalMinutes() * 60;
      els.toggleBtn.textContent = '停止提醒';
      els.toggleBtn.classList.remove('primary');
      els.toggleBtn.classList.add('ghost');
      log('提醒已啟動');
    } else {
      els.toggleBtn.textContent = '啟動提醒';
      els.toggleBtn.classList.add('primary');
      els.toggleBtn.classList.remove('ghost');
      renderIdle();
      log('提醒已停止');
    }
  }

  function getIntervalMinutes() {
    return Math.max(5, parseInt(els.intervalMinutes.value, 10) || 40);
  }
  function getExerciseMinutes() {
    return Math.max(1, parseInt(els.exerciseMinutes.value, 10) || 5);
  }

  function withinWindows(now) {
    const windows = [
      [els.morningStart.value, els.morningEnd.value],
      [els.afternoonStart.value, els.afternoonEnd.value]
    ];
    const cur = now.getHours() * 60 + now.getMinutes();
    return windows.some(([start, end]) => {
      if (!start || !end) return false;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const s = sh * 60 + sm, e = eh * 60 + em;
      return cur >= s && cur < e;
    });
  }

  function tick() {
    if (!enabled) return;

    const now = new Date();
    if (!withinWindows(now)) {
      mode = 'waiting';
      renderWaiting();
      return;
    }

    // 剛從等待狀態進入工作時段：重新起算
    if (mode === 'waiting') {
      mode = 'work';
      remainingSeconds = getIntervalMinutes() * 60;
    }

    remainingSeconds--;

    if (remainingSeconds <= 0) {
      if (mode === 'work') {
        mode = 'break';
        remainingSeconds = getExerciseMinutes() * 60;
        playSound();
        notify('該起來動一動囉！', `休息 ${getExerciseMinutes()} 分鐘，動一動再回來 💪`);
        log(`⏰ ${formatTime(now)} 提醒起身運動 ${getExerciseMinutes()} 分鐘`);
      } else if (mode === 'break') {
        mode = 'work';
        remainingSeconds = getIntervalMinutes() * 60;
        playSound();
        notify('休息結束', '準備回到工作崗位囉，繼續加油！');
        log(`✅ ${formatTime(now)} 運動結束，回到工作`);
      }
    }

    render();
  }

  function render() {
    els.bigTimer.textContent = formatCountdown(remainingSeconds);
    if (mode === 'break') {
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
    els.timerLabel.textContent = '目前非工作時段，等待中';
    els.statusBadge.textContent = '等待工作時段';
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

  function formatTime(d) {
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  function log(message) {
    if (els.logList.querySelector('.empty')) els.logList.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = message;
    els.logList.prepend(li);
  }

  function notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch (e) { /* ignore */ }
    }
  }

  // 播放提示音：優先嘗試 audio/ding.mp3，找不到就用 Web Audio 產生嗶聲
  function playSound() {
    const audio = new Audio('audio/ding.mp3');
    audio.volume = 0.8;
    const playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => beep());
    }
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
    } catch (e) { /* Web Audio unavailable, silently ignore */ }
  }

  return { init };
})();
