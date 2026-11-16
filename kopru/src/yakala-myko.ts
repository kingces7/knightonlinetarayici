// Geliştirme aracı: çalışan Myko oyun sunucusuna doğrudan bağlanıp oyuna giriş sırasında gelen BÜTÜN paketleri ham olarak kaydeder.
// Çıktı: kopru/protokol/ornekler/myko-oyuna-giris.json (testlerde gerçek veri olarak kullanılır). Hesap bilgisi dosyaya YAZILMAZ.
// Kullanım:  KO_HESAP=... KO_SIFRE=... node src/yakala-myko.ts
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PaketKanali, type Paket } from '../protokol/kanal.ts';
import { PaketOkuyucu, PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';

const hesap = process.env.KO_HESAP; const sifre = process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('KO_HESAP ve KO_SIFRE ortam değişkenleri gerekli'); process.exit(1); }
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

const s = net.connect(15001, '127.0.0.1');
const k = new PaketKanali();
const kayit: Array<{ asama: string; opcode: number; hex: string }> = [];
let asama = 'surum';
const kuyruk: Paket[] = [];
s.on('data', (d) => { for (const p of k.al(d)) { kayit.push({ asama, opcode: p.opcode, hex: hex(p.govde) }); kuyruk.push(p); } });
s.on('error', (e) => console.log('hata', e.message));
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const yolla = async (ad: string, op: number, govde?: Uint8Array, ms = 1500) => { asama = ad; s.write(k.paketYap(op, govde)); await bekle(ms); };

await new Promise<void>((r) => s.once('connect', () => r()));
await yolla('surum', WIZ.SURUM_KONTROL);
await yolla('giris', WIZ.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
await yolla('karakter_listesi', WIZ.TUM_KARAKTER_BILGISI, new PaketYazici().u8(1).baytlar());
const liste = kuyruk.find((p) => p.opcode === WIZ.TUM_KARAKTER_BILGISI)!;
const lo = new PaketOkuyucu(liste.govde); lo.u8(); lo.u8(); const karakter = lo.yazi();
await yolla('karakter_sec', WIZ.KARAKTER_SEC, new PaketYazici().yazi(hesap).yazi(karakter).u8(1).baytlar(), 2500);
await yolla('oyun_baslat_1', WIZ.OYUN_BASLAT, new PaketYazici().u8(1).yazi(karakter, false).baytlar(), 4000);
await yolla('oyun_baslat_2', WIZ.OYUN_BASLAT, new PaketYazici().u8(2).yazi(karakter, false).baytlar(), 3000);
s.destroy();

const hedef = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'protokol', 'ornekler', 'myko-oyuna-giris.json');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.writeFileSync(hedef, JSON.stringify({ aciklama: 'Myko oyun sunucusu (kaynaktan derlendi), 2026-11-16: oyuna giriş sırasında gelen paketler (opcode + gövde, ham hex).', paketler: kayit }, null, 1));
console.log(`${kayit.length} paket kaydedildi → ${hedef}`);
const sayim: Record<string, number> = {}; for (const p of kayit) sayim[`0x${p.opcode.toString(16)}`] = (sayim[`0x${p.opcode.toString(16)}`] ?? 0) + 1;
console.log(JSON.stringify(sayim));
setTimeout(() => process.exit(0), 200);
