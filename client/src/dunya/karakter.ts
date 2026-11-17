// Animasyonlu karakter/canavar modeli (araclar/model ile üretilen .glb).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as iskeletKopyala } from 'three/addons/utils/SkeletonUtils.js';

const onbellek = new Map<string, Promise<GLTF>>();
type AnimBilgisi = Record<string, { animasyonlar: Record<string, { hiz: number; vurus: number | null; sure: number }> }>;
let animBilgisi: AnimBilgisi = {};

/** karakterler.json: her model için animasyon hızları (bir kez yüklenir). */
export async function animBilgisiYukle(): Promise<void> {
  try { animBilgisi = await (await fetch('/karakter/karakterler.json')).json(); } catch { animBilgisi = {}; }
}

/** silah.json: eşya numarası → takılacak eklem (iskelet ön-sıra numarası; 12 sağ el, 7 sol el). araclar: npm run silahlar */
let silahBilgisi: Record<string, { eklem: number }> = {};
export async function silahBilgisiYukle(): Promise<void> {
  try { silahBilgisi = await (await fetch('/silah/silah.json')).json(); } catch { silahBilgisi = {}; }
}

function yukle(url: string): Promise<GLTF> {
  let p = onbellek.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url); onbellek.set(url, p); }
  return p;
}

export class KarakterModeli {
  readonly kok: THREE.Object3D;
  private karistirici: THREE.AnimationMixer;
  private klipler = new Map<string, THREE.AnimationClip>();
  private aktif: THREE.AnimationAction | null = null;
  aktifAd = '';
  /** Animasyon hız çarpanları (ad -> çarpan); varsayılan 1. */
  readonly hizlar = new Map<string, number>();

  private constructor(kok: THREE.Object3D, klipler: THREE.AnimationClip[]) {
    this.kok = kok;
    this.karistirici = new THREE.AnimationMixer(kok);
    for (const k of klipler) this.klipler.set(k.name, k);
    kok.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) { m.frustumCulled = false; }
    });
  }

  static async olustur(url: string): Promise<KarakterModeli> {
    const g = await yukle(url);
    const m = new KarakterModeli(iskeletKopyala(g.scene), g.animations);
    const no = /\/(\d+)\.glb$/.exec(url)?.[1];
    for (const [ad, b] of Object.entries(no ? animBilgisi[no]?.animasyonlar ?? {} : {})) if (b.hiz > 0) m.hizlar.set(ad, b.hiz);
    return m;
  }

  var(ad: string): boolean { return this.klipler.has(ad); }

  /** Ekipman yuvası → gövde parçası (modelde `parca_<ad>_giyili` ve `parca_<ad>_ciplak` düğümleri bulunur). */
  private static readonly GIYIM_YUVALARI: [string, number][] = [['bas', 1], ['govde', 4], ['bacak', 10], ['el', 12], ['ayak', 13]];
  private giyimImzasi = '';
  /** Giyilen eşyaya göre parçaları açar/kapatır: yuvada eşya varsa giyili parça, yoksa çıplak parça görünür. */
  // ---- Eşyaya göre giyinme (ırk modelleri): zırh parçası giyim/<ırk>/<kaynak>.glb, modelin iskeletine bağlanır; çıplak parça gizlenir.
  private giyimNesneleri = new Map<string, { kaynak: number; nesne: THREE.SkinnedMesh | null }>();
  private static giyimDizini: Record<string, number[]> | null = null;
  private static giyimDizinYukle: Promise<void> | null = null;
  private static readonly DINAMIK_YUVALAR: [string, number][] = [['bas', 1], ['govde', 4], ['bacak', 10], ['el', 12], ['ayak', 13]];
  /** Çıplak ırk modeli mi (parca_<yuva>_ciplak var, parca_<yuva>_giyili yok)? */
  private get irkModeli(): boolean { let v = false; this.kok.traverse((o) => { if (/^parca_[a-z]+_ciplak$/.test(o.name)) v = true; if (/^parca_[a-z]+_giyili$/.test(o.name)) v = false; }); return v; }
  private taban(): THREE.SkinnedMesh | null { let s: THREE.SkinnedMesh | null = null; this.kok.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!s && m.isSkinnedMesh && !o.name.startsWith('giyim_')) s = m; }); return s; }
  /**
   * Giyilen eşyalara göre zırh parçalarını yükler/değiştirir. `kaynaklar[yuva]` = eşyanın görünüm kaynağı (0 = çıplak). Yükleme asenkron; her çağrı yalnız değişen yuvalara dokunur.
   */
  giyimUygula(irk: number, kaynaklar: Record<string, number>): void {
    if (!irk) return;
    if (!KarakterModeli.giyimDizini) { KarakterModeli.giyimDizinYukle ??= fetch('/giyim/dizin.json').then((r) => r.json()).then((d) => { KarakterModeli.giyimDizini = d; }).catch(() => { KarakterModeli.giyimDizini = {}; }); void KarakterModeli.giyimDizinYukle.then(() => this.giyimUygula(irk, kaynaklar)); return; }
    for (const [yuva] of KarakterModeli.DINAMIK_YUVALAR) {
      const k = kaynaklar[yuva] ?? 0, mevcut = this.giyimNesneleri.get(yuva);
      if ((mevcut?.kaynak ?? 0) === k) continue;
      if (mevcut?.nesne) { mevcut.nesne.removeFromParent(); }
      this.giyimNesneleri.set(yuva, { kaynak: k, nesne: null });
      const ciplak = (goster: boolean) => this.kok.traverse((o) => { if (o.name === `parca_${yuva}_ciplak`) o.visible = goster; });
      if (!k || !(KarakterModeli.giyimDizini[String(irk)] ?? []).includes(k)) { ciplak(true); continue; } // eşyanın bu ırk için görünümü yok: çıplak kalır
      void yukle(`/giyim/${irk}/${k}.glb`).then((g) => {
        const t = this.giyimNesneleri.get(yuva); if (!t || t.kaynak !== k) return; // bu arada başka eşya giyildi
        const kaynakMesh = (() => { let m: THREE.SkinnedMesh | null = null; g.scene.traverse((o) => { const s = o as THREE.SkinnedMesh; if (!m && s.isSkinnedMesh) m = s; }); return m as THREE.SkinnedMesh | null; })();
        const taban = this.taban(); if (!kaynakMesh || !taban) return;
        const mesh = new THREE.SkinnedMesh(kaynakMesh.geometry, kaynakMesh.material);
        mesh.name = `giyim_${yuva}`; mesh.frustumCulled = false; mesh.bind(taban.skeleton, taban.bindMatrix);
        taban.parent?.add(mesh); t.nesne = mesh; ciplak(false);
      }).catch(() => ciplak(true));
    }
  }

  giyimAyarla(ekipman: ({ no: number; kaynak?: number } | null)[], irk = 0): void {
    if (irk && this.irkModeli) { const k: Record<string, number> = {}; for (const [y, s] of KarakterModeli.DINAMIK_YUVALAR) k[y] = ekipman[s]?.kaynak ?? 0; this.giyimUygula(irk, k); return; }
    const imza = KarakterModeli.GIYIM_YUVALARI.map(([, y]) => (ekipman[y] ? 1 : 0)).join('');
    if (imza === this.giyimImzasi) return;
    this.giyimImzasi = imza;
    const giyili = new Map(KarakterModeli.GIYIM_YUVALARI.map(([ad, y]) => [ad, !!ekipman[y]]));
    this.kok.traverse((o) => {
      const m = /^parca_([a-z]+)_(giyili|ciplak)$/.exec(o.name); if (!m) return;
      o.visible = (m[2] === 'giyili') === giyili.get(m[1]);
    });
  }

  // ---- Elde taşınan eşyalar (.n3cplug → /silah/<eşya no>.glb): ilgili el kemiğine takılır.
  private plugler = new Map<string, { no: number; nesne: THREE.Object3D; kemik: THREE.Object3D }>();
  private kemikBul(i: number): THREE.Object3D | null {
    let sonuc: THREE.Object3D | null = null;
    this.kok.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!sonuc && m.isSkinnedMesh && m.skeleton.bones[i]) sonuc = m.skeleton.bones[i]; });
    return sonuc;
  }
  /** `yuva` ('sag' | 'sol') için eşya modelini takar; no = 0 ya da modeli yoksa kaldırır. */
  async plugTak(yuva: string, no: number): Promise<void> {
    const eski = this.plugler.get(yuva);
    if (eski?.no === no) return;
    if (eski) { eski.kemik.remove(eski.nesne); this.plugler.delete(yuva); }
    const bilgi = no ? silahBilgisi[String(no)] : undefined;
    if (!bilgi) return;
    const kemik = this.kemikBul(bilgi.eklem); if (!kemik) return;
    try {
      const g = await yukle(`/silah/${no}.glb`);
      if (this.plugler.get(yuva)) return; // bu arada başka bir istek takmış
      const nesne = g.scene.clone(true);
      kemik.add(nesne);
      this.plugler.set(yuva, { no, nesne, kemik });
    } catch { /* model yoksa elde bir şey görünmez */ }
  }

  /**
   * Oyuncu iskeletinde animasyonlar silah türüne göre numaralıdır (32_breath_sword0, 33_attack_sword0_A…).
   * Silah türü (eşya tablosu sütun 10) → [bekleme, saldırı A, saldırı B, skill A, skill B] animasyon numaraları. Eşleşme adlardan çıkarıldı
   * (X0 = tek el, Twohand/Twoblunt = iki el); orijinal istemci kodu olmadığı için sınıflandırma varsayımdır.
   */
  private static readonly SILAH_AILESI: Record<number, [number, number, number, number, number]> = {
    0: [86, 87, 88, 0, 0], // silahsız: yumruk
    11: [38, 39, 40, 116, 117], 21: [32, 33, 34, 128, 129], 22: [50, 51, 52, 134, 135],
    31: [68, 69, 70, 112, 113], 32: [71, 72, 73, 132, 133], 41: [56, 57, 58, 120, 121], 42: [62, 63, 64, 122, 123],
    51: [74, 75, 76, 126, 127], 52: [80, 81, 82, 124, 125], 70: [92, 96, 97, 0, 0], 71: [93, 96, 97, 0, 0], 110: [98, 99, 100, 0, 0],
  };
  private aile: [number, number, number, number, number] | null = null;
  /** Yürüme/koşma/geri animasyonları (hız buff'ında hızlanır: orijinalde animasyon hızı m_fMoveDelta ile çarpılır). */
  private static readonly HAREKET = new Set(['yuru', 'kos', 'geri']);
  private hareketCarpaniDeger = 1;
  get hareketCarpani(): number { return this.hareketCarpaniDeger; }
  set hareketCarpani(c: number) {
    if (c === this.hareketCarpaniDeger) return;
    this.hareketCarpaniDeger = c;
    if (this.aktif && KarakterModeli.HAREKET.has(this.aktifAd)) { const g = this.aktifAd; this.aktifAd = ''; this.calistir(g, true, 0); }
  }
  private silahTipi = -1;
  private savasDurusuDeger = false;
  /** Düşman hedef seçiliyken true: bekleme animasyonu silahlı savaş duruşu olur. */
  get savasDurusu(): boolean { return this.savasDurusuDeger; }
  set savasDurusu(d: boolean) {
    if (d === this.savasDurusuDeger) return;
    this.savasDurusuDeger = d;
    if (this.aktifAd === 'bekle') { this.aktifAd = ''; this.calistir('bekle', true, 0.2); }
  }
  private klipNo(no: number): string | undefined {
    if (!no) return undefined;
    for (const ad of this.klipler.keys()) if (ad.startsWith(`${no}_`)) return ad;
    return undefined;
  }
  // ---- Hareket ederken saldırı (orijinal PlayerBase::Action PSA_ATTACK: IsMovingNow → ANI_ATTACK_WITH_WEAPON_WHEN_MOVE = 14, "yalnız üst gövde").
  // Kemikler iki gruba bölünür: üst gövde (göğüs, omuz, kol, boyun, baş) saldırı animasyonunu oynar, bacak/kalça koşmayı sürdürür.
  private static readonly UST_KEMIKLER = new Set(['Chest', 'Chest2', 'LeftCollar', 'LeftShoulder', 'LeftElbow', 'RightCollar', 'RightShoulder', 'RightElbow', 'Neck', 'Head']);
  private bolunmus = new Map<string, { ust: THREE.AnimationClip; alt: THREE.AnimationClip }>();
  private ustSaldiriAktif = false;
  private bol(klip: THREE.AnimationClip): { ust: THREE.AnimationClip; alt: THREE.AnimationClip } {
    let b = this.bolunmus.get(klip.name);
    if (!b) {
      const ustMu = (iz: THREE.KeyframeTrack) => KarakterModeli.UST_KEMIKLER.has(iz.name.split('.')[0]);
      b = { ust: new THREE.AnimationClip(klip.name + '_ust', klip.duration, klip.tracks.filter(ustMu)), alt: new THREE.AnimationClip(klip.name + '_alt', klip.duration, klip.tracks.filter((t) => !ustMu(t))) };
      this.bolunmus.set(klip.name, b);
    }
    return b;
  }
  /** Koşarken/yürürken saldırı: üst gövde 14 numaralı animasyonu bir kez oynar, alt gövde hareket animasyonuna devam eder. */
  ustSaldiri(skillAnimNo?: number, klipAdi?: string): void {
    if (this.ustSaldiriAktif || this.oturAsama !== 'yok' || (this.aktifAd !== 'kos' && this.aktifAd !== 'yuru')) return;
    // Skill kullanılırken skill tablosundaki animasyon (yürüyerek de) üst gövdede oynar; numara yoksa/26 ise silahın hareket-saldırısı (14).
    const skillAd = skillAnimNo && skillAnimNo !== 26 ? this.klipNo(skillAnimNo) : null;
    const saldiri = (klipAdi ? this.klipler.get(klipAdi) : undefined) ?? (skillAd ? this.klipler.get(skillAd) : undefined) ?? [...this.klipler.values()][14], hareket = this.klipler.get(this.aktifAd);
    if (!saldiri || !hareket || !this.aktif) return;
    const ust = this.bol(saldiri).ust, alt = this.bol(hareket).alt;
    if (!ust.tracks.length || !alt.tracks.length) return;
    this.ustSaldiriAktif = true;
    const altEylem = this.karistirici.clipAction(alt); altEylem.reset(); altEylem.timeScale = this.aktif.timeScale; altEylem.play();
    this.aktif.crossFadeTo(altEylem, 0.05, false); this.aktif = altEylem;
    const ustEylem = this.karistirici.clipAction(ust); ustEylem.reset(); ustEylem.setLoop(THREE.LoopOnce, 1); ustEylem.clampWhenFinished = false; ustEylem.play(); ustEylem.fadeIn(0.05);
    const ad = this.aktifAd;
    setTimeout(() => {
      ustEylem.fadeOut(0.08); this.ustSaldiriAktif = false;
      if (this.aktifAd === ad) { this.aktifAd = ''; this.calistir(ad, true, 0.08); } // tam hareket animasyonuna dön
    }, Math.max(150, ust.duration * 1000 / Math.max(0.1, this.aktif.timeScale || 1)));
  }
  /**
   * Hasar alma (orijinal PSA_STRUCK, JudgeAnimationStruck): oyuncuda ANI_STRUCK0..2'den biri YALNIZCA ÜST GÖVDEDE oynar (bacaklar yürümeye devam eder);
   * durağanken bütün vücut oynar. Canavarlarda (NPC) her zaman bütün vücut.
   */
  darbeOynat(ustGovde: boolean): void {
    const n = Math.floor(Math.random() * 3), ad = `darbe${n}`;
    if (ustGovde && this.klipler.has(ad) && (this.aktifAd === 'kos' || this.aktifAd === 'yuru') && this.oturAsama === 'yok') { this.ustSaldiri(undefined, ad); return; }
    this.oynatRastgele('darbe', 3, false, 0.05);
  }
  /** Numaralı animasyonu (ör. 104 selamlama) bir kez oynatır; süresini (sn) döndürür, yoksa 0. */
  numaraOynat(no: number): number { const ad = this.klipNo(no); return ad ? this.oynat(ad, false, 0.1) : 0; }
  /** Eldeki silahın türüne göre bekleme/saldırı/skill animasyonlarını seçer (0 = silahsız). Silah değişince bekleme yenilenir. */
  silahAyarla(tip: number): void {
    if (tip === this.silahTipi) return;
    this.silahTipi = tip;
    this.aile = this.klipNo(32) ? (KarakterModeli.SILAH_AILESI[tip] ?? KarakterModeli.SILAH_AILESI[21]) : null; // numaralı animasyonu olmayan modellerde (canavar) yok
    if (this.aktifAd === 'bekle') { this.aktifAd = ''; this.calistir('bekle', true, 0.2); }
  }
  /** Fiziksel skill animasyonu: silah türüne özgü skill hareketi (A ya da B), yoksa büyü hareketi. Süreyi döndürür. */
  beceriOynat(animNo?: number, yay = false): number {
    if (yay && animNo) { const ad = this.klipNo(animNo); if (ad) return this.oynat(ad, false, 0.08); } // yay: 26 = Shoot_Arrow_A (gerilme)
    // Skill tablosundaki animasyon numarası (iSelfAnimID1) oyuncu iskeletinde doğrudan animasyon numarasıdır (153 dribble, 154 shoot, 24 magic4…).
    // 26 (Shoot_Arrow_A) yakın dövüş skill'lerinde de yazılı: yay animasyonu silahla uyuşmaz, bu yüzden silahın saldırı animasyonu kullanılır (varsayım).
    if (animNo && animNo !== 26) { const ad = this.klipNo(animNo); if (ad) return this.oynat(ad, false, 0.08); }
    return this.oynatRastgele('saldir', 2, false, 0.08);
  }
  /** `onek0..onek(adet-1)` animasyonlarından var olan birini rastgele oynatır (ör. darbe0-2, olum0-1, saldir0-1). */
  oynatRastgele(onek: string, adet: number, tekrar = false, gecis = 0.1): number {
    const adaylar = Array.from({ length: adet }, (_, i) => `${onek}${i}`).filter((a) => this.klipler.has(a) || (this.aile !== null && onek === 'saldir'));
    if (!adaylar.length) return 0;
    return this.oynat(adaylar[Math.floor(Math.random() * adaylar.length)], tekrar, gecis);
  }

  /** Özgün adı olmayan modellerde (oyuncu iskeleti) saldırı animasyonları silah türüne göre adlandırılmıştır; aile seçilmediyse kılıç (sword0). */
  private static readonly YEDEK_AD: Record<string, string> = { saldir0: '33_attack_sword0_A', saldir1: '34_attack_sword0_B' };

  /**
   * Animasyonu oynatır. tekrar=false ise son karede durur. Bitiş süresini (sn) döndürür.
   * Oturma animasyonları sürerken 'bekle' çağrıları yok sayılır; başka bir animasyon isteği (yürüme, darbe…) oturmayı bitirir.
   */
  oynat(ad: string, tekrar = true, gecis = 0.15): number {
    if (this.oturAsama !== 'yok') {
      if (ad === 'bekle') return 0;
      this.oturAsama = 'yok'; this.oturHedef = 0;
    }
    return this.calistir(ad, tekrar, gecis);
  }

  private calistir(ad: string, tekrar: boolean, gecis: number): number {
    let gercek = this.klipler.has(ad) ? ad : KarakterModeli.YEDEK_AD[ad] ?? ad;
    // Orijinal (JudgeAnimationBreath): silaha özgü bekleme duruşu YALNIZCA düşman bir hedef varken; aksi hâlde normal soluma (ANI_BREATH).
    if (this.aile) { const f = ad === 'bekle' ? (this.savasDurusu ? this.klipNo(this.aile[0]) : undefined) : ad === 'saldir0' ? this.klipNo(this.aile[1]) : ad === 'saldir1' ? this.klipNo(this.aile[2]) : undefined; if (f) gercek = f; }
    const klip = this.klipler.get(gercek);
    if (!klip) return 0;
    if (this.aktifAd === ad && tekrar) return klip.duration;
    const yeni = this.karistirici.clipAction(klip);
    const hiz = this.hizlar.get(gercek) ?? 1;
    yeni.reset();
    yeni.setLoop(tekrar ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    yeni.clampWhenFinished = !tekrar;
    yeni.timeScale = (hiz > 0 ? hiz : 1) * (KarakterModeli.HAREKET.has(ad) ? this.hareketCarpani : 1);
    yeni.play();
    if (this.aktif && this.aktif !== yeni) this.aktif.crossFadeTo(yeni, gecis, false);
    this.aktif = yeni;
    this.aktifAd = ad;
    return klip.duration / (yeni.timeScale || 1);
  }

  // ---- Oturma, gerçek animasyonla: oturBasla (SitDown) → otur (SitDown_Breath, döngü) → kalk (StandUp).
  private oturAsama: 'yok' | 'basla' | 'otur' | 'kalk' = 'yok';
  private oturSayac = 0;
  private get gercekOturma(): boolean { return this.klipler.has('oturBasla') && this.klipler.has('otur') && this.klipler.has('kalk'); }

  // ---- Oturma: modelde oturma animasyonu yok; animasyonun üstüne yerde oturma pozu (kemik açıları) uygulanır.
  // Ölçüm (scripts/oturgor.mjs): kalça −140°, diz +160° (X ekseni) → dizler yukarıda, baldır geriye eğik, ayaklar yerde; kalça kökü 0,90 m alçalır.
  // Her karede: önceki karenin pozu geri yüklenir → animasyon güncellenir → ham poz saklanır → oturma eklenir (birikme/kayma olmaz).
  private static readonly OTUR_KALCA = -140;
  private static readonly OTUR_DIZ = 160;
  private static readonly OTUR_INDIR = 0.9;
  private oturHedef = 0;
  private oturDeger = 0;
  private kemikler: { hips: THREE.Object3D; ayak: { kemik: THREE.Object3D; aci: number }[] } | null = null;
  private kayit: { q: THREE.Quaternion[]; hipsY: number } | null = null;
  private static readonly EKSEN_X = new THREE.Vector3(1, 0, 0);
  private readonly oturDonus = new THREE.Quaternion();

  oturPozu(aktif: boolean): void {
    this.oturHedef = aktif ? 1 : 0;
    if (!this.gercekOturma) return;
    if (aktif && (this.oturAsama === 'yok' || this.oturAsama === 'kalk')) { this.oturAsama = 'basla'; this.oturSayac = this.calistir('oturBasla', false, 0.1); }
    else if (!aktif && this.oturAsama !== 'yok' && this.oturAsama !== 'kalk') { this.oturAsama = 'kalk'; this.oturSayac = this.calistir('kalk', false, 0.1); }
  }
  get oturuyor(): boolean { return this.oturHedef === 1; }

  guncelle(dt: number): void {
    const kb = this.kemikler;
    if (this.kayit && kb) { // önceki karede eklenen oturma pozunu geri al
      kb.ayak.forEach((a, i) => a.kemik.quaternion.copy(this.kayit!.q[i]));
      kb.hips.position.y = this.kayit.hipsY;
    }
    this.kayit = null;
    this.karistirici.update(dt);
    if (this.oturAsama !== 'yok') {
      this.oturSayac -= dt;
      if (this.oturSayac <= 0) {
        if (this.oturAsama === 'basla') { this.oturAsama = 'otur'; this.calistir('otur', true, 0.1); }
        else if (this.oturAsama === 'kalk') this.oturAsama = 'yok';
      }
    }
    if (this.gercekOturma) return; // kemik pozu yalnızca oturma animasyonu olmayan modeller için
    const fark = this.oturHedef - this.oturDeger;
    if (fark !== 0) this.oturDeger += Math.sign(fark) * Math.min(Math.abs(fark), dt * 2.2); // ~0,45 sn
    if (this.oturDeger <= 0.0005) { this.oturDeger = Math.max(0, this.oturDeger); return; }
    if (!this.kemikler) {
      const b = (ad: string) => this.kok.getObjectByName(ad);
      const hips = b('Hips');
      const ayak = ([['LeftHip', KarakterModeli.OTUR_KALCA], ['RightHip', KarakterModeli.OTUR_KALCA], ['LeftKnee', KarakterModeli.OTUR_DIZ], ['RightKnee', KarakterModeli.OTUR_DIZ]] as [string, number][])
        .flatMap(([ad, aci]) => { const k = b(ad); return k ? [{ kemik: k, aci }] : []; });
      if (!hips || !ayak.length) { this.oturDeger = 0; return; }
      this.kemikler = { hips, ayak };
    }
    const k = this.kemikler;
    const e = this.oturDeger * this.oturDeger * (3 - 2 * this.oturDeger); // yumuşatma
    this.kayit = { q: k.ayak.map((a) => a.kemik.quaternion.clone()), hipsY: k.hips.position.y };
    for (const a of k.ayak) {
      this.oturDonus.setFromAxisAngle(KarakterModeli.EKSEN_X, (a.aci * e * Math.PI) / 180);
      a.kemik.quaternion.multiply(this.oturDonus);
    }
    k.hips.position.y -= KarakterModeli.OTUR_INDIR * e;
  }
}
