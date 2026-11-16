// Skill penceresi (K) için El Morad Savaşçı'nın temel skillerini ve simgelerini çıkarır.
//   npm run beceriler   -> donusturulmus/web/beceri/beceriler.json + ikon/<no>.png
// Kaynak: Data/SkillMagicTable_us.tbl (sütunlar: 0 numara, 2 ad, 3 açıklama, 15 gereken seviye, 16 skill sayfası kodu, 17 MP).
// Animasyon: tablonun 5. sütunu (iSelfAnimID1) = oyuncu iskeletindeki animasyon numarası (ör. 153 = dribble, 154 = shoot, 24 = magic4).
// Simge: UI/skillicon_<simge no>_<sayfa kodu>.dxt; simge no = tablonun 33. sütunu (32. indeks, ör. 101002) son 2 hanesi. Numaranın son 2 hanesi DEĞİL:
// Stroke (201001) tablodaki 101002 → kılıç simgesi, Sprint (201002) 101001 → koşan figür. Aynı sayı skill penceresindeki sırayı da verir.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';

/** Oyunda şimdilik tek sınıf: El Morad Savaşçı → temel skill sayfası 2010. */
const SAYFA = 2010;

export function simgeAdaylari(simgeNo: number, sayfa: number): string[] {
  const nn = String(simgeNo % 100).padStart(2, '0');
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
    const simgeNo = Number(s[32]) > 0 ? Number(s[32]) : no;
    for (const yol of simgeAdaylari(simgeNo, SAYFA)) {
      if (!od.var(yol)) continue;
      try {
        const d = dxtOku(od.oku(yol));
        fs.writeFileSync(path.join(hedef, 'ikon', `${no}.png`), pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d)));
        simge = `ikon/${no}.png`; break;
      } catch { /* sonraki aday */ }
    }
    const ad = String(s[2] || s[1]).trim();
    liste.push({ no, ad: ad.charAt(0).toUpperCase() + ad.slice(1), aciklama: String(s[3]).replace(/\|\s*/g, ' ').trim(), seviye: Number(s[15]), msp: Number(s[17]), sayfa: SAYFA, sira: simgeNo % 100, anim: Number(s[4]), efektKendi: Number(s[7]) || null, efektHedef: Number(s[12]) || null, efektUcan: Number(s[11]) || null, simge });
  }
  liste.sort((a, b) => Number(a.sira) - Number(b.sira) || Number(a.no) - Number(b.no));
  fs.writeFileSync(path.join(hedef, 'beceriler.json'), JSON.stringify(liste, null, 1));
  console.log(`${liste.length} skill (sayfa ${SAYFA}) -> ${hedef}`);
  for (const b of liste) console.log(`  ${b.no} ${b.ad} · sv.${b.seviye} · MP ${b.msp} · ${b.simge ?? 'simge yok'}`);
  od.kapat();
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
