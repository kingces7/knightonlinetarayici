// Canavar yerleşimi: sunucu K_NPCPOS1098 kayıtları (araclar/sunucu/canavar-disa-aktar.ps1 → harita/<ad>/canavar.json).
// Sunucu kuralı (NpcThread.cpp): her kayıt `adet` canavarı (x, z) çevresinde `alan` yarıçapında doğurur, `dogus` saniyede yeniden doğurur.
// Yüzlerce canavarı birden çizmemek için kayıt grupları oyuncu yaklaşınca (YUKLE) doğurulur, uzaklaşınca (BIRAK) sahneden kaldırılır.
import * as THREE from 'three';
import { Canavar, type Oyuncu } from './varliklar';
import { canavarTuruSid, rastgele } from './veri';

export interface YerlesimKaydi { sid: number; x: number; z: number; adet: number; alan: number; dogus: number; davranis: number }

const YUKLE = 90; // m
const BIRAK = 130; // m

interface Grup { kayit: YerlesimKaydi; canavarlar: Canavar[]; aktif: boolean; yukleniyor: boolean }

export class CanavarYoneticisi {
  private gruplar: Grup[];
  private sayac = 0;

  constructor(kayitlar: YerlesimKaydi[], private sahne: THREE.Scene, private liste: Canavar[], private oyuncu: Oyuncu) {
    this.gruplar = kayitlar.map((kayit) => ({ kayit, canavarlar: [], aktif: false, yukleniyor: false }));
  }

  /** Her kare çağrılır; gruplara yarım saniyede bir bakar. */
  guncelle(dt: number): void {
    this.sayac += dt;
    if (this.sayac < 0.5) return;
    this.sayac = 0;
    for (const g of this.gruplar) {
      const uzak = Math.hypot(g.kayit.x - this.oyuncu.konum.x, g.kayit.z - this.oyuncu.konum.y);
      if (!g.aktif && !g.yukleniyor && uzak < YUKLE) void this.ac(g);
      else if (g.aktif && uzak > BIRAK && !this.mesgul(g)) this.kapat(g);
    }
  }

  /** Grubun canavarlarından biri oyuncuyla çatışıyorsa grup kaldırılmaz. */
  private mesgul(g: Grup): boolean { return g.canavarlar.some((c) => c.kizgin || c === this.oyuncu.hedef); }

  private async ac(g: Grup): Promise<void> {
    const tur = canavarTuruSid(g.kayit.sid);
    if (!tur) return;
    g.yukleniyor = true;
    for (let i = 0; i < g.kayit.adet; i++) {
      const r = g.kayit.alan;
      const c = new Canavar(tur, g.kayit.x + rastgele(-r, r), g.kayit.z + rastgele(-r, r));
      c.yerlesim = { alan: g.kayit.alan, dogus: g.kayit.dogus, davranis: g.kayit.davranis, grup: g.canavarlar };
      try { await c.modelYukle(); } catch (e) { console.warn('Canavar modeli yüklenemedi', tur.ad, e); continue; }
      this.sahne.add(c.grup); this.liste.push(c); g.canavarlar.push(c);
    }
    g.aktif = true; g.yukleniyor = false;
  }

  private kapat(g: Grup): void {
    for (const c of g.canavarlar) {
      this.sahne.remove(c.grup);
      const i = this.liste.indexOf(c); if (i >= 0) this.liste.splice(i, 1);
      if (this.oyuncu.hedef === c) this.oyuncu.hedef = null;
    }
    g.canavarlar = []; g.aktif = false;
  }

  /** Doğurulmuş (şu an sahnede) canavar sayısı. */
  get sahnedeki(): number { return this.gruplar.reduce((t, g) => t + g.canavarlar.length, 0); }
  get grupSayisi(): number { return this.gruplar.length; }
}
