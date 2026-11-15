// Oyun arayüzü (HTML katmanı): can/mana çubukları, hedef penceresi, mesaj kutusu, envanter, ganimet penceresi.
// Oyun içeriği İngilizce olduğu için arayüz yazıları da İngilizce.
import type { EsyaTanimi } from '../oyun/veri';
import { gerekenDeneyim } from '../oyun/veri';
import type { Canavar, GanimetKutusu, Npc, Oyuncu } from '../oyun/varliklar';

const $ = <T extends HTMLElement>(html: string): T => {
  const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as T;
};

export class Hud {
  private kok = document.getElementById('arayuz')!;
  private durum = $<HTMLDivElement>(`<div class="panel durum">
      <div class="ad">KnightEmpire <span class="sev"></span></div>
      <div class="cubuk can"><i></i><b></b></div>
      <div class="cubuk mana"><i></i><b></b></div>
      <div class="cubuk exp"><i></i><b></b></div></div>`);
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

  /** Ganimet penceresinde "al" tıklanınca çağrılır. */
  ganimetAl: (kutu: GanimetKutusu, i: number | 'altin' | 'hepsi') => void = () => {};
  /** Envanterde eşyaya tıklanınca (kuşan). */
  esyaKusan: (i: number) => void = () => {};
  yenidenDog: () => void = () => {};
  private acikKutu: GanimetKutusu | null = null;

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

  guncelle(o: Oyuncu, hedef: Canavar | null): void {
    this.durum.querySelector('.sev')!.textContent = `Lv ${o.seviye}`;
    this.cubuk(this.durum.querySelector('.can')!, o.can, o.enCok);
    this.cubuk(this.durum.querySelector('.mana')!, o.mana, o.enCokMana);
    const g = gerekenDeneyim(o.seviye);
    this.cubuk(this.durum.querySelector('.exp')!, o.deneyim, g, `EXP ${((o.deneyim / g) * 100).toFixed(1)}%`);
    if (hedef && !hedef.olu) {
      this.hedef.classList.remove('gizli');
      this.hedef.querySelector('.ad')!.textContent = `${hedef.tur.ad}  (Lv ${hedef.tur.seviye})`;
      this.cubuk(this.hedef.querySelector('.can')!, hedef.can, hedef.enCok);
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

  ipucuGoster(e: EsyaTanimi, ev: MouseEvent): void {
    const st = e.tur === 'silah' ? `Attack Power ${e.hasar}` : e.tur === 'zirh' ? `Defense ${e.savunma}` : '';
    this.ipucu.innerHTML = '';
    this.ipucu.append($(`<div class="ad"></div>`), $(`<div class="st"></div>`), $(`<div class="ac"></div>`), $(`<div class="fi"></div>`));
    (this.ipucu.children[0] as HTMLElement).textContent = e.ad;
    (this.ipucu.children[1] as HTMLElement).textContent = st;
    (this.ipucu.children[2] as HTMLElement).textContent = e.aciklama;
    (this.ipucu.children[3] as HTMLElement).textContent = `Price ${e.fiyat.toLocaleString('en-US')} Noah`;
    this.ipucu.style.left = `${ev.clientX + 16}px`; this.ipucu.style.top = `${ev.clientY + 12}px`;
    this.ipucu.classList.remove('gizli');
  }

  ganimetAc(k: GanimetKutusu | null): void {
    this.acikKutu = k;
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

  etiketGuncelle(canavarlar: Canavar[], izdusum: (c: Canavar) => { x: number; y: number; gorunur: boolean }, hedef: Canavar | null): void {
    for (const c of canavarlar) {
      let el = this.etiketHaritasi.get(c);
      if (!el) {
        el = $<HTMLDivElement>(`<div class="etiket"><span></span><div class="mini"><i></i></div></div>`);
        el.querySelector('span')!.textContent = c.tur.ad;
        this.etiketler.appendChild(el); this.etiketHaritasi.set(c, el);
      }
      const p = izdusum(c);
      const goster = p.gorunur && !c.olu;
      el.style.display = goster ? '' : 'none';
      if (!goster) continue;
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      el.classList.toggle('secili', c === hedef);
      (el.querySelector('i') as HTMLElement).style.width = `${(c.can / c.enCok) * 100}%`;
    }
  }
}
