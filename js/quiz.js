/* ===========================================================
   quiz.js
   負責：把「今天的 10 個單字」轉成選擇題（單字 → 選對的中文意思）
   干擾選項從整個單字庫中隨機挑選，確保每次測驗選項也會不同。
=========================================================== */

const Quiz = (() => {
  let questions = [];
  let currentIndex = 0;
  let correctCount = 0;
  let onFinishCallback = null;

  function build(todayWords, fullBank) {
    questions = todayWords.map((item) => {
      const distractors = shuffle(
        fullBank.filter((w) => w.word !== item.word)
      ).slice(0, 3).map((w) => w.meaning);

      const options = shuffle([item.meaning, ...distractors]);
      return {
        word: item.word,
        correctAnswer: item.meaning,
        options
      };
    });
    currentIndex = 0;
    correctCount = 0;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start(onFinish) {
    onFinishCallback = onFinish;
    currentIndex = 0;
    correctCount = 0;
    renderQuestion();
  }

  function renderQuestion() {
    const quizCard = document.getElementById('quiz-card');
    const progressBar = document.getElementById('quiz-progress-bar');
    progressBar.style.width = `${(currentIndex / questions.length) * 100}%`;

    if (currentIndex >= questions.length) {
      finish();
      return;
    }

    const q = questions[currentIndex];
    quizCard.innerHTML = `
      <div class="q-eyebrow">第 ${currentIndex + 1} / ${questions.length} 題</div>
      <div class="q-word">${q.word}</div>
      <div class="quiz-options">
        ${q.options.map((opt) => `<button class="quiz-option" data-value="${escapeHtml(opt)}">${opt}</button>`).join('')}
      </div>
    `;

    quizCard.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => handleAnswer(btn, q));
    });
  }

  function escapeHtml(str) {
    return str.replace(/"/g, '&quot;');
  }

  function handleAnswer(btn, q) {
    const chosen = btn.dataset.value;
    const allBtns = btn.parentElement.querySelectorAll('.quiz-option');
    allBtns.forEach((b) => (b.disabled = true));

    if (chosen === q.correctAnswer) {
      btn.classList.add('correct');
      correctCount++;
    } else {
      btn.classList.add('wrong');
      allBtns.forEach((b) => {
        if (b.dataset.value === q.correctAnswer) b.classList.add('correct');
      });
    }

    setTimeout(() => {
      currentIndex++;
      renderQuestion();
    }, 900);
  }

  function finish() {
    const progressBar = document.getElementById('quiz-progress-bar');
    progressBar.style.width = '100%';
    if (onFinishCallback) onFinishCallback(correctCount, questions.length);
  }

  return { build, start };
})();
