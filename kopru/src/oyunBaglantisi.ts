// Ortak yardımcılar: çalışan Myko oyun sunucusuna doğrudan TCP ile bağlanan basit istemci (geliştirme betikleri için).
import net from 'node:net';
import { PaketKanali, type Paket } from '../protokol/kanal.ts';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { benimBilgim, karakterListesi, karakterSecCevabi, oyunGirisCevabi } from '../protokol/paketler.ts';

export const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
export const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const tumOyunlar: Oyun[] = [];
process.on('uncaughtException', (e) => { console.log('HATA:', (e as Error).message); for (const o of tumOyunlar) console.log(`  [${o.ad}] son paketler:`, o.kayit.slice(-8).map((k) => `${k.asama}:0x${k.opcode.toString(16)}(${k.hex.length / 2}b) ${k.hex.slice(0, 40)}`)); process.exit(1); });

export class Oyun {
  readonly kanal = new PaketKanali();
  readonly kayit: Array<{ asama: string; opcode: number; hex: string }> = [];
  asama = 'baglanti';
  kuyruk: Paket[] = [];
  kapandi = false;
  #s: net.Socket;
  ad: string;
  constructor(ad: string) {
    this.ad = ad; tumOyunlar.push(this);
    this.#s = net.connect(15001, '127.0.0.1');
    this.#s.on('data', (d) => { for (const p of this.kanal.al(d)) { this.kuyruk.push(p); this.kayit.push({ asama: this.asama, opcode: p.opcode, hex: hex(p.govde) }); } });
    this.#s.on('close', () => { this.kapandi = true; });
    this.#s.on('error', () => { this.kapandi = true; });
  }
  async hazir(): Promise<void> { await new Promise<void>((r) => this.#s.once('connect', () => r())); }
  gonder(op: number, govde?: Uint8Array): void { if (this.kapandi) throw new Error(`${this.ad}: bağlantı kapalı`); this.#s.write(this.kanal.paketYap(op, govde)); }
  async al(op: number, ms = 4000): Promise<Paket> {
    const son = Date.now() + ms;
    while (Date.now() < son) { const i = this.kuyruk.findIndex((p) => p.opcode === op); if (i >= 0) return this.kuyruk.splice(i, 1)[0]; if (this.kapandi) throw new Error(`${this.ad}: bağlantı kapandı (0x${op.toString(16)} beklenirken)`); await bekle(20); }
    throw new Error(`${this.ad}: 0x${op.toString(16)} gelmedi`);
  }
  kapat(): void { this.#s.destroy(); }
}

/** Sürüm → giriş → (ulus) → (karakter oluştur) → karakter seç → oyuna gir. */
export async function girisYap(ad: string, hesap: string, sifre: string, yeniKarakter?: string, secilen?: string) {
  const o = new Oyun(ad); await o.hazir();
  o.asama = 'surum'; o.gonder(WIZ.SURUM_KONTROL); await o.al(WIZ.SURUM_KONTROL);
  o.asama = 'giris'; o.gonder(WIZ.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
  const g = oyunGirisCevabi((await o.al(WIZ.GIRIS)).govde);
  if (!g.basarili) throw new Error(`${ad}: giriş reddedildi`);
  if (g.ulus === 0) { o.gonder(WIZ.ULUS_SEC, new PaketYazici().u8(2).baytlar()); await o.al(WIZ.ULUS_SEC); }
  const listele = async () => { o.gonder(WIZ.TUM_KARAKTER_BILGISI, new PaketYazici().u8(1).baytlar()); return karakterListesi((await o.al(WIZ.TUM_KARAKTER_BILGISI)).govde).yuvalar; };
  let yuvalar = await listele();
  if (!yuvalar.some((y) => y.ad) && yeniKarakter) {
    // yuva 0, ad, ırk 12 (El Morad erkek), sınıf 201 (savaşçı), yüz 1, saç 1, statlar 60×5 = 300
    o.gonder(WIZ.YENI_KARAKTER, new PaketYazici().u8(0).yazi(yeniKarakter).u8(12).u16(201).u8(1).u32(1).u8(60).u8(60).u8(60).u8(60).u8(60).baytlar());
    const k = (await o.al(WIZ.YENI_KARAKTER)).govde[0];
    console.log(`  [${ad}] karakter oluşturma sonucu: ${k} (0 = başarılı)`);
    if (k !== 0) throw new Error(`${ad}: karakter oluşturulamadı (kod ${k})`);
    yuvalar = await listele();
  }
  const karakter = secilen ? yuvalar.find((y) => y.ad.toLowerCase() === secilen.toLowerCase()) : yuvalar.find((y) => y.ad); if (!karakter) throw new Error(`${ad}: karakter yok`);
  o.asama = 'karakter_sec'; o.gonder(WIZ.KARAKTER_SEC, new PaketYazici().yazi(hesap).yazi(karakter.ad).u8(1).baytlar());
  const sec = karakterSecCevabi((await o.al(WIZ.KARAKTER_SEC)).govde);
  o.asama = 'oyun_baslat_1'; o.gonder(WIZ.OYUN_BASLAT, new PaketYazici().u8(1).yazi(karakter.ad, false).baytlar());
  const benim = benimBilgim((await o.al(WIZ.BENIM_BILGIM)).govde);
  await o.al(WIZ.OYUN_BASLAT);
  o.asama = 'oyun_baslat_2'; o.gonder(WIZ.OYUN_BASLAT, new PaketYazici().u8(2).yazi(karakter.ad, false).baytlar());
  await bekle(800);
  return { o, benim, sec };
}

