// Harita nesnelerini (.opd) tek bir .glb dosyasına çevirir.
// Her nesne bir düğüm (konum/dönüş/ölçek), parçaları alt düğüm (konum = parça pivotu).
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { opdOku, pmeshOku } from '../model/n3.ts';
import { GlbYazici } from '../model/gltf.ts';
import { dokuPng } from '../model/dokuYardim.ts';

export interface NesneRaporu { animli: number; nesne: number; atlanan: number; model: number; eksikModel: number; doku: number; sifreliDoku: number; boyut: number }

/** Animasyonlu dokular (ateş, duman, ışınlanma işareti…): parçada birden çok doku ve fps varsa kareler `anim/<ad>.png` olarak ayrıca yazılır, düğüme `extras.anim` eklenir. */
export function nesneleriDisaAktar(od: OyunDosyalari, harita: string): { glb: Buffer; rapor: NesneRaporu; kareler: Map<string, Buffer> } {
  const kareler = new Map<string, Buffer>();
  let animli = 0;
  const opd = opdOku(od.oku(`Zones/${harita}.opd`));
  const g = new GlbYazici();
  const malzemeler = new Map<string, number>();
  const meshler = new Map<string, number | null>();
  let eksikModel = 0, sifreliDoku = 0;

  const malzemeAl = (doku: string, ayri = false): number => {
    const k = doku.toLowerCase() + (ayri ? '|anim' : '');
    let m = malzemeler.get(k);
    if (m === undefined) {
      const d = dokuPng(od, doku);
      if (d?.sifreli) sifreliDoku++;
      m = g.malzeme(doku, d?.png ?? null, d?.alfa ?? 'OPAQUE', d ? d.alfa !== 'OPAQUE' : false);
      malzemeler.set(k, m);
    }
    return m;
  };

  const meshAl = (yol: string, doku: string, ayri = false): number | null => {
    const k = `${yol.toLowerCase()}|${doku.toLowerCase()}${ayri ? '|anim' : ''}`;
    if (meshler.has(k)) return meshler.get(k)!;
    let sonuc: number | null = null;
    try {
      const m = pmeshOku(od.oku(yol));
      if (m.indeks.length) sonuc = g.mesh(yol, [{ konum: m.konum, normal: m.normal, uv: m.uv, indeks: m.indeks, malzeme: malzemeAl(doku, ayri) }]);
    } catch { eksikModel++; }
    meshler.set(k, sonuc);
    return sonuc;
  };

  for (const n of opd.nesneler) {
    const cocuklar: number[] = [];
    for (const p of n.parcalar) {
      const animli_ = p.dokular.length > 1 && p.fps > 0;
      const mi = meshAl(p.mesh, p.dokular[0] ?? '', animli_);
      if (mi === null) continue;
      let ekstra: Record<string, unknown> | undefined;
      if (animli_) {
        const adlar: string[] = [];
        for (const dk of p.dokular) {
          const ad = dk.toLowerCase().split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '');
          if (!kareler.has(ad)) { const png = dokuPng(od, dk); if (png) kareler.set(ad, png.png); }
          if (kareler.has(ad)) adlar.push(ad);
        }
        if (adlar.length > 1) { ekstra = { anim: { fps: p.fps, kareler: adlar } }; animli++; }
      }
      cocuklar.push(g.dugum({ mesh: mi, konum: p.pivot, ekstra }));
    }
    if (cocuklar.length) g.dugum({ ad: n.ad, konum: n.konum, donus: n.donus, olcek: n.olcek, cocuklar }, true);
  }
  const glb = g.glb();
  return {
    glb,
    kareler,
    rapor: {
      animli,
      nesne: opd.nesneler.length, atlanan: opd.atlanan, model: [...meshler.values()].filter((x) => x !== null).length,
      eksikModel, doku: malzemeler.size, sifreliDoku, boyut: glb.length,
    },
  };
}
