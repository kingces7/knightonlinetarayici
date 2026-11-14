// Harita nesnelerini (.opd) tek bir .glb dosyasına çevirir.
// Her nesne bir düğüm (konum/dönüş/ölçek), parçaları alt düğüm (konum = parça pivotu).
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { opdOku, pmeshOku } from '../model/n3.ts';
import { GlbYazici } from '../model/gltf.ts';
import { dokuPng } from '../model/dokuYardim.ts';

export interface NesneRaporu { nesne: number; atlanan: number; model: number; eksikModel: number; doku: number; sifreliDoku: number; boyut: number }

export function nesneleriDisaAktar(od: OyunDosyalari, harita: string): { glb: Buffer; rapor: NesneRaporu } {
  const opd = opdOku(od.oku(`Zones/${harita}.opd`));
  const g = new GlbYazici();
  const malzemeler = new Map<string, number>();
  const meshler = new Map<string, number | null>();
  let eksikModel = 0, sifreliDoku = 0;

  const malzemeAl = (doku: string): number => {
    const k = doku.toLowerCase();
    let m = malzemeler.get(k);
    if (m === undefined) {
      const d = dokuPng(od, doku);
      if (d?.sifreli) sifreliDoku++;
      m = g.malzeme(doku, d?.png ?? null, d?.alfa ?? 'OPAQUE', d ? d.alfa !== 'OPAQUE' : false);
      malzemeler.set(k, m);
    }
    return m;
  };

  const meshAl = (yol: string, doku: string): number | null => {
    const k = `${yol.toLowerCase()}|${doku.toLowerCase()}`;
    if (meshler.has(k)) return meshler.get(k)!;
    let sonuc: number | null = null;
    try {
      const m = pmeshOku(od.oku(yol));
      if (m.indeks.length) sonuc = g.mesh(yol, [{ konum: m.konum, normal: m.normal, uv: m.uv, indeks: m.indeks, malzeme: malzemeAl(doku) }]);
    } catch { eksikModel++; }
    meshler.set(k, sonuc);
    return sonuc;
  };

  for (const n of opd.nesneler) {
    const cocuklar: number[] = [];
    for (const p of n.parcalar) {
      const mi = meshAl(p.mesh, p.dokular[0] ?? '');
      if (mi !== null) cocuklar.push(g.dugum({ mesh: mi, konum: p.pivot }));
    }
    if (cocuklar.length) g.dugum({ ad: n.ad, konum: n.konum, donus: n.donus, olcek: n.olcek, cocuklar }, true);
  }
  const glb = g.glb();
  return {
    glb,
    rapor: {
      nesne: opd.nesneler.length, atlanan: opd.atlanan, model: [...meshler.values()].filter((x) => x !== null).length,
      eksikModel, doku: malzemeler.size, sifreliDoku, boyut: glb.length,
    },
  };
}
