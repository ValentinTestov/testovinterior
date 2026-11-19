import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const secret = (process.env.METRIKA_TOKEN || '').trim();
const fragment = secret.slice(secret.indexOf('#') + 1);
const token = (new URLSearchParams(fragment).get('access_token') ??
  (/^https?:\/\//i.test(secret) ? '' : secret.replace(/^(OAuth|Bearer)\s+/i, ''))).trim();
if (!token) throw new Error('Добавьте METRIKA_TOKEN с правом metrika:read в секреты репозитория.');

const counterId = '112145522';
const through = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
const visitorsSince = twoMonthsBefore(through);
const trackingStarted = '2026-11-18'; // Первый выпуск с ti_tool_used и ti_contact_click.
const eventsSince = visitorsSince < trackingStarted ? trackingStarted : visitorsSince;
const site = "EXISTS(ym:pv:URL=*'https://valentintestov.github.io/testovinterior/*')";

function twoMonthsBefore(isoDay) {
  const end = new Date(isoDay + 'T00:00:00Z');
  const targetMonth = end.getUTCMonth() - 2;
  const start = new Date(Date.UTC(end.getUTCFullYear(), targetMonth + 1, 0));
  // Короткий месяц заканчивается 28/29/30-го. Обе границы входят в отчёт.
  start.setUTCDate(Math.min(end.getUTCDate(), start.getUTCDate()));
  return start.toISOString().slice(0, 10);
}

function request(url) {
  return fetch(url, {
    headers: { Authorization: 'OAuth ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(60000)
  });
}

// В публичном журнале допустимы только документированные коды, без текста ответа Яндекса.
const publicErrorTypes = new Set(['invalid_token', 'unauthorized', 'access_denied', 'invalid_parameter',
  'missing_parameter', 'filter_limits', 'query_error', 'not_found']);
function statusText(response, body) {
  const code = Array.isArray(body?.errors)
    ? body.errors.find(error => publicErrorTypes.has(error?.error_type))?.error_type
    : undefined;
  return 'HTTP ' + response.status + (code ? ' (' + code + ')' : '');
}

async function accessError(reportStatus) {
  const lookup = new URL('https://api-metrika.yandex.net/management/v1/counters');
  lookup.search = new URLSearchParams({ counter_ids: counterId, per_page: '1' });
  const result = await request(lookup).catch(() => null);
  if (!result) return reportStatus + ' Отдельный запрос доступа к счётчику не получил ответа.';
  const list = await result.json().catch(() => null);
  const summary = reportStatus + ' Проверка доступа к счётчику ' + counterId + ' — ' + statusText(result, list) + '. ';
  if (result.ok && Array.isArray(list?.counters)) {
    return summary + (list.counters.some(counter => String(counter.id) === counterId)
      ? 'Счётчик доступен этому аккаунту. Яндекс отказал в чтении отчёта.'
      : 'Счётчика нет среди доступных этому аккаунту.');
  }
  return summary + 'Для чтения нужны право приложения metrika:read и доступ аккаунта к счётчику.';
}

async function uniqueVisitors(since, parameter) {
  const filter = parameter ? site + " AND EXISTS(ym:s:paramsLevel1=='" + parameter + "')" : site;
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.search = new URLSearchParams({
    ids: counterId, metrics: 'ym:s:users', date1: since, date2: through,
    filters: filter, timezone: '+03:00', accuracy: 'full'
  });
  const response = await request(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const summary = 'Отчёт ' + (parameter || 'посещаемости') + ' — ' + statusText(response, body) + '.';
    if (response.status === 401 || response.status === 403) throw new Error(await accessError(summary));
    throw new Error(summary);
  }
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
