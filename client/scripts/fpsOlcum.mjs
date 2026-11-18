// Geliştirme aracı: harita çizim yükü. Kullanım: node scripts/fpsOlcum.mjs karus2004 elmo2004 14th_oldmoradon   (her harita 1920x1080'de; arazi/nesne/su ayrı ayrı gizlenerek)
import { chromium } from 'playwright-core';
const t = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
for (const harita of process.argv.slice(2)) {
  const s = await t.newPage({ viewport: { width: 1920, height: 1080 } });
  await s.goto(`http://localhost:5173/?harita=${harita}&giris=0`); await s.waitForFunction(() => window.ke?.oyuncu, null, { timeout: 240000 }); await s.waitForTimeout(5000);
  const olc = (ad, f) => s.evaluate(async ([ad, f]) => {
    const ke = window.ke; const geri = f ? eval(f)(ke) : null;
    const k = []; let son = performance.now();
    await new Promise((res) => { let n = 0; const g = () => { const t = performance.now(); k.push(t - son); son = t; if (++n < 90) requestAnimationFrame(g); else res(); }; requestAnimationFrame(g); });
    if (geri) geri(); k.sort((a, b) => a - b);
    const c = ke.cizici; return `${ad}: medyan ${k[45].toFixed(1)} ms | çağrı ${c.info.render.calls} üçgen ${c.info.render.triangles}`;
  }, [ad, f]);
  console.log('==', harita);
  console.log(await olc('hepsi'));
  console.log(await olc('arazi gizli', '(ke) => { ke.arazi.mesh.visible = false; return () => { ke.arazi.mesh.visible = true; }; }'));
  console.log(await olc('nesneler gizli', '(ke) => { const l = ke.sahne.children.filter((c) => c !== ke.arazi.mesh && c.type === "Group" || c.name === "nesneler"); l.forEach((c) => c.visible = false); return () => l.forEach((c) => c.visible = true); }'));
  console.log(JSON.stringify(await s.evaluate(() => window.ke.sahne.children.map((c) => `${c.type}:${c.name || ""}:${c.children?.length ?? 0}`).filter((x) => !/Light/.test(x)).slice(0, 14))));
  await s.close();
}
await t.close();
