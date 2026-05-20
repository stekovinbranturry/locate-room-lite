/**
 * Dual-browser E2E smoke (Playwright).
 * Usage: node scripts/dual-browser-test.mjs [baseURL]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3002';

const log = (s) => console.log(`[browser-dual] ${s}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const errors = [];

try {
  const ctxA = await browser.newContext({
    geolocation: { latitude: 39.91, longitude: 116.4 },
    permissions: ['geolocation'],
  });
  const ctxB = await browser.newContext({
    geolocation: { latitude: 39.92, longitude: 116.41 },
    permissions: ['geolocation'],
  });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  pageA.on('console', (m) => {
    if (m.type() === 'error') errors.push(`A: ${m.text()}`);
  });
  pageB.on('console', (m) => {
    if (m.type() === 'error') errors.push(`B: ${m.text()}`);
  });

  await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pageA.getByRole('button', { name: '创建房间' }).click();

  await pageA.waitForURL(/\/room\//, { timeout: 15000 });
  const roomUrl = pageA.url();
  log(`A room URL: ${roomUrl}`);

  await pageB.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pageB.waitForTimeout(2000);

  const statusA = await pageA.getByText(/信令:/).textContent();
  const statusB = await pageB.getByText(/信令:/).textContent();
  log(`A status: ${statusA}`);
  log(`B status: ${statusB}`);

  if (!statusA?.includes('已连接')) throw new Error(`A signaling not connected: ${statusA}`);
  if (!statusB?.includes('已连接')) throw new Error(`B signaling not connected: ${statusB}`);

  // Wait for P2P labels or second member in list
  await pageA.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('P2P') || text.includes('成员 (2/4)');
    },
    { timeout: 20000 },
  );
  log('A sees peer / P2P');

  await pageB.waitForFunction(
    () => document.body.innerText.includes('P2P') || document.body.innerText.includes('成员 (2/4)'),
    { timeout: 20000 },
  );
  log('B sees peer / P2P');

  const membersA = await pageA.locator('aside').first().textContent();
  log(`A members panel: ${membersA?.replace(/\s+/g, ' ').slice(0, 120)}`);

  if (errors.length) {
    log(`console errors (${errors.length}):`);
    for (const e of errors.slice(0, 8)) log(`  ${e}`);
  }

  log('PASS: dual browser smoke');
} finally {
  await browser.close();
}
