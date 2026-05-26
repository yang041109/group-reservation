/**
 * 로컬 dev 서버(기본 http://localhost:3000) 페이지·버튼 스모크 테스트
 * 사용: node scripts/e2e-smoke.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const results = [];

function log(status, path, detail = '') {
  results.push({ status, path, detail });
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${icon} ${path}${detail ? ` — ${detail}` : ''}`);
}

async function collectPageErrors(page) {
  const errors = [];
  const onConsole = (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  };
  const onPageError = (err) => errors.push(`pageerror: ${err.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  return {
    errors,
    detach: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

async function visit(path, { clickButtons = false, waitMs = 1500 } = {}) {
  const url = `${BASE}${path}`;
  const page = await context.newPage();
  const { errors, detach } = await collectPageErrors(page);
  let httpStatus = 0;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    httpStatus = res?.status() ?? 0;
    await page.waitForTimeout(waitMs);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasNextError = bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error');
    const visibleError = await page.locator('[data-nextjs-dialog]').count();

    if (clickButtons) {
      const buttons = page.locator(
        'button:visible, a[role="button"]:visible, [type="button"]:visible',
      );
      const count = await buttons.count();
      const maxClicks = Math.min(count, 12);
      for (let i = 0; i < maxClicks; i++) {
        try {
          const btn = buttons.nth(i);
          if (!(await btn.isEnabled())) continue;
          await btn.click({ timeout: 3000 });
          await page.waitForTimeout(400);
        } catch {
          /* ignore overlay / navigation failures */
        }
      }
    }

    const fatal = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR'),
    );

    if (httpStatus >= 500 || hasNextError || visibleError > 0) {
      log('fail', path, `HTTP ${httpStatus}${fatal.length ? ` | ${fatal.slice(0, 2).join('; ')}` : ''}`);
    } else if (fatal.length) {
      log('warn', path, fatal.slice(0, 3).join(' | '));
    } else {
      log('ok', path, `HTTP ${httpStatus}`);
    }
  } catch (e) {
    log('fail', path, e.message);
  } finally {
    detach();
    await page.close();
  }
}

let browser;
let context;

try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ locale: 'ko-KR' });

  const staticPaths = [
    '/',
    '/search',
    '/reservations',
    '/admin/manage',
    '/stores/test-store-id',
    '/stores/test-store-id/confirm',
    '/stores/test-store-id/complete',
    '/admin/m/invalid-token-test',
    '/admin/m/invalid-token-test/calendar',
    '/admin/m/invalid-token-test/pending',
    '/admin/m/invalid-token-test/settings',
    '/admin/m/invalid-token-test/closed-dates',
  ];

  for (const p of staticPaths) {
    await visit(p, { clickButtons: false, waitMs: 2000 });
  }

  for (const p of ['/', '/search', '/admin/manage']) {
    await visit(p, { clickButtons: true, waitMs: 1000 });
  }

  const adminRes = await context.request.get(`${BASE}/admin`, { maxRedirects: 0 });
  log(adminRes.status() < 400 ? 'ok' : 'warn', '/admin (redirect)', `HTTP ${adminRes.status()}`);

  const apiChecks = [
    '/api/stores',
    '/api/data/all',
    '/api/admin/health',
  ];
  for (const api of apiChecks) {
    try {
      const r = await context.request.get(`${BASE}${api}`, { timeout: 45000 });
      const text = (await r.text()).slice(0, 120);
      log(r.status() < 500 ? 'ok' : 'fail', api, `HTTP ${r.status()} ${text}`);
    } catch (e) {
      log('fail', api, e.message);
    }
  }
} finally {
  await context?.close();
  await browser?.close();
}

const failed = results.filter((r) => r.status === 'fail');
const warned = results.filter((r) => r.status === 'warn');
console.log('\n--- 요약 ---');
console.log(`총 ${results.length} | 실패 ${failed.length} | 경고 ${warned.length}`);
if (failed.length) process.exitCode = 1;
