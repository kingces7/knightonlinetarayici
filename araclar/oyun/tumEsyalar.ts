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
import { execFileSync } from 'node:child_process';

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
  // Sunucuya özel (Myko) eşyalar Item_Org_us.tbl'de yok (kutu, madalya, sertifika, pirinç keki…): temel kayıtları sunucu ITEM tablosundan eklenir.
  const var_ = new Set(liste.map((e) => Number(e.no))); let sunucudan = 0;
  try {
    const ayrac = String.fromCharCode(30);
    const alanlar = ['Num', 'strName', 'Description', 'ItemIconID1', 'Kind', 'Slot', 'Race', 'Class', 'Damage', 'Delay', 'Range', 'Weight', 'Duration', 'BuyPrice', 'Ac', 'Countable', 'ReqLevel', 'ReqStr', 'ReqSta', 'ReqDex', 'ReqIntel', 'ReqCha', 'ItemClass'];
    const sorgu = 'SET NOCOUNT ON; SELECT ' + alanlar.map((a) => (a === 'strName' || a === 'Description' ? `REPLACE(REPLACE(CAST(ISNULL(${a},'') AS NVARCHAR(400)),CHAR(13),' '),CHAR(10),' ')` : `CAST(ISNULL(${a},0) AS NVARCHAR(40))`)).join(`+CHAR(30)+`) + ' FROM ITEM WHERE Num % 1000 = 0';
    const cikti = execFileSync('sqlcmd', ['-S', '.' + String.fromCharCode(92) + 'SQLEXPRESS', '-E', '-d', 'LILITH_MYKO', '-h', '-1', '-f', '65001', '-Q', sorgu], { encoding: 'utf8', maxBuffer: 1 << 26 });
    for (const satir of cikti.split(/\r?\n/)) {
      const a = satir.split(ayrac); if (a.length < alanlar.length) continue;
      const no = Number(a[0]); if (!no || var_.has(no)) continue;
      const simge = Number(a[3]), tur = Number(a[4]); let simgeAd = '';
      if (simge) {
        const yol = simgeYolu(simge), dosya = path.join(ikonKlasor, `${simge}.png`);
        if (!fs.existsSync(dosya) && od.var(yol)) { try { const x = dxtOku(od.oku(yol)); fs.writeFileSync(dosya, pngKodla(x.genislik, x.yukseklik, rgbayaCevir(x))); } catch { /* çözülemedi */ } }
        if (fs.existsSync(dosya)) simgeAd = `ikon/${simge}.png`;
      }
      const n = (i: number) => Number(a[i]) || 0;
      liste.push({ no, kaynak: Math.floor(no / 1000), ad: a[1].trim(), aciklama: a[2].replace(/\|\s*/g, ' ').trim(), simge: simgeAd, tur: SILAH.has(tur) ? 'silah' : tur === KALKAN ? 'kalkan' : ZIRH.has(tur) ? 'zirh' : 'sarf', tip: tur,
        yuva: n(5), hasar: n(8), gecikme: n(9), savunma: n(14), fiyat: n(13), sayilabilir: n(15) > 0, irk: n(6), sinif: n(7), menzil: n(10), agirlik: n(11), dayanim: n(12),
        gerekSeviye: n(16), gerekGuc: n(17), gerekSta: n(18), gerekCev: n(19), gerekZeka: n(20), gerekBuyu: 0, sinifDerece: n(22) });
      sunucudan++;
    }
  } catch (e) { console.log('Sunucu eşyaları eklenemedi (SQL Server yok mu?): ' + (e as Error).message.split(String.fromCharCode(10))[0]); }
  console.log(`sunucudan eklenen (tabloda olmayan) eşya: ${sunucudan}`);
  fs.writeFileSync(path.join(klasor, 'tum.json'), JSON.stringify(liste));
  od.kapat();
  console.log(`${liste.length} eşya, ${yazilan.size} simge (${ikonYok} eşyanın simgesi yok) -> ${klasor}`);
  return 0;
}
if (process.argv[1]?.endsWith('tumEsyalar.ts')) { try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); } }
