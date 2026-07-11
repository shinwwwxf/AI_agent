/* ===========================================================
   quiz.js
   負責：將單字轉成選擇題（三種題型隨機混合），答錯的題目下一輪強制變換題型重考，直到全對。
=========================================================== */

const Quiz = (() => {
  let fullBank = [];
  let originalWords = [];       
  let currentQuizQueue = [];    
  let wrongStageQueue = [];     
  
  let currentIndex = 0;
  let originalCorrectCount = 0; 
  let isFirstRound = true;      
  let dailyRecord = [];         
  let onFinishCallback = null;

  function build(todayWords, bank) {
    fullBank = bank;
    originalWords = [...todayWords];
    currentQuizQueue = generateQuestions(originalWords);
    wrongStageQueue = [];
    currentIndex = 0;
    originalCorrectCount = 0;
    isFirstRound = true;
    dailyRecord = originalWords.map(w => ({ word: w.word, correct: true }));
  }

  function generateQuestions(wordsArray) {
    const types = ['ENG_TO_CH', 'CH_TO_ENG', 'FILL_BLANK'];
    return wordsArray.map((item) => {
      const type = types[Math.floor(Math.random() * types.length)];
      
      let questionText = '';
      let correctAnswer = '';
      let distractorSource = [];

      if (type === 'ENG_TO_CH') {
        questionText = `【英翻中】請選出單字「 <b style="color:#e8a33d;">${item.word}</b> 」的正確中文意思：`;
        correctAnswer = item.meaning;
        distractorSource = fullBank.filter(w => w.word !== item.word).map(w => w.meaning);
      } else if (type === 'CH_TO_ENG') {
        questionText = `【中翻英】請選出中文「 <b style="color:#e8a33d;">${item.meaning}</b> 」的正確英文單字：`;
        correctAnswer = item.word;
        distractorSource = fullBank.filter(w => w.word !== item.word).map(w => w.word);
      } else {
        const regex = new RegExp(item.word, 'gi');
        const blankExample = item.example ? item.example.replace(regex, '______') : `______ (${item.meaning})`;
        questionText = `【例句填空】請選出適合填入空格的單字：<br><br><i style="color:#bbb;">${blankExample}</i><br><br><b>提示：</b>${item.example_cn || item.meaning}`;
        correctAnswer = item.word;
        distractorSource = fullBank.filter(w => w.word !== item.word).map(w => w.word);
      }

      const distractors = shuffle(distractorSource).slice(0, 3);
      const options = shuffle([correctAnswer, ...distractors]);

      return {
        rawItem: item, 
        type,
        questionText,
        correctAnswer,
        options
      };
    });
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
    renderQuestion();
  }

  function renderQuestion() {
    const quizCard = document.getElementById('quiz-card');
    const progressBar = document.getElementById('quiz-progress-bar');
    
    const totalInThisRound = currentQuizQueue.length;
    progressBar.style.width = `${(currentIndex / totalInThisRound) * 100}%`;

    if (currentIndex >= totalInThisRound) {
      if (isFirstRound) {
        isFirstRound = false; 
      }

      if (wrongStageQueue.length > 0) {
        alert(`這一輪結束！還有 ${wrongStageQueue.length} 個單字答錯。接下來將「變換題型」重新挑戰這些錯字，直到全對為止！`);
        currentQuizQueue = generateQuestions(wrongStageQueue);
        wrongStageQueue = [];
        currentIndex = 0;
        renderQuestion();
      } else {
        finish();
      }
      return;
    }

    const q = currentQuizQueue[currentIndex];
    const roundTitle = isFirstRound ? `今日挑戰` : `🔥 錯題重考地獄`;
    
    quizCard.innerHTML = `
      <div class="q-eyebrow">${roundTitle} ： 第 ${currentIndex + 1} / ${totalInThisRound} 題</div>
      <div class="q-word" style="font-size:1.25rem; line-height:1.6; margin:20px 0; font-weight:500;">${q.questionText}</div>
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
      if (isFirstRound) {
        originalCorrectCount++;
      }
    } else {
      btn.classList.add('wrong');
      allBtns.forEach((b) => {
        if (b.dataset.value === q.correctAnswer) b.classList.add('correct');
      });

      wrongStageQueue.push(q.rawItem);

      if (isFirstRound) {
        const recordItem = dailyRecord.find(r => r.word === q.rawItem.word);
        if (recordItem) recordItem.correct = false;
      }
    }

    setTimeout(() => {
      currentIndex++;
      renderQuestion();
    }, 1200);
  }

  function finish() {
    const progressBar = document.getElementById('quiz-progress-bar');
    progressBar.style.width = '100%';
    if (onFinishCallback) {
      onFinishCallback(originalCorrectCount, originalWords.length, dailyRecord);
    }
  }

  return { build, start };
})();