import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const secret = (process.env.METRIKA_TOKEN || '').trim();
const fragment = secret.slice(secret.indexOf('#') + 1);
const token = (new URLSearchParams(fragment).get('access_token') ??
  (/^https?:\/\//i.test(secret) ? '' : secret.replace(/^(OAuth|Bearer)\s+/i, ''))).trim();
if (!token) throw new Error('Добавьте METRIKA_TOKEN с правом metrika:read в секреты репозитория.');

const counterId = '112145522';
const visitorsSince = '2026-09-01'; // С этой даты счётчик 112145522 есть на сайте.
const eventsSince = '2026-11-18'; // Первый выпуск с ti_tool_used и ti_contact_click.
const through = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
const site = "EXISTS(ym:pv:URL=*'https://valentintestov.github.io/testovinterior/*')";

function request(url) {
  return fetch(url, {
    headers: { Authorization: 'OAuth ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(60000)
  });
}

async function accessError(response) {
  const body = await response.json().catch(() => null);
  const invalid = 'Яндекс отклонил токен. Проверьте значение access_token в секрете METRIKA_TOKEN.';
  if (response.status === 401 || body?.errors?.some(error => error.error_type === 'invalid_token')) return invalid;

  // Проверяем доступ исключительно к счётчику сайта. В публичный журнал попадает только результат проверки.
  const lookup = new URL('https://api-metrika.yandex.net/management/v1/counters');
  lookup.search = new URLSearchParams({ counter_ids: counterId, per_page: '1' });
  const result = await request(lookup);
  const list = await result.json().catch(() => null);
  if (result.ok && Array.isArray(list?.counters)) {
    return list.counters.some(counter => String(counter.id) === counterId)
      ? 'Счётчик 112145522 доступен этому аккаунту, но Яндекс отказал в чтении отчёта.'
      : 'Токен принят. Счётчика 112145522 нет среди доступных этому аккаунту.';
  }
  if (list?.errors?.some(error => error.error_type === 'invalid_token')) return invalid;
  return 'Проверка доступа к счётчику 112145522 вернула HTTP ' + result.status +
    '. Проверьте право приложения metrika:read и аккаунт, выдавший токен.';
}

async function uniqueVisitors(since, parameter) {
  const filter = parameter ? site + " AND EXISTS(ym:s:paramsLevel1=='" + parameter + "')" : site;
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.search = new URLSearchParams({
    ids: counterId, metrics: 'ym:s:users', date1: since, date2: through,
    filters: filter, timezone: '+03:00', accuracy: 'full'
  });
  const response = await request(url);
  if (response.status === 401 || response.status === 403) throw new Error(await accessError(response));
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
