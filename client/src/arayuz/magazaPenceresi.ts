// "Store" penceresi: mağaza (üstte 6×4) ve envanter (altta 7×4) TEK pencerede (oyunun alış-satış NPC düzeni, kullanıcının referans ekran görüntüsüne göre çizildi).
// Sol tık mağaza eşyası = satın al; sağ tık envanter eşyası = sat; tamirci NPC'de "Repair" modu eşyaya tıklayınca tamir ettirir.
import type { EsyaTanimi } from '../oyun/veri';
import type { YuvaKonumu } from '../oyun/varliklar';
import { tamirUcreti } from '../../../kopru/protokol/envanter.ts';

const TASARIM_GEN = 702, TASARIM_YUK = 902;
const SIMGE_BOYUTU = '68px 68px'; // simge 45×45 resim; hücre 91×82

export interface MagazaKancalari {
  envanter: () => (EsyaTanimi | null)[]; altin: () => number;
  satinAl: (e: EsyaTanimi) => void; sat: (yuva: number) => void; tamirEt: (k: YuvaKonumu) => void;
  ipucu: (e: EsyaTanimi, ev: MouseEvent, satin: boolean, tamir: number) => void; ipucuGizle: () => void;
  mesaj: (m: string) => void; altBos: () => number; kapandi: () => void;
}

export class MagazaPenceresi {
  readonly el = document.createElement('div');
  private ust: HTMLElement[] = []; private alt: HTMLElement[] = [];
  private sayfaYazi = document.createElement('div'); private altinYazi = document.createElement('div'); private baslik = document.createElement('div');
  private tamirDugme = document.createElement('div');
  private sayfalar: EsyaTanimi[][] = []; private sayfa = 0; private tamirModu = false; private imza = '';
  acik = false;

  constructor(private k: MagazaKancalari, ust: HTMLElement) {
    const e = this.el;
    e.className = 'magaza-pencere'; e.style.display = 'none';
    Object.assign(e.style, { position: 'absolute', width: `${TASARIM_GEN}px`, height: `${TASARIM_YUK}px`, transformOrigin: 'top right', zIndex: '7', userSelect: 'none', color: '#fff', fontFamily: "'Segoe UI', Tahoma, sans-serif" });
    const zemin = document.createElement('div');
    Object.assign(zemin.style, { position: 'absolute', inset: '0', background: 'linear-gradient(#17140f, #0d0b08)', border: '3px solid #a8742f', borderRadius: '4px', boxShadow: '0 0 0 2px #000, 0 8px 26px #000c', opacity: '.93' });
    e.appendChild(zemin);
    Object.assign(this.baslik.style, { position: 'absolute', left: '0', right: '0', top: '34px', textAlign: 'center', font: '400 32px Segoe UI, sans-serif', color: '#d9b878', textShadow: '0 2px 3px #000' });
    this.baslik.textContent = 'Store'; e.appendChild(this.baslik);
    // Kapatma (sağ üst çarpı)
    const x = document.createElement('div'); x.textContent = '✕';
    Object.assign(x.style, { position: 'absolute', right: '10px', top: '-14px', width: '40px', height: '40px', lineHeight: '38px', textAlign: 'center', fontSize: '22px', borderRadius: '50%', background: 'radial-gradient(#e6c56e, #8a5f1f)', border: '2px solid #3a2810', color: '#2a1a06', cursor: 'pointer', fontWeight: '700' });
    x.addEventListener('click', () => this.kapat()); e.appendChild(x);
    // Mağaza ızgarası: 6 sütun × 4 satır
    const hucre = (sol: number, ust2: number, gen: number, yuk: number): HTMLElement => {
      const h = document.createElement('div');
      Object.assign(h.style, { position: 'absolute', left: `${sol}px`, top: `${ust2}px`, width: `${gen}px`, height: `${yuk}px`, boxSizing: 'border-box', border: '2px solid #8f6128', background: 'rgba(0,0,0,.40)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', cursor: 'default' });
      e.appendChild(h); return h;
    };
    for (let s = 0; s < 4; s++) for (let c = 0; c < 6; c++) this.ust.push(hucre(26 + c * 91, 130 + s * 82, 91, 82));
    // Sayfa okları ve numarası
    const ok = (yukari: boolean, y: number) => {
      const d = document.createElement('div'); d.textContent = yukari ? '▲' : '▼';
      Object.assign(d.style, { position: 'absolute', left: '616px', top: `${y}px`, width: '74px', height: '34px', lineHeight: '34px', textAlign: 'center', color: '#e8b84a', fontSize: '22px', background: 'linear-gradient(#5a5f6a, #2a2d35)', border: '1px solid #15171c', borderRadius: '3px', cursor: 'pointer' });
      d.addEventListener('click', () => this.sayfaDegistir(yukari ? -1 : 1)); e.appendChild(d);
    };
    ok(true, 214); ok(false, 346);
    Object.assign(this.sayfaYazi.style, { position: 'absolute', left: '616px', top: '276px', width: '74px', textAlign: 'center', font: '700 26px Segoe UI, sans-serif', color: '#ffe600', textShadow: '0 1px 2px #000' });
    e.appendChild(this.sayfaYazi);
    // Ayraç + altın
    const ayrac = document.createElement('div'); Object.assign(ayrac.style, { position: 'absolute', left: '26px', right: '26px', top: '486px', height: '2px', background: '#8f6128' }); e.appendChild(ayrac);
    Object.assign(this.altinYazi.style, { position: 'absolute', left: '458px', top: '499px', width: '224px', height: '36px', lineHeight: '36px', boxSizing: 'border-box', paddingRight: '12px', textAlign: 'right', font: '700 22px Segoe UI, sans-serif', color: '#ffe600', border: '2px solid #8f6128', background: 'rgba(0,0,0,.55)', textShadow: '0 1px 2px #000' });
    e.appendChild(this.altinYazi);
    const noah = document.createElement('div'); Object.assign(noah.style, { position: 'absolute', left: '412px', top: '498px', width: '40px', height: '38px', backgroundImage: 'url(/esya/noah.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }); e.appendChild(noah);
    // Tamir düğmesi (yalnız tamirci NPC)
    Object.assign(this.tamirDugme.style, { position: 'absolute', left: '40px', top: '499px', width: '120px', height: '36px', lineHeight: '34px', textAlign: 'center', font: '700 18px Segoe UI, sans-serif', color: '#ffe9a8', border: '2px solid #8f6128', background: 'linear-gradient(#3a3d46, #1b1d23)', borderRadius: '3px', cursor: 'pointer', display: 'none' });
    this.tamirDugme.textContent = 'Repair'; this.tamirDugme.addEventListener('click', () => this.tamirModuDegistir(!this.tamirModu)); e.appendChild(this.tamirDugme);
    // Envanter ızgarası: 7 sütun × 4 satır
    for (let s = 0; s < 4; s++) for (let c = 0; c < 7; c++) this.alt.push(hucre(40 + c * 88, 548 + s * 84, 88, 84));
    ust.appendChild(e);
    addEventListener('resize', () => this.yerlestir());
  }

  /** Mağazayı açar. `tamirci`: NPC tamir de yapıyor mu. */
  ac(npcAdi: string, sayfalar: EsyaTanimi[][], tamirci: boolean): void {
    this.sayfalar = sayfalar; this.sayfa = 0; this.imza = ''; this.tamirModuDegistir(false);
    this.baslik.textContent = 'Store'; this.el.title = npcAdi;
    this.tamirDugme.style.display = tamirci ? '' : 'none';
    this.acik = true; this.el.style.display = ''; this.yerlestir(); this.ciz();
  }
  kapat(): void { if (!this.acik) return; this.acik = false; this.tamirModuDegistir(false); this.el.style.display = 'none'; this.k.ipucuGizle(); this.k.kapandi(); }

  private tamirModuDegistir(ac: boolean): void {
    this.tamirModu = ac; this.imza = ''; this.k.ipucuGizle();
    this.tamirDugme.style.filter = ac ? 'brightness(1.5) sepia(1) hue-rotate(60deg)' : '';
    if (ac) this.k.mesaj('Repair mode: click an item to repair it.');
    if (this.acik) this.ciz();
  }
  private sayfaDegistir(d: number): void { const n = this.sayfalar.length || 1; this.sayfa = (this.sayfa + d + n) % n; this.imza = ''; this.ciz(); }

  /** Pencereyi sağ üst köşeye, görev çubuğunun üstünde kalacak şekilde ölçekleyerek yerleştirir. */
  yerlestir(): void {
    const bos = this.k.altBos(), ol = Math.max(0.35, Math.min(1, (innerHeight - bos - 12) / TASARIM_YUK, (innerWidth - 16) / TASARIM_GEN));
    Object.assign(this.el.style, { right: '6px', top: '8px', left: 'auto', transform: `scale(${ol})` });
  }

  /** Her karede çağrılır (açıkken): içerik değiştiyse yeniden çizer. */
  ciz(): void {
    if (!this.acik) return;
    const env = this.k.envanter(), altin = this.k.altin();
    const imza = `${this.sayfa}|${altin}|${this.tamirModu}|${env.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}d${e?.suru ?? ''}`).join(',')}`;
    if (imza === this.imza) return; this.imza = imza;
    this.sayfaYazi.textContent = String(this.sayfa + 1); this.altinYazi.textContent = altin.toLocaleString('en-US');
    const sayfa = this.sayfalar[this.sayfa] ?? [];
    this.ust.forEach((h, i) => this.hucreCiz(h, sayfa[i] ?? null, true, null));
    this.alt.forEach((h, i) => this.hucreCiz(h, env[i] ?? null, false, { tur: 'c', i }));
  }

  private hucreCiz(h: HTMLElement, e: EsyaTanimi | null, magaza: boolean, konum: YuvaKonumu | null): void {
    h.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; h.style.backgroundSize = SIMGE_BOYUTU;
    h.style.cursor = e ? 'pointer' : 'default';
    h.style.opacity = e && magaza && this.k.altin() < e.fiyat ? '0.55' : '1';
    // Adet (sağ alt köşe)
    let adet = h.querySelector('span') as HTMLElement | null;
    const yazi = e && (e.adet ?? 1) > 1 ? String(e.adet) : '';
    if (!adet && yazi) { adet = document.createElement('span'); Object.assign(adet.style, { position: 'absolute', right: '5px', bottom: '2px', font: '700 18px Segoe UI, sans-serif', textShadow: '0 1px 2px #000, 0 0 3px #000' }); h.appendChild(adet); }
    if (adet) adet.textContent = yazi;
    const tamir = e && !magaza && this.tamirModu ? tamirUcreti(e.fiyat, e.dayanim ?? 0, e.suru ?? (e.dayanim ?? 0)) : 0;
    h.onmouseenter = e ? (ev) => this.k.ipucu(e, ev, magaza, tamir) : null; h.onmouseleave = () => this.k.ipucuGizle();
    h.onclick = e ? () => { this.k.ipucuGizle(); if (magaza) this.k.satinAl(e); else if (konum && this.tamirModu) this.k.tamirEt(konum); } : null;
    h.oncontextmenu = e && !magaza && konum ? (ev) => { ev.preventDefault(); this.k.ipucuGizle(); if (!this.tamirModu) this.k.sat(konum.i); } : null;
  }
}
