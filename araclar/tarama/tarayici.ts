// Veri tarayıcı: oyunun veritabanı, harita dosyaları ve client harita ayarında tutarsızlık arar. Salt okunur.
// Kullanım (araclar klasöründe): npm run tara
//   Çıktı: docs/raporlar/tarama-<tarih>.md ve .json. Çıkış kodu: KRITIK bulgu varsa 2, yoksa 0.
import { bolgeleriOku, type BolgeBilgisi } from './bolgeler.ts';
import { dosyaKontrolleri } from './dosyaKontrol.ts';
import { raporYaz } from './rapor.ts';
import { Toplayici } from './tur.ts';
import { veritabaniKontrolleri } from './veritabaniKontrol.ts';

const t = new Toplayici();
let bolgeler: Map<number, BolgeBilgisi> | null = null;
try {
  bolgeler = bolgeleriOku();
} catch (e) {
  t.atla('DB-*', 'Veritabanı ve harita kontrolleri', `Veritabanına bağlanılamadı: ${(e as Error).message}. SQL Server (.\\SQLEXPRESS) çalışıyor mu?`);
}

if (bolgeler) {
  try { veritabaniKontrolleri(t, bolgeler); } catch (e) { t.atla('DB-*', 'Veritabanı kontrolleri (yarıda kesildi)', (e as Error).message); }
  try { dosyaKontrolleri(t, bolgeler); } catch (e) { t.atla('DOS-*', 'Dosya kontrolleri (yarıda kesildi)', (e as Error).message); }
}

const { md, json } = raporYaz(t);
const sayi = (o: string) => t.bulgular.filter((b) => b.onem === o).length;
console.log(`Tarama bitti: ${t.bulgular.length} bulgu (KRITIK ${sayi('KRITIK')}, YUKSEK ${sayi('YUKSEK')}, ORTA ${sayi('ORTA')}, DUSUK ${sayi('DUSUK')}, BILGI ${sayi('BILGI')}), ${t.gecenler.length} kontrol temiz, ${t.atlananlar.length} atlandı.`);
for (const a of t.atlananlar) console.log(`  ATLANDI ${a.kod}: ${a.neden}`);
console.log(`Rapor: ${md}\n       ${json}`);
process.exit(sayi('KRITIK') > 0 || t.atlananlar.some((a) => a.kod.endsWith('*')) ? 2 : 0);
