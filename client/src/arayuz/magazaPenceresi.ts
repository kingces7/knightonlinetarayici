// NPC alış-satış penceresi: oyunun kendi "Transaction" penceresi (LilithACS\re_el_Transaction.lilith → re_el_transaction.json).
// Üstte mağaza (6×4, sayfalı, fiyatlar yuvaların altında), ortada sepet (14 yuva; "Buy Page" / "Sell Page" sekmeleri, toplam Noah, Buy/Sell düğmeleri), altta envanter (7×4) + ağırlık + Noah.
// Kullanım (orijinal akışa uygun): eşyayı SÜRÜKLE — mağazadan sepete (alış) ya da envanterden sepete (satış); "Buy"/"Sell" sepeti sunucuya yollar. Kısayol: mağaza eşyasına ÇİFT tık = hemen 1 al,
// envanter eşyasına SAĞ tık = hemen sat; mağazadan envantere / envanterden mağazaya sürüklemek de al / sat. Tamirci NPC'de "Repair" düğmesi tamir modu açar (envanter eşyasına tıkla).
import { UiPencere } from './orijinal';
import type { EsyaTanimi } from '../oyun/veri';
import type { YuvaKonumu } from '../oyun/varliklar';
import { tamirUcreti } from '../../../kopru/protokol/envanter.ts';

const SIMGE = '142.22% 142.22%';
const SURUKLE = 'application/x-ke-islem';

export interface MagazaKancalari {
  envanter: () => (EsyaTanimi | null)[]; altin: () => number;
  satinAl: (e: EsyaTanimi) => void; sat: (yuva: number) => void; tamirEt: (k: YuvaKonumu) => void;
  ipucu: (e: EsyaTanimi, ev: MouseEvent, satin: boolean, tamir: number) => void; ipucuGizle: () => void;
  mesaj: (m: string) => void; altBos: () => number; olcek: () => number; kapandi: () => void;
}
type Sepet = { e: EsyaTanimi; yuva: number }[];

export class MagazaPenceresi {
  acik = false;
  private magaza: HTMLElement[] = []; private fiyat: HTMLElement[] = [];
  private canta: HTMLElement[] = []; private cantaAdet: HTMLElement[] = [];
  private sepet: HTMLElement[] = []; // ortadaki 14 yuvalık sepet (iki sekme de aynı yuvaları kullanır)
  private tabAl!: HTMLElement; private tabSat!: HTMLElement;
  private sayfalar: EsyaTanimi[][] = []; private sayfa = 0;
  private alimlar: Sepet = []; private satimlar: Sepet = [];
  private satisSekmesi = false; private tamirModu = false; private imza = '';
  private tamirDugme = document.createElement('div'); private soru: HTMLElement | null = null;

  static async olustur(k: MagazaKancalari, ust: HTMLElement): Promise<MagazaPenceresi> {
    const p = await UiPencere.yukle('re_el_transaction'); return new MagazaPenceresi(p, k, ust);
  }

  private constructor(private p: UiPencere, private k: MagazaKancalari, ust: HTMLElement) {
    p.el.style.display = 'none'; p.el.style.zIndex = '7'; p.surukle(); ust.appendChild(p.el);
    this.tabAl = p.bul('base_tab_itembuy')[0]; this.tabSat = p.bul('base_tab_itemsell')[0];
    // Elemanlar kimliklerine ve bulundukları bölgeye göre gruplanır (aynı kimlikler üç bölgede tekrar eder).
    const bolge = (el: HTMLElement): 'sepet' | 'ust' | 'alt' => { const y = parseFloat(el.style.top); return y < 300 ? 'ust' : y < 500 ? 'sepet' : 'alt'; };
    for (let i = 0; i < 28; i++) for (const el of p.bul(String(i))) {
      const yuva = el.classList.contains('ui-t9'), b = bolge(el);
      if (yuva) { if (b === 'ust') this.magaza[i] = el; else if (b === 'alt') this.canta[i] = el; else this.sepet[i] = el; }
      else if (b === 'alt') this.cantaAdet[i] = el;
    }
    for (let i = 0; i < 24; i++) this.fiyat[i] = p.bul(String(100 + i))[0];
    p.gizle('img_title_realmpoint'); // başlığın iki yanındaki kırmızı rozet simgeleri
    for (const t of p.bul('text_title')) Object.assign(t.style, { fontSize: '17px', fontWeight: '700', color: '#ffe9a8', textShadow: '0 1px 3px #000' });
    // Sepet bölümünün etrafındaki mavi ve sarı çerçeve çizgileri (ince kenar resimleri) kaldırılır
    for (const tab of [this.tabAl, this.tabSat]) tab.querySelectorAll<HTMLElement>(':scope > .ui-t4').forEach((r) => { const w = parseFloat(r.style.width), h = parseFloat(r.style.height); if (w <= 4 || h <= 4) r.style.display = 'none'; });
    // Arka plan: üst bölümün siyah panelleri envanterin yarı saydam zemini gibi görünsün (şeffaflık)
    p.el.querySelectorAll<HTMLElement>('.ui-t4').forEach((r) => { if (parseFloat(r.style.width) >= 40 && parseFloat(r.style.height) >= 30 && r.style.backgroundImage.includes('person')) r.style.opacity = '0.55'; });
    for (const tab of [this.tabAl, this.tabSat]) tab.querySelectorAll<HTMLElement>('.ui-t4').forEach((r) => { if (parseFloat(r.style.width) >= 300 && parseFloat(r.style.height) >= 30) r.style.opacity = '0.55'; }); // sepet bölümünün zemini de aynı şekilde
    // Düğme yazıları durum resimlerinin ÜSTÜNDE görünsün
    for (const el of p.tumDugmeler()) el.querySelectorAll<HTMLElement>('.ui-yazi').forEach((y) => { y.style.zIndex = '3'; y.style.pointerEvents = 'none'; });
    // Düğmeler
    for (const el of p.tumDugmeler()) if (/close|cancel/i.test(el.dataset.id ?? '')) p.tikla.set(el.dataset.id!, () => this.kapat());
    p.tikla.set('btn_tab_item_sell', () => this.sekme(true)); p.tikla.set('btn_tab_item_buy', () => this.sekme(false));
    p.tikla.set('btn_refresh', () => { this.alimlar = []; this.satimlar = []; this.imza = ''; this.ciz(); });
    p.tikla.set('btn_buy', () => this.sepetiYolla(false)); p.tikla.set('btn_sell', () => this.sepetiYolla(true));
    for (const el of p.tumDugmeler()) { const id = (el.dataset.id ?? '').toLowerCase(); if (/up|prev/.test(id)) p.tikla.set(el.dataset.id!, () => this.sayfaDegistir(-1)); else if (/down|next/.test(id)) p.tikla.set(el.dataset.id!, () => this.sayfaDegistir(1)); }
    // Tamirci düğmesi (başlığın yanında)
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
      const al = () => { const e = sayfa()[i]; if (e) this.adetSor(e); };
      el.ondblclick = al; el.oncontextmenu = (ev) => { ev.preventDefault(); al(); }; // çift ya da sağ tık: kaç tane?
      birak(el, (v) => { if (v.k === 'canta') this.k.sat(v.i); }); // envanterden mağazaya bırak = sat
    });
    this.canta.forEach((el, i) => {
      suruklenebilir(el, () => (this.k.envanter()[i] ? { k: 'canta', i } : null));
      el.oncontextmenu = (ev) => { ev.preventDefault(); if (this.k.envanter()[i] && !this.tamirModu) { this.k.ipucuGizle(); this.k.sat(i); } };
      birak(el, (v) => { if (v.k === 'magaza') { const e = sayfa()[v.i]; if (e) this.adetSor(e); } }); // mağazadan envantere sürükle = al (kaç tane sorulur)
    });
    this.sepet.forEach((el, i) => {
      const hedef = () => (this.satisSekmesi ? this.satimlar : this.alimlar);
      birak(el, (v) => this.sepeteEkle(v));
      el.onclick = () => { if (hedef()[i]) { hedef().splice(i, 1); this.imza = ''; this.k.ipucuGizle(); this.ciz(); } }; // sepetteki eşyaya tık = çıkar
    });
    birak(this.tabAl, (v) => this.sepeteEkle(v)); birak(this.tabSat, (v) => this.sepeteEkle(v)); // sepet bölgesinin her yeri bırakma hedefidir
  }

  /** Sürüklenen eşya mağazadansa alış sepetine, envanterdense satış sepetine girer. */
  /** "Kaç tane?" sorusu: sayı kutusu, ± düğmeleri, toplam fiyat; Enter onaylar, Esc iptal eder. */
  private adetSor(e: EsyaTanimi): void {
    this.soruKapat(); this.k.ipucuGizle();
    const bosYuva = this.k.envanter().filter((x) => !x).length;
    const parayla = Math.floor(this.k.altin() / Math.max(1, e.fiyat));
    const maks = Math.max(0, e.sayilabilir ? Math.min(parayla, 9999) : Math.min(parayla, bosYuva));
    if (maks < 1) { this.k.mesaj(parayla < 1 ? 'You do not have enough Noah.' : 'Your inventory is full.'); return; }
    const kutu = document.createElement('div'); this.soru = kutu;
    Object.assign(kutu.style, { position: 'absolute', left: '52px', top: '150px', width: '260px', padding: '12px 14px 14px', zIndex: '20', background: 'linear-gradient(#26201a, #120e0a)', border: '2px solid #b9803a', borderRadius: '4px', boxShadow: '0 0 0 1px #000, 0 6px 18px #000c', font: '13px Verdana, "Segoe UI", sans-serif', color: '#fff', textAlign: 'center' });
    const baslik = document.createElement('div'); baslik.textContent = e.ad; Object.assign(baslik.style, { fontWeight: '700', color: '#ffe9a8', marginBottom: '4px' });
    const alt = document.createElement('div'); alt.textContent = 'How many do you want to buy?'; alt.style.marginBottom = '8px';
    const satir = document.createElement('div'); Object.assign(satir.style, { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' });
    const dugme = (yazi: string, f: () => void) => { const d = document.createElement('div'); d.textContent = yazi; Object.assign(d.style, { minWidth: '28px', height: '24px', lineHeight: '24px', border: '1px solid #8f6128', background: 'rgba(60,45,28,.95)', color: '#ffe9a8', cursor: 'pointer', fontWeight: '700', borderRadius: '3px', userSelect: 'none', padding: '0 6px' }); d.addEventListener('click', f); return d; };
    const giris = document.createElement('input'); giris.type = 'text'; giris.value = '1'; giris.inputMode = 'numeric';
    Object.assign(giris.style, { width: '70px', height: '24px', textAlign: 'center', background: '#0b0907', color: '#ffff80', border: '1px solid #8f6128', font: '700 14px Verdana, sans-serif', outline: 'none' });
    const toplam = document.createElement('div'); Object.assign(toplam.style, { marginTop: '8px', color: '#ffff80' });
    const sayi = () => Math.max(1, Math.min(maks, Math.floor(Number(giris.value.replace(/\D/g, '')) || 1)));
    const yenile = () => { toplam.textContent = `Total: ${(sayi() * e.fiyat).toLocaleString('en-US')} Noah`; };
    giris.addEventListener('input', () => { giris.value = giris.value.replace(/\D/g, ''); yenile(); });
    giris.addEventListener('blur', () => { giris.value = String(sayi()); yenile(); });
    const onay = () => { const n = sayi(); this.soruKapat(); if (e.sayilabilir) this.k.satinAl({ ...e, adet: n }); else for (let i = 0; i < n; i++) this.k.satinAl(e); };
    giris.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') onay(); else if (ev.key === 'Escape') this.soruKapat(); });
    satir.append(dugme('−', () => { giris.value = String(Math.max(1, sayi() - 1)); yenile(); }), giris, dugme('+', () => { giris.value = String(Math.min(maks, sayi() + 1)); yenile(); }), dugme('Max', () => { giris.value = String(maks); yenile(); }));
    const dugmeler = document.createElement('div'); Object.assign(dugmeler.style, { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' });
    dugmeler.append(dugme('OK', onay), dugme('Cancel', () => this.soruKapat()));
    kutu.append(baslik, alt, satir, toplam, dugmeler); this.p.el.appendChild(kutu); yenile(); giris.focus(); giris.select();
  }
  private soruKapat(): void { this.soru?.remove(); this.soru = null; }

  private sepeteEkle(v: { k: string; i: number }): void {
    if (v.k === 'magaza') {
      const e = (this.sayfalar[this.sayfa] ?? [])[v.i]; if (!e) return;
      if (this.alimlar.length >= 14) { this.k.mesaj('The basket is full.'); return; }
      this.alimlar.push({ e, yuva: -1 }); this.satisSekmesi = false;
    } else if (v.k === 'canta') {
      const e = this.k.envanter()[v.i]; if (!e || this.satimlar.some((s) => s.yuva === v.i)) return;
      if (this.satimlar.length >= 14) { this.k.mesaj('The basket is full.'); return; }
      this.satimlar.push({ e, yuva: v.i }); this.satisSekmesi = true;
    }
    this.imza = ''; this.ciz();
  }

  private sepetiYolla(satis: boolean): void {
    const liste = satis ? this.satimlar : this.alimlar;
    if (!liste.length) { this.k.mesaj(satis ? 'The sell basket is empty.' : 'The buy basket is empty.'); return; }
    for (const s of [...liste]) { if (satis) this.k.sat(s.yuva); else this.k.satinAl(s.e); }
    liste.length = 0; this.imza = ''; this.ciz();
  }

  private sekme(satis: boolean): void { this.satisSekmesi = satis; this.imza = ''; this.ciz(); }
  private sayfaDegistir(d: number): void { const n = this.sayfalar.length || 1; this.sayfa = (this.sayfa + d + n) % n; this.imza = ''; this.ciz(); }
  private tamirModuDegistir(ac: boolean): void {
    this.tamirModu = ac; this.imza = ''; this.k.ipucuGizle(); this.tamirDugme.style.filter = ac ? 'brightness(1.6) sepia(1) hue-rotate(60deg)' : '';
    if (ac) this.k.mesaj('Repair mode: click an item in your inventory to repair it.');
    if (this.acik) this.ciz();
  }

  /** Mağazayı açar. `tamirci`: NPC aynı zamanda tamir ediyor mu. */
  ac(npcAdi: string, sayfalar: EsyaTanimi[][], tamirci: boolean): void {
    this.soruKapat(); this.sayfalar = sayfalar; this.sayfa = 0; this.alimlar = []; this.satimlar = []; this.satisSekmesi = false; this.tamirModu = false; this.imza = '';
    this.p.metin('text_title', 'Store'); this.tamirDugme.style.display = tamirci ? '' : 'none';
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
    const imza = `${this.sayfa}|${altin}|${this.tamirModu}|${this.satisSekmesi}|${this.alimlar.map((a) => a.e.no).join(',')}|${this.satimlar.map((s) => s.yuva).join(',')}|${env.map((e) => `${e?.no ?? 0}x${e?.adet ?? 1}d${e?.suru ?? ''}`).join(',')}`;
    if (imza === this.imza) return; this.imza = imza;
    const p = this.p, sayfa = this.sayfalar[this.sayfa] ?? [];
    p.metin('string_page', this.sayfa + 1); p.metin('string_max_page', `/${this.sayfalar.length || 1}`);
    p.metin('text_mypoint', altin.toLocaleString('en-US'));
    p.metin('text_weight', `${env.filter(Boolean).length} / 28`);
    this.tabAl.style.display = this.satisSekmesi ? 'none' : ''; this.tabSat.style.display = this.satisSekmesi ? '' : 'none';
    this.magaza.forEach((el, i) => { const e = sayfa[i] ?? null; this.simge(el, e, true, 0); const f = this.fiyat[i]?.querySelector('span'); if (f) f.textContent = e ? e.fiyat.toLocaleString('en-US') : ''; el.style.opacity = e && altin < e.fiyat ? '0.55' : '1'; });
    this.canta.forEach((el, i) => {
      const e = env[i] ?? null, tamir = e && this.tamirModu ? tamirUcreti(e.fiyat, e.dayanim ?? 0, e.suru ?? (e.dayanim ?? 0)) : 0;
      this.simge(el, e, false, tamir); const a = this.cantaAdet[i]?.querySelector('span'); if (a) a.textContent = e && (e.adet ?? 1) > 1 ? String(e.adet) : '';
      el.onclick = this.tamirModu && e ? () => this.k.tamirEt({ tur: 'c', i }) : null;
      el.style.opacity = this.satimlar.some((s) => s.yuva === i) ? '0.45' : '1';
    });
    let topAl = 0, topSat = 0;
    for (let i = 0; i < 14; i++) {
      const a = this.alimlar[i], s = this.satimlar[i];
      if (this.sepet[i]) { const g = this.satisSekmesi ? s : a; this.simge(this.sepet[i], g?.e ?? null, !this.satisSekmesi, 0); }
      if (a) topAl += a.e.fiyat; if (s) topSat += Math.max(1, Math.floor(s.e.fiyat / 6));
    }
    for (const el of p.bul('text_totalpoint')) { const t = el.querySelector('span'); if (t) t.textContent = (el.closest('[data-id=base_tab_itemsell]') ? topSat : topAl).toLocaleString('en-US'); }
  }

  private simge(el: HTMLElement, e: EsyaTanimi | null, satin: boolean, tamir: number): void {
    el.style.backgroundImage = e?.simge ? `url(${e.simge})` : ''; el.style.backgroundSize = SIMGE; el.style.backgroundPosition = '0 0';
    el.style.cursor = e ? 'pointer' : 'default';
    el.onmouseenter = e ? (ev) => this.k.ipucu(e, ev, satin, tamir) : null; el.onmouseleave = () => this.k.ipucuGizle();
  }
}
