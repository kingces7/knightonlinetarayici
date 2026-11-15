// Silah modelleri: eşya listesindeki (esyalar.json) silahların .n3cplug dosyalarını okuyup elde taşınacak .glb yapar.
//   npm run silahlar   -> donusturulmus/web/silah/<eşya no>.glb ve silah.json  { no: { eklem } }
// .n3cplug biçimi (hex incelemesiyle, Raptor/Short Sword ile; kaynak kodda CN3CPlug yok):
//   metin ad, int32 tür (0), int32 eklem (iskelet ön-sıra numarası; 12 = sağ el ucu), vec3 konum, 4×4 matris (satır vektör: 3 satır yön + (0,0,0,1)),
//   malzeme renkleri, ..., metin .n3pmesh yolu, metin .dxt yolu, ...
// Eşya → dosya: eşya tablosu sütun 7 (simge/kaynak no, 8 hane) → "item/A_BBBB_CC_D.n3cplug" (A = 1 hane, 748/845 silahta bulunur).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { Okuyucu, pmeshOku } from '../model/n3.ts';
import { GlbYazici } from '../model/gltf.ts';
import { dokuPng } from '../model/dokuYardim.ts';

export interface PlugBilgisi { eklem: number; konum: [number, number, number]; matris: number[]; mesh: string; doku: string }

export function plugOku(b: Buffer): PlugBilgisi {
  const r = new Okuyucu(b);
  r.str(); r.i32(); // ad, tür
  const eklem = r.i32();
  const konum = r.v3();
  const matris: number[] = []; for (let i = 0; i < 16; i++) matris.push(r.f32());
  const s = b.toString('latin1');
  const mesh = /item[\\/][^\0]*?\.n3pmesh/i.exec(s)?.[0];
  const doku = /item[\\/][^\0]*?\.dxt/i.exec(s)?.[0];
  if (!mesh) throw new Error('plug içinde .n3pmesh yolu yok');
  return { eklem, konum, matris, mesh, doku: doku ?? '' };
}

/** 3×3 yönelim (satır vektör düzeni: satırlar x/y/z eksenleri) → birim dördey [x, y, z, w]. */
export function matrisDordey(m: number[]): [number, number, number, number] {
  // m[0..2] = X ekseni, m[4..6] = Y, m[8..10] = Z (satır vektör düzeninde matris devriği döndürmeyi verir)
  const r00 = m[0], r01 = m[4], r02 = m[8], r10 = m[1], r11 = m[5], r12 = m[9], r20 = m[2], r21 = m[6], r22 = m[10];
  const iz = r00 + r11 + r22;
  let x: number, y: number, z: number, w: number;
  if (iz > 0) { const s = Math.sqrt(iz + 1) * 2; w = s / 4; x = (r21 - r12) / s; y = (r02 - r20) / s; z = (r10 - r01) / s; }
  else if (r00 > r11 && r00 > r22) { const s = Math.sqrt(1 + r00 - r11 - r22) * 2; w = (r21 - r12) / s; x = s / 4; y = (r01 + r10) / s; z = (r02 + r20) / s; }
  else if (r11 > r22) { const s = Math.sqrt(1 + r11 - r00 - r22) * 2; w = (r02 - r20) / s; x = (r01 + r10) / s; y = s / 4; z = (r12 + r21) / s; }
  else { const s = Math.sqrt(1 + r22 - r00 - r11) * 2; w = (r10 - r01) / s; x = (r02 + r20) / s; y = (r12 + r21) / s; z = s / 4; }
  const u = Math.hypot(x, y, z, w) || 1;
  return [x / u, y / u, z / u, w / u];
}

function main(): number {
  const od = new OyunDosyalari();
  const esyalarYolu = path.join(CIKTI_DIZINI, 'web', 'esya', 'esyalar.json');
  const esyalar = JSON.parse(fs.readFileSync(esyalarYolu, 'utf8')) as { no: number; tur: string }[];
  const tablo = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'silah');
  fs.mkdirSync(hedef, { recursive: true });
  const bilgi: Record<string, { eklem: number }> = {};
  let tamam = 0, yok = 0;
  for (const e of esyalar.filter((x) => x.tur === 'silah')) {
    const satir = tablo.find((x) => Number(x[0]) === e.no) ?? tablo.find((x) => Number(x[0]) === e.no - (e.no % 1000));
    if (!satir) { yok++; continue; }
    const s = String(satir[7]).padStart(8, '0');
    const yol = `item/${s[0]}_${s.slice(1, 5)}_${s.slice(5, 7)}_${s[7]}.n3cplug`;
    if (!od.var(yol)) { yok++; continue; }
    try {
      const p = plugOku(od.oku(yol));
      const mesh = pmeshOku(od.oku(p.mesh.split('\\').join('/')));
      if (!mesh.indeks.length) { yok++; continue; }
      const g = new GlbYazici();
      const d = p.doku ? dokuPng(od, p.doku) : null;
      const mz = g.malzeme(p.doku || 'silah', d?.png ?? null, d?.alfa ?? 'OPAQUE', d ? d.alfa !== 'OPAQUE' : false);
      const mi = g.mesh(`silah_${e.no}`, [{ konum: mesh.konum, normal: mesh.normal, uv: mesh.uv, indeks: mesh.indeks, malzeme: mz }]);
      g.dugum({ ad: `silah_${e.no}`, mesh: mi, konum: p.konum, donus: matrisDordey(p.matris) }, true);
      fs.writeFileSync(path.join(hedef, `${e.no}.glb`), g.glb());
      bilgi[String(e.no)] = { eklem: p.eklem };
      tamam++;
    } catch (err) { yok++; console.log(`  uyarı ${e.no}: ${(err as Error).message}`); }
  }
  fs.writeFileSync(path.join(hedef, 'silah.json'), JSON.stringify(bilgi));
  od.kapat();
  console.log(`${tamam} silah modeli, ${yok} atlandı -> ${hedef}`);
  return 0;
}

if (process.argv[1]?.endsWith('silahlar.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
