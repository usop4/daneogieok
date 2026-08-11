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

  global.quizCommon = {
    $, normalizeLine, escapeHtml, escapeAttr, sampleOne, shuffle, updateStat, renderEmptyTable
  };
})(window);
