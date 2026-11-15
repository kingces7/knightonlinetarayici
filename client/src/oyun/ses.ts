// Ses: karakter/canavar sesleri, adım sesleri ve bölge müziği (araclar/oyun/ses.ts → /ses/ses.json ve .ogg dosyaları).
// Tarayıcılar kullanıcı etkileşiminden önce ses çalmaya izin vermez; ilk tıklama/tuşta etkinleşir. M tuşu sesi kapatır/açar.
import * as THREE from 'three';

interface ModelSesi { yuru: string | null; saldir: string[]; darbe: string[]; olum: string | null }
interface SesVerisi { model: Record<string, ModelSesi>; adim: Record<string, { yuru: string[]; kos: string[] }>; muzik: Record<string, string> }

const UZAK = 45; // m: bu uzaklıktan sonra duyulmaz
const ADIM_TURU = '12'; // Move_Sound: El Morad normal boy erkek (oyuncu modeli upc_el_rm)

export class Ses {
  private veri: SesVerisi | null = null;
  private baglam: AudioContext | null = null;
  private ana: GainNode | null = null;
  private tamponlar = new Map<string, Promise<AudioBuffer | null>>();
  private muzik: HTMLAudioElement | null = null;
  private sessiz = false;
  private adimSira = 0;
  /** Dinleyici konumu (oyuncu; Knight Online x, z). */
  dinleyici = new THREE.Vector2();

  async yukle(): Promise<void> {
    try { this.veri = await (await fetch('/ses/ses.json')).json() as SesVerisi; } catch { this.veri = null; return; }
    const ac = () => {
      if (!this.baglam) {
        this.baglam = new AudioContext();
        this.ana = this.baglam.createGain(); this.ana.gain.value = this.sessiz ? 0 : 0.7; this.ana.connect(this.baglam.destination);
      }
      void this.baglam.resume();
      void this.muzik?.play().catch(() => { /* kullanıcı etkileşimi bekleniyor */ });
    };
    addEventListener('pointerdown', ac); addEventListener('keydown', ac);
  }

  /** M tuşu: tüm sesi kapat/aç. */
  sessizDegistir(): boolean {
    this.sessiz = !this.sessiz;
    if (this.ana) this.ana.gain.value = this.sessiz ? 0 : 0.7;
    if (this.muzik) this.muzik.muted = this.sessiz;
    return this.sessiz;
  }

  private tampon(dosya: string): Promise<AudioBuffer | null> {
    let p = this.tamponlar.get(dosya);
    if (!p) {
      p = (async () => {
        try {
          const b = await (await fetch(`/ses/${dosya}`)).arrayBuffer();
          return await (this.baglam ?? (this.baglam = new AudioContext())).decodeAudioData(b);
        } catch { return null; }
      })();
      this.tamponlar.set(dosya, p);
    }
    return p;
  }

  /** Dosyayı çalar; `konum` verilirse dinleyiciye uzaklığa göre kısılır. */
  cal(dosya: string | null | undefined, hacim = 1, konum?: THREE.Vector2): void {
    if (!dosya || !this.veri || !this.baglam || !this.ana || this.baglam.state !== 'running') return;
    let k = hacim;
    if (konum) { const d = konum.distanceTo(this.dinleyici); if (d >= UZAK) return; k *= Math.pow(1 - d / UZAK, 1.5); }
    if (k < 0.02) return;
    void this.tampon(dosya).then((t) => {
      if (!t || !this.baglam || !this.ana) return;
      const kaynak = this.baglam.createBufferSource(); kaynak.buffer = t;
      const g = this.baglam.createGain(); g.gain.value = k;
      kaynak.connect(g); g.connect(this.ana); kaynak.start();
    });
  }

  /** Model sesi (NPC_Looks): saldır / darbe / ölüm. */
  modelSesi(model: number, tur: 'saldir' | 'darbe' | 'olum', konum?: THREE.Vector2): void {
    const m = this.veri?.model[String(model)]; if (!m) return;
    const d = tur === 'olum' ? m.olum : m[tur][Math.floor(Math.random() * m[tur].length)];
    this.cal(d, 1, konum);
  }

  /** Oyuncu adımı (Move_Sound): sırayla yürüme/koşma sesleri. */
  adim(kosuyor: boolean): void {
    const a = this.veri?.adim[ADIM_TURU]; if (!a) return;
    const l = kosuyor ? a.kos : a.yuru; if (!l.length) return;
    this.cal(l[this.adimSira++ % l.length], 0.6);
  }

  /** Bölge müziği (Snd/<bölge>_<ad>.ogg), döngülü ve kısık. */
  muzikCal(bolge: number): void {
    const d = this.veri?.muzik[String(bolge)]; if (!d || this.muzik) return;
    this.muzik = new Audio(`/ses/${d}`); this.muzik.loop = true; this.muzik.volume = 0.22; this.muzik.muted = this.sessiz;
    void this.muzik.play().catch(() => { /* ilk etkileşimde başlar */ });
  }
}
