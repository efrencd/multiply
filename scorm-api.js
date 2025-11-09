const ScormWrapper = (() => {
  let api = null;
  let initialized = false;

  function findAPI(win) {
    let depth = 0;
    let current = win;

    while (!current.API && current.parent && current.parent !== current && depth < 7) {
      depth += 1;
      current = current.parent;
    }

    return current.API || null;
  }

  function getAPI() {
    if (api) {
      return api;
    }

    let currentWindow = window;
    api = findAPI(currentWindow);

    if (!api && currentWindow.opener) {
      api = findAPI(currentWindow.opener);
    }

    if (!api) {
      console.warn("[SCORM] No se encontró API SCORM en la ventana actual.");
    }

    return api;
  }

  function initialize() {
    api = getAPI();
    if (!api) {
      return false;
    }

    const result = api.LMSInitialize("") === "true";
    initialized = result;

    if (initialized) {
      safeSetValue("cmi.core.lesson_status", "incomplete");
      api.LMSCommit("");
      console.info("[SCORM] Sesión inicializada");
    } else {
      console.warn("[SCORM] LMSInitialize devolvió false");
    }

    return initialized;
  }

  function safeSetValue(element, value) {
    if (!initialized || !api) {
      return;
    }

    try {
      const result = api.LMSSetValue(element, value);
      if (result !== "true") {
        console.warn(`[SCORM] LMSSetValue falló para ${element}`);
      }
    } catch (err) {
      console.error(`[SCORM] Error al asignar ${element}:`, err);
    }
  }

  function reportScore(correctAnswers, totalQuestions) {
    if (!initialized || !api) {
      return;
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    safeSetValue("cmi.core.score.min", "0");
    safeSetValue("cmi.core.score.max", "100");
    safeSetValue("cmi.core.score.raw", score.toString());

    const status = score >= 70 ? "passed" : "failed";
    safeSetValue("cmi.core.lesson_status", status);
    api.LMSCommit("");
    console.info(`[SCORM] Puntaje reportado: ${score} (${status})`);
  }

  function finish() {
    if (!initialized || !api) {
      return;
    }

    try {
      api.LMSCommit("");
      api.LMSFinish("");
      initialized = false;
      console.info("[SCORM] Sesión finalizada");
    } catch (err) {
      console.error("[SCORM] Error al finalizar la sesión:", err);
    }
  }

  return {
    init: initialize,
    reportScore,
    setStatus: (status) => safeSetValue("cmi.core.lesson_status", status),
    finish,
  };
})();

window.addEventListener("beforeunload", () => {
  ScormWrapper.finish();
});
