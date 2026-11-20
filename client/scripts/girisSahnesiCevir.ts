// Karakter seçim sahnesi (ChrSelect/): orijinal oyunun 3B odası (Karus: ka_cave + ka_chairs, El Morad: el_chairs + el_elmo_chairs) → donusturulmus/web/giris/<ka|el>.glb
// Kullanım (depo kökünden): node client/scripts/girisSahnesiCevir.ts
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../../araclar/ortak/yollar.ts';
import { OyunDosyalari } from '../../araclar/ortak/oyunDosyalari.ts';
import { pmeshOku, shapeOku } from '../../araclar/model/n3.ts';
import { GlbYazici } from '../../araclar/model/gltf.ts';
import { dokuPng } from '../../araclar/model/dokuYardim.ts';

const SAHNELER: Record<string, string[]> = {
  ka: ['ChrSelect/ka_cave.n3shape', 'ChrSelect/ka_chairs.n3shape'],
  el: ['ChrSelect/el_chairs.n3shape', 'ChrSelect/el_elmo_chairs.n3shape'],
};

const od = new OyunDosyalari();
const hedef = path.join(CIKTI_DIZINI, 'web', 'giris');
fs.mkdirSync(hedef, { recursive: true });
for (const [ad, dosyalar] of Object.entries(SAHNELER)) {
  const g = new GlbYazici();
  const malzemeler = new Map<string, number>();
  let parca = 0, eksik = 0;
  for (const d of dosyalar) {
    let sekil;
    try { sekil = shapeOku(od.oku(d)); } catch (e) { console.log(`! ${d}: ${(e as Error).message}`); continue; }
    const cocuklar: number[] = [];
    for (const p of sekil.parcalar) {
      try {
        const m = pmeshOku(od.oku(p.mesh.split('\\').join('/')));
        if (!m.indeks.length) continue;
        const doku = p.dokular[0] ?? '';
        let mi = malzemeler.get(doku.toLowerCase());
        if (mi === undefined) { const t = dokuPng(od, doku); mi = g.malzeme(doku, t?.png ?? null, t?.alfa ?? 'OPAQUE', t ? t.alfa !== 'OPAQUE' : false); malzemeler.set(doku.toLowerCase(), mi); }
        cocuklar.push(g.dugum({ mesh: g.mesh(p.mesh, [{ konum: m.konum, normal: m.normal, uv: m.uv, indeks: m.indeks, malzeme: mi }]), konum: p.pivot }));
        parca++;
      } catch (e) { eksik++; if (eksik < 3) console.log("  hata", p.mesh, (e as Error).message); }
    }
    if (cocuklar.length) g.dugum({ ad: sekil.ad || path.basename(d), konum: sekil.konum, donus: sekil.donus, olcek: sekil.olcek, cocuklar }, true);
  }
  const glb = g.glb();
  fs.writeFileSync(path.join(hedef, `${ad}.glb`), glb);
  console.log(`${ad}: ${parca} parça, ${eksik} eksik, ${(glb.length / 1024).toFixed(0)} KB`);
}
