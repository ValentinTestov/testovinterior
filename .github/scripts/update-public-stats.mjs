import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const token = process.env.METRIKA_TOKEN;
if (!token) throw new Error('Добавьте METRIKA_TOKEN с правом metrika:read в секреты репозитория.');

const visitorsSince = '2026-09-01'; // С этой даты счётчик 112145522 есть на сайте.
const eventsSince = '2026-11-18'; // Первый выпуск с ti_tool_used и ti_contact_click.
const through = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
const site = "EXISTS(ym:pv:URL=*'https://valentintestov.github.io/testovinterior/*')";

async function uniqueVisitors(since, parameter) {
  const filter = parameter ? site + " AND EXISTS(ym:s:paramsLevel1=='" + parameter + "')" : site;
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.search = new URLSearchParams({
    ids: '112145522', metrics: 'ym:s:users', date1: since, date2: through,
    filters: filter, timezone: '+03:00', accuracy: 'full'
  });
  const response = await fetch(url, {
    headers: { Authorization: 'OAuth ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error('Метрика вернула HTTP ' + response.status + ' для ' + (parameter || 'посещаемости'));
  const report = await response.json();
  const value = report.totals?.[0];
  if (report.sampled || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Метрика не вернула точное количество посетителей.');
  }
  return value;
}

// По одному запросу на весь период. Сумма дневных значений посчитала бы людей повторно.
const visitors = await uniqueVisitors(visitorsSince);
const tools = await uniqueVisitors(eventsSince, 'ti_tool_used');
const contacts = await uniqueVisitors(eventsSince, 'ti_contact_click');
if (tools > visitors || contacts > visitors) throw new Error('Итоги трёх отчётов расходятся, повторите обновление.');
const snapshot = { visitorsSince, eventsSince, through, visitors, tools, contacts };
await writeFile(join(process.env.RUNNER_TEMP, 'public-stats.json'), JSON.stringify(snapshot, null, 2) + '\n');
// Публичное имя отчёта можно прочитать через GitHub API без входа и скачивания архива.
const name = ['testov-stats', visitorsSince, eventsSince, through,
  'visitors-' + visitors, 'tools-' + tools, 'contacts-' + contacts].join('_');
await appendFile(process.env.GITHUB_OUTPUT, 'artifact=' + name + '\n');
