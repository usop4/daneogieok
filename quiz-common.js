(function (global) {
  function $(selector) {
    return document.querySelector(selector);
  }

  function normalizeLine(line) {
    return String(line || '').replace(/\r/g, '').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function sampleOne(array) {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  function shuffle(array) {
    const arr = Array.isArray(array) ? [...array] : [];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function updateStat(selectorOrElement, score) {
    const pill = typeof selectorOrElement === 'string' ? $(selectorOrElement) : selectorOrElement;
    if (!pill || !score) return;
    pill.textContent = `正解=${score.ok} / 不正解=${score.ng}`;
  }

  function renderEmptyTable(selectorOrElement, msg) {
    const table = typeof selectorOrElement === 'string' ? $(selectorOrElement) : selectorOrElement;
    if (!table) return;
    table.innerHTML = `
      <tr><td style="text-align:left;font-size:14px;color:#aab3d6;">${escapeHtml(msg)}</td></tr>
    `;
  }

  function createOutcomeProgress(options) {
    const storageKey = options?.storageKey;
    const getItemKey = options?.getItemKey;
    const score = options?.score;
    const stickyNg = options?.stickyNg === true;
    const outcomes = new Map();

    function readScoreFromStorage(parsed) {
      if (!score || !parsed || !parsed.score || typeof parsed.score !== 'object') return;
      const ok = Number(parsed.score.ok);
      const ng = Number(parsed.score.ng);
      const total = Number(parsed.score.total);
      score.ok = Number.isFinite(ok) ? ok : 0;
      score.ng = Number.isFinite(ng) ? ng : 0;
      score.total = Number.isFinite(total) ? total : 0;
    }

    function readOutcomesFromStorage(parsed) {
      outcomes.clear();
      if (!parsed || !parsed.outcomes || typeof parsed.outcomes !== 'object') return;
      for (const [key, outcome] of Object.entries(parsed.outcomes)) {
        if (!key) continue;
        if (outcome !== 'ok' && outcome !== 'ng') continue;
        outcomes.set(key, outcome);
      }
    }

    function load() {
      if (!storageKey) return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        readScoreFromStorage(parsed);
        readOutcomesFromStorage(parsed);
      } catch (error) {
        console.warn('[quizCommon] Failed to load progress:', error);
      }
    }

    function persist() {
      if (!storageKey || !score) return;
      try {
        const payload = {
          score: {
            ok: Number(score.ok) || 0,
            ng: Number(score.ng) || 0,
            total: Number(score.total) || 0
          },
          outcomes: Object.fromEntries(outcomes.entries())
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (error) {
        console.warn('[quizCommon] Failed to save progress:', error);
      }
    }

    function recordOutcome(item, isCorrect) {
      const key = getItemKey ? getItemKey(item) : null;
      if (!key) return;
      const current = outcomes.get(key);
      if (stickyNg && current === 'ng' && isCorrect) {
        return;
      }
      outcomes.set(key, isCorrect ? 'ok' : 'ng');
    }

    function getOutcome(item) {
      const key = getItemKey ? getItemKey(item) : null;
      if (!key) return undefined;
      return outcomes.get(key);
    }

    function getIncorrectKeys(items) {
      const keys = [];
      for (const item of items || []) {
        const key = getItemKey ? getItemKey(item) : null;
        if (!key) continue;
        if (outcomes.get(key) === 'ng') keys.push(key);
      }
      return keys;
    }

    function resetForStatPill(options = {}) {
      const clearOutcomes = options?.clearOutcomes === true;
      if (score) {
        score.ok = 0;
        score.ng = 0;
        score.total = 0;
      }
      if (clearOutcomes) {
        outcomes.clear();
      }
      persist();
    }

    function buildQuestionOrder(items, mode = 'random') {
      const indices = (items || []).map((_, index) => index);
      if (mode === 'random') {
        return shuffle(indices);
      }

      const okIndices = [];
      const ngIndices = [];
      const unknownIndices = [];

      for (const index of indices) {
        const item = items[index];
        const outcome = getOutcome(item);
        if (outcome === 'ok') {
          okIndices.push(index);
        } else if (outcome === 'ng') {
          ngIndices.push(index);
        } else {
          unknownIndices.push(index);
        }
      }

      if (mode === 'startup') {
        return [...shuffle([...ngIndices, ...unknownIndices]), ...shuffle(okIndices)];
      }

      if (mode === 'prioritize') {
        return [...shuffle(ngIndices), ...shuffle(unknownIndices), ...shuffle(okIndices)];
      }

      return shuffle(indices);
    }

    return {
      load,
      persist,
      recordOutcome,
      getOutcome,
      getIncorrectKeys,
      resetForStatPill,
      buildQuestionOrder
    };
  }

  const DAILY_STATS_STORAGE_KEY = 'quiz-daily-stats-v1';

  function toDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function createEmptyDailyRecord() {
    return { ok: 0, ng: 0 };
  }

  function isValidDailyRecord(value) {
    return Boolean(
      value
      && typeof value === 'object'
      && Number.isFinite(Number(value.ok))
      && Number.isFinite(Number(value.ng))
    );
  }

  function parseDailyStats(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const parsed = {};
    for (const [dateKey, perQuiz] of Object.entries(raw)) {
      if (!dateKey || typeof perQuiz !== 'object' || !perQuiz) continue;
      const quizMap = {};
      for (const [quizId, value] of Object.entries(perQuiz)) {
        if (!quizId || !isValidDailyRecord(value)) continue;
        quizMap[quizId] = {
          ok: Number(value.ok) || 0,
          ng: Number(value.ng) || 0
        };
      }
      parsed[dateKey] = quizMap;
    }
    return parsed;
  }

  function loadDailyStats() {
    try {
      const raw = localStorage.getItem(DAILY_STATS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parseDailyStats(parsed);
    } catch (error) {
      console.warn('[quizCommon] Failed to load daily stats:', error);
      return {};
    }
  }

  function saveDailyStats(stats) {
    try {
      localStorage.setItem(DAILY_STATS_STORAGE_KEY, JSON.stringify(stats || {}));
    } catch (error) {
      console.warn('[quizCommon] Failed to save daily stats:', error);
    }
  }

  function trimDailyStatsToLastNDays(stats, days = 7, refDate = new Date()) {
    const target = stats && typeof stats === 'object' ? { ...stats } : {};
    const keep = new Set();
    for (let offset = 0; offset < days; offset++) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - offset);
      keep.add(toDateKey(d));
    }
    for (const key of Object.keys(target)) {
      if (!keep.has(key)) {
        delete target[key];
      }
    }
    return target;
  }

  function recordDailyQuizOutcome(quizId, isCorrect, date = new Date()) {
    if (!quizId) return;
    const dateKey = toDateKey(date);
    const stats = trimDailyStatsToLastNDays(loadDailyStats(), 7, date);
    if (!stats[dateKey]) stats[dateKey] = {};
    if (!stats[dateKey][quizId]) stats[dateKey][quizId] = createEmptyDailyRecord();
    if (isCorrect) {
      stats[dateKey][quizId].ok += 1;
    } else {
      stats[dateKey][quizId].ng += 1;
    }
    saveDailyStats(stats);
  }

  function getRecentDailyQuizStats(quizIds, days = 7, refDate = new Date()) {
    const ids = Array.isArray(quizIds) ? quizIds.filter(Boolean) : [];
    const stats = trimDailyStatsToLastNDays(loadDailyStats(), days, refDate);
    const rows = [];

    for (let offset = days - 1; offset >= 0; offset--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - offset);
      const dateKey = toDateKey(d);
      const perQuiz = {};
      for (const quizId of ids) {
        const source = stats?.[dateKey]?.[quizId];
        perQuiz[quizId] = source
          ? { ok: Number(source.ok) || 0, ng: Number(source.ng) || 0 }
          : createEmptyDailyRecord();
      }
      rows.push({ date: dateKey, quizzes: perQuiz });
    }

    return rows;
  }

  global.quizCommon = {
    $,
    normalizeLine,
    escapeHtml,
    escapeAttr,
    sampleOne,
    shuffle,
    updateStat,
    renderEmptyTable,
    createOutcomeProgress,
    recordDailyQuizOutcome,
    getRecentDailyQuizStats
  };
})(window);
