const ScormWrapper = (() => {
  let api = null;
  let initialized = false;
  let attemptCounter = 0;

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
      attemptCounter += 1;
      safeSetValue("cmi.core.lesson_status", "incomplete");
      safeSetValue("cmi.core.exit", "");
      api.LMSCommit("");
      console.info(`[SCORM] Sesión inicializada (intento ${attemptCounter})`);
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

  function setSessionTime(milliseconds) {
    if (!initialized || !api) {
      return;
    }

    const formatted = msToScormTime(milliseconds);
    safeSetValue("cmi.core.session_time", formatted);
  }

  function finishAttempt(exitReason = "logout") {
    if (!initialized || !api) {
      return false;
    }

    try {
      safeSetValue("cmi.core.exit", exitReason);
      api.LMSCommit("");
      api.LMSFinish("");
      initialized = false;
      api = null;
      console.info(`[SCORM] Sesión finalizada (motivo: ${exitReason})`);
      return true;
    } catch (err) {
      console.error("[SCORM] Error al finalizar la sesión:", err);
      return false;
    }
  }

  function startNewAttempt() {
    if (initialized) {
      finishAttempt();
    }
    return initialize();
  }

  function relaunchSCO() {
    finishAttempt("logout");
    try {
      const target = window.top && window.top.location ? window.top : window;
      target.location.reload();
      return true;
    } catch (err) {
      console.warn("[SCORM] No se pudo recargar la ventana superior. Reintentando con la actual.", err);
      try {
        window.location.reload();
        return true;
      } catch (innerErr) {
        console.error("[SCORM] Falló la recarga automática del SCO.", innerErr);
        return false;
      }
    }
  }

  return {
    init: initialize,
    reportScore,
    setSessionTime,
    setStatus: (status) => safeSetValue("cmi.core.lesson_status", status),
    finish: finishAttempt,
    finishAttempt,
    startNewAttempt,
    relaunch: relaunchSCO,
    isInitialized: () => initialized,
  };
})();

window.addEventListener("beforeunload", () => {
  ScormWrapper.finishAttempt("time-out");
});

function msToScormTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
