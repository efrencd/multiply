(() => {
  const TOTAL_QUESTIONS = 10;
  const MIN_FACTOR = 1;
  const MAX_FACTOR = 9;

  const questionEl = document.getElementById("question");
  const progressTextEl = document.getElementById("progress-text");
  const progressFillEl = document.getElementById("progress-fill");
  const feedbackEl = document.getElementById("feedback");
  const answerInput = document.getElementById("answer");
  const form = document.getElementById("answer-form");
  const summarySection = document.getElementById("summary");
  const exerciseSection = document.getElementById("exercise");
  const hitsEl = document.getElementById("hits");
  const totalEl = document.getElementById("total");
  const finalScoreEl = document.getElementById("final-score");
  const restartBtn = document.getElementById("restart");

  let questions = [];
  let currentIndex = 0;
  let correctAnswers = 0;
  let awaitingNext = false;

  totalEl.textContent = TOTAL_QUESTIONS.toString();

  document.addEventListener("DOMContentLoaded", () => {
    ScormWrapper.init();
    startSession();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (awaitingNext) {
      return;
    }
    processAnswer();
  });

  restartBtn.addEventListener("click", () => {
    startSession();
  });

  function startSession() {
    questions = createQuestions(TOTAL_QUESTIONS);
    currentIndex = 0;
    correctAnswers = 0;
    awaitingNext = false;

    summarySection.hidden = true;
    exerciseSection.hidden = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";

    updateProgress();
    showQuestion();
    focusInput();
    ScormWrapper.setStatus("incomplete");
  }

  function createQuestions(count) {
    return Array.from({ length: count }, () => ({
      a: randomInt(MIN_FACTOR, MAX_FACTOR),
      b: randomInt(MIN_FACTOR, MAX_FACTOR),
    }));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function showQuestion() {
    const { a, b } = questions[currentIndex];
    questionEl.textContent = `${a} × ${b}`;
    answerInput.value = "";
  }

  function updateProgress() {
    const current = Math.min(currentIndex + 1, TOTAL_QUESTIONS);
    progressTextEl.textContent = `Pregunta ${current} de ${TOTAL_QUESTIONS}`;
    const progress = (currentIndex / TOTAL_QUESTIONS) * 100;
    progressFillEl.style.width = `${progress}%`;
  }

  function processAnswer() {
    const userValue = answerInput.value.trim();
    if (userValue === "") {
      showFeedback("Escribe tu respuesta para continuar.", "error");
      focusInput();
      return;
    }

    const userAnswer = Number(userValue);
    const { a, b } = questions[currentIndex];
    const correct = a * b;
    const isCorrect = userAnswer === correct;

    if (isCorrect) {
      correctAnswers += 1;
      showFeedback("¡Correcto!", "success");
    } else {
      showFeedback(`Casi... la respuesta correcta es ${correct}.`, "error");
    }

    awaitingNext = true;
    setTimeout(() => {
      awaitingNext = false;
      goToNextQuestion();
    }, 800);
  }

  function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback feedback--${type === "success" ? "success" : "error"}`;
  }

  function goToNextQuestion() {
    currentIndex += 1;
    if (currentIndex >= TOTAL_QUESTIONS) {
      finishSession();
      return;
    }
    updateProgress();
    showQuestion();
    focusInput();
  }

  function finishSession() {
    updateProgressBarFull();
    exerciseSection.hidden = true;
    summarySection.hidden = false;

    const score = Math.round((correctAnswers / TOTAL_QUESTIONS) * 100);
    hitsEl.textContent = correctAnswers.toString();
    finalScoreEl.textContent = `${score}%`;

    ScormWrapper.reportScore(correctAnswers, TOTAL_QUESTIONS);
    focusRestartButton();
  }

  function updateProgressBarFull() {
    progressTextEl.textContent = `Pregunta ${TOTAL_QUESTIONS} de ${TOTAL_QUESTIONS}`;
    progressFillEl.style.width = "100%";
  }

  function focusInput() {
    setTimeout(() => answerInput.focus(), 0);
  }

  function focusRestartButton() {
    setTimeout(() => restartBtn.focus(), 0);
  }
})();
