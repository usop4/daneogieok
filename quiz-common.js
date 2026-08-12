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

    function resetForStatPill() {
      if (score) {
        score.ok = 0;
        score.ng = 0;
        score.total = 0;
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

  global.quizCommon = {
    $, normalizeLine, escapeHtml, escapeAttr, sampleOne, shuffle, updateStat, renderEmptyTable, createOutcomeProgress
  };
})(window);
