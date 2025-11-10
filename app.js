(() => {
  const TOTAL_QUESTIONS = 10;
  const MIN_FACTOR = 1;
  const MAX_FACTOR = 9;
  const NEXT_DELAY_MS = 350;

  const questionEl = document.getElementById("question");
  const progressTextEl = document.getElementById("progress-text");
  const progressFillEl = document.getElementById("progress-fill");
  const feedbackEl = document.getElementById("feedback");
  const answerInput = document.getElementById("answer");
  const form = document.getElementById("answer-form");
  const submitBtn = form.querySelector("button[type='submit']");
  const hitsEl = document.getElementById("hits");
  const totalEl = document.getElementById("total");
  const finalScoreEl = document.getElementById("final-score");
  const finalTimeEl = document.getElementById("final-time");
  const restartBtn = document.getElementById("restart");
  const modal = document.getElementById("result-modal");
  const fullscreenBtn = document.getElementById("fullscreen-toggle");

  let questions = [];
  let currentIndex = 0;
  let correctAnswers = 0;
  let awaitingNext = false;
  let sessionStart = null;

  totalEl.textContent = TOTAL_QUESTIONS.toString();

  document.addEventListener("DOMContentLoaded", () => {
    ScormWrapper.init();
    startSession();
    updateFullscreenButton();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (awaitingNext) {
      return;
    }
    processAnswer();
  });

  restartBtn.addEventListener("click", () => {
    closeModal();
    restartBtn.disabled = true;
    restartBtn.textContent = "Creando nuevo intento...";
    const reloaded = ScormWrapper.relaunch();
    if (!reloaded) {
      const restarted = ScormWrapper.startNewAttempt();
      if (restarted) {
        startSession();
      }
      restartBtn.disabled = false;
      restartBtn.textContent = "Volver a intentarlo";
    }
  });

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      toggleFullscreen();
    });
  }

  document.addEventListener("fullscreenchange", updateFullscreenButton);

  function startSession() {
    questions = createQuestions(TOTAL_QUESTIONS);
    currentIndex = 0;
    correctAnswers = 0;
    awaitingNext = false;
    sessionStart = Date.now();

    answerInput.disabled = false;
    submitBtn.disabled = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    closeModal();

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
    }, NEXT_DELAY_MS);
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

    const score = Math.round((correctAnswers / TOTAL_QUESTIONS) * 100);
    const elapsedMs = sessionStart ? Date.now() - sessionStart : 0;

    hitsEl.textContent = correctAnswers.toString();
    finalScoreEl.textContent = `${score}%`;
    finalTimeEl.textContent = formatDuration(elapsedMs);

    answerInput.disabled = true;
    submitBtn.disabled = true;

    ScormWrapper.reportScore(correctAnswers, TOTAL_QUESTIONS);
    ScormWrapper.setSessionTime(elapsedMs);
    ScormWrapper.finishAttempt();
    openModal();
  }

  function updateProgressBarFull() {
    progressTextEl.textContent = `Pregunta ${TOTAL_QUESTIONS} de ${TOTAL_QUESTIONS}`;
    progressFillEl.style.width = "100%";
  }

  function focusInput() {
    setTimeout(() => answerInput.focus(), 0);
  }

  function openModal() {
    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => restartBtn.focus(), 0);
  }

  function closeModal() {
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
  }

  function toggleFullscreen() {
    const doc = document;
    const docEl = doc.documentElement;
    if (!doc.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
    } else if (doc.exitFullscreen) {
      doc.exitFullscreen();
    }
  }

  function updateFullscreenButton() {
    if (!fullscreenBtn) {
      return;
    }
    const isFull = Boolean(document.fullscreenElement);
    fullscreenBtn.textContent = isFull ? "Salir de pantalla completa" : "Pantalla completa";
    fullscreenBtn.setAttribute("aria-pressed", isFull.toString());
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
})();
