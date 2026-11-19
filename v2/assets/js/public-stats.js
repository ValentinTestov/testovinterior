(function () {
  'use strict';

  // Метрика определяет уникальных посетителей за весь период уже в отчёте.
  // Повторять один и тот же параметр на каждом клике этой страницы незачем.
  const sent = new Set();
  function record(parameter) {
    if (sent.has(parameter) || typeof window.ym !== 'function' || window.disableYaCounter112145522) return;
    try {
      if (window.localStorage.getItem('ck') === 'no') return;
      window.ym(112145522, 'params', { [parameter]: 1 });
      sent.add(parameter);
    } catch {
      // Работа инструмента и переход в чат не зависят от доступности аналитики.
    }
  }

  document.addEventListener('testov:tool-used', () => record('ti_tool_used'));
  function contactClick(event) {
    if (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0) return;
    const link = event.target.closest('a[href]');
    if (link && link.protocol === 'https:' && link.hostname === 't.me' && /^\/vtestov\/?$/i.test(link.pathname)) {
      record('ti_contact_click');
    }
  }
  document.addEventListener('click', contactClick, true);
  document.addEventListener('auxclick', contactClick, true);

  const panel = document.querySelector('[data-public-stats]');
  if (!panel) return;

  const numbers = new Intl.NumberFormat('ru-RU');
  const dates = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
  const publishTimes = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
  });
  function parseDay(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('date');
    const date = new Date(iso + 'T00:00:00Z');
    if (date.toISOString().slice(0, 10) !== iso) throw new Error('date');
    return date;
  }
  function render(stats) {
    if (!stats) return false;
    const fields = ['visitors', 'tools', 'contacts'];
    if (!fields.every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0)) return false;
    if (stats.tools > stats.visitors || stats.contacts > stats.visitors) return false;
    const start = parseDay(stats.visitorsSince);
    const eventsStart = parseDay(stats.eventsSince);
    const end = parseDay(stats.through);
    if (stats.visitorsSince > stats.eventsSince || stats.eventsSince > stats.through) return false;
    // Прежние накопительные отчёты имеют тот же формат. Проверяем их период до показа.
    const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    if (months !== 2 || start.getUTCDate() !== Math.min(end.getUTCDate(), lastDay)) return false;
    const published = Date.parse(stats.publishedAt);
    const updated = Number.isFinite(published)
      ? 'Обновлено ' + publishTimes.format(published) + ' МСК'
      : 'Данные на ' + dates.format(end);
    const range = dates.formatRange ? dates.formatRange(start, end) : dates.format(start) + ' — ' + dates.format(end);
    const notes = ['Уникальные посетители за последние 2 месяца', range, updated];
    if (stats.eventsSince > stats.visitorsSince) {
      notes.push('Инструменты и переходы в Telegram учитываются с ' + dates.format(eventsStart));
    }
    fields.forEach(key => {
      panel.querySelector('[data-stat="' + key + '"]').textContent = numbers.format(stats[key]);
    });
    panel.querySelector('[data-stat-period]').textContent = notes.join(' · ');
    panel.hidden = false;
    return true;
  }
  async function github(path) {
    const response = await fetch('https://api.github.com/repos/ValentinTestov/testovinterior/actions/' + path,
      { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('GitHub ' + response.status);
    return response.json();
  }
  async function displayStats() {
    const cacheKey = 'testovinterior:public-stats:v1';
    let cached;
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey));
      if (!render(cached?.stats)) cached = null;
    } catch { cached = null; }
    const runs = await github('workflows/public-stats.yml/runs?branch=main&status=success&per_page=1');
    const run = runs.workflow_runs[0];
    if (!Number.isSafeInteger(run?.id)) return;
    if (cached?.runId === run.id && cached.attempt === run.run_attempt) return;
    const result = await github('runs/' + run.id + '/artifacts');
    const pattern = /^testov-stats_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_visitors-(\d+)_tools-(\d+)_contacts-(\d+)$/;
    const report = result.artifacts.filter(file => !file.expired && pattern.test(file.name))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.id - a.id)[0];
    if (!report) return;
    const match = pattern.exec(report.name);
    const [, visitorsSince, eventsSince, through, visitors, tools, contacts] = match;
    const stats = { visitorsSince, eventsSince, through, publishedAt: report.created_at,
      visitors: Number(visitors), tools: Number(tools), contacts: Number(contacts) };
    if (render(stats)) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ runId: run.id, attempt: run.run_attempt, stats })); } catch {}
    }
  }
  function refreshStats() {
    displayStats().catch(() => { /* При сбое остаётся последняя доступная сводка. */ });
  }
  refreshStats();
  window.addEventListener('pageshow', event => {
    if (event.persisted) refreshStats();
  });
})();
