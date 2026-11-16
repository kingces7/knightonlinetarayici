// Skill efektleri (.fxb): araclar/oyun/efekt.ts'in ürettiği JSON'u oynatır. Davranış OpenKO 1299 istemci kaynağındaki N3FXPartParticles / N3FXParticle /
// N3FXPartBillBoard / N3FXPartBottomBoard Tick-Create mantığından alındı (docs/formatlar/fxb.md). Mesh parçaları henüz yok.
// Koordinat: efekt (x, y, z) → sahne (x, y, −z); efekt dünyaya hizalıdır (karakterin yönüne göre döndürülmez).
import * as THREE from 'three';

interface FxParca {
  tur: number; baslangic: number; omur: number;
  hiz: number[]; ivme: number[]; donusHizi: number[]; konum: number[];
  dokuFps: number; dokular: string[];
  kaynakKarisim: number; hedefKarisim: number; solmaGiris: number; solmaCikis: number; cizimBayraklari: number;
  // parçacık
  adet?: number; boyut?: [number, number]; parcacikOmru?: [number, number]; olusumMin?: number[]; olusumMaks?: number[];
  olusumAraligi?: number; olusumAdedi?: number; yayilimTuru?: number; yayilimAcisi?: number; toplanmaNoktasi?: number[];
  yon?: number[]; parcacikHizi?: number; parcacikDonusHizi?: number; yercekimi?: number; renkAnahtarlari?: number[] | null;
  dokuDonusHizi?: number; olcekHizX?: number; olcekHizY?: number;
  // tahta / zemin tahtası
  boyutX?: number; boyutY?: number; boyutZ?: number; dokuDongu?: boolean; yaricap?: number; olcekIvmeX?: number; olcekIvmeY?: number; olcekHizZ?: number; aralik?: number;
}
interface FxVeri { id: number; omur: number; parcalar: FxParca[] }

/** `azamiSure` aşılınca efekt bu kadar saniyede söner. */
const SONME = 0.12;
const D3D_KARISIM: Record<number, THREE.BlendingDstFactor> = {
  1: THREE.ZeroFactor, 2: THREE.OneFactor, 3: THREE.SrcColorFactor, 4: THREE.OneMinusSrcColorFactor, 5: THREE.SrcAlphaFactor, 6: THREE.OneMinusSrcAlphaFactor,
  7: THREE.DstAlphaFactor, 8: THREE.OneMinusDstAlphaFactor, 9: THREE.DstColorFactor, 10: THREE.OneMinusDstColorFactor,
};
const sahneV = (v: number[]) => new THREE.Vector3(v[0], v[1], -v[2]);
const rastgele = (a: number, b: number) => a + (b - a) * (Math.floor(Math.random() * 100) / 100);

interface Tanecik {
  sprite: THREE.Sprite; mat: THREE.SpriteMaterial; omur: number; yas: number; boyut: number;
  baslangicNoktasi: THREE.Vector3; yerel: THREE.Vector3; hiz: THREE.Vector3; dusus: number; dusmeHizi: number; donus: number; eksen: THREE.Vector3;
}
interface ParcaDurumu {
  p: FxParca; dokular: THREE.Texture[]; olusumSayaci: number; taneler: Tanecik[]; mesh?: THREE.Object3D; mats?: THREE.SpriteMaterial[]; bitti: boolean;
}
interface Ornek { azami: number | null; veri: FxVeri; kok: THREE.Object3D; kok0: THREE.Vector3; t: number; sure: number; parcalar: ParcaDurumu[]; grup: THREE.Group; olcek: number }

export class EfektYoneticisi {
  private onbellek = new Map<number, Promise<FxVeri | null>>();
  private dokular = new Map<string, THREE.Texture>();
  private aktif: Ornek[] = [];
  private yukleyici = new THREE.TextureLoader();
  constructor(private sahne: THREE.Scene, private kamera: THREE.Camera) {}

  private veri(id: number): Promise<FxVeri | null> {
    let o = this.onbellek.get(id);
    if (!o) { o = fetch(`/efekt/fx/${id}.json`).then((r) => (r.ok ? (r.json() as Promise<FxVeri>) : null)).catch(() => null); this.onbellek.set(id, o); }
    return o;
  }
  private doku(yol: string): THREE.Texture {
    let t = this.dokular.get(yol);
    if (!t) { t = this.yukleyici.load(`/${yol}`); t.colorSpace = THREE.SRGBColorSpace; this.dokular.set(yol, t); }
    return t;
  }
  /** Efektleri önceden yükler (ilk kullanımda gecikme olmasın). */
  async hazirla(idler: number[]): Promise<void> { await Promise.all(idler.map((i) => this.veri(i))); }

  /**
   * Efekti `kok` nesnesinin bulunduğu yerde oynatır. `sure`: yayılan parçalara ne kadar süre yeni parçacık yaptıracağı (sn); varsayılan paket ömrü, en çok 2 sn.
   * Dönen değer yoksa (efekt yok/çözülemedi) false.
   */
  async oynat(id: number, kok: THREE.Object3D, secenek: { sure?: number; olcek?: number; azamiSure?: number } = {}): Promise<boolean> {
    const veri = await this.veri(id); if (!veri) return false;
    const grup = new THREE.Group(); this.sahne.add(grup);
    const parcalar = veri.parcalar.map((p): ParcaDurumu => ({ p, dokular: p.dokular.map((d) => this.doku(d)), olusumSayaci: p.olusumAraligi ?? 0, taneler: [], bitti: false }));
    this.aktif.push({ azami: secenek.azamiSure ?? null, veri, kok, kok0: kok.getWorldPosition(new THREE.Vector3()), t: 0, sure: secenek.sure ?? Math.min(veri.omur || 2, 2), parcalar, grup, olcek: secenek.olcek ?? 1 });
    return true;
  }

  private malzeme(p: FxParca, harita: THREE.Texture | undefined): THREE.SpriteMaterial {
    const m = new THREE.SpriteMaterial({ map: harita ?? null, transparent: true, depthWrite: false, fog: false });
    const ek = p.kaynakKarisim === 5 && p.hedefKarisim === 2 || p.kaynakKarisim === 2 && p.hedefKarisim === 2;
    if (ek) m.blending = THREE.AdditiveBlending;
    else if (D3D_KARISIM[p.kaynakKarisim] !== undefined && D3D_KARISIM[p.hedefKarisim] !== undefined && !(p.kaynakKarisim === 5 && p.hedefKarisim === 6)) {
      m.blending = THREE.CustomBlending; m.blendSrc = D3D_KARISIM[p.kaynakKarisim] as unknown as THREE.BlendingSrcFactor; m.blendDst = D3D_KARISIM[p.hedefKarisim];
    }
    return m;
  }

  /** (0,0,1) eksenini `yon`a çeviren dönüş (kaynaktaki RotateQuaternion). */
  private hizala(yon: THREE.Vector3): THREE.Quaternion {
    const q = new THREE.Quaternion();
    if (yon.lengthSq() < 1e-9) return q;
    return q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), yon.clone().normalize());
  }

  guncelle(dt: number): void {
    for (let i = this.aktif.length - 1; i >= 0; i--) {
      const o = this.aktif[i]; o.t += dt;
      o.kok.getWorldPosition(o.kok0);
      if (o.azami !== null && o.t >= o.azami + SONME) { for (const s of o.parcalar) s.bitti = true; }
      let canli = false;
      for (const s of o.parcalar) { if (!s.bitti) { this.parcaGuncelle(o, s, dt); if (!s.bitti) canli = true; } }
      if (!canli) { o.grup.removeFromParent(); for (const s of o.parcalar) { for (const t of s.taneler) t.mat.dispose(); s.mats?.forEach((m) => m.dispose()); } this.aktif.splice(i, 1); }
    }
  }

  private parcaGuncelle(o: Ornek, s: ParcaDurumu, dt: number): void {
    const p = s.p, t = o.t - p.baslangic;
    if (t < 0) return;
    const son = o.azami === null ? 1 : Math.max(0, Math.min(1, 1 - (o.t - o.azami) / SONME)); // azami süreden sonra hızla sönme
    const omur = p.omur > 0 ? p.omur : o.sure;
    const yayilimBitti = t >= Math.min(omur, o.sure) + p.solmaGiris; // yeni parçacık yaratmayı bırak (kaynak: parça ömrü dolunca Stop)
    const merkez = o.kok0.clone().add(sahneV(p.konum).multiplyScalar(o.olcek));
    // yayıcı konumu: hız ve ivme (kaynak: CN3FXPartBase::Tick)
    const kt = Math.min(t, omur);
    const yayici = merkez.clone().add(sahneV(p.hiz).multiplyScalar(kt * o.olcek)).add(sahneV(p.ivme).multiplyScalar(0.5 * kt * kt * o.olcek));

    if (p.tur === 1) {
      const yon = p.yon ?? [0, 0, 1], aciYay = p.yayilimAcisi ?? 0;
      if (!yayilimBitti) {
        s.olusumSayaci += dt;
        if (s.olusumSayaci >= (p.olusumAraligi ?? 0.05) && s.taneler.length <= (p.adet ?? 30)) {
          s.olusumSayaci = 0;
          for (let n = 0; n < (p.olusumAdedi ?? 1) && s.taneler.length < (p.adet ?? 30); n++) this.tanecikYarat(o, s, yayici, yon, aciYay);
        }
      }
      for (let n = s.taneler.length - 1; n >= 0; n--) {
        const k = s.taneler[n]; if (!this.tanecikGuncelle(o, s, k, dt)) { k.sprite.removeFromParent(); k.mat.dispose(); s.taneler.splice(n, 1); }
      }
      if (yayilimBitti && !s.taneler.length) s.bitti = true;
      return;
    }
    // Tahta (billboard) ve zemin tahtası: tek parça, ömür boyunca görünür; solma giriş/çıkış
    const toplam = p.solmaGiris + omur + p.solmaCikis;
    const bitisT = Math.min(toplam, p.solmaGiris + Math.min(omur, Math.max(o.sure, 0.3)) + p.solmaCikis);
    if (t >= bitisT) { s.mesh?.removeFromParent(); s.bitti = true; return; }
    let alfa = son;
    if (p.solmaGiris > 0 && t < p.solmaGiris) alfa = t / p.solmaGiris * son;
    const kalan = bitisT - t;
    if (p.solmaCikis > 0 && kalan < p.solmaCikis) alfa = Math.min(alfa, kalan / p.solmaCikis);
    const kare = s.dokular.length ? (p.dokuDongu ? Math.floor(t * p.dokuFps) % s.dokular.length : Math.min(s.dokular.length - 1, Math.floor(t * p.dokuFps))) : 0;
    if (p.tur === 2) {
      if (!s.mats) {
        s.mats = []; const kap = new THREE.Group(); s.mesh = kap; o.grup.add(kap);
        for (let n = 0; n < Math.max(1, p.adet ?? 1); n++) { const m = this.malzeme(p, s.dokular[0]); s.mats.push(m); const sp = new THREE.Sprite(m); sp.renderOrder = 5; kap.add(sp); }
      }
      const ol = o.olcek, bx = Math.max(0, (p.boyutX ?? 1) + (p.olcekHizX ?? 0) * t) * ol, by = Math.max(0, (p.boyutY ?? 1) + (p.olcekHizY ?? 0) * t) * ol;
      let konum = yayici.clone();
      const kam = this.kamera.getWorldPosition(new THREE.Vector3()), fark = kam.clone().sub(konum), yaricap = (p.yaricap ?? 0) * ol;
      if (fark.length() > yaricap && yaricap > 0) konum.add(fark.normalize().multiplyScalar(yaricap)); // kaynak: kameraya doğru yarıçap kadar öne çekilir
      (s.mesh as THREE.Group).children.forEach((c, n) => { c.position.copy(konum); c.scale.set(bx, by, 1); const m = s.mats![n]; m.map = s.dokular[kare] ?? null; m.opacity = alfa; m.rotation = (p.donusHizi[0] ?? 0) * t; m.needsUpdate = true; });
    } else if (p.tur === 4) {
      if (!s.mesh) {
        const m = new THREE.MeshBasicMaterial({ map: s.dokular[0] ?? null, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const ek = p.kaynakKarisim === 5 && p.hedefKarisim === 2 || p.kaynakKarisim === 2 && p.hedefKarisim === 2; if (ek) m.blending = THREE.AdditiveBlending;
        const g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); g.rotation.x = -Math.PI / 2; g.renderOrder = 2; s.mesh = g; o.grup.add(g);
      }
      const g = s.mesh as THREE.Mesh, m = g.material as THREE.MeshBasicMaterial, ol = o.olcek;
      g.scale.set(Math.max(0, (p.boyutX ?? 1) + (p.olcekHizX ?? 0) * t) * ol, Math.max(0, (p.boyutZ ?? 1) + (p.olcekHizZ ?? 0) * t) * ol, 1);
      g.position.set(yayici.x, o.kok0.y + 0.05 + (p.aralik ?? 0), yayici.z); m.opacity = alfa; m.map = s.dokular[kare] ?? null; m.needsUpdate = true;
    } else s.bitti = true;
  }

  private tanecikYarat(o: Ornek, s: ParcaDurumu, yayici: THREE.Vector3, yon: number[], aci: number): void {
    const p = s.p, ol = o.olcek;
    const eksen = sahneV(yon).normalize(); if (eksen.lengthSq() < 1e-9) eksen.set(0, 0, 1);
    const q = this.hizala(eksen);
    const mn = sahneV(p.olusumMin ?? [0, 0, 0]), mx = sahneV(p.olusumMaks ?? [0, 0, 0]);
    const yerel = new THREE.Vector3(rastgele(mn.x, mx.x), rastgele(mn.y, mx.y), rastgele(mn.z, mx.z)).multiplyScalar(ol).applyQuaternion(q);
    let hiz = new THREE.Vector3();
    const hizDeger = (p.parcacikHizi ?? 0) * ol;
    if (p.yayilimTuru === 1) { // yayılma: Z ekseni etrafında koni
      const a = aci ? (Math.floor(Math.random() * Math.max(1, Math.floor(aci))) - aci / 2) * Math.PI / 180 : 0, r = Math.random() * Math.PI * 2;
      const d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).applyAxisAngle(new THREE.Vector3(0, 0, 1), r);
      hiz = d.applyQuaternion(q).multiplyScalar(hizDeger);
    } else if (p.yayilimTuru === 2) { // toplanma: yerel konumdan toplanma noktasına
      const g = sahneV(p.toplanmaNoktasi ?? [0, 0, 0]).multiplyScalar(ol).applyQuaternion(q);
      hiz = g.sub(yerel); if (hiz.lengthSq() > 1e-9) hiz.normalize(); hiz.multiplyScalar(hizDeger);
    }
    const boyut = rastgele(p.boyut?.[0] ?? 0.3, p.boyut?.[1] ?? 0.3) * ol;
    const omur = rastgele(p.parcacikOmru?.[0] ?? 0.5, p.parcacikOmru?.[1] ?? 0.5);
    const m = this.malzeme(p, s.dokular[0]);
    const sp = new THREE.Sprite(m); sp.renderOrder = 5; sp.scale.set(boyut, boyut, 1); o.grup.add(sp);
    s.taneler.push({ sprite: sp, mat: m, omur: Math.max(0.01, omur), yas: 0, boyut, baslangicNoktasi: yayici.clone(), yerel, hiz, dusus: 0, dusmeHizi: 0, donus: 0, eksen });
  }

  private tanecikGuncelle(o: Ornek, s: ParcaDurumu, k: Tanecik, dt: number): boolean {
    const p = s.p, ol = o.olcek, son = o.azami === null ? 1 : Math.max(0, Math.min(1, 1 - (o.t - o.azami) / SONME));
    const renkli = !!p.renkAnahtarlari?.length;
    if (renkli ? k.yas >= k.omur : k.yas >= p.solmaGiris + k.omur + p.solmaCikis) return false;
    const konum = k.baslangicNoktasi.clone().add(k.yerel);
    if (k.donus) konum.copy(k.baslangicNoktasi).add(k.yerel.clone().applyAxisAngle(k.eksen, k.donus));
    konum.y -= k.dusus;
    k.sprite.position.copy(konum);
    const ox = Math.max(0, k.boyut + (p.olcekHizX ?? 0) * k.yas * ol), oy = Math.max(0, k.boyut + (p.olcekHizY ?? 0) * k.yas * ol);
    k.sprite.scale.set(ox, oy, 1);
    k.mat.rotation = (p.dokuDonusHizi ?? 0) * k.yas;
    // renk / saydamlık (kaynak: CN3FXParticle::Tick)
    if (renkli) {
      const anahtar = Math.min(99, Math.floor(k.yas * 100 / k.omur)), c = (p.renkAnahtarlari![Math.min(anahtar, p.renkAnahtarlari!.length - 1)] ?? 0xffffffff) >>> 0;
      k.mat.color.setRGB(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255); k.mat.opacity = ((c >>> 24) & 255) / 255 * son;
    } else {
      let a = 1; if (k.yas <= p.solmaGiris && p.solmaGiris > 0) a = k.yas / p.solmaGiris; else if (k.yas > p.solmaGiris + k.omur) a = p.solmaCikis > 0 ? (p.solmaGiris + k.omur + p.solmaCikis - k.yas) / p.solmaCikis : 0;
      k.mat.color.setRGB(1, 1, 1); k.mat.opacity = Math.max(0, Math.min(1, a)) * son;
    }
    if (s.dokular.length) { const kare = Math.floor(k.yas * p.dokuFps) % s.dokular.length; k.mat.map = s.dokular[kare]; }
    // sonraki adım
    k.yerel.addScaledVector(k.hiz, dt);
    k.dusmeHizi += (p.yercekimi ?? 0) * dt; k.dusus += k.dusmeHizi * dt;
    k.donus += (p.parcacikDonusHizi ?? 0) * dt; k.yas += dt;
    return true;
  }
}
