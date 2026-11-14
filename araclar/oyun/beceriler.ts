// Skill penceresi (K) için El Morad Savaşçı'nın temel skillerini ve simgelerini çıkarır.
//   npm run beceriler   -> donusturulmus/web/beceri/beceriler.json + ikon/<no>.png
// Kaynak: Data/SkillMagicTable_us.tbl (sütunlar: 0 numara, 2 ad, 3 açıklama, 15 gereken seviye, 16 skill sayfası kodu, 17 MP).
// Simge: UI/skillicon_<numaranın son 2 hanesi>_<sayfa kodu>.dxt (yoksa 1010 sayfasındaki aynı numaralı simge).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';

/** Oyunda şimdilik tek sınıf: El Morad Savaşçı → temel skill sayfası 2010. */
const SAYFA = 2010;

export function simgeAdaylari(no: number, sayfa: number): string[] {
  const nn = String(no % 100).padStart(2, '0');
  return [`UI/skillicon_${nn}_${sayfa}.dxt`, `UI/skillicon_${nn}_1010.dxt`];
}

function main(): number {
  const od = new OyunDosyalari();
  const satirlar = tbldenOku(od.oku('Data/SkillMagicTable_us.tbl'), 'windows-1252').satirlar;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'beceri');
  fs.mkdirSync(path.join(hedef, 'ikon'), { recursive: true });
  const liste: Record<string, unknown>[] = [];
  for (const s of satirlar) {
    if (Number(s[16]) !== SAYFA || Number(s[15]) <= 0) continue; // seviye 0 = etkinlik skilleri
    const no = Number(s[0]);
    let simge: string | null = null;
    for (const yol of simgeAdaylari(no, SAYFA)) {
      if (!od.var(yol)) continue;
      try {
        const d = dxtOku(od.oku(yol));
        fs.writeFileSync(path.join(hedef, 'ikon', `${no}.png`), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d)));
        simge = `ikon/${no}.png`; break;
      } catch { /* sonraki aday */ }
    }
    const ad = String(s[2] || s[1]).trim();
    liste.push({ no, ad: ad.charAt(0).toUpperCase() + ad.slice(1), aciklama: String(s[3]).replace(/\|\s*/g, ' ').trim(), seviye: Number(s[15]), msp: Number(s[17]), sayfa: SAYFA, simge });
  }
  liste.sort((a, b) => Number(a.seviye) - Number(b.seviye) || Number(a.no) - Number(b.no));
  fs.writeFileSync(path.join(hedef, 'beceriler.json'), JSON.stringify(liste, null, 1));
  console.log(`${liste.length} skill (sayfa ${SAYFA}) -> ${hedef}`);
  for (const b of liste) console.log(`  ${b.no} ${b.ad} · sv.${b.seviye} · MP ${b.msp} · ${b.simge ?? 'simge yok'}`);
  od.kapat();
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
