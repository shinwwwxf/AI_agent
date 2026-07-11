/* ===========================================================
   script.js — App 進入點
   負責：導覽列切換、時鐘顯示、把四個模組的 init 串起來
=========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initClock();

  // ---- 1. 單字學習 + 測驗 ----
  const { words, dayNumber } = await Vocabulary.load();
  document.getElementById('vocab-day-badge').textContent = `Day ${dayNumber}`;
  Vocabulary.renderCards(document.getElementById('vocab-cards'));

  document.getElementById('start-quiz-btn').addEventListener('click', () => {
    Quiz.build(words, Vocabulary.getFullBank());
    document.getElementById('vocab-learn-view').classList.add('hidden');
    document.getElementById('vocab-result-view').classList.add('hidden');
    document.getElementById('vocab-quiz-view').classList.remove('hidden');
    Quiz.start(onQuizFinish);
  });

  document.getElementById('retry-quiz-btn').addEventListener('click', () => {
    document.getElementById('vocab-result-view').classList.add('hidden');
    document.getElementById('vocab-quiz-view').classList.remove('hidden');
    Quiz.build(words, Vocabulary.getFullBank());
    Quiz.start(onQuizFinish);
  });

  function onQuizFinish(correct, total) {
    document.getElementById('vocab-quiz-view').classList.add('hidden');
    document.getElementById('vocab-result-view').classList.remove('hidden');
    const pct = Math.round((correct / total) * 100);
    document.getElementById('score-ring').style.setProperty('--pct', pct);
    document.getElementById('score-text').textContent = `${correct}/${total}`;
    const msgs = pct === 100
      ? '滿分！今天的單字完全記住了 🎉'
      : pct >= 70
      ? '很不錯！再複習一下錯的單字吧 💪'
      : '沒關係，多看幾次卡片再測一次！📚';
    document.getElementById('result-message').textContent = msgs;
  }

  // ---- 2. 起身提醒 ----
  Reminder.init();

  // ---- 3. 即時匯率 ----
  Exchange.init();

  // ---- 4. 輕音樂電台 ----
  Music.init();
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
    clockEl.textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
    dateEl.textContent = now.toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
    });
  }
  update();
  setInterval(update, 1000);
}
