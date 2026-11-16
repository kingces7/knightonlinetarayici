// Geliştirme aracı: köprü üzerinden GERÇEK sunuculara bağlanıp doğrulanmış akışı dener (docs/protokol.md §5–6):
//   login server (/giris): sürüm → giriş → sunucu listesi → haber            (şifresiz, 2 baytlık yazı uzunluğu)
//   oyun sunucusu (/oyun): sürüm kontrol (LZF'li) → şifreleme → giriş → karakter listesi isteği
// Kullanım (köprü ve sunucular çalışırken):  node src/deneme-giris.ts [hesap] [şifre] [köprü adresi]
import { WebSocket } from 'ws';
import { PaketKanali, type Paket } from '../protokol/kanal.ts';
import { PaketOkuyucu, PaketYazici } from '../protokol/ikili.ts';
import { OZEL_ANAHTAR_KLASIK } from '../protokol/jvSifre.ts';
import { LS, WIZ } from '../protokol/opcode.ts';

const [hesap = 'admin', sifre = 'admin', koprü = 'ws://127.0.0.1:8081'] = process.argv.slice(2);
const hex = (b: Uint8Array, n = 48) => [...b.subarray(0, n)].map((x) => x.toString(16).padStart(2, '0')).join(' ') + (b.length > n ? ' …' : '');

class Oturum {
  readonly kanal = new PaketKanali();
  #kuyruk: Paket[] = [];
  #bekleyen: ((p: Paket) => void) | null = null;
  readonly ws: WebSocket;
  readonly ad: string;
  constructor(ws: WebSocket, ad: string) {
    this.ws = ws; this.ad = ad;
    ws.on('message', (d) => { for (const p of this.kanal.al(d as Buffer)) { if (this.#bekleyen) { const b = this.#bekleyen; this.#bekleyen = null; b(p); } else this.#kuyruk.push(p); } });
  }
  static async ac(adres: string, ad: string): Promise<Oturum> {
    const ws = new WebSocket(adres);
    await new Promise<void>((c, h) => { ws.once('open', () => c()); ws.once('error', h); });
    return new Oturum(ws, ad);
  }
  gonder(ad: string, opcode: number, govde?: Uint8Array): void { console.log(`[${this.ad}] -> ${ad} (0x${opcode.toString(16)})`); this.ws.send(this.kanal.paketYap(opcode, govde)); }
  sonraki(ms = 4000): Promise<Paket> {
    const k = this.#kuyruk.shift(); if (k) return Promise.resolve(k);
    return new Promise((coz, hata) => { const z = setTimeout(() => { this.#bekleyen = null; hata(new Error('zaman aşımı')); }, ms); this.#bekleyen = (p) => { clearTimeout(z); coz(p); }; });
  }
}

async function girisSunucusu(): Promise<void> {
  const o = await Oturum.ac(`${koprü}/giris`, 'giriş');
  try {
    o.gonder('SURUM', LS.SURUM);
    const s = await o.sonraki(); console.log(`   sürüm: ${new PaketOkuyucu(s.govde).i16()}`);

    o.gonder('GIRIS', LS.GIRIS, new PaketYazici().yazi(hesap, true).yazi(sifre, true).baytlar());
    const g = await o.sonraki(); const sonuc = new PaketOkuyucu(g.govde).u8();
    console.log(`   giriş sonucu: ${sonuc} ${({ 1: '(başarılı)', 2: '(hesap yok)', 3: '(şifre yanlış)', 4: '(yasaklı)', 5: '(zaten oyunda)' } as Record<number, string>)[sonuc] ?? ''}`);

    o.gonder('SUNUCU_LISTESI', LS.SUNUCU_LISTESI, new PaketYazici().u16(1).baytlar());
    const l = await o.sonraki(); const lo = new PaketOkuyucu(l.govde); const n = lo.u8();
    for (let i = 0; i < n; i++) console.log('   sunucu:', { ip: lo.yazi(true), ad: lo.yazi(true), oyuncu: lo.i16() });

    o.gonder('HABER', LS.HABER);
    const h = await o.sonraki(); const ho = new PaketOkuyucu(h.govde); console.log('   haber:', JSON.stringify({ baslik: ho.yazi(true), metin: ho.yazi(true) }));
  } finally { o.ws.close(); }
}

async function oyunSunucusu(): Promise<void> {
  const o = await Oturum.ac(`${koprü}/oyun`, 'oyun');
  try {
    o.gonder('SURUM_KONTROL', WIZ.SURUM_KONTROL);
    const v = await o.sonraki(); const vo = new PaketOkuyucu(v.govde);
    const surum = vo.u16(); const acik = vo.u64();
    console.log(`   sunucu sürümü ${surum}, açık anahtar 0x${acik.toString(16)} → şifreleme açılıyor`);
    o.kanal.sifrelemeyiAc(acik, OZEL_ANAHTAR_KLASIK);

    o.gonder('GIRIS', WIZ.GIRIS, new PaketYazici().yazi(hesap, true).yazi(sifre, true).baytlar());
    const g = await o.sonraki(); console.log(`   giriş cevabı: opcode 0x${g.opcode.toString(16)} sonuç ${new PaketOkuyucu(g.govde).i8()} (0..2 = başarılı, -1 = başarısız)`);

    o.gonder('TUM_KARAKTER_BILGISI', WIZ.TUM_KARAKTER_BILGISI, new PaketYazici().u8(1).baytlar());
    const c = await o.sonraki(); console.log(`   karakter listesi: opcode 0x${c.opcode.toString(16)}, ${c.govde.length} bayt: ${hex(c.govde)}`);
  } finally { o.ws.close(); }
}

try { await girisSunucusu(); console.log(''); await oyunSunucusu(); console.log('\nTAMAM'); }
catch (e) { console.log('HATA:', (e as Error).message); }
setTimeout(() => process.exit(0), 300);
