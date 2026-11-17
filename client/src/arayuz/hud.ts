// Oyun arayüzü (HTML katmanı): can/mana çubukları, hedef penceresi, mesaj kutusu, envanter, ganimet penceresi.
// Oyun içeriği İngilizce olduğu için arayüz yazıları da İngilizce.
import type { EsyaTanimi } from '../oyun/veri';
import { gerekenDeneyim, esyaTablo } from '../oyun/veri';
import { esyaBilgisiOlustur, type OyuncuOzeti } from './esyaBilgisi';
import type { Canavar, DigerOyuncu, GanimetKutusu, Npc, Oyuncu } from '../oyun/varliklar';

const $ = <T extends HTMLElement>(html: string): T => {
  const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as T;
};

export class Hud {
  private kok = document.getElementById('arayuz')!;
  private durum = $<HTMLDivElement>(`<div class="panel durum">
      <div class="ad">kingces <span class="sev"></span></div>
      <div class="cubuk can"><i></i><b></b></div>
      <div class="cubuk mana"><i></i><b></b></div>
      <div class="cubuk exp"><i></i><b></b></div></div>`);
  /** Oyuncu adını (sol üstteki durum paneli) değiştirir. */
  adAyarla(ad: string): void { const e = this.durum.querySelector('.ad')!; if (e.firstChild) e.firstChild.textContent = ad + ' '; }
  private hedef = $<HTMLDivElement>(`<div class="panel hedef gizli"><div class="ad"></div><div class="cubuk can"><i></i><b></b></div></div>`);
  private mesajlar = $<HTMLDivElement>(`<div class="panel mesajlar"></div>`);
  private envanter = $<HTMLDivElement>(`<div class="panel pencere envanter gizli">
      <div class="baslik">Inventory <button data-kapat>✕</button></div>
      <div class="kusanilan"><div class="yuva silah" title="Weapon"></div><div class="yuva zirh" title="Armor"></div><div class="istat"></div></div>
      <div class="izgara"></div><div class="altin"></div></div>`);
  private ganimet = $<HTMLDivElement>(`<div class="panel pencere ganimet gizli">
      <div class="baslik">Loot <button data-kapat>✕</button></div><div class="liste"></div>
      <button class="dugme hepsini">Take all</button></div>`);
  private olum = $<HTMLDivElement>(`<div class="olum gizli"><div>You have died.</div><button class="dugme">Respawn</button></div>`);
  private ipucu = $<HTMLDivElement>(`<div class="panel ipucu gizli"></div>`);
  private yardim = $<HTMLDivElement>(`<div class="yardim">WASD / Left click: move · Click monster: attack · Right drag: camera · Middle click: turn around · Wheel: zoom · Tab: next target · U: stats · K: skills · I: inventory</div>`);
  private etiketler = document.createElement('div');
  private etiketHaritasi = new Map<Canavar, HTMLDivElement>();
  private npcEtiketHaritasi = new Map<Npc, HTMLDivElement>();
  private oyuncuEtiketi: HTMLDivElement | null = null;
  private nickAcik = true;
  /** O tuşu: oyuncu adlarını (kendimiz ve diğer oyuncular) açar/kapatır; yeni durumu döndürür. */
  nickDegistir(): boolean { this.nickAcik = !this.nickAcik; return this.nickAcik; }
  /** Karakterin üstündeki ad: partideyse sarı, değilse oyundaki ad rengi (beyaz; re_el_hpbar text_Nick). */
  oyuncuEtiketGuncelle(ad: string, p: { x: number; y: number; gorunur: boolean }, partide: boolean): void {
    if (!this.oyuncuEtiketi) { this.oyuncuEtiketi = $<HTMLDivElement>('<div class="etiket oyuncu"><span></span></div>'); this.etiketler.appendChild(this.oyuncuEtiketi); }
    const el = this.oyuncuEtiketi;
    const span = el.querySelector('span')!; if (span.textContent !== ad) span.textContent = ad;
    el.style.display = this.nickAcik && p.gorunur ? '' : 'none';
    el.classList.toggle('parti', partide);
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) translateY(-2px)`;
  }

  /** Ganimet penceresinde "al" tıklanınca çağrılır. */
  ganimetAl: (kutu: GanimetKutusu, i: number | 'altin' | 'hepsi') => void = () => {};
  /** Envanterde eşyaya tıklanınca (kuşan). */
  esyaKusan: (i: number) => void = () => {};
  yenidenDog: () => void = () => {};
  private acikKutu: GanimetKutusu | null = null;
  /** Açık ganimet kutusu var mı? (yürümeye başlayınca ya da hedef değişince kapatılır) */
  get kutuAcik(): boolean { return this.acikKutu !== null; }

  constructor() {
    this.etiketler.className = 'etiketler';
    for (const el of [this.etiketler, this.durum, this.hedef, this.mesajlar, this.envanter, this.ganimet, this.olum, this.ipucu, this.yardim]) this.kok.appendChild(el);
    for (const p of [this.envanter, this.ganimet]) p.querySelector('[data-kapat]')!.addEventListener('click', () => p.classList.add('gizli'));
    this.ganimet.querySelector('.hepsini')!.addEventListener('click', () => this.acikKutu && this.ganimetAl(this.acikKutu, 'hepsi'));
    this.olum.querySelector('button')!.addEventListener('click', () => this.yenidenDog());
    const izgara = this.envanter.querySelector('.izgara')!;
    for (let i = 0; i < 28; i++) {
      const y = $<HTMLDivElement>(`<div class="yuva" data-i="${i}"></div>`);
      y.addEventListener('click', () => this.esyaKusan(i));
      izgara.appendChild(y);
    }
  }

  envanterAcKapa(): void { this.envanter.classList.toggle('gizli'); }

  /** Orijinal arayüzdeki bilgi penceresi (varsa) mesajları buradan da alır. */
  mesajKancasi: ((metin: string, tur: 'bilgi' | 'hasar' | 'odul' | 'sistem') => void) | null = null;

  mesaj(metin: string, tur: 'bilgi' | 'hasar' | 'odul' | 'sistem' = 'bilgi'): void {
    this.mesajKancasi?.(metin, tur);
    const m = $<HTMLDivElement>(`<div class="m ${tur}"></div>`); m.textContent = metin;
    this.mesajlar.appendChild(m);
    while (this.mesajlar.children.length > 60) this.mesajlar.firstChild!.remove();
    this.mesajlar.scrollTop = this.mesajlar.scrollHeight;
  }

  private cubuk(el: Element, deger: number, enCok: number, yazi?: string): void {
    (el.querySelector('i') as HTMLElement).style.width = `${Math.max(0, Math.min(1, deger / enCok)) * 100}%`;
    el.querySelector('b')!.textContent = yazi ?? `${Math.ceil(deger)} / ${enCok}`;
  }

  guncelle(o: Oyuncu, hedef: Canavar | null, oyuncuHedef: { ad: string; seviye: number; can: number; enCok: number } | null = null): void {
    this.durum.querySelector('.sev')!.textContent = `Lv ${o.seviye}`;
    this.cubuk(this.durum.querySelector('.can')!, o.can, o.enCok);
    this.cubuk(this.durum.querySelector('.mana')!, o.mana, o.enCokMana);
    const g = o.azamiDeneyimSunucu ?? gerekenDeneyim(o.seviye);
    this.cubuk(this.durum.querySelector('.exp')!, o.deneyim, g, `EXP ${((o.deneyim / g) * 100).toFixed(1)}%`);
    if (hedef && !hedef.olu) {
      this.hedef.classList.remove('gizli');
      this.hedef.querySelector('.ad')!.textContent = `${hedef.tur.ad}  (Lv ${hedef.tur.seviye})`;
      this.cubuk(this.hedef.querySelector('.can')!, hedef.can, hedef.enCok);
    } else if (oyuncuHedef) { // seçili başka oyuncu (PvP)
      this.hedef.classList.remove('gizli');
      this.hedef.querySelector('.ad')!.textContent = `${oyuncuHedef.ad}  (Lv ${oyuncuHedef.seviye})`;
      this.cubuk(this.hedef.querySelector('.can')!, oyuncuHedef.can, oyuncuHedef.enCok);
    } else this.hedef.classList.add('gizli');
    this.olum.classList.toggle('gizli', !o.olu);
  }

  envanterCiz(o: Oyuncu): void {
    const yuvalar = this.envanter.querySelectorAll<HTMLDivElement>('.izgara .yuva');
    o.envanter.forEach((e, i) => this.yuvaCiz(yuvalar[i], e));
    this.yuvaCiz(this.envanter.querySelector('.kusanilan .silah')!, o.silah);
    this.yuvaCiz(this.envanter.querySelector('.kusanilan .zirh')!, o.zirh);
    this.envanter.querySelector('.istat')!.textContent = `Attack ${o.toplamVurus()} · Defense ${o.savunma()}`;
    this.envanter.querySelector('.altin')!.textContent = `${o.altin.toLocaleString('en-US')} Noah`;
  }

  private yuvaCiz(y: HTMLDivElement, e: EsyaTanimi | null): void {
    y.style.backgroundImage = e ? `url(${e.simge})` : '';
    y.onmouseenter = e ? (ev) => this.ipucuGoster(e, ev) : null;
    y.onmouseleave = () => this.ipucu.classList.add('gizli');
  }

  ipucuGizle(): void { this.ipucu.classList.add('gizli'); }

  /** Oyuncunun seviye/stat/sınıf özeti: eşya bilgisinde yetmeyen şartlar kırmızı gösterilir. */
  oyuncuOzeti: () => OyuncuOzeti | null = () => null;
  ipucuGoster(e: EsyaTanimi, ev: MouseEvent, satin = false, tamir = 0): void {
    const tam = esyaTablo(e.sunucuNo ?? e.no); // yeni alanlar (şartlar, ağırlık…) eşya tablosundan
    const bilgi: EsyaTanimi = { ...e, ...(tam ? { irk: tam.irk, sinif: tam.sinif, menzil: tam.menzil, agirlik: tam.agirlik, dayanim: tam.dayanim, gerekSeviye: tam.gerekSeviye, gerekGuc: tam.gerekGuc, gerekSta: tam.gerekSta, gerekCev: tam.gerekCev, gerekZeka: tam.gerekZeka, gerekBuyu: tam.gerekBuyu, sinifDerece: tam.sinifDerece, tip: e.tip || tam.tip } : {}) };
    this.ipucu.innerHTML = '';
    this.ipucu.appendChild(esyaBilgisiOlustur(bilgi, this.oyuncuOzeti(), satin, tamir));
    this.ipucu.style.left = '0px'; this.ipucu.style.top = '0px';
    this.ipucu.classList.remove('gizli');
    // Eşya bilgisi hiçbir zaman ekran dışına taşmaz: sağa sığmıyorsa imlecin soluna, alta sığmıyorsa yukarı alınır.
    const r = this.ipucu.getBoundingClientRect(), ke = 6;
    let x = ev.clientX + 16, y = ev.clientY + 12;
    if (x + r.width > innerWidth - ke) x = ev.clientX - r.width - 16;
    if (y + r.height > innerHeight - ke) y = ev.clientY - r.height - 12;
    x = Math.max(ke, Math.min(x, innerWidth - r.width - ke)); y = Math.max(ke, Math.min(y, innerHeight - r.height - ke));
    this.ipucu.style.left = `${x}px`; this.ipucu.style.top = `${y}px`;
  }

  /** Orijinal ganimet penceresi (re_droppeditem) bunu dinler; eski panel CSS ile gizlenir. */
  ganimetKancasi: ((k: GanimetKutusu | null) => void) | null = null;
  ganimetAc(k: GanimetKutusu | null): void {
    this.acikKutu = k;
    this.ganimetKancasi?.(k);
    if (!k) { this.ganimet.classList.add('gizli'); return; }
    const liste = this.ganimet.querySelector('.liste')!;
    liste.innerHTML = '';
    if (k.altin > 0) {
      const s = $<HTMLDivElement>(`<div class="satir"><div class="yuva noah"></div><span></span></div>`);
      s.querySelector('span')!.textContent = `${k.altin} Noah`;
      s.addEventListener('click', () => this.ganimetAl(k, 'altin'));
      liste.appendChild(s);
    }
    k.esyalar.forEach((e, i) => {
      const s = $<HTMLDivElement>(`<div class="satir"><div class="yuva"></div><span></span></div>`);
      (s.querySelector('.yuva') as HTMLElement).style.backgroundImage = `url(${e.simge})`;
      s.querySelector('span')!.textContent = e.ad;
      s.addEventListener('click', () => this.ganimetAl(k, i));
      liste.appendChild(s);
    });
    this.ganimet.classList.remove('gizli');
  }

  /** Canavarların üstündeki ad ve can çubukları (ekrana izdüşüm). */
  /** NPC isim etiketleri (can çubuğu yok). */
  npcEtiketGuncelle(npcler: Npc[], izdusum: (n: Npc) => { x: number; y: number; gorunur: boolean }): void {
    for (const n of npcler) {
      let el = this.npcEtiketHaritasi.get(n);
      if (!el) {
        el = $<HTMLDivElement>('<div class="etiket npc"><span></span></div>');
        el.querySelector('span')!.textContent = n.ad;
        this.etiketler.appendChild(el); this.npcEtiketHaritasi.set(n, el);
      }
      const p = izdusum(n);
      el.style.display = p.gorunur ? '' : 'none';
      if (p.gorunur) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
  }

  private digerEtiketleri = new Map<DigerOyuncu, HTMLDivElement>();
  /** Sunucudaki diğer oyuncuların ad etiketleri (oyuncu adlarını açıp kapatan O tuşuna uyar). */
  digerEtiketGuncelle(oyuncular: DigerOyuncu[], izdusum: (o: DigerOyuncu) => { x: number; y: number; gorunur: boolean }): void {
    for (const o of oyuncular) {
      let el = this.digerEtiketleri.get(o);
      if (!el) { el = $<HTMLDivElement>('<div class="etiket oyuncu"><span></span></div>'); this.etiketler.appendChild(el); this.digerEtiketleri.set(o, el); }
      const span = el.querySelector('span')!; if (span.textContent !== o.ad) span.textContent = o.ad;
      const p = izdusum(o);
      el.style.display = this.nickAcik && p.gorunur ? '' : 'none';
      if (this.nickAcik && p.gorunur) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) translateY(-2px)`;
    }
  }
  digerEtiketKaldir(o: DigerOyuncu): void { const el = this.digerEtiketleri.get(o); if (el) { el.remove(); this.digerEtiketleri.delete(o); } }
  /** Sahneden kalkan canavarın ad etiketini siler. */
  etiketKaldir(c: Canavar): void { const el = this.etiketHaritasi.get(c); if (el) { el.remove(); this.etiketHaritasi.delete(c); } }
  etiketGuncelle(canavarlar: Canavar[], izdusum: (c: Canavar) => { x: number; y: number; gorunur: boolean }, hedef: Canavar | null): void {
    for (const c of canavarlar) {
      let el = this.etiketHaritasi.get(c);
      if (!el) {
        el = $<HTMLDivElement>(`<div class="etiket"><span></span></div>`);
        el.querySelector('span')!.textContent = c.tur.ad;
        this.etiketler.appendChild(el); this.etiketHaritasi.set(c, el);
      }
      const p = izdusum(c);
      const goster = p.gorunur && !c.olu;
      el.style.display = goster ? '' : 'none';
      if (!goster) continue;
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) translateY(-4px)`;
      el.classList.toggle('secili', c === hedef);
    }
  }
}
