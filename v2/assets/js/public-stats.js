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
  function displayDate(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('date');
    const date = new Date(iso + 'T00:00:00Z');
    if (date.toISOString().slice(0, 10) !== iso) throw new Error('date');
    return dates.format(date);
  }
  function render(stats) {
    if (!stats) return false;
    const fields = ['visitors', 'tools', 'contacts'];
    if (!fields.every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0)) return false;
    if (stats.tools > stats.visitors || stats.contacts > stats.visitors) return false;
    const visitorsSince = displayDate(stats.visitorsSince);
    const eventsSince = displayDate(stats.eventsSince);
    const through = displayDate(stats.through);
    if (stats.visitorsSince > stats.eventsSince || stats.eventsSince > stats.through) return false;
    fields.forEach(key => {
      panel.querySelector('[data-stat="' + key + '"]').textContent = numbers.format(stats[key]);
    });
    panel.querySelector('[data-stat-period]').textContent =
      'Уникальные посетители · посещения с ' + visitorsSince + ' · действия с ' + eventsSince +
      ' · данные на ' + through;
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
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached && render(cached.stats) && Date.now() - cached.checkedAt < 6 * 3600000) return;
    } catch { /* Закрытое хранилище не мешает получить свежий отчёт. */ }
    const runs = await github('workflows/public-stats.yml/runs?branch=main&status=success&per_page=1');
    const id = runs.workflow_runs[0]?.id;
    if (!Number.isSafeInteger(id)) return;
    const result = await github('runs/' + id + '/artifacts');
    const name = result.artifacts.find(file => !file.expired && file.name.startsWith('testov-stats_'))?.name;
    const pattern = /^testov-stats_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_visitors-(\d+)_tools-(\d+)_contacts-(\d+)$/;
    const match = pattern.exec(name || '');
    if (!match) return;
    const [, visitorsSince, eventsSince, through, visitors, tools, contacts] = match;
    const stats = { visitorsSince, eventsSince, through,
      visitors: Number(visitors), tools: Number(tools), contacts: Number(contacts) };
    if (render(stats)) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ checkedAt: Date.now(), stats })); } catch {}
    }
  }
  displayStats().catch(() => { /* Страница пригодна и без отчёта. */ });
})();
