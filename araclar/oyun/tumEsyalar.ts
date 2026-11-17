// Sunucu modu için TÜM eşyalar: Item_Org_us.tbl'deki her satır + simgeleri (sunucu her eşyayı düşürebilir/verebilir).
//   npm run tum-esyalar  -> donusturulmus/web/esya/tum.json + ikon/<simge>.png (varsa dokunmaz)
// Alanlar magaza.ts ile aynıdır; eşya adları/açıklamaları oyunun İngilizce tablosundan aynen alınır.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';
import { simgeYolu } from './esyalar.ts';

const SILAH = new Set([11, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 70, 71, 110]);
const ZIRH = new Set([210, 220, 230, 240]);
const KALKAN = 60; // sol el yuvası (sunucu ItemSlot1HLeftHand); modeli .n3cplug, kolun üstüne takılır

function main(): number {
  const od = new OyunDosyalari();
  const satirlar = tbldenOku(od.oku('Data/Item_Org_us.tbl'), 'windows-1252').satirlar;
  const klasor = path.join(CIKTI_DIZINI, 'web', 'esya'), ikonKlasor = path.join(klasor, 'ikon');
  fs.mkdirSync(ikonKlasor, { recursive: true });
  const yazilan = new Set<number>(); let ikonYok = 0;
  const liste: Record<string, unknown>[] = [];
  for (const s of satirlar) {
    const no = Number(s[0]), simge = Number(s[7]), tur = Number(s[10]);
    let simgeAd = '';
    if (!yazilan.has(simge)) {
      const yol = simgeYolu(simge), dosya = path.join(ikonKlasor, `${simge}.png`);
      if (fs.existsSync(dosya)) yazilan.add(simge);
      else if (od.var(yol)) { try { const d = dxtOku(od.oku(yol)); fs.writeFileSync(dosya, pngKodla(d.genislik, d.yukseklik, rgbayaCevir(d))); yazilan.add(simge); } catch { /* çözülemedi */ } }
    }
    if (yazilan.has(simge)) simgeAd = `ikon/${simge}.png`; else ikonYok++;
    liste.push({
      no, kaynak: Number(s[6]), ad: String(s[2]), aciklama: String(s[3]).replace(/\|\s*/g, ' '), simge: simgeAd,
      tur: SILAH.has(tur) ? 'silah' : tur === KALKAN ? 'kalkan' : ZIRH.has(tur) ? 'zirh' : 'sarf', tip: tur, yuva: Number(s[12]),
      hasar: Number(s[15]), gecikme: Number(s[16]), savunma: Number(s[22]), fiyat: Number(s[20]), sayilabilir: Number(s[23]) > 0,
      // Orijinal eşya bilgisi (UIImageTooltipDlg) alanları — sütunlar __TABLE_ITEM_BASIC sırasıdır: 13 ırk, 14 sınıf, 17 menzil (0,1 m), 18 ağırlık (0,1), 19 dayanıklılık,
      // 26 gereken seviye, 30-34 gereken güç/dayanıklılık/çeviklik/zekâ/büyü gücü, 36 eşya sınıfı (1 düşük, 2 orta, 3 yüksek).
      irk: Number(s[13]), sinif: Number(s[14]), menzil: Number(s[17]), agirlik: Number(s[18]), dayanim: Number(s[19]),
      gerekSeviye: Number(s[26]), gerekGuc: Number(s[30]), gerekSta: Number(s[31]), gerekCev: Number(s[32]), gerekZeka: Number(s[33]), gerekBuyu: Number(s[34]), sinifDerece: Number(s[36]),
    });
  }
  fs.writeFileSync(path.join(klasor, 'tum.json'), JSON.stringify(liste));
  od.kapat();
  console.log(`${liste.length} eşya, ${yazilan.size} simge (${ikonYok} eşyanın simgesi yok) -> ${klasor}`);
  return 0;
}
if (process.argv[1]?.endsWith('tumEsyalar.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
