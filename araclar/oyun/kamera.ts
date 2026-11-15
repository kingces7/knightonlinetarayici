// Oyunun varsayılan kamera ayarını (Data/DefaultCamera.N3Camera) okur ve istemci için JSON yazar.
//   npm run kamera   -> donusturulmus/web/oyun/kamera.json  { goz, bak, yukari, fov (radyan), yakin, uzak }
// Biçim (hex incelemesiyle; kaynak kodda CN3Camera yok, CN3Transform::Load N3BASE'te var):
//   CN3Base:      int32 uzunluk + ad
//   CN3Transform: vec3 konum, quat dönüş, vec3 ölçek, 3 × animasyon anahtarı (konum/dönüş/ölçek; adet 0 ise yalnız int32 0)
//   CN3Camera:    3 bilinmeyen float (0,0,0), vec3 göz, vec3 bakılan nokta, vec3 yukarı, float görüş açısı (rad),
//                 float en/boy (dosyada 0 = çizici belirler), float yakın düzlem, float uzak düzlem, ...
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';

export interface KameraAyari { ad: string; goz: [number, number, number]; bak: [number, number, number]; yukari: [number, number, number]; fov: number; yakin: number; uzak: number }

export function kameraOku(b: Buffer): KameraAyari {
  let o = 0;
  const i32 = () => { const v = b.readInt32LE(o); o += 4; return v; };
  const f32 = () => { const v = b.readFloatLE(o); o += 4; return v; };
  const v3 = (): [number, number, number] => [f32(), f32(), f32()];
  const n = i32();
  if (n < 0 || n > 256) throw new Error('kamera adı geçersiz');
  const ad = b.toString('latin1', o, o + n); o += n;
  o += 3 * 4 + 4 * 4 + 3 * 4; // konum, dönüş, ölçek
  for (let i = 0; i < 3; i++) {
    const adet = i32();
    if (adet > 0) o += 8 + adet * 4 * (i === 1 ? 4 : 3); // tür + örnekleme hızı + veri
  }
  o += 12; // bilinmeyen 3 float
  const goz = v3(), bak = v3(), yukari = v3();
  const fov = f32(); f32() /* en/boy */;
  const yakin = f32(), uzak = f32();
  if (!(fov > 0.1 && fov < 3 && yakin > 0 && uzak > yakin)) throw new Error('kamera değerleri makul değil');
  return { ad, goz, bak, yukari, fov, yakin, uzak };
}

if (process.argv[1]?.endsWith('kamera.ts') && !process.argv[1].endsWith('test.ts')) {
  const od = new OyunDosyalari();
  const k = kameraOku(od.oku('Data/DefaultCamera.N3Camera'));
  od.kapat();
  const hedef = path.join(CIKTI_DIZINI, 'web', 'oyun');
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'kamera.json'), JSON.stringify(k));
  console.log(`${k.ad}: göz ${k.goz}, bak ${k.bak}, görüş açısı ${(k.fov * 180 / Math.PI).toFixed(1)}°, yakın ${k.yakin}, uzak ${k.uzak}`);
}
