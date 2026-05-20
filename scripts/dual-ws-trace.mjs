import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const framesA = [];
const framesB = [];

const browser = await chromium.launch({ headless: true });
const ctxA = await browser.newContext({ geolocation: { latitude: 39.91, longitude: 116.4 }, permissions: ['geolocation'] });
const ctxB = await browser.newContext({ geolocation: { latitude: 39.92, longitude: 116.41 }, permissions: ['geolocation'] });
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();

pageA.on('websocket', (ws) => {
  if (!ws.url().includes('/signal')) return;
  ws.on('framereceived', (e) => framesA.push(JSON.parse(e.payload.toString())));
  ws.on('framesent', (e) => framesA.push({ _sent: JSON.parse(e.payload.toString()) }));
});
pageB.on('websocket', (ws) => {
  if (!ws.url().includes('/signal')) return;
  ws.on('framereceived', (e) => framesB.push(JSON.parse(e.payload.toString())));
});

await pageA.goto(BASE, { waitUntil: 'domcontentloaded' });
await pageA.getByRole('button', { name: '创建房间' }).click();
await pageA.waitForURL(/\/room\//);
const roomUrl = pageA.url();
await pageB.goto(roomUrl, { waitUntil: 'domcontentloaded' });
await pageA.waitForTimeout(5000);

console.log('A frames:', framesA.length, framesA.map((f) => f.type ?? f._sent?.type));
console.log('B frames:', framesB.length, framesB.map((f) => f.type ?? f._sent?.type));
console.log('A members text:', (await pageA.locator('aside').first().textContent())?.slice(0, 80));

await browser.close();
