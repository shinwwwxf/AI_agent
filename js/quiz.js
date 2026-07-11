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
    originalWords = shuffle([...todayWords]);
    currentQuizQueue = generateQuestions(originalWords);
    wrongStageQueue = [];
    currentIndex = 0;
    originalCorrectCount = 0;
    isFirstRound = true;
    
    // 初始化今日紀錄，初測答錯的話會標記為 false
    dailyRecord = originalWords.map(w => ({ word: w.word, correct: true }));
  }

  function generateQuestions(wordsArray) {
    const types = ['ENG_TO_CH', 'CH_TO_ENG', 'FILL_BLANK'];
    return wordsArray.map((item) => {
      const type = types[Math.floor(Math.random() * types.length)];
      
      let questionText = '';
      let correctAnswer = '';
      let distractorSource = [];
      
      // 擷取單字的第一個字母（轉小寫），用來做精準同字首干擾
      const firstLetter = item.word.charAt(0).toLowerCase();

      // 從總字庫中撈出「同字母開頭」且「不是自己」的單字群當干擾備選
      let sameLetterBank = fullBank.filter(w => 
        w.word && 
        w.word.charAt(0).toLowerCase() === firstLetter && 
        w.word.toLowerCase() !== item.word.toLowerCase()
      );

      // 防錯機制：如果同字母開頭的單字太少（少於3個），則放寬使用全字庫做干擾
      if (sameLetterBank.length < 3) {
        sameLetterBank = fullBank.filter(w => w.word && w.word.toLowerCase() !== item.word.toLowerCase());
      }

      if (type === 'ENG_TO_CH') {
        questionText = `【英翻中】請選出單字「 <b style="color:#e8a33d;">${item.word}</b> 」的正確中文意思：`;
        correctAnswer = item.meaning;
        // 同字首英文單字對應的中文含義，達到極高混淆鑑別度
        distractorSource = sameLetterBank.map(w => w.meaning);
      } else if (type === 'CH_TO_ENG') {
        questionText = `【中翻英】請選出中文「 <b style="color:#e8a33d;">${item.meaning}</b> 」的正確英文單字：`;
        correctAnswer = item.word;
        distractorSource = sameLetterBank.map(w => w.word);
      } else {
        // 智慧型遮罩，替換例句中的關鍵字為底線
        const regex = new RegExp(item.word, 'gi');
        const blankExample = item.example ? item.example.replace(regex, '______') : `______ (${item.meaning})`;
        questionText = `【例句填空】請選出最適合填入空格的單字：<br><br><i style="color:#bbb; display:block; line-height:1.5;">${blankExample}</i><br><b>提示(中文意)：</b>${item.meaning}`;
        correctAnswer = item.word;
        distractorSource = sameLetterBank.map(w => w.word);
      }

      // 利用 Set 去除可能重複的翻譯或單字，確保選項不重複
      const cleanCorrectAnswer = (correctAnswer || '').trim();
      const uniqueDistractors = Array.from(new Set(
        distractorSource
          .map(d => (d || '').trim())
          .filter(d => d && d !== cleanCorrectAnswer)
      ));
      
      const distractors = shuffle(uniqueDistractors).slice(0, 3);
      const options = shuffle([cleanCorrectAnswer, ...distractors]);

      return {
        rawItem: item, 
        type,
        questionText,
        correctAnswer: cleanCorrectAnswer,
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
    
    if (!quizCard) return;

    const totalInThisRound = currentQuizQueue.length;
    progressBar.style.width = `${(currentIndex / totalInThisRound) * 100}%`;

    // 檢查當前這一輪是否寫完
    if (currentIndex >= totalInThisRound) {
      if (isFirstRound) {
        isFirstRound = false; // 初測完結，鎖定原始分數
      }

      if (wrongStageQueue.length > 0) {
        // 答錯者進入變換題型的地獄複習，完全免用 window.alert，提供優雅的卡片引導
        quizCard.innerHTML = `
          <div style="text-align:center; padding:30px; animation: fadeIn 0.5s ease;">
            <div style="font-size:3.5rem; margin-bottom:15px;">🔥</div>
            <h3 style="font-size:1.4rem; color:#e8a33d; font-weight:600; margin-bottom:10px;">本輪測驗結束！</h3>
            <p style="font-size:1rem; color:#ccc; margin-bottom:20px; line-height:1.6;">
              你有 <b style="color:#ff5f56; font-size:1.2rem;">${wrongStageQueue.length}</b> 個單字答錯。<br>
              接下來將為您「全面變換題型」，並繼續維持「同字首干擾選項」進行重新測驗，直到全對為止！
            </p>
            <button id="next-stage-btn" style="
              background-color:#e8a33d; color:#121212; border:none; 
              padding:12px 30px; font-size:1rem; font-weight:600; 
              border-radius:8px; cursor:pointer; transition:all 0.2s;
              box-shadow: 0 4px 12px rgba(232, 163, 61, 0.3);
            ">
              進入錯題地獄挑戰
            </button>
          </div>
        `;
        document.getElementById('next-stage-btn').addEventListener('click', () => {
          currentQuizQueue = generateQuestions(wrongStageQueue);
          wrongStageQueue = [];
          currentIndex = 0;
          renderQuestion();
        });
      } else {
        finish();
      }
      return;
    }

    const q = currentQuizQueue[currentIndex];
    const roundTitle = isFirstRound ? `今日初測挑戰 (同字首混淆模式)` : `🔥 錯題變換題型重考地獄`;
    
    quizCard.innerHTML = `
      <div class="q-eyebrow" style="color: #888; font-size: 0.85rem; margin-bottom: 10px;">${roundTitle} ： 第 ${currentIndex + 1} / ${totalInThisRound} 題</div>
      <div class="q-word" style="font-size:1.25rem; line-height:1.6; margin:20px 0; font-weight:500;">${q.questionText}</div>
      <div class="quiz-options" style="display: flex; flex-direction: column; gap: 12px;">
        ${q.options.map((opt) => `<button class="quiz-option" data-value="${escapeHtml(opt)}" style="text-align: left; padding: 14px 20px; border-radius: 8px; font-size: 1rem; cursor: pointer;">${opt}</button>`).join('')}
      </div>
    `;

    quizCard.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => handleAnswer(btn, q));
    });
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
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

      // 答錯了，將此字塞入下一輪複習佇列
      wrongStageQueue.push(q.rawItem);

      // 初測即答錯，將歷史日誌此字對應狀態寫為 ❌ (false)
      if (isFirstRound) {
        const recordItem = dailyRecord.find(r => r.word === q.rawItem.word);
        if (recordItem) recordItem.correct = false;
      }
    }

    // 延遲 1.2 秒切換下一題，以看清正確答案
    setTimeout(() => {
      currentIndex++;
      renderQuestion();
    }, 1200);
  }

  function finish() {
    const progressBar = document.getElementById('quiz-progress-bar');
    if (progressBar) progressBar.style.width = '100%';
    if (onFinishCallback) {
      onFinishCallback(originalCorrectCount, originalWords.length, dailyRecord);
    }
  }

  return { build, start };
})();