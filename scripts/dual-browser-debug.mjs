import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3002';
const browser = await chromium.launch({ headless: true });
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

const logs = [];
for (const [tag, page] of [
  ['A', pageA],
  ['B', pageB],
]) {
  page.on('console', (m) => logs.push(`${tag}:${m.type()}:${m.text()}`));
}

await pageA.goto(BASE, { waitUntil: 'domcontentloaded' });
await pageA.getByRole('button', { name: '创建房间' }).click();
await pageA.waitForURL(/\/room\//);
const roomUrl = pageA.url();
await pageB.goto(roomUrl, { waitUntil: 'domcontentloaded' });
await pageA.waitForTimeout(12000);

const bodyA = await pageA.locator('body').innerText();
const bodyB = await pageB.locator('body').innerText();
const rtc = await pageA.evaluate(() => typeof RTCPeerConnection !== 'undefined');

console.log('RTC available:', rtc);
console.log('--- A body excerpt ---');
console.log(bodyA.slice(0, 800));
console.log('--- B body excerpt ---');
console.log(bodyB.slice(0, 800));
console.log('--- console ---');
for (const l of logs.slice(0, 30)) console.log(l);

await browser.close();
