// NPC alış-satış penceresi: oyunun kendi "Transaction" penceresi (LilithACS\re_el_Transaction.lilith → re_el_transaction.json).
// Üstte mağaza (6×4, sayfalı, fiyat yuvaların altında), altta envanter (7×4) + ağırlık + Noah. Pencerenin ortadaki alış/satış sepeti bu sürümde olmadığı için gizlenir ve alttaki bölüm yukarı çekilir.
// Kullanım: mağaza eşyasına SAĞ tık, ÇİFT tık ya da envantere SÜRÜKLEME = kaç tane alınacağı sorulur; envanter eşyasına SAĞ tık (ya da mağazaya sürükleme) = sat. Tamirci NPC'de "Repair" modu.
import { UiPencere } from './orijinal';
import type { EsyaTanimi } from '../oyun/veri';
import type { YuvaKonumu } from '../oyun/varliklar';
import { tamirUcreti } from '../../../kopru/protokol/envanter.ts';

const SIMGE = '142.22% 142.22%';
const SURUKLE = 'application/x-ke-islem';
/** Gizlenen sepet bölümünün yüksekliği (pencere tasarımı px): alttaki kısım bu kadar yukarı çekilir. */
const KAYMA = 160; // envanter eskisinden biraz daha aşağıda: mağaza ızgarasının altında nefes payı kalır

/** Oyunun kendi arayüz dokusundan (512×512 atlas, /arayuz/doku) bir parçayı elemana çizer: uv = [u0, v0, u1, v1]. */
export function sprite(el: HTMLElement, doku: string, uv: [number, number, number, number], w: number, h: number): void {
  const rw = (uv[2] - uv[0]) * 512, rh = (uv[3] - uv[1]) * 512;
  Object.assign(el.style, { backgroundImage: `url(/arayuz/doku/${doku}.png)`, backgroundRepeat: 'no-repeat', backgroundSize: `${(512 * w) / rw}px ${(512 * h) / rh}px`, backgroundPosition: `${-(uv[0] * 512 * w) / rw}px ${-(uv[1] * 512 * h) / rh}px` });
}
export const UV_DUGME: [number, number, number, number] = [0.71484375, 0.005859375, 0.85546875, 0.052734375]; // oyunun düğme dokusu
export const UV_KUTU: [number, number, number, number] = [0.5078125, 0.861328125, 0.8203125, 0.90625]; // altın çubuğu (sayı kutusu)

export interface MagazaKancalari {
  envanter: () => (EsyaTanimi | null)[]; altin: () => number;
  satinAl: (e: EsyaTanimi) => void; sat: (yuva: number, adet?: number) => void; tamirEt: (k: YuvaKonumu) => void;
  ipucu: (e: EsyaTanimi, ev: MouseEvent, satin: boolean, tamir: number) => void; ipucuGizle: () => void;
  mesaj: (m: string) => void; altBos: () => number; olcek: () => number; kapandi: () => void;
}

export class MagazaPenceresi {
  acik = false;
  private magaza: HTMLElement[] = []; private fiyat: HTMLElement[] = [];
  private canta: HTMLElement[] = []; private cantaAdet: HTMLElement[] = [];
  private agirlikYazi = document.createElement('div'); private altinYazi = document.createElement('div');
  private sayfalar: EsyaTanimi[][] = []; private sayfa = 0;
  private tamirModu = false; private imza = '';
  private tamirDugme = document.createElement('div');
  private soru: HTMLElement | null = null;

  static async olustur(k: MagazaKancalari, ust: HTMLElement): Promise<MagazaPenceresi> {
    const p = await UiPencere.yukle('re_el_transaction'); return new MagazaPenceresi(p, k, ust);
  }

  private constructor(private p: UiPencere, private k: MagazaKancalari, ust: HTMLElement) {
    p.el.style.display = 'none'; p.el.style.zIndex = '7'; p.surukle(); ust.appendChild(p.el);
    const y = (el: HTMLElement) => parseFloat(el.style.top);
    for (let i = 0; i < 28; i++) for (const el of p.bul(String(i))) {
      const yuva = el.classList.contains('ui-t9');
      if (yuva) { if (y(el) < 300) this.magaza[i] = el; else if (y(el) >= 500) this.canta[i] = el; else el.style.display = 'none'; } // ortadaki sepet yuvaları gizli
      else if (y(el) >= 500) this.cantaAdet[i] = el;
    }
    for (let i = 0; i < 24; i++) this.fiyat[i] = p.bul(String(100 + i))[0];
    for (const t of p.bul('text_title')) Object.assign(t.style, { fontSize: '17px', fontWeight: '700', color: '#ffe9a8', textShadow: '0 1px 3px #000' }); // başlık "Store": daha büyük ve okunaklı
    p.gizle('img_title_realmpoint'); // başlığın iki yanındaki kırmızı rozet simgeleri (kullanıcı isteği)
    for (let i = 200; i < 214; i++) for (const el of p.bul(String(i))) el.style.display = 'none';
    for (const id of ['base_tab_itembuy', 'base_tab_itemsell']) for (const el of p.bul(id)) el.style.display = 'none'; // alış/satış sepeti bölümü: bu sürümde yok
    // Sepet bölgesinin arka plan resimleri (şeritler ve kayık hücre resimleri) de gizlenir: yukarı çekilince mağaza ızgarasına bulaşıp bozuk çizgiler çiziyordu
    p.el.querySelectorAll<HTMLElement>('.ui-t4').forEach((r) => { const yy = parseFloat(r.style.top); if (r.style.backgroundImage.includes('person') && yy >= 300 && yy < 500) r.style.display = 'none'; });
    // Üst bölümün siyah zemini envanter gibi yarı saydam
    p.el.querySelectorAll<HTMLElement>('.ui-t4').forEach((r) => { if (r.style.display !== 'none' && r.style.backgroundImage.includes('person') && parseFloat(r.style.width) >= 40 && parseFloat(r.style.height) >= 30) r.style.opacity = '0.55'; });
    // Alttaki bölümü (envanter ve alt çerçeve) boşalan yere çek
    const kap = this.canta[0].parentElement!;
    for (const c of Array.from(kap.children) as HTMLElement[]) if (c.style.display !== 'none' && y(c) >= 300) c.style.top = `${y(c) - KAYMA}px`;
    p.boyut[1] -= KAYMA; (p as unknown as { sinirOnbellek: unknown }).sinirOnbellek = null;
    // Ağırlık ve Noah satırı (sepet bölümünün alt çubuğunun yerine)
    const stil = { position: 'absolute', top: `${476 - KAYMA}px`, height: '20px', lineHeight: '20px', font: '700 12px Verdana, "Segoe UI", sans-serif', color: '#ffff80', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap' };
    Object.assign(this.agirlikYazi.style, stil, { left: '18px' }); Object.assign(this.altinYazi.style, stil, { right: '18px', textAlign: 'right' });
    kap.appendChild(this.agirlikYazi); kap.appendChild(this.altinYazi);
    // Düğmeler: kapatma ve sayfa okları
    for (const el of p.tumDugmeler()) if (/close|cancel/i.test(el.dataset.id ?? '')) p.tikla.set(el.dataset.id!, () => this.kapat());
    for (const el of p.tumDugmeler()) { const id = (el.dataset.id ?? '').toLowerCase(); if (/^(btn_)?(page_?)?(up|prev)/.test(id)) p.tikla.set(el.dataset.id!, () => this.sayfaDegistir(-1)); else if (/^(btn_)?(page_?)?(down|next)/.test(id)) p.tikla.set(el.dataset.id!, () => this.sayfaDegistir(1)); }
    // Tamirci düğmesi
    Object.assign(this.tamirDugme.style, { position: 'absolute', left: '8px', top: '36px', width: '50px', height: '22px', lineHeight: '20px', textAlign: 'center', font: '700 12px Segoe UI, sans-serif', color: '#ffe9a8', border: '1px solid #8f6128', background: 'rgba(40,30,18,.9)', cursor: 'pointer', display: 'none', zIndex: '2', borderRadius: '3px' });
    this.tamirDugme.textContent = 'Repair'; this.tamirDugme.addEventListener('click', () => this.tamirModuDegistir(!this.tamirModu)); p.el.appendChild(this.tamirDugme);
    this.baglantilar();
    addEventListener('resize', () => this.yerlestir());
  }

  /** Yuva etkileşimleri (bir kez kurulur; içerik her çizimde yenilenir). */
  private baglantilar(): void {
    const suruklenebilir = (el: HTMLElement, veri: () => object | null) => {
      el.draggable = true;
      el.ondragstart = (ev) => { const v = veri(); if (!v) { ev.preventDefault(); return; } ev.dataTransfer?.setData(SURUKLE, JSON.stringify(v)); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'; this.k.ipucuGizle(); };
    };
    const birak = (el: HTMLElement, kabul: (v: { k: string; i: number }) => void) => {
      el.ondragover = (ev) => { if (ev.dataTransfer?.types.includes(SURUKLE)) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } };
      el.ondrop = (ev) => { const v = ev.dataTransfer?.getData(SURUKLE); if (!v) return; ev.preventDefault(); kabul(JSON.parse(v)); };
    };
    const sayfa = () => this.sayfalar[this.sayfa] ?? [];
    this.magaza.forEach((el, i) => {
      suruklenebilir(el, () => (sayfa()[i] ? { k: 'magaza', i } : null));
      const al = () => { const e = sayfa()[i]; if (!e) return; if (e.sayilabilir) this.adetSor(e); else this.k.satinAl(e); }; // yığınlanmayan eşya (küpe, silah, zırh…) sorusuz 1 adet alınır
      el.ondblclick = al; el.oncontextmenu = (ev) => { ev.preventDefault(); al(); }; // çift ya da sağ tık: kaç tane?
      birak(el, (v) => { if (v.k === 'canta') this.satSor(v.i); }); // envanterden mağazaya bırak = sat (yığınsa kaç tane sorulur)
    });
    this.canta.forEach((el, i) => {
      suruklenebilir(el, () => (this.k.envanter()[i] ? { k: 'canta', i } : null));
      el.oncontextmenu = (ev) => { ev.preventDefault(); if (this.k.envanter()[i] && !this.tamirModu) { this.k.ipucuGizle(); this.satSor(i); } };
      birak(el, (v) => { if (v.k === 'magaza') { const e = sayfa()[v.i]; if (!e) return; if (e.sayilabilir) this.adetSor(e); else this.k.satinAl(e); } }); // mağazadan envantere sürükle = al (kaç tane sorulur)
    });
  }

  /** Satış: yığınsa (111 adet vb.) kaç tane satılacağı sorulur; tek eşya hemen satılır. */
  private satSor(yuva: number): void {
    const e = this.k.envanter()[yuva]; if (!e) return;
    const n = e.adet ?? 1;
    if (!e.sayilabilir || n <= 1) { this.k.sat(yuva); return; }
    this.soruKutusu(e, 'How many do you want to sell?', n, 'Sell', (adet) => this.k.sat(yuva, adet), Math.max(1, Math.floor(e.fiyat / 6)));
  }
  /** Alış: kaç tane alınacağı sorulur (para ve boş yuvaya göre üst sınır). */
  private adetSor(e: EsyaTanimi): void {
    const bosYuva = this.k.envanter().filter((x) => !x).length;
    const parayla = Math.floor(this.k.altin() / Math.max(1, e.fiyat));
    const maks = Math.max(0, e.sayilabilir ? Math.min(parayla, 9999) : Math.min(parayla, bosYuva));
    if (maks < 1) { this.k.mesaj(parayla < 1 ? 'You do not have enough Noah.' : 'Your inventory is full.'); return; }
    this.soruKutusu(e, 'How many do you want to buy?', maks, 'Buy', (n) => { if (e.sayilabilir) this.k.satinAl({ ...e, adet: n }); else for (let i = 0; i < n; i++) this.k.satinAl(e); }, e.fiyat);
  }
  /** Adet sorusu: oyunun kendi doku parçalarıyla (koyu zemin, altın çerçeve, oyun düğmeleri, altın çubuğu biçiminde sayı kutusu). Enter onaylar, Esc iptal eder. */
  private soruKutusu(e: EsyaTanimi, soru: string, maks: number, onayYazisi: string, onay: (n: number) => void, birimFiyat: number): void {
    this.soruKapat(); this.k.ipucuGizle();
    const kutu = document.createElement('div'); this.soru = kutu;
    Object.assign(kutu.style, { position: 'absolute', left: '42px', top: '140px', width: '280px', height: '150px', zIndex: '20', boxSizing: 'border-box', border: '2px solid #8f6128', boxShadow: '0 0 0 1px #000, 0 6px 18px #000c', font: '12px Verdana, "Segoe UI", sans-serif', color: '#fff', textAlign: 'center' });
    kutu.style.backgroundColor = 'rgba(22, 17, 12, .96)'; // envanter penceresinin koyu kahverengi zemin rengi (çizgisiz, arkadaki simgeler görünmesin)
    const yazi = (t: string, stil: Partial<CSSStyleDeclaration>) => { const x = document.createElement('div'); x.textContent = t; Object.assign(x.style, { position: 'absolute', left: '0', right: '0', ...stil }); return x; };
    const ad = yazi(e.ad, { top: '10px', fontWeight: '700', color: '#ffe9a8', fontSize: '13px', textShadow: '0 1px 2px #000' });
    const alt = yazi(soru, { top: '30px', color: '#ffffff' });
    const toplam = yazi('', { top: '88px', color: '#ffff80', fontWeight: '700' });
    const dugme = (t: string, sol: number, ust: number, gen: number, f: () => void) => {
      const b = document.createElement('div'); b.textContent = t;
      Object.assign(b.style, { position: 'absolute', left: `${sol}px`, top: `${ust}px`, width: `${gen}px`, height: '24px', lineHeight: '24px', fontWeight: '700', color: 'rgb(255,255,128)', textShadow: '0 1px 2px #000', cursor: 'pointer', userSelect: 'none' });
      sprite(b, 'ui_marketing', UV_DUGME, gen, 24); b.addEventListener('click', f); kutu.appendChild(b); return b;
    };
    const giris = document.createElement('input'); giris.type = 'text'; giris.value = '1'; giris.inputMode = 'numeric';
    Object.assign(giris.style, { position: 'absolute', left: '96px', top: '54px', width: '88px', height: '26px', boxSizing: 'border-box', textAlign: 'center', background: 'transparent', color: '#ffff80', border: '0', font: '700 14px Verdana, sans-serif', outline: 'none' });
    const cerceve = document.createElement('div'); Object.assign(cerceve.style, { position: 'absolute', left: '96px', top: '54px', width: '88px', height: '26px' }); sprite(cerceve, 'ui_marketing', UV_KUTU, 88, 26);
    const sayi = () => Math.max(1, Math.min(maks, Math.floor(Number(giris.value.replace(/\D/g, '')) || 1)));
    const yenile = () => { toplam.textContent = `Total: ${(sayi() * birimFiyat).toLocaleString('en-US')} Noah`; };
    giris.addEventListener('input', () => { giris.value = giris.value.replace(/\D/g, ''); yenile(); });
    giris.addEventListener('blur', () => { giris.value = String(sayi()); yenile(); });
    const tamam = () => { const n = sayi(); this.soruKapat(); onay(n); };
    giris.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') tamam(); else if (ev.key === 'Escape') this.soruKapat(); });
    kutu.append(ad, alt, cerceve, giris, toplam);
    dugme('-', 60, 54, 30, () => { giris.value = String(Math.max(1, sayi() - 1)); yenile(); });
    dugme('+', 190, 54, 30, () => { giris.value = String(Math.min(maks, sayi() + 1)); yenile(); });
    dugme('Max', 226, 54, 44, () => { giris.value = String(maks); yenile(); });
    dugme(onayYazisi, 52, 114, 80, tamam); dugme('Cancel', 148, 114, 80, () => this.soruKapat());
    this.p.el.appendChild(kutu); yenile(); giris.focus(); giris.select();
  }
  private soruKapat(): void { this.soru?.remove(); this.soru = null; }

  private sayfaDegistir(d: number): void { const n = this.sayfalar.length || 1; this.sayfa = (this.sayfa + d + n) % n; this.imza = ''; this.ciz(); }
  private tamirModuDegistir(ac: boolean): void {
    this.tamirModu = ac; this.imza = ''; this.k.ipucuGizle(); this.tamirDugme.style.filter = ac ? 'brightness(1.6) sepia(1) hue-rotate(60deg)' : '';
    if (ac) this.k.mesaj('Repair mode: click an item in your inventory to repair it.');
    if (this.acik) this.ciz();
  }

  /** Mağazayı açar. `tamirci`: NPC aynı zamanda tamir ediyor mu. */
  ac(npcAdi: string, sayfalar: EsyaTanimi[][], tamirci: boolean): void {
    this.soruKapat(); this.sayfalar = sayfalar; this.sayfa = 0; this.tamirModu = false; this.imza = '';
    this.p.metin('text_title', 'Store'); // NPC adı yerine yalnız "Store" this.tamirDugme.style.display = tamirci ? '' : 'none';
    this.acik = true; this.p.el.style.display = ''; this.yerlestir(); this.ciz();
  }
  kapat(): void { if (!this.acik) return; this.acik = false; this.soruKapat(); this.tamirModuDegistir(false); this.p.el.style.display = 'none'; this.k.ipucuGizle(); this.k.kapandi(); }

  /** Orijinal: pencere sağ kenara, üstten 10 px'e konur; görev çubuğunun üstünde kalacak şekilde ölçeklenir. */
  yerlestir(): void {
    const [sl, st, sr, sb] = this.p.sinir();
    const ol = Math.max(0.4, Math.min(this.k.olcek(), (innerWidth - 16) / (sr - sl), (innerHeight - this.k.altBos() - 14) / (sb - st)));
    this.p.olcekAyarla(ol);
    const [, t2, r2] = this.p.sinir();
    this.p.el.style.left = `${innerWidth - r2 * ol - 2}px`; this.p.el.style.top = `${10 - t2 * ol}px`;
  }

  /** Her kare (açıkken): içerik değiştiyse yeniden çizer. */
  ciz(): void {
    if (!this.acik) return;
    const env = this.k.envanter(), altin = this.k.altin();
    const imza = `${this.sayfa}|${altin}|${this.tamirModu}|${env.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}d${e?.suru ?? ''}`).join(',')}`;
    if (imza === this.imza) return; this.imza = imza;
    const p = this.p, sayfa = this.sayfalar[this.sayfa] ?? [];
    p.metin('string_page', this.sayfa + 1); p.metin('string_max_page', `/${this.sayfalar.length || 1}`);
    this.agirlikYazi.textContent = `Weight: ${env.filter(Boolean).length} / 28`; this.altinYazi.textContent = `${altin.toLocaleString('en-US')} Noah`;
    this.magaza.forEach((el, i) => { const e = sayfa[i] ?? null; this.simge(el, e, true, 0); const f = this.fiyat[i]?.querySelector('span'); if (f) f.textContent = e && e.sayilabilir ? e.fiyat.toLocaleString('en-US') : ''; el.style.opacity = e && altin < e.fiyat ? '0.55' : '1'; });
    this.canta.forEach((el, i) => {
      const e = env[i] ?? null, tamir = e && this.tamirModu ? tamirUcreti(e.fiyat, e.dayanim ?? 0, e.suru ?? (e.dayanim ?? 0)) : 0;
      this.simge(el, e, false, tamir); const a = this.cantaAdet[i]?.querySelector('span'); if (a) a.textContent = e && (e.adet ?? 1) > 1 ? String(e.adet) : '';
      el.onclick = this.tamirModu && e ? () => this.k.tamirEt({ tur: 'c', i }) : null;
    });
  }

  private simge(el: HTMLElement, e: EsyaTanimi | null, satin: boolean, tamir: number): void {
    el.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; el.style.backgroundSize = SIMGE; el.style.backgroundPosition = '0 0';
    el.style.cursor = e ? 'pointer' : 'default';
    el.onmouseenter = e ? (ev) => this.k.ipucu(e, ev, satin, tamir) : null; el.onmouseleave = () => this.k.ipucuGizle();
  }
}
