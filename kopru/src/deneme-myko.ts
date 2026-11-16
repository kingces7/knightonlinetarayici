// Geliştirme aracı: köprü üzerinden KENDİ DERLEDİĞİMİZ Myko sunucusuna bağlanıp Aşama 4 akışını dener (docs/protokol.md §5–6).
//   login server (/giris): sürüm → şifreleme (0xF2) → giriş → sunucu listesi → haber
//   oyun sunucusu (/oyun): sürüm kontrol → giriş → karakter listesi → karakter seç → oyun başlat
// Kullanım (köprü ve Myko sunucusu çalışırken):  node src/deneme-myko.ts [hesap] [şifre] [köprü adresi]   (KARAKTER=ad ile karakter seçilir)
import { WebSocket } from 'ws';
import { PaketKanali, type Paket } from '../protokol/kanal.ts';
import { PaketOkuyucu, PaketYazici } from '../protokol/ikili.ts';
import { LS, WIZ } from '../protokol/opcode.ts';

// Hesap bilgisi koda yazılmaz: komut satırından ya da KO_HESAP / KO_SIFRE ortam değişkenlerinden gelir.
const [hesapArg, sifreArg, koprü = 'ws://127.0.0.1:8081'] = process.argv.slice(2);
const hesap = hesapArg ?? process.env.KO_HESAP;
const sifre = sifreArg ?? process.env.KO_SIFRE;
if (!hesap || !sifre) { console.log('Kullanım: node src/deneme-myko.ts <hesap> <şifre> [köprü adresi]   (ya da KO_HESAP / KO_SIFRE ortam değişkenleri)'); process.exit(1); }
const hex = (b: Uint8Array, n = 64) => [...b.subarray(0, n)].map((x) => x.toString(16).padStart(2, '0')).join(' ') + (b.length > n ? ' …' : '');

class Oturum {
  readonly kanal = new PaketKanali();
  readonly ws: WebSocket;
  readonly ad: string;
  #kuyruk: Paket[] = [];
  #bekleyen: ((p: Paket) => void) | null = null;
  constructor(ws: WebSocket, ad: string) {
    this.ws = ws; this.ad = ad;
    ws.on('message', (d) => {
      try { for (const p of this.kanal.al(d as Buffer)) { if (this.#bekleyen) { const b = this.#bekleyen; this.#bekleyen = null; b(p); } else this.#kuyruk.push(p); } }
      catch (e) { console.log(`[${this.ad}] çözme hatası: ${(e as Error).message}; ham: ${hex(d as Buffer)}`); }
    });
    ws.on('close', (k) => console.log(`[${this.ad}] bağlantı kapandı (${k})`));
  }
  static async ac(adres: string, ad: string): Promise<Oturum> {
    const ws = new WebSocket(adres);
    await new Promise<void>((c, h) => { ws.once('open', () => c()); ws.once('error', h); });
    return new Oturum(ws, ad);
  }
  gonder(ad: string, opcode: number, govde?: Uint8Array): void { console.log(`[${this.ad}] -> ${ad} (0x${opcode.toString(16)})`); this.ws.send(this.kanal.paketYap(opcode, govde)); }
  sonraki(ms = 4000): Promise<Paket> {
    const k = this.#kuyruk.shift(); if (k) return Promise.resolve(k);
    return new Promise((coz, hata) => { const z = setTimeout(() => { this.#bekleyen = null; hata(new Error('zaman aşımı (cevap yok)')); }, ms); this.#bekleyen = (p) => { clearTimeout(z); coz(p); }; });
  }
  /** Belirli süre boyunca gelen bütün paketleri toplar. */
  async topla(ms: number): Promise<Paket[]> {
    const l: Paket[] = []; const son = Date.now() + ms;
    while (Date.now() < son) { try { l.push(await this.sonraki(Math.max(50, son - Date.now()))); } catch { break; } }
    return l;
  }
}

async function girisSunucusu(): Promise<void> {
  const o = await Oturum.ac(`${koprü}/giris`, 'giriş');
  try {
    o.gonder('SURUM', LS.SURUM);
    const s = await o.sonraki(); console.log(`   sürüm: ${new PaketOkuyucu(s.govde).i16()}`);

    o.gonder('SIFRELEME', LS.SIFRELEME);
    const k = await o.sonraki(); const anahtar = new PaketOkuyucu(k.govde).u64();
    console.log(`   açık anahtar 0x${anahtar.toString(16)} → şifreleme açılıyor (Myko özel anahtarı)`);
    o.kanal.sifrelemeyiAc(anahtar);

    o.gonder('GIRIS', LS.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
    const g = await o.sonraki(); const go = new PaketOkuyucu(g.govde);
    const bas = go.u16(); const sonuc = go.u8();
    console.log(`   giriş sonucu: ${sonuc} (1 = başarılı), baştaki u16 = ${bas}${sonuc === 1 ? `, premium ${go.i16()}, hesap "${go.yazi()}"` : ''}`);

    o.gonder('SUNUCU_LISTESI', LS.SUNUCU_LISTESI, new PaketYazici().u16(1).baytlar());
    const l = await o.sonraki(); const lo = new PaketOkuyucu(l.govde);
    console.log(`   sunucu listesi: yankı ${lo.u16()}, sunucu sayısı ${lo.u8()}`);
    console.log('   sunucu:', { lanIp: lo.yazi(), ip: lo.yazi(), ad: lo.yazi(), oyuncu: lo.i16(), no: lo.i16(), grup: lo.i16(), ust: lo.i16(), ucretsiz: lo.i16(), sifir: lo.u8(), ekran: lo.u8(), karusKral: lo.yazi(), karusDuyuru: lo.yazi(), elKral: lo.yazi(), elDuyuru: lo.yazi() });

    o.gonder('HABER', LS.HABER);
    const h = await o.sonraki(); console.log(`   haber: ${h.govde.length} bayt: ${hex(h.govde, 48)}`);
  } finally { o.ws.close(); }
}

async function oyunSunucusu(): Promise<void> {
  const o = await Oturum.ac(`${koprü}/oyun`, 'oyun');
  const goster = (l: Paket[]) => { for (const p of l) console.log(`     <- 0x${p.opcode.toString(16).padStart(2, '0')} (${p.govde.length} bayt): ${hex(p.govde, 72)}`); if (!l.length) console.log('     (cevap yok)'); };
  const adim = async (ad: string, op: number, govde?: Uint8Array, ms = 1200): Promise<Paket[]> => { o.gonder(ad, op, govde); const l = await o.topla(ms); goster(l); return l; };
  try {
    const v = await adim('SURUM_KONTROL', WIZ.SURUM_KONTROL);
    const vo = new PaketOkuyucu(v[0].govde); vo.u8(); console.log(`   oyun sunucusu sürümü ${vo.u16()}; anahtarlar 0 → düz metin`);

    await adim('GIRIS', WIZ.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
    const liste = await adim('TUM_KARAKTER_BILGISI', WIZ.TUM_KARAKTER_BILGISI, new PaketYazici().u8(1).baytlar(), 1500);
    const lp = liste.find((p) => p.opcode === WIZ.TUM_KARAKTER_BILGISI);
    let karakter = process.env.KARAKTER ?? '';
    if (lp) {
      const lo = new PaketOkuyucu(lp.govde); console.log(`   liste: alt kod ${lo.u8()}, ${lo.u8()}`);
      for (let i = 0; i < 4 && lo.kalan > 0; i++) {
        const ad = lo.yazi();
        if (!ad) { console.log(`   yuva ${i}: boş`); continue; }
        const ks = { irk: lo.u8(), sinif: lo.u16(), seviye: lo.u8(), yuz: lo.u8(), sac: lo.u32(), bolge: lo.u8() };
        for (let j = 0; j < 8; j++) lo.ham(6);
        console.log(`   yuva ${i}:`, ad, ks); if (!karakter) karakter = ad;
      }
    }
    if (!karakter) { console.log('   karakter bulunamadı, durduruluyor'); return; }
    await adim('KARAKTER_SEC', WIZ.KARAKTER_SEC, new PaketYazici().yazi(hesap).yazi(karakter).u8(1).baytlar(), 2500);
    await adim('OYUN_BASLAT (1)', WIZ.OYUN_BASLAT, new PaketYazici().u8(1).yazi(karakter, false).baytlar(), 3000);
    await adim('OYUN_BASLAT (2)', WIZ.OYUN_BASLAT, new PaketYazici().u8(2).yazi(karakter, false).baytlar(), 2000);
  } finally { o.ws.close(); }
}

try { await girisSunucusu().catch((e) => console.log('GİRİŞ SUNUCUSU HATA:', (e as Error).message)); console.log(''); await oyunSunucusu(); console.log('\nTAMAM'); }
catch (e) { console.log('HATA:', (e as Error).message); }
setTimeout(() => process.exit(0), 300);
