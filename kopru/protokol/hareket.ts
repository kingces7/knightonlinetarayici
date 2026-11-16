// Oyuncu hareketini sunucuya bildirme (WIZ_MOVE, client → sunucu). Kaynak: GameServer/CharacterMovementHandler.cpp (MoveProcess), User.cpp (SpeedHackUser).
//
// Paket gövdesi: `u16 varış x, z, y (×10), i16 hız (×10 m/sn), u8 yankı, u16 şimdiki x, z, y (×10)`. Yankı: 1 = hareket başlıyor, 3 = hareket sürüyor, 0 = durdu.
// Sunucunun bizi hileli sanmaması için uyulacak kurallar (MoveProcess):
//  - yankı yalnızca 0, 1, 3 olabilir; başka değer bağlantıyı keser;
//  - yankı ≠ 0 iken hız 0 olamaz (3 kez olursa oyuncu şehre geri gönderilir) — varış ile şimdiki konum aynıysa ("durağan") bu kural atlanır;
//  - art arda iki "durdu" (yankı 0) paketi yollanamaz;
//  - hız sınırı: normal sınıf 4,5 m/sn (45), savaşçı/büyücü/rahip 6,7 (67), haydut 9,0 (90); aşılırsa bağlantı kesilir.
// Gerçek istemci hareket sürerken saniyede bir "sürüyor" paketi yollar (WIZ_MOVE açıklaması: "Move (1 Second)"); aynısı yapılır.
import { PaketYazici } from './ikili.ts';

export const YANKI = { DURDU: 0, BASLADI: 1, SURUYOR: 3 } as const;

/** Bu hızın (m/sn) altı "duruyor" sayılır. */
const DURMA_ESIGI = 0.4;
/** Hareket bitince "durdu" paketi, bu kadar saniye kıpırdamadan sonra yollanır (titreme/tek kare duraksamayı elemek için). */
const DURMA_SURESI = 0.15;
/** Hareket sürerken en az bu aralıkla (sn) "sürüyor" paketi yollanır. */
const YENILEME_ARALIGI = 1.0;
/** Yön bu kadar derece değişirse aralığı beklemeden "sürüyor" yollanır. */
const YON_DEGISIMI = 20;

export type HareketYollayici = (govde: Uint8Array, yanki: number) => void;

export class HareketGonderici {
  #yolla: HareketYollayici;
  #azamiHiz10: number;
  #t = 0;
  #px = NaN; #pz = NaN;
  #hareketli = false;
  #hiz = 0; // yumuşatılmış m/sn
  #yonX = 0; #yonZ = 0;
  #sonYolX = 0; #sonYolZ = 0;
  #sonGonderim = 0;
  #durma = 0;

  /** `azamiHiz10`: sunucunun bu sınıf için izin verdiği en yüksek hız (×10; normal 45, savaşçı/büyücü/rahip 67, haydut 90). */
  constructor(yolla: HareketYollayici, azamiHiz10 = 45) { this.#yolla = yolla; this.#azamiHiz10 = azamiHiz10; }

  get hareketli(): boolean { return this.#hareketli; }

  /** Her karede çağrılır. `x, z, y`: şimdiki konum (metre; y = yükseklik), `dt`: önceki kareden geçen süre (sn). */
  guncelle(x: number, z: number, y: number, dt: number): void {
    if (!(dt > 0)) return;
    this.#t += dt;
    if (Number.isNaN(this.#px)) { this.#px = x; this.#pz = z; return; }
    const dx = x - this.#px, dz = z - this.#pz;
    this.#px = x; this.#pz = z;
    const d = Math.hypot(dx, dz), v = d / dt;

    if (v > DURMA_ESIGI) {
      this.#durma = 0;
      this.#hiz = this.#hareketli ? this.#hiz * 0.7 + v * 0.3 : v;
      const yx = dx / d, yz = dz / d;
      if (!this.#hareketli) {
        this.#yonX = yx; this.#yonZ = yz; this.#hareketli = true;
        this.#gonder(YANKI.BASLADI, x, z, y);
      } else {
        const cos = yx * this.#sonYolX + yz * this.#sonYolZ;
        const acidegisti = cos < Math.cos((YON_DEGISIMI * Math.PI) / 180);
        this.#yonX = yx; this.#yonZ = yz;
        if (acidegisti || this.#t - this.#sonGonderim >= YENILEME_ARALIGI) this.#gonder(YANKI.SURUYOR, x, z, y);
      }
    } else if (this.#hareketli) {
      this.#durma += dt;
      if (this.#durma >= DURMA_SURESI) { this.#hareketli = false; this.#gonder(YANKI.DURDU, x, z, y); }
    }
  }

  #gonder(yanki: number, x: number, z: number, y: number): void {
    const hiz10 = yanki === YANKI.DURDU ? 0 : Math.min(this.#azamiHiz10, Math.max(1, Math.round(this.#hiz * 10)));
    // Varış: hareket sürerken 1 sn sonraki tahmini konum; durunca şimdiki konum ("durağan" paket).
    const vx = yanki === YANKI.DURDU ? x : x + this.#yonX * (hiz10 / 10);
    const vz = yanki === YANKI.DURDU ? z : z + this.#yonZ * (hiz10 / 10);
    const p = (m: number) => Math.min(0xffff, Math.max(0, Math.round(m * 10)));
    const govde = new PaketYazici().u16(p(vx)).u16(p(vz)).u16(p(y)).i16(hiz10).u8(yanki).u16(p(x)).u16(p(z)).u16(p(y)).baytlar();
    this.#sonGonderim = this.#t; this.#sonYolX = this.#yonX; this.#sonYolZ = this.#yonZ;
    this.#yolla(govde, yanki);
  }
}
