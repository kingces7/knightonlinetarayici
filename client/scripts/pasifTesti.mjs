// Geliştirme aracı: pasif skill etkisi. DB'de kotestkar'ın ağaç puanları değiştirilip giriş paketindeki savunma/direnç/can değerleri karşılaştırılır. Kullanım: KO_HESAP=… KO_SIFRE=… node scripts/pasifTesti.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
const sql = (q) => execFileSync('sqlcmd', ['-S', '.' + String.fromCharCode(92) + 'SQLEXPRESS', '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-W', '-Q', 'SET NOCOUNT ON; ' + q], { encoding: 'utf8' });
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
for (const [ad, hex] of [['hiç puan', '0x00000000000000000000'], ['1. ağaç 60', '0x00000000003c00000000'], ['2. ağaç 60 (Defense)', '0x0000000000003c000000'], ['3. ağaç 60', '0x000000000000003c0000']]) {
  sql(`UPDATE USERDATA SET strSkill = CAST(${hex} AS varchar(10)) WHERE strUserID='kotestkar'`);
  const s = await t.newPage(); await s.goto('http://localhost:5173/?giris=0'); await s.waitForFunction(() => window.ke?.efektler, null, { timeout: 120000 }); await s.waitForTimeout(2000);
  await s.evaluate(([h, p]) => window.ke.sunucuyaBaglan(h, p), [process.env.KO_HESAP, process.env.KO_SIFRE]); await s.waitForTimeout(1500);
  const b = await s.evaluate(() => { const m = window.ke.benimBilgi; return { savunma: m.toplamSavunma, vurus: m.toplamVurus, direnc: JSON.stringify(m.direnc), can: m.azamiCan, mana: m.azamiMana, skill: m.skillPuanlari.join(',') }; });
  console.log(ad.padEnd(24), JSON.stringify(b)); await s.close();
}
await t.close();
