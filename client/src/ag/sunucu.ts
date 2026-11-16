// Sunucu bağlantısı (Aşama 4): köprü (kopru/) üzerinden Myko giriş ve oyun sunucularına bağlanır.
// Protokol kütüphanesi kopru/protokol/ içindedir (tarayıcıda ve Node'da aynı kod çalışır; docs/protokol.md §5–6, §12).
// Akış: giriş sunucusu (sürüm → şifreleme → giriş → sunucu listesi) → oyun sunucusu (sürüm → giriş → karakter listesi → karakter seç → oyun başlat).
import { PaketKanali, type Paket } from '../../../kopru/protokol/kanal.ts';
import { PaketOkuyucu, PaketYazici } from '../../../kopru/protokol/ikili.ts';
import { LS, WIZ, GIRIS_SONUCU } from '../../../kopru/protokol/opcode.ts';
import {
  benimBilgim, karakterListesi, karakterSecCevabi, oyunGirisCevabi, oyunHavasi, oyunSaati,
  type BenimBilgim, type KarakterOzeti,
} from '../../../kopru/protokol/paketler.ts';

export class SunucuHatasi extends Error {}

export const VARSAYILAN_KOPRU = 'ws://127.0.0.1:8081';

/** Tek bir WebSocket bağlantısı + paket kanalı; gelen paketleri sıraya koyar, istenen opcode'u bekletir. */
class Baglanti {
  readonly kanal = new PaketKanali();
  readonly ws: WebSocket;
  #kuyruk: Paket[] = [];
  #bekleyen: { opcode: number; coz: (p: Paket) => void; hata: (e: Error) => void; zaman: ReturnType<typeof setTimeout> } | null = null;
  #kapali: Error | null = null;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('message', (o) => {
      try { for (const p of this.kanal.al(new Uint8Array(o.data as ArrayBuffer))) this.#paketGeldi(p); }
      catch (e) { this.#hata(e as Error); }
    });
    ws.addEventListener('close', () => this.#hata(new SunucuHatasi('Connection closed by the server.')));
  }

  static ac(adres: string): Promise<Baglanti> {
    return new Promise((coz, hata) => {
      let ws: WebSocket;
      try { ws = new WebSocket(adres); } catch (e) { hata(new SunucuHatasi(`Bad bridge address: ${adres}`)); return; }
      const b = new Baglanti(ws);
      ws.addEventListener('open', () => coz(b), { once: true });
      ws.addEventListener('error', () => hata(new SunucuHatasi(`Cannot reach the bridge at ${adres}. Is it running?`)), { once: true });
    });
  }

  #paketGeldi(p: Paket): void {
    if (this.#bekleyen && this.#bekleyen.opcode === p.opcode) {
      const b = this.#bekleyen; this.#bekleyen = null; clearTimeout(b.zaman); b.coz(p);
    } else {
      this.#kuyruk.push(p);
      if (this.#kuyruk.length > 400) this.#kuyruk.shift(); // oyun içi akışta sınırsız büyümesin (Aşama 5'te işleyicilere bağlanacak)
    }
  }

  #hata(e: Error): void {
    this.#kapali ??= e;
    if (this.#bekleyen) { const b = this.#bekleyen; this.#bekleyen = null; clearTimeout(b.zaman); b.hata(e); }
  }

  gonder(opcode: number, govde?: Uint8Array): void {
    if (this.#kapali) throw this.#kapali;
    this.ws.send(this.kanal.paketYap(opcode, govde));
  }

  /** Verilen opcode'lu ilk paketi bekler (sıradakiler arasında varsa hemen verir). */
  bekle(opcode: number, ms = 6000): Promise<Paket> {
    const i = this.#kuyruk.findIndex((p) => p.opcode === opcode);
    if (i >= 0) return Promise.resolve(this.#kuyruk.splice(i, 1)[0]);
    if (this.#kapali) return Promise.reject(this.#kapali);
    return new Promise((coz, hata) => {
      const zaman = setTimeout(() => { this.#bekleyen = null; hata(new SunucuHatasi(`No answer from the server (0x${opcode.toString(16)}).`)); }, ms);
      this.#bekleyen = { opcode, coz, hata, zaman };
    });
  }

  kapat(): void { this.ws.close(); }
}

export interface SunucuOturumu {
  sunucuAdi: string;
  karakter: KarakterOzeti;
  /** Oyuncunun bulunduğu bölge numarası (21 = Moradon). */
  bolge: number;
  ulus: number;
  benim: BenimBilgim;
  saat: ReturnType<typeof oyunSaati> | null;
  hava: ReturnType<typeof oyunHavasi> | null;
  /** Sunucunun karşılama mesajı (varsa). */
  karsilama: string | null;
  kapat(): void;
}

const GIRIS_MESAJLARI: Record<number, string> = {
  [GIRIS_SONUCU.HESAP_YOK]: 'Account not found.', [GIRIS_SONUCU.SIFRE_YANLIS]: 'Wrong password.', [GIRIS_SONUCU.YASAKLI]: 'This account is banned.',
  [GIRIS_SONUCU.OYUNDA]: 'This account is already in the game.', [GIRIS_SONUCU.HATA]: 'Login error.',
};

/** Giriş sunucusu: şifreli oturum açar, sunucu adını döndürür. */
async function girisSunucusu(kopru: string, hesap: string, sifre: string): Promise<string> {
  const b = await Baglanti.ac(`${kopru}/giris`);
  try {
    b.gonder(LS.SURUM); await b.bekle(LS.SURUM);
    b.gonder(LS.SIFRELEME);
    const anahtar = new PaketOkuyucu((await b.bekle(LS.SIFRELEME)).govde).u64();
    b.kanal.sifrelemeyiAc(anahtar);
    b.gonder(LS.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
    const g = new PaketOkuyucu((await b.bekle(LS.GIRIS)).govde); g.u16();
    const sonuc = g.u8();
    if (sonuc !== GIRIS_SONUCU.BASARILI) throw new SunucuHatasi(GIRIS_MESAJLARI[sonuc] ?? `Login refused (code ${sonuc}).`);
    b.gonder(LS.SUNUCU_LISTESI, new PaketYazici().u16(1).baytlar());
    const l = new PaketOkuyucu((await b.bekle(LS.SUNUCU_LISTESI)).govde);
    l.u16();
    if (l.u8() < 1) throw new SunucuHatasi('The login server has no game servers.');
    l.yazi(); l.yazi();
    return l.yazi().split('|')[0]; // "DiabloKO|DiabloKO" biçimi: ilk parça görünen ad
  } finally { b.kapat(); }
}

/**
 * Tam bağlantı akışı. Başarılı olunca oyun sunucusu bağlantısı AÇIK kalır (`kapat()` ile kapatılır).
 * `karakterAdi` verilmezse hesabın ilk dolu karakter yuvası seçilir.
 */
export async function sunucuyaBaglan(hesap: string, sifre: string, kopru = VARSAYILAN_KOPRU, karakterAdi?: string): Promise<SunucuOturumu> {
  const sunucuAdi = await girisSunucusu(kopru, hesap, sifre);

  const b = await Baglanti.ac(`${kopru}/oyun`);
  try {
    b.gonder(WIZ.SURUM_KONTROL); await b.bekle(WIZ.SURUM_KONTROL);

    b.gonder(WIZ.GIRIS, new PaketYazici().yazi(hesap).yazi(sifre).baytlar());
    const giris = oyunGirisCevabi((await b.bekle(WIZ.GIRIS)).govde);
    if (!giris.basarili) throw new SunucuHatasi('The game server refused the login.');

    b.gonder(WIZ.TUM_KARAKTER_BILGISI, new PaketYazici().u8(1).baytlar());
    const { yuvalar } = karakterListesi((await b.bekle(WIZ.TUM_KARAKTER_BILGISI)).govde);
    const karakter = yuvalar.find((y) => y.ad && (!karakterAdi || y.ad.toLowerCase() === karakterAdi.toLowerCase()));
    if (!karakter) throw new SunucuHatasi(karakterAdi ? `Character "${karakterAdi}" not found on this account.` : 'This account has no characters.');

    b.gonder(WIZ.KARAKTER_SEC, new PaketYazici().yazi(hesap).yazi(karakter.ad).u8(1).baytlar());
    const sec = karakterSecCevabi((await b.bekle(WIZ.KARAKTER_SEC)).govde);
    if (!sec.basarili || sec.bolge === undefined) throw new SunucuHatasi(`Character selection failed (code ${sec.kod}).`);

    b.gonder(WIZ.OYUN_BASLAT, new PaketYazici().u8(1).yazi(karakter.ad, false).baytlar());
    const benim = benimBilgim((await b.bekle(WIZ.BENIM_BILGIM)).govde);
    const saatPaketi = await b.bekle(WIZ.SAAT, 3000).catch(() => null);
    const havaPaketi = await b.bekle(WIZ.HAVA, 3000).catch(() => null);
    const karsilamaPaketi = await b.bekle(0xc4, 3000).catch(() => null); // karşılama mesajı
    await b.bekle(WIZ.OYUN_BASLAT); // sunucu "hazır" der
    b.gonder(WIZ.OYUN_BASLAT, new PaketYazici().u8(2).yazi(karakter.ad, false).baytlar()); // dünyaya gir

    let karsilama: string | null = null;
    if (karsilamaPaketi) { try { karsilama = new PaketOkuyucu(karsilamaPaketi.govde).yazi(); } catch { /* biçim farklıysa yok say */ } }
    return {
      sunucuAdi, karakter, bolge: sec.bolge, ulus: giris.ulus === -1 ? 0 : giris.ulus, benim,
      saat: saatPaketi ? oyunSaati(saatPaketi.govde) : null, hava: havaPaketi ? oyunHavasi(havaPaketi.govde) : null,
      karsilama, kapat: () => b.kapat(),
    };
  } catch (e) { b.kapat(); throw e; }
}
