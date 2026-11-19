// Geliştirme aracı (ross): bozuk (windows-1252 sanılan CP949) kapı duyurusuyla ışınlanma listesini El Morad ve Karus için açar; NPC penceresinin sağ kenarını da çeker. Edge CDP 9333.
import { chromium } from 'playwright-core';
const [klasor = '.'] = process.argv.slice(2);
const t = await chromium.connectOverCDP('http://127.0.0.1:9333');
const s = await (t.contexts()[0] ?? await t.newContext()).newPage();
await s.setViewportSize({ width: 1600, height: 900 });
const hatalar = []; s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('http://localhost:5173/?giris=0');
await s.waitForFunction(() => window.ke?.arayuz?.(), null, { timeout: 120000 }); await s.waitForTimeout(3000);
// CP949 baytlarını windows-1252 gibi çözerek sunucunun bozuk çıktısını taklit et
const bozuk = (baytlar) => new TextDecoder('windows-1252').decode(new Uint8Array(baytlar));
const kor = (m) => { const e = []; for (const c of m) { const k = c.codePointAt(0); if (k < 128) e.push(k); } return e; };
// "루나 밸리 입구로 이동합니다." — elle CP949 baytları
const metin = bozuk([0xB7, 0xE7, 0xB3, 0xAA, 0x20, 0xB9, 0xF6, 0xB8, 0xAE, 0x20, 0xC0, 0xD4, 0xB1, 0xB8, 0xB7, 0xCE, 0x20, 0xC0, 0xCC, 0xB5, 0xBF, 0xC7, 0xD5, 0xB4, 0xCF, 0xB4, 0xD9, 0x2E]);
for (const [ad, sinif] of [['el', 201], ['ka', 101]]) {
  await s.evaluate(([metin, sinif]) => { window.ke.oyuncu.sinif = sinif; window.ke.arayuz().isinlanmaListesi([
    { ad: 'Luna Valley Entrance', duyuru: metin, ucret: 5000, sec: () => undefined }, { ad: 'Luferson Castle', duyuru: 'Plain English text.', ucret: 0, sec: () => undefined }]); }, [metin, sinif]);
  await s.waitForTimeout(1200); await s.screenshot({ path: `${klasor}/kk_${ad}.png`, clip: { x: 500, y: 100, width: 600, height: 700 } });
  await s.keyboard.press('Escape'); await s.waitForTimeout(300);
}
await s.evaluate(() => { window.ke.arayuz().diyalogDuz('[Potion Merchant]Clepio', 'A great blacksmith like me is hard to find.', [{ yazi: 'I want to trade.', sec: () => undefined }, { yazi: 'Walk away.', sec: () => undefined }]); });
await s.waitForTimeout(900);
const k = await s.evaluate(() => { const b = window.ke.arayuz().diyalog.p.el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
await s.screenshot({ path: `${klasor}/kk_npc.png`, clip: { x: Math.max(0, k.x - 20), y: k.y - 10, width: k.w + 60, height: Math.min(k.h + 20, 700) } });
console.log(JSON.stringify({ hatalar, k }));
await s.close(); await t.close();
