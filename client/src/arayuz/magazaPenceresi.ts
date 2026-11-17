// "Store" penceresi: mağaza (üstte 6×4) ve envanter (altta 7×4) TEK pencerede (oyunun alış-satış NPC düzeni, kullanıcının referans ekran görüntüsüne göre çizildi).
// Sol tık mağaza eşyası = satın al; sağ tık envanter eşyası = sat; tamirci NPC'de "Repair" modu eşyaya tıklayınca tamir ettirir.
import type { EsyaTanimi } from '../oyun/veri';
import type { YuvaKonumu } from '../oyun/varliklar';
import { tamirUcreti } from '../../../kopru/protokol/envanter.ts';

const TASARIM_GEN = 702, TASARIM_YUK = 902;
const SIMGE_BOYUTU = '76px 76px'; // simge 45×45 resim; hücre 91×82

/** Oyunun kendi arayüz dokusundan (512×512 atlas, /arayuz/doku) bir parçayı elemana çizer: uv = [u0, v0, u1, v1]. */
function sprite(el: HTMLElement, doku: string, uv: [number, number, number, number], w: number, h: number): void {
  const rw = (uv[2] - uv[0]) * 512, rh = (uv[3] - uv[1]) * 512;
  Object.assign(el.style, { backgroundImage: `url(/arayuz/doku/${doku}.png)`, backgroundRepeat: 'no-repeat', backgroundSize: `${(512 * w) / rw}px ${(512 * h) / rh}px`, backgroundPosition: `${-(uv[0] * 512 * w) / rw}px ${-(uv[1] * 512 * h) / rh}px` });
}
// Orijinal re_tradeinventory penceresinin dokuları: ızgara zemini, altın çubuğu, Noah simgesi, düğmeler, çarpı
// Tek yuva (orijinal ızgaranın bir hücresi: 48×48 px, atlasta x 15, y 145)
const UV_YUVA: [number, number, number, number] = [15 / 512, 145 / 512, 63 / 512, 193 / 512];
const UV_ALTIN: [number, number, number, number] = [0.5078125, 0.861328125, 0.8203125, 0.90625];
const UV_NOAH: [number, number, number, number] = [0.501953125, 0.724609375, 0.55859375, 0.76953125];
const UV_DUGME: [number, number, number, number] = [0.71484375, 0.005859375, 0.85546875, 0.052734375];
const UV_CARPI: [number, number, number, number] = [0.724609375, 0.009765625, 0.763671875, 0.048828125];
const UV_CARPI_USTU: [number, number, number, number] = [0.80859375, 0.009765625, 0.84765625, 0.048828125];

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
    Object.assign(x.style, { position: 'absolute', right: '8px', top: '-16px', width: '52px', height: '52px', cursor: 'pointer', fontSize: '0' });
    sprite(x, 'ui_ka_levelquest', UV_CARPI, 52, 52); x.onmouseenter = () => sprite(x, 'ui_ka_levelquest', UV_CARPI_USTU, 52, 52); x.onmouseleave = () => sprite(x, 'ui_ka_levelquest', UV_CARPI, 52, 52);
    x.addEventListener('click', () => this.kapat()); e.appendChild(x);
    // Mağaza ızgarası: 6 sütun × 4 satır
    const hucre = (sol: number, ust2: number, gen: number, yuk: number): HTMLElement => {
      const h = document.createElement('div');
      Object.assign(h.style, { position: 'absolute', left: `${sol}px`, top: `${ust2}px`, width: `${gen}px`, height: `${yuk}px`, boxSizing: 'border-box', cursor: 'default' });
      sprite(h, 'ui_marketing', UV_YUVA, gen, yuk); h.dataset.zemin = h.style.backgroundImage; h.dataset.zeminBoyut = h.style.backgroundSize; h.dataset.zeminKonum = h.style.backgroundPosition;
      e.appendChild(h); return h;
    };
        for (let s = 0; s < 4; s++) for (let c = 0; c < 6; c++) this.ust.push(hucre(26 + c * 91, 130 + s * 82, 91, 82));
    // Sayfa okları ve numarası
    const ok = (yukari: boolean, y: number) => {
      const d = document.createElement('div'); d.textContent = yukari ? '▲' : '▼';
      Object.assign(d.style, { position: 'absolute', left: '616px', top: `${y}px`, width: '74px', height: '34px', lineHeight: '34px', textAlign: 'center', color: '#e8b84a', fontSize: '22px', cursor: 'pointer' }); sprite(d, 'ui_marketing', UV_DUGME, 74, 34);
      d.addEventListener('click', () => this.sayfaDegistir(yukari ? -1 : 1)); e.appendChild(d);
    };
    ok(true, 214); ok(false, 346);
    Object.assign(this.sayfaYazi.style, { position: 'absolute', left: '616px', top: '276px', width: '74px', textAlign: 'center', font: '700 26px Segoe UI, sans-serif', color: '#ffe600', textShadow: '0 1px 2px #000' });
    e.appendChild(this.sayfaYazi);
    // Ayraç + altın
    const ayrac = document.createElement('div'); Object.assign(ayrac.style, { position: 'absolute', left: '26px', right: '26px', top: '486px', height: '2px', background: '#8f6128' }); e.appendChild(ayrac);
    Object.assign(this.altinYazi.style, { position: 'absolute', left: '458px', top: '499px', width: '224px', height: '36px', lineHeight: '36px', boxSizing: 'border-box', paddingRight: '12px', textAlign: 'right', font: '700 22px Segoe UI, sans-serif', color: '#ffe600', textShadow: '0 1px 2px #000' }); sprite(this.altinYazi, 'ui_marketing', UV_ALTIN, 224, 36);
    e.appendChild(this.altinYazi);
    const noah = document.createElement('div'); Object.assign(noah.style, { position: 'absolute', left: '412px', top: '498px', width: '40px', height: '38px', }); sprite(noah, 're_achieve_07', UV_NOAH, 40, 38); e.appendChild(noah);
    // Tamir düğmesi (yalnız tamirci NPC)
    Object.assign(this.tamirDugme.style, { position: 'absolute', left: '40px', top: '499px', width: '120px', height: '36px', lineHeight: '34px', textAlign: 'center', font: '700 18px Segoe UI, sans-serif', color: '#ffe9a8', cursor: 'pointer', display: 'none' }); sprite(this.tamirDugme, 'ui_marketing', UV_DUGME, 120, 36);
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
    // Yuva dokusu + eşya simgesi iki katman: simge üstte ortada
    h.style.backgroundImage = e?.simge ? `url(${e.simge}), ${h.dataset.zemin}` : h.dataset.zemin!;
    h.style.backgroundSize = e?.simge ? `${SIMGE_BOYUTU}, ${h.dataset.zeminBoyut}` : h.dataset.zeminBoyut!;
    h.style.backgroundPosition = e?.simge ? `center, ${h.dataset.zeminKonum}` : h.dataset.zeminKonum!;
    h.style.backgroundRepeat = 'no-repeat';
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
