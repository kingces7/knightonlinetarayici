// Düşen eşya kutusunun orijinal modeli (Misc/itembox.n3shape) → donusturulmus/web/esya/itembox.glb ve Noah (para) simgesi → esya/noah.png
//   npm run itembox
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { shapeOku, pmeshOku } from '../model/n3.ts';
import { GlbYazici } from '../model/gltf.ts';
import { dokuPng } from '../model/dokuYardim.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { simgeYolu } from './esyalar.ts';

const od = new OyunDosyalari();
const hedef = path.join(CIKTI_DIZINI, 'web', 'esya');
fs.mkdirSync(hedef, { recursive: true });

const sekil = shapeOku(od.oku('Misc/itembox.n3shape'));
const g = new GlbYazici();
const cocuklar: number[] = [];
for (const p of sekil.parcalar) {
  const m = pmeshOku(od.oku(p.mesh));
  const doku = p.dokular[0] ? dokuPng(od, p.dokular[0]) : null;
  const mz = g.malzeme(p.dokular[0] ?? 'itembox', doku?.png ?? null, doku?.alfa ?? 'OPAQUE', doku ? doku.alfa !== 'OPAQUE' : false);
  const mesh = g.mesh(p.mesh, [{ konum: m.konum, normal: m.normal, uv: m.uv, indeks: m.indeks, malzeme: mz }]);
  cocuklar.push(g.dugum({ mesh, konum: p.pivot }));
  console.log(`parça: ${p.mesh} · doku ${p.dokular.join(',')} · ${m.konum.length / 3} köşe`);
}
g.dugum({ ad: 'itembox', konum: [0, 0, 0], cocuklar }, true);
fs.writeFileSync(path.join(hedef, 'itembox.glb'), g.glb());

// Noah (para): eşya tablosunda 900000000 "Coin", simge 90001000
const d = dxtOku(od.oku(simgeYolu(90001000)));
fs.writeFileSync(path.join(hedef, 'noah.png'), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d)));
console.log('itembox.glb ve noah.png yazıldı ->', hedef);

// Hedef (agro) halkası: Misc/hunt_targetsymbol.n3shape = yerde 1×1 m'lik halka resmi (target_symbol_plane) + baş üstü işareti (target_symbol).
// Resimler esya/hedef_halka.png, hedef_isaret.png, hedef_halka_hunt.png olarak yazılır; istemci halkayı yere yatay bir kare olarak çizer.
for (const [dxt, ad] of [['Misc/target_symbol_plane.dxt', 'hedef_halka'], ['Misc/target_symbol.dxt', 'hedef_isaret'], ['Misc/target_hunt_plane.dxt', 'hedef_halka_hunt']] as const) {
  const r = dokuPng(od, dxt);
  if (r) { fs.writeFileSync(path.join(hedef, `${ad}.png`), r.png); console.log(`${ad}.png`, r.alfa); }
}
