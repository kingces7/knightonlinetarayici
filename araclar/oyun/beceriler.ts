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

/** Dört sınıfın temel skill sayfaları: El Morad Warrior/Rogue/Mage/Priest = 2010/2020/2030/2040, Karus = 1010–1040. */
const SAYFALAR = [2010, 2020, 2030, 2040, 1010, 1020, 1030, 1040];
/** Terfi sonrası (novice/master) skill sayfaları: 1050–1129 ve 2050–2129 (sayfa = ulus × 1000 + sınıf kodu × 10 + ağaç; 5/6/7/8 = novice/master özel ağaçları). */
const terfiSayfasi = (p: number) => (p >= 1050 && p <= 1129) || (p >= 2050 && p <= 2129);

export function simgeAdaylari(simgeNo: number, sayfa: number): string[] {
  const nn = String(simgeNo % 100).padStart(2, '0');
  const kendi = Math.floor(simgeNo / 100); // simge numarasının sınıf sayfası (104004 → 1040)
  return [`UI/skillicon_${nn}_${sayfa}.dxt`, `UI/skillicon_${nn}_${kendi}.dxt`, `UI/skillicon_${nn}_1010.dxt`];
}

function main(): number {
  const od = new OyunDosyalari();
  const satirlar = tbldenOku(od.oku('Data/SkillMagicTable_us.tbl'), 'windows-1252').satirlar;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'beceri');
  fs.mkdirSync(path.join(hedef, 'ikon'), { recursive: true });
  // Yakın dövüş skill'lerinin (Type 1, CastTime 0) animasyonu ana tablodaki iSelfAnimID1 DEĞİL, skill_magic_1.tbl'deki iAct[0] numarasıdır (orijinal MagicSkillMng::StartSkillMagicAtTargetPacket → AnimationAdd(iAct[i])).
  // Sütunlar: 0 numara, 6 kombo sayısı, 9..11 iAct. Numara oyuncu iskeletindeki animasyon numarasıdır (ör. 126 = skill_spear_A, 128 = skill_sword01_A).
  const tip1 = new Map<number, number>();
  const kombolar = new Map<number, number[]>(); // orijinal: iNumCombo kadar animasyon art arda (iAct[0..2]) oynar (MagicSkillMng.cpp AnimationAdd döngüsü)
  const hasarYuzde = new Map<number, number>(); // skill_magic_1 sütun 3: silah hasarının yüzdesi (açıklamadaki "Inflict N% damage")
  for (const s of tbldenOku(od.oku('Data/skill_magic_1.tbl'), 'windows-1252').satirlar) if (Number(s[6]) >= 1 && Number(s[9]) > 0) { tip1.set(Number(s[0]), Number(s[9])); kombolar.set(Number(s[0]), [s[9], s[10], s[11]].slice(0, Math.max(1, Math.min(3, Number(s[6])))).map(Number).filter((x) => x > 0)); hasarYuzde.set(Number(s[0]), Number(s[3])); }
  const liste: Record<string, unknown>[] = [];
  for (const s of satirlar) {
    const SAYFA = Number(s[16]);
    if ((!SAYFALAR.includes(SAYFA) && !terfiSayfasi(SAYFA)) || (Number(s[15]) <= 0 && !terfiSayfasi(SAYFA))) continue; // seviye 0 = etkinlik skilleri
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
    liste.push({ no, ad: ad.charAt(0).toUpperCase() + ad.slice(1), aciklama: String(s[3]).replace(/\|\s*/g, ' ').trim(), seviye: Number(s[15]), msp: Number(s[17]), sayfa: SAYFA, sira: simgeNo % 100, anim: Number(s[21]) === 0 && tip1.has(no) ? tip1.get(no) : Number(s[4]), vurusAnim: tip1.get(no), kombo: Number(s[21]) === 0 && (kombolar.get(no)?.length ?? 0) > 1 ? kombolar.get(no) : undefined, efektKendi: Number(s[7]) || null, efektHedef: Number(s[12]) || null, efektUcan: Number(s[11]) || null, simge });
  }
  // Kullanıcı kararı: yakın dövüş skill'lerinde (Stroke, Slash, Crash, Piercing — tüm sınıflar) kendinde parıltı yok; tablodaki 2601 heal_cast yalnızca iyileştirme skill'lerinde kalır.
  for (const b of liste) if (tip1.has(Number(b.no)) && b.efektKendi === 2601) b.efektKendi = null;
  for (const b of liste) if (hasarYuzde.has(Number(b.no))) b.hasarYuzde = hasarYuzde.get(Number(b.no));
  liste.sort((a, b) => Number(a.sayfa) - Number(b.sayfa) || Number(a.sira) - Number(b.sira) || Number(a.no) - Number(b.no));
  fs.writeFileSync(path.join(hedef, 'beceriler.json'), JSON.stringify(liste, null, 1));
  console.log(`${liste.length} skill (sayfalar ${SAYFALAR.join(', ')}) -> ${hedef}`);
  for (const b of liste) console.log(`  ${b.no} ${b.ad} · sv.${b.seviye} · MP ${b.msp} · ${b.simge ?? 'simge yok'}`);
  od.kapat();
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
