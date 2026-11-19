// Pelerin modelleri: ırka göre pelerin (.n3cplug + .n3mesh) ve pelerin kimliğine göre doku (item/cloak_c_<kimlik>.dxt) → .glb.
//   npm run pelerin   -> donusturulmus/web/pelerin/<ırk>_<kimlik>.glb ve pelerin.json  { "<ırk>": { eklem } }
// Biçimler (hex incelemesiyle; kaynak kodda yok):
//   item/cloak_0RR.n3cplug (RR = ırk: 01–04 Karus, 06, 11 Barbarian, 12/13 İnsan erkek/kadın, 14): metin ad, int32 tür, int32 eklem (13), vec3 konum, 4×4 matris, malzeme..., metin .n3mesh yolu
//   item/cloak_0RR.n3mesh: int32 köşeSayısı, köşe × { vec3 konum, vec3 normal, float u, float v } (32 bayt), int32 indeksSayısı, indeks × uint16
//   Doku: pelerin kimliği (sunucunun gönderdiği klan/kral pelerin numarası) → item/cloak_c_<kimlik>.dxt. Kral pelerinleri: 97 Karus kralı, 98 El Morad kralı, 99 beyaz kral pelerini (KingCapeType).
// Pelerin sert bir ağ olarak çizilir (kumaş fiziği yok).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { Okuyucu } from '../model/n3.ts';
import { GlbYazici } from '../model/gltf.ts';
import { dokuPng } from '../model/dokuYardim.ts';
import { matrisDordey } from './silahlar.ts';

export const PELERIN_IRKLARI = [1, 2, 3, 4, 6, 11, 12, 13, 14];
export const PELERIN_KIMLIKLERI = [97, 98, 99];

export interface PelerinAgi { konum: Float32Array; normal: Float32Array; uv: Float32Array; indeks: Uint16Array }

export function n3meshOku(b: Buffer): PelerinAgi {
  const n = b.readInt32LE(0);
  if (n < 3 || n > 65535) throw new Error(`n3mesh köşe sayısı geçersiz (${n})`);
  let o = 4;
  const konum = new Float32Array(n * 3), normal = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) { konum[i * 3 + k] = b.readFloatLE(o); o += 4; }
    for (let k = 0; k < 3; k++) { normal[i * 3 + k] = b.readFloatLE(o); o += 4; }
    uv[i * 2] = b.readFloatLE(o); uv[i * 2 + 1] = b.readFloatLE(o + 4); o += 8;
  }
  const ic = b.readInt32LE(o); o += 4;
  if (ic < 3 || ic % 3 !== 0 || o + ic * 2 !== b.length) throw new Error(`n3mesh indeksleri dosyayla uyuşmuyor (${ic} indeks, ${b.length - o} bayt kaldı)`);
  const indeks = new Uint16Array(ic);
  for (let i = 0; i < ic; i++) { indeks[i] = b.readUInt16LE(o + i * 2); if (indeks[i] >= n) throw new Error('n3mesh indeksi köşe sayısını aşıyor'); }
  return { konum, normal, uv, indeks };
}

export function pelerinPlugOku(b: Buffer): { eklem: number; konum: [number, number, number]; matris: number[]; mesh: string } {
  const r = new Okuyucu(b);
  r.str(); r.i32();
  const eklem = r.i32(), konum = r.v3();
  const matris: number[] = []; for (let i = 0; i < 16; i++) matris.push(r.f32());
  const mesh = /item[\\/][^\0]*?\.n3mesh/i.exec(b.toString('latin1'))?.[0];
  if (!mesh) throw new Error('pelerin plug\'ında .n3mesh yolu yok');
  return { eklem, konum, matris, mesh };
}

function main(): number {
  const od = new OyunDosyalari();
  const hedef = path.join(CIKTI_DIZINI, 'web', 'pelerin');
  fs.mkdirSync(hedef, { recursive: true });
  const bilgi: Record<string, { eklem: number }> = {};
  const dokular = new Map<number, ReturnType<typeof dokuPng>>();
  for (const id of PELERIN_KIMLIKLERI) dokular.set(id, dokuPng(od, `item/cloak_c_${id}.dxt`, 256));
  let tamam = 0;
  for (const irk of PELERIN_IRKLARI) {
    const yol = `item/cloak_${String(irk).padStart(3, '0')}.n3cplug`;
    if (!od.var(yol)) { console.log(`  ırk ${irk}: ${yol} yok, atlandı`); continue; }
    const p = pelerinPlugOku(od.oku(yol));
    const ag = n3meshOku(od.oku(p.mesh.split('\\').join('/')));
    bilgi[String(irk)] = { eklem: p.eklem };
    for (const id of PELERIN_KIMLIKLERI) {
      const d = dokular.get(id);
      if (!d) { console.log(`  kimlik ${id}: doku okunamadı`); continue; }
      const g = new GlbYazici();
      const mz = g.malzeme(`pelerin_${id}`, d.png, 'OPAQUE', true); // pelerin iki yüzlü çizilir
      const mi = g.mesh(`pelerin_${irk}_${id}`, [{ konum: ag.konum, normal: ag.normal, uv: ag.uv, indeks: ag.indeks, malzeme: mz }]);
      g.dugum({ ad: `pelerin_${irk}_${id}`, mesh: mi, konum: p.konum, donus: matrisDordey(p.matris) }, true);
      fs.writeFileSync(path.join(hedef, `${irk}_${id}.glb`), g.glb());
      tamam++;
    }
  }
  fs.writeFileSync(path.join(hedef, 'pelerin.json'), JSON.stringify(bilgi));
  od.kapat();
  console.log(`${tamam} pelerin modeli -> ${hedef}`);
  return tamam > 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('pelerin.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
