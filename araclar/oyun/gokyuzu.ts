// Gökyüzü: bir bölgenin .n3sky dosyasındaki gün döngüsü renklerini (şafak/öğle/gün batımı/gece) web için JSON yapar.
//   npm run gokyuzu -- <harita adı> [sky dosyası adı]   ör. npm run gokyuzu -- 14th_oldmoradon moradon
//   Çıktı: donusturulmus/web/harita/<harita>/gokyuzu.json   { dokular: [...], anahtar: { gokyuzu: [[saniye, r, g, b], ...], sis, ... } }
// Biçim (hex incelemesiyle; dosya baytı baytına tükeniyor, test: gokyuzu.test.ts):
//   10 × metin (doku yolu: güneş diski/parıltı/flare, bulut katmanları, ay evreleri), int32 kayıt sayısı,
//   kayıt: metin ad ("SunRise - SkyColor"…), int32 tür, int32 zaman (gün içi saniye), uint32 renk (D3DCOLOR 0xAARRGGBB), int32 ek, float ek
//   tür: 0 gökyüzü, 1 sis, 2 yıldız sayısı, 3 ay evresi, 4 güneş, 5 parıltı, 6 flare, 7 bulut1, 8 bulut2, 10-12 ışık0-2.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { Okuyucu } from '../model/n3.ts';

export interface GokyuzuAnahtari { ad: string; tur: number; zaman: number; renk: [number, number, number]; ek: number; ondalik: number }
export interface Gokyuzu { dokular: string[]; kayitlar: GokyuzuAnahtari[] }

const TUR_ADI: Record<number, string> = { 0: 'gokyuzu', 1: 'sis', 2: 'yildiz', 3: 'ay', 4: 'gunes', 5: 'parilti', 6: 'flare', 7: 'bulut1', 8: 'bulut2', 10: 'isik0', 11: 'isik1', 12: 'isik2' };

export function gokyuzuOku(b: Buffer): Gokyuzu {
  const r = new Okuyucu(b);
  const dokular: string[] = []; for (let i = 0; i < 10; i++) dokular.push(r.str());
  const adet = r.i32();
  if (adet < 0 || adet > 500) throw new Error(`sky kayıt sayısı geçersiz ${adet}`);
  const kayitlar: GokyuzuAnahtari[] = [];
  for (let i = 0; i < adet; i++) {
    const ad = r.str(), tur = r.i32(), zaman = r.i32(), renk = r.u32(), ek = r.i32(), ondalik = r.f32();
    kayitlar.push({ ad, tur, zaman, renk: [(renk >> 16) & 255, (renk >> 8) & 255, renk & 255], ek, ondalik });
  }
  if (r.o !== b.length) throw new Error(`sky: ${b.length - r.o} bayt artık var`);
  return { dokular, kayitlar };
}

/** İstemci JSON'u: renk türü başına zamana göre sıralı [saniye, r, g, b] anahtarları. */
export function gokyuzuJson(g: Gokyuzu): { dokular: string[]; anahtar: Record<string, number[][]> } {
  const anahtar: Record<string, number[][]> = {};
  for (const k of g.kayitlar) {
    const ad = TUR_ADI[k.tur]; if (!ad) continue;
    (anahtar[ad] ??= []).push([k.zaman, ...k.renk]);
  }
  for (const l of Object.values(anahtar)) l.sort((a, c) => a[0] - c[0]);
  return { dokular: g.dokular, anahtar };
}

if (process.argv[1]?.endsWith('gokyuzu.ts')) {
  const [harita, sky] = process.argv.slice(2);
  if (!harita) { console.log('kullanım: npm run gokyuzu -- <harita> [sky adı]'); process.exit(1); }
  const od = new OyunDosyalari();
  const g = gokyuzuOku(od.oku(`Misc/sky/${sky ?? harita}.n3sky`));
  od.kapat();
  const hedef = path.join(CIKTI_DIZINI, 'web', 'harita', harita);
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'gokyuzu.json'), JSON.stringify(gokyuzuJson(g)));
  console.log(`${g.kayitlar.length} sky anahtarı -> ${hedef}`);
}
