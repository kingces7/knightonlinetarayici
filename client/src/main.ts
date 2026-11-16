// KnightEmpire — tarayıcı istemcisi giriş noktası (tek oyunculu mod).
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle, nesneAnimasyonunuIlerlet, type DokuAnimasyonu } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';
import { animBilgisiYukle, silahBilgisiYukle } from './dunya/karakter';
import { Hud } from './arayuz/hud';
import { OyunArayuzu } from './arayuz/oyunArayuzu';
import { Canavar, DigerOyuncu, GanimetKutusu, Npc, type NpcTanimi, Oyuncu, Varlik, acıyaYaklas } from './oyun/varliklar';
import { HARITALAR, VARSAYILAN_AYAR } from './oyun/haritalar';
import { type BeceriKurali, canavarTurleri, kurallar, OYUNCU_MODELI, OYUNCU_SES_MODELI, irkModeli, kurallariYukle, esyalariYukle, ganimetUret, ganimetYukle, gerekenDeneyim, magazaSayfalari, magazaYukle, rastgele, type EsyaTanimi } from './oyun/veri';
import * as savas from './oyun/savas';
import { Ses } from './oyun/ses';
import { Gokyuzu } from './dunya/gokyuzu';
import { Su } from './dunya/su';
import { EfektDeneme, type Tanecik } from './dunya/efektDeneme';
import { sunucuyaBaglan, type SunucuOturumu } from './ag/sunucu';
import { GirisEkrani } from './arayuz/girisEkrani';
import { sunucuVerisiniUygula } from './oyun/sunucuVerisi';
import { SunucuDunyasi } from './oyun/sunucuDunyasi';
import { HareketGonderici } from '../../kopru/protokol/hareket.ts';
import { WIZ } from '../../kopru/protokol/opcode.ts';
import { partiDavetCevabi, partiDavetiIstegi } from '../../kopru/protokol/parti.ts';
import { hedefCanIstegi, saldiriIstegi, yenidenDogusIstegi } from '../../kopru/protokol/savas.ts';
import { CanavarYoneticisi, type YerlesimKaydi } from './oyun/yerlesim';
import { beceriVurusu, canavarVurusu, oyuncuVurusu, vurusAraligi } from './oyun/savas';

const parametre = new URLSearchParams(location.search);
const HARITA = parametre.get('harita') ?? '14th_oldmoradon';
const ayar = HARITALAR[HARITA] ?? VARSAYILAN_AYAR;
const SIS = new THREE.Color(0x9fb4c8);
const SALDIRI_MENZILI = 2.6;
/**
 * Oyuncu koşma hızı (m/sn). Sunucu kaynağı: SpeedHackUser() normal oyuncuda en çok 45, savaşçı/büyücü/rahipte 67 (= 45 × 1,5; Sprint %150 buff) izin verir;
 * hız paketi onda bir metre/sn biriminde olduğundan temel koşu 4,5 m/sn. Yürüme oranı (0,5) orijinalden doğrulanmadı.
 */
const OYUNCU_HIZI = 4.5;
/** Klavyeyle yürürken gidiş yönünün dönebileceği en yüksek hız (rad/sn): yumuşak, geniş kavisler. */
const YURUME_DONUS_HIZI = 3.2;
/** W + A/D basılıyken karakterin sürekli dönüş hızı (rad/sn): tuş basılı kaldıkça 360° dönebilir. */
const DIREKSIYON_HIZI = Math.PI / 3; // orijinal: A/D saniyede 60° (docs/hareket-mekanigi.md)
/** Orijinal yürüme hızı (m/sn); koşma bunun 3 katı. Geri giderken her zaman yürüme hızı. */
const YURUME_HIZI = 1.5;
/** Oturma: saniyede en çok canın / mananın yüzdesi kadar dolar (sonradan ayarlanabilir). */
const OTURMA_CAN_ORANI = 0.04;
const OTURMA_MANA_ORANI = 0.05;
/** Savaştan bu kadar saniye sonra oturulabilir. */
const OTURMA_SAVAS_BEKLEME = 4;

function durum(metin: string): void {
  const el = document.getElementById('yukleme-durum');
  if (el) el.textContent = metin;
}

async function basla(): Promise<void> {
  const tuval = document.getElementById('oyun') as HTMLCanvasElement;
  const cizici = new THREE.WebGLRenderer({ canvas: tuval, antialias: true });
  cizici.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sahne = new THREE.Scene();
  sahne.background = SIS.clone();
  sahne.fog = new THREE.Fog(SIS, 150, 600);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6b5a45, 1.6);
  sahne.add(hemi);
  const gunes = new THREE.DirectionalLight(0xfff2dd, 1.8);
  gunes.position.set(40, 80, -30);
  sahne.add(gunes, gunes.target);

  durum('Loading terrain…');
  const arazi = await Arazi.yukle(`/harita/${HARITA}`);
  arazi.sisAyarla(SIS, 150, 600);
  sahne.add(arazi.mesh);
  durum('Loading objects…');
  const su = await Su.yukle(`/harita/${HARITA}/su.json`, sahne); // nehir, kanal, deniz (yoksa su yok)
  // DENEYSEL: .fxb tahmini efekt denemesi (bkz. efektDeneme.ts başı) — gerçek bir skill'e bağlı değil, yalnızca window.ke.efektDene() ile elle tetiklenir.
  const efektDeneme = await EfektDeneme.yukle('/efekt/dust.json');
  const efektTanecikleri: Tanecik[] = [];
  void GanimetKutusu.modelYukle();
  const halkaDoku = new THREE.TextureLoader().load('/esya/hedef_halka.png'); halkaDoku.colorSpace = THREE.SRGBColorSpace;
  const halka = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: halkaDoku, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  halka.visible = false; halka.renderOrder = 2; sahne.add(halka);
  let dokuAnimlari: DokuAnimasyonu[] = [];
  try { const n = await nesneleriYukle(`/harita/${HARITA}/nesneler.glb`); dokuAnimlari = n.animlar ?? []; sahne.add(n); } catch (e) { console.warn('Nesneler yüklenemedi', e); }
  durum('Loading characters…');
  await Promise.all([animBilgisiYukle(), silahBilgisiYukle(), esyalariYukle(), kurallariYukle(), magazaYukle(), ganimetYukle()]);

  const hud = new Hud();
  const ses = new Ses();
  await ses.yukle();
  if (ayar.bolge) ses.muzikCal(ayar.bolge);
  const oyuncu = new Oyuncu();
  let sunucuOturumu: SunucuOturumu | null = null;
  let sunucuDunyasi: SunucuDunyasi | null = null;
  let secilenOyuncu: DigerOyuncu | null = null; // tıklanarak seçilen diğer oyuncu (parti daveti için)
  let partidayiz = false; // davet gönderdiysek parti kurulmuştur (sonraki davetler PARTY_INSERT)
  const partiDavetEt = () => {
    if (!sunucuOturumu) { hud.mesaj('Party invitations need a server connection.', 'sistem'); return; }
    if (secilenOyuncu && !digerOyuncular.includes(secilenOyuncu)) secilenOyuncu = null; // ayrılmış oyuncu
    if (!secilenOyuncu) { hud.mesaj('Click a player first, then press Party.', 'sistem'); return; }
    sunucuOturumu.gonder(WIZ.PARTI, partiDavetiIstegi(secilenOyuncu.ad, partidayiz));
    hud.mesaj(`You invited ${secilenOyuncu.ad} to a party.`, 'sistem');
    partidayiz = true;
  };
  let sonIstenenHedef: Canavar | null = null; // sunucudan can bilgisi istenen son hedef
  let hareketGonderici: HareketGonderici | null = null; // sunucu bağlıyken oyuncu hareketini bildirir
  oyuncu.kurallariUygula();
  oyuncu.baslangicEsyalariVer();
  Varlik.arazi = arazi;
  const baslangic = new THREE.Vector2(...(ayar.baslangic ?? [arazi.genislik / 2, arazi.genislik / 2]));
  oyuncu.isinla(baslangic.x, baslangic.y, arazi);
  await oyuncu.modelYukle(Number(parametre.get('model')) || OYUNCU_MODELI);
  sahne.add(oyuncu.grup);

  // Canavarlar: başlangıç noktasının çevresine, türüne göre ayrı bölgelere (güvenli şehirlerde yok)
  const canavarlar: Canavar[] = [];
  const digerOyuncular: DigerOyuncu[] = []; // sunucudaki diğer oyuncular (canlı mod)
  const turler = ayar.canavar ? canavarTurleri() : [];
  for (const [i, tur] of turler.entries()) {
    const aci = (i / turler.length) * Math.PI * 2;
    const merkez = new THREE.Vector2(baslangic.x + Math.cos(aci) * (22 + i * 9), baslangic.y + Math.sin(aci) * (22 + i * 9));
    for (let k = 0; k < tur.adet; k++) {
      const c = new Canavar(tur, merkez.x + rastgele(-10, 10), merkez.y + rastgele(-10, 10));
      try { await c.modelYukle(); } catch (e) { console.warn('Canavar modeli yüklenemedi', tur.ad, e); continue; }
      sahne.add(c.grup);
      canavarlar.push(c);
    }
  }
  // Sunucu yerleşimi (K_NPCPOS) varsa canavarlar oradan, yaklaşınca doğurulur; yoksa yukarıdaki eski halka yerleşimi kullanılır.
  let yonetici: CanavarYoneticisi | null = null;
  try {
    const yanit = await fetch(`/harita/${HARITA}/canavar.json`);
    const kayitlar = ((await yanit.json()) as { yerlesim: YerlesimKaydi[] }).yerlesim;
    if (kayitlar?.length) yonetici = new CanavarYoneticisi(kayitlar, sahne, canavarlar, oyuncu);
  } catch { /* bu haritada yerleşim verisi yok */ }
  const kutular: GanimetKutusu[] = [];

  // NPC'ler: sunucu veritabanından dışa aktarılan npc.json (yoksa NPC olmaz)
  const npcler: Npc[] = [];
  try {
    const yanit = await fetch(`/harita/${HARITA}/npc.json`);
    const tanimlar = ((await yanit.json()) as { npc: NpcTanimi[] }).npc;
    await Promise.all(tanimlar.map(async (t) => {
      const n = new Npc(t);
      try { await n.modelYukle(); } catch (e) { console.warn('NPC modeli yüklenemedi', t.ad, t.model, e); return; }
      sahne.add(n.grup); npcler.push(n);
    }));
  } catch { /* bu haritada NPC verisi yok */ }

  const kamera = new TakipKamerasi(tuval);
  // Gökyüzü: bölgenin .n3sky gün döngüsü (yoksa sabit renkler). Saat gerçek yerel saat; ?saat=12 ile zorlanır.
  const saatParam = parametre.get('saat');
  const gokyuzu = await Gokyuzu.yukle(`/harita/${HARITA}/gokyuzu.json`, sahne, hemi, gunes, (r) => arazi.sisAyarla(r, 150, (sahne.fog as THREE.Fog).far), saatParam !== null ? Number(saatParam) : null);
  // Orijinal kamera ayarı (Data/DefaultCamera.N3Camera): 55° görüş açısı, yakın 0,7, uzak 512; sis de uzak düzlemde biter.
  try {
    const ka = await (await fetch('/oyun/kamera.json')).json() as { fov: number; yakin: number; uzak: number; goz: number[]; bak: number[] };
    if (ka.uzak > 150) { kamera.ayarUygula(ka); (sahne.fog as THREE.Fog).far = ka.uzak; arazi.sisAyarla(SIS, 150, ka.uzak); }
  } catch { /* dosya yoksa kendi değerlerimiz kalır */ }
  const boyut = () => { cizici.setSize(innerWidth, innerHeight, false); kamera.boyutlandir(innerWidth, innerHeight); };
  addEventListener('resize', boyut); boyut();

  // Yürüme/koşma ve oturma (görev çubuğu düğmeleri; C = otur, T = yürü/koş)
  let kosuyor = true;
  const oturDegistir = () => {
    if (oyuncu.olu || !oyuncu.model) return;
    const otur = !oyuncu.model.oturuyor;
    if (otur && oyuncu.savastanBeri < OTURMA_SAVAS_BEKLEME) { hud.mesaj('You cannot sit down during combat.', 'sistem'); return; }
    if (otur) { oyuncu.hedef = null; oyuncu.yuruHedef = null; acilacakKutu = null; oyuncu.yuruAcisi = null; oyuncu.model.oynat('bekle'); }
    oyuncu.model.oturPozu(otur);
    hud.mesaj(otur ? 'You sit down. Health and mana recover quickly.' : 'You stand up.', 'sistem');
  };
  const kalk = () => { if (oyuncu.model?.oturuyor) oyuncu.model.oturPozu(false); };
  const yuruKosDegistir = () => { kosuyor = !kosuyor; hud.mesaj(kosuyor ? 'You are running.' : 'You are walking.', 'sistem'); };
  const hizAl = () => (kosuyor ? OYUNCU_HIZI : YURUME_HIZI) * oyuncu.hizCarpani; // hız buff'ı (Sprint) dahil
  const hareketAnimi = () => (kosuyor ? 'kos' : 'yuru');

  const simdiSn = () => performance.now() / 1000;
  /** Skill kullanımı (sunucu MagicInstance): seviye, MP, tekrar kullanım süresi; Type1 hedef ister, Type4 buff kendine uygulanır. */
  const beceriKullan = (no: number) => {
    const v = kurallar?.beceri[String(no)];
    if (!v || oyuncu.olu) return;
    if (oyuncu.blinkli) { hud.mesaj('You cannot use skills while blinking.', 'sistem'); return; } // sunucu: m_bCanUseSkills = false (10 sn)
    if (oyuncu.seviye < v.seviye) { hud.mesaj(`${v.ad} requires level ${v.seviye}.`, 'sistem'); return; }
    const hazir = oyuncu.beceriBekleme.get(no) ?? 0;
    if (hazir > simdiSn()) { hud.mesaj(`${v.ad} is not ready yet.`, 'sistem'); return; }
    if (oyuncu.mana < v.msp) { hud.mesaj('Not enough MP.', 'sistem'); return; }
    let hedef: Canavar | null = null;
    if (v.tip === 1) {
      hedef = oyuncu.hedef && !oyuncu.hedef.olu ? oyuncu.hedef : null;
      if (!hedef) { hud.mesaj('Select a target first.', 'sistem'); return; }
      if (oyuncu.konum.distanceTo(hedef.konum) > SALDIRI_MENZILI + 0.5) { hud.mesaj('The target is too far away.', 'sistem'); return; }
    } else if (v.tip !== 4) { hud.mesaj(`${v.ad} cannot be used yet.`, 'sistem'); return; }
    if (hedef?.agModu) { hud.mesaj('Skills are not connected to the server yet.', 'sistem'); return; } // sunucu canavarına skill: sonraki adım
    kalk();
    oyuncu.mana -= v.msp;
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // sunucu: ReCastTime × 90 ms
    oyuncu.savastanBeri = v.tip === 1 ? 0 : oyuncu.savastanBeri;
    if (v.tip === 1 && hedef) {
      oyuncu.bak(hedef.konum);
      oyuncu.animKilidi = oyuncu.model?.beceriOynat(arayuz?.beceriAnimNo(no)) || 0.8; // skill tablosundaki animasyon
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
      oyuncu.saldiriSayaci = Math.max(oyuncu.saldiriSayaci, 0.6);
      vurusZamanlayici.push({ kalan: 0.45, hedef, beceri: v });
    } else if (v.tip4) {
      oyuncu.animKilidi = oyuncu.model?.beceriOynat(arayuz?.beceriAnimNo(no)) || oyuncu.model?.oynat('buyu1', false, 0.1) || 0.8;
      oyuncu.buflar = oyuncu.buflar.filter((b) => b.no !== no);
      oyuncu.buflar.push({ no, ad: v.ad, bitis: simdiSn() + v.tip4.sure, hiz: v.tip4.turu === 6 ? v.tip4.hiz : 0, ac: v.tip4.ac });
      hud.mesaj(`${v.ad} is active for ${v.tip4.sure} seconds.`, 'sistem');
    }
  };

  let esyaCikar: (p: number) => void = () => {};
  // Orijinal arayüz (oyunun kendi UIF pencereleri); yüklenemezse eski basit arayüz kalır.
  let arayuz: OyunArayuzu | null = null;
  try {
    const a = new OyunArayuzu({
      kok: document.getElementById('arayuz')!, oyuncu, kamera,
      esyaKusan: (i) => hud.esyaKusan(i),
      esyaTasi: (k, h) => {
        const e = k.tur === 'c' ? oyuncu.envanter[k.i] : oyuncu.ekipman[k.i];
        if (!oyuncu.esyaTasi(k, h)) { if (e) hud.mesaj('You cannot move the item there.', 'sistem'); return; }
        if (e && h.tur === 'e') hud.mesaj(`You equipped ${e.ad}.`, 'sistem'); else if (e && k.tur === 'e') hud.mesaj(`You unequipped ${e.ad}.`, 'sistem');
        envanterYenile();
      },
      ipucuGoster: (e, ev) => hud.ipucuGoster(e, ev), ipucuGizle: () => hud.ipucuGizle(),
      mesaj: (t) => hud.mesaj(t, 'sistem'), statDegisti: () => {},
      partiDavet: () => partiDavetEt(), otur: () => oturDegistir(), yuruKos: () => yuruKosDegistir(), esyaCikar: (p) => esyaCikar(p), beceriKullan: (no) => beceriKullan(no), magazaSatinAl: (e) => magazaSatinAl(e), magazaSat: (i) => magazaSat(i), ganimetAl: (k, s) => hud.ganimetAl(k, s), haritaBilgi: () => ({ ad: HARITA, genislik: arazi.genislik }), npcler: () => npcler.map((n) => ({ ad: n.ad, x: n.konum.x, y: n.konum.y })),
      durum: () => ({ oturuyor: !!oyuncu.model?.oturuyor, kosuyor }),
    });
    await a.baslat(); arayuz = a;
    hud.ganimetKancasi = (k) => a.ganimetGoster(k);
    for (const ad of (parametre.get('ui') ?? '').split(',').filter(Boolean)) void a.genel.ac(ad); // ?ui=re_minimap,re_el_party: pencere önizleme/hata ayıklama
    hud.mesajKancasi = (m, t) => a.bilgiMesaji(m, t);
  } catch (e) { console.warn('Orijinal arayüz yüklenemedi, basit arayüz kullanılacak', e); }
  hud.mesaj('Welcome to KnightEmpire!', 'sistem');
  hud.mesaj(ayar.canavar || yonetici ? 'Hunt monsters, open the chests they drop and level up.' : 'You are in a safe town. Explore with WASD or by clicking the ground.', 'sistem');

  // ---------------- Olaylar ----------------
  const envanterYenile = () => hud.envanterCiz(oyuncu);
  envanterYenile();
  hud.esyaKusan = (i) => {
    const e = oyuncu.esyaKusan(i);
    if (!e) { hud.mesaj('You cannot equip this item.', 'sistem'); return; }
    hud.mesaj(`You equipped ${e.ad}.`, 'sistem');
    envanterYenile();
  };
  esyaCikar = (p) => {
    const e = oyuncu.ekipman[p];
    if (!e) return;
    if (!oyuncu.esyaCikar(p)) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
    hud.mesaj(`You unequipped ${e.ad}.`, 'sistem');
    envanterYenile();
  };
  hud.ganimetAl = (k, secim) => {
    const al = (i: number): boolean => {
      const e = k.esyalar[i];
      if (!oyuncu.esyaEkle(e)) { hud.mesaj('Your inventory is full.', 'sistem'); return false; }
      hud.mesaj(`You obtained ${e.ad}.`, 'odul'); k.esyalar.splice(i, 1); return true;
    };
    if (secim === 'altin' || secim === 'hepsi') {
      if (k.altin > 0) { oyuncu.altin += k.altin; hud.mesaj(`You obtained ${k.altin} Noah.`, 'odul'); k.altin = 0; }
    }
    if (secim === 'hepsi') { while (k.esyalar.length && al(0)) { /* hepsini al */ } }
    else if (typeof secim === 'number') al(secim);
    envanterYenile();
    if (k.bos) { k.omur = 0; hud.ganimetAc(null); } else hud.ganimetAc(k);
  };
  /**
   * Ölümde deneyim kaybı (sunucu OnDeathKilledNpc + ExpChange): bölgede ExpLost varsa ve seviye ≥ 6 ise seviyenin en çok deneyiminin 1/20'si gider.
   * Deneyim sıfırın altına inerse seviye düşer: yeni seviyenin tavanı alınır, kalan ondan çıkarılır (sunucudaki hesapla aynı).
   */
  const deneyimKaybet = (kayip: number): void => {
    if (oyuncu.seviye < 6 || kayip <= 0) return;
    if (oyuncu.deneyim - kayip >= 0) { oyuncu.deneyim -= kayip; return; }
    const eski = oyuncu.deneyim;
    oyuncu.seviye--;
    const fark = eski + Math.floor(gerekenDeneyim(oyuncu.seviye) / 20);
    oyuncu.deneyim = gerekenDeneyim(oyuncu.seviye);
    oyuncu.canManaHesapla(true); // seviye değişince can/mana yeniden hesaplanıp dolar
    hud.mesaj(`You have lost a level. You are now level ${oyuncu.seviye}.`, 'hasar');
    deneyimKaybet(fark);
  };
  hud.yenidenDog = () => {
    if (sunucuOturumu) { sunucuOturumu.gonder(WIZ.YENIDEN_DOGUS, yenidenDogusIstegi()); return; } // sunucu canı doldurur ve yeni konumu bildirir
    // Sunucu Regene: START_POSITION (bölge 21: 264,302 + 0..3 rastgele), canı tam doldurur (mana değişmez), 10 sn göz kırpma
    oyuncu.isinla(baslangic.x + Math.floor(Math.random() * 4), baslangic.y + Math.floor(Math.random() * 4), arazi); oyuncu.can = oyuncu.enCok;
    oyuncu.hedef = null; oyuncu.yuruHedef = null; oyuncu.buflar = []; kalk(); oyuncu.model?.oynat('bekle');
    oyuncu.blinkBitis = simdiSn() + 10;
    hud.mesaj('You have been revived.', 'sistem');
  };

  const tuslar = new Set<string>();
  let otoIleri = false; // E ile açılan otomatik ilerleme
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return; // sohbet yazarken oyun tuşları çalışmasın
    tuslar.add(e.code);
    // Ses aç/kapat: orijinalde tuşu yok (M mini haritaya ayrıldı); Shift+M
    if (!e.repeat && e.code === 'KeyM' && e.shiftKey) { hud.mesaj(ses.sessizDegistir() ? 'Sound is off.' : 'Sound is on.', 'sistem'); return; }
    if (!e.repeat && arayuz?.tus(e.code)) { e.preventDefault(); if (e.code === 'Escape') { /* pencere kapandı */ } return; }
    // Hedef seçimi: Z en yakın canavar, Q ve Tab bir sonraki yakın canavar (yalnızca seçer); R seçili hedefe temel saldırıyı başlatır
    const yakinlar = () => canavarlar.filter((c) => !c.olu && c.konum.distanceTo(oyuncu.konum) < 40).sort((a, b) => a.konum.distanceTo(oyuncu.konum) - b.konum.distanceTo(oyuncu.konum));
    if (!e.repeat && (e.code === 'KeyZ' || e.code === 'KeyQ' || e.code === 'Tab')) {
      e.preventDefault();
      const l = yakinlar();
      const yeni = e.code === 'KeyZ' ? l[0] : (l.find((c) => c !== oyuncu.hedef && (!oyuncu.hedef || c.konum.distanceTo(oyuncu.konum) >= oyuncu.hedef.konum.distanceTo(oyuncu.konum))) ?? l[0]);
      if (yeni && yeni !== oyuncu.hedef) { oyuncu.hedef = yeni; oyuncu.saldiriyor = false; }
      if (e.code === 'KeyZ' && yeni) oyuncu.bak(yeni.konum); // orijinal: en yakın düşmanı seçince ona döner (RotateTo)
    }
    if (e.code === 'KeyS') oyuncu.saldiriyor = false; // S: temel saldırıyı durdurur (hedef seçili kalır)
    if (!e.repeat && e.code === 'KeyR' && oyuncu.saldiriyor) { oyuncu.saldiriyor = false; hud.mesaj('Auto attack off.', 'sistem'); } // R: sürekli saldırıyı aç/kapa (orijinal CommandToggleAttackContinous)
    else if (!e.repeat && e.code === 'KeyR') {
      if (!oyuncu.hedef || oyuncu.hedef.olu) { const y = yakinlar()[0]; if (y) oyuncu.hedef = y; }
      if (oyuncu.hedef && !oyuncu.hedef.olu) { oyuncu.saldiriyor = true; oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null; }
    }
    if (e.code === 'Escape') { if (!oyuncu.hedef) void arayuz?.genel.degistir('re_exitmenu'); oyuncu.hedef = null; hud.ganimetAc(null); } // seçili hedef yoksa Esc çıkış menüsünü açar
    if (!e.repeat && e.code === 'KeyC') oturDegistir();
    if (!e.repeat && e.code === 'KeyT') yuruKosDegistir();
    if (!e.repeat && e.code === 'KeyE' && !oyuncu.olu) { otoIleri = !otoIleri; if (otoIleri) { oyuncu.yuruHedef = null; oyuncu.saldiriyor = false; } } // E: otomatik ilerleme (orijinal KM_TOGGLE_MOVE_CONTINOUS)
    if (!e.repeat && e.code === 'KeyO') hud.mesaj(hud.nickDegistir() ? 'Player names are shown.' : 'Player names are hidden.', 'sistem'); // O: oyuncu adlarını aç/kapat
    if (e.code === 'Home' || e.code === 'End') e.preventDefault(); // kamera eğimi: Home/End basılı tutulunca (döngüde)
  });
  addEventListener('keyup', (e) => { tuslar.delete(e.code); if (e.code === 'Home' || e.code === 'End') kamera.egimKaydet(); });

  const isin = new THREE.Raycaster();
  let acilacakKutu: GanimetKutusu | null = null;
  let acilacakNpc: Npc | null = null;
  /** NPC'ye tıklayınca: satış grubu olan tüccar mağaza açar; diğer NPC işlevleri henüz yok. */
  const npcEtkilesim = (n: Npc) => {
    const sayfalar = n.tanim.satis > 0 ? magazaSayfalari(n.tanim.satis) : null;
    if (sayfalar && arayuz) { arayuz.magazaAc(n.ad, sayfalar); return; }
    if (n.tanim.tur === 31 && n.tanim.sid !== 19999 && arayuz) { arayuz.depoAc(); return; } // Inn Hostess = banka (Clan Bank ayrı, henüz yok)
    hud.mesaj(`${n.ad}: (conversation is not available yet)`, 'bilgi');
  };
  /** Mağazaya satış (sunucu NPCHandler.cpp): fiyat = alış fiyatı / 6 (varsayılan kural). */
  const magazaSat = (yuva: number) => {
    const e = oyuncu.envanter[yuva]; if (!e) return;
    const fiyat = Math.floor(e.fiyat / 6) * (e.adet ?? 1); // yığının tamamı satılır
    if (fiyat <= 0) { hud.mesaj('This item cannot be sold.', 'sistem'); return; }
    oyuncu.envanter[yuva] = null; oyuncu.altin += fiyat;
    hud.mesaj(`You sold ${e.adet && e.adet > 1 ? `${e.adet} × ` : ''}${e.ad} for ${fiyat.toLocaleString('en-US')} Noah.`, 'odul');
  };
  /** Mağazadan satın alma: sunucu mantığı gibi Noah yetmiyorsa ya da çanta doluysa olmaz. */
  const magazaSatinAl = (e: EsyaTanimi) => {
    if (oyuncu.altin < e.fiyat) { hud.mesaj('You do not have enough Noah.', 'sistem'); return; }
    if (!oyuncu.esyaEkle(e)) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
    oyuncu.altin -= e.fiyat;
    hud.mesaj(`You bought ${e.ad} for ${e.fiyat.toLocaleString('en-US')} Noah.`, 'odul');
  };
  // Oyun imleci: tıklayınca ikinci resim, canavarın üstünde kılıç resmi (stil.css .imlec-*)
  addEventListener('pointerdown', () => document.body.classList.add('imlec-basili'));
  addEventListener('pointerup', () => document.body.classList.remove('imlec-basili'));
  tuval.addEventListener('pointermove', (e) => {
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const ustunde = isin.intersectObjects(canavarlar.filter((c) => !c.olu).map((c) => c.secimKutusu)).length > 0;
    document.body.classList.toggle('imlec-saldir', ustunde);
  });
  tuval.addEventListener('pointerleave', () => document.body.classList.remove('imlec-saldir'));
  const sol = { basili: false, x: 0, y: 0 };
  tuval.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || oyuncu.olu) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const npcVurus = isin.intersectObjects(npcler.map((n) => n.secimKutusu))[0];
    if (npcVurus) {
      const n = npcler.find((x) => x.secimKutusu === npcVurus.object)!;
      oyuncu.hedef = null; oyuncu.yuruHedef = n.konum.clone(); acilacakKutu = null; acilacakNpc = n;
      if (oyuncu.konum.distanceTo(n.konum) < 3) { oyuncu.yuruHedef = null; acilacakNpc = null; npcEtkilesim(n); }
      return;
    }
    const kutuVurus = isin.intersectObjects(kutular.map((k) => k.secimKutusu))[0];
    if (kutuVurus) {
      const k = kutular.find((x) => x.secimKutusu === kutuVurus.object)!;
      acilacakKutu = k; oyuncu.hedef = null; oyuncu.yuruHedef = k.konum.clone();
      return;
    }
    const canavarVurus = isin.intersectObjects(canavarlar.filter((c) => !c.olu).map((c) => c.secimKutusu))[0];
    if (canavarVurus) {
      oyuncu.hedef = canavarlar.find((c) => c.secimKutusu === canavarVurus.object) ?? null; oyuncu.saldiriyor = true;
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      return;
    }
    const oyuncuVurus = isin.intersectObjects(digerOyuncular.map((d) => d.secimKutusu))[0];
    if (oyuncuVurus) {
      secilenOyuncu = digerOyuncular.find((d) => d.secimKutusu === oyuncuVurus.object) ?? null;
      if (secilenOyuncu) hud.mesaj(`Selected player: ${secilenOyuncu.ad} (Lv ${secilenOyuncu.seviye}).`, 'sistem');
      oyuncu.hedef = null; oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      return;
    }
    const zemin = isin.intersectObject(arazi.mesh)[0];
    if (zemin) { secilenOyuncu = null; oyuncu.yuruHedef = new THREE.Vector2(zemin.point.x, -zemin.point.z); oyuncu.hedef = null; acilacakKutu = null; acilacakNpc = null; sol.basili = true; sol.x = e.clientX; sol.y = e.clientY; }
  });
  // Sol tuş basılı tutulup sürüklenince karakter imlecin gösterdiği yöne yürür (her karede yeniden hedeflenir) ve oraya döner
  addEventListener('pointermove', (e) => { if (sol.basili) { sol.x = e.clientX; sol.y = e.clientY; } });
  addEventListener('pointerup', (e) => { if (e.button === 0) sol.basili = false; });
  addEventListener('blur', () => { sol.basili = false; });

  // ---------------- Oyun kuralları ----------------
  const deneyimKazan = (miktar: number) => {
    oyuncu.deneyim += miktar;
    hud.mesaj(`You gained ${miktar} experience.`, 'odul');
    while (oyuncu.deneyim >= gerekenDeneyim(oyuncu.seviye)) {
      oyuncu.deneyim -= gerekenDeneyim(oyuncu.seviye);
      oyuncu.seviye++;
      oyuncu.bonusPuan += oyuncu.seviye > 60 ? 5 : 3; // sunucu: 60. seviyeye kadar 3, sonrası 5 statü puanı (U penceresinde harcanır)
      oyuncu.canManaHesapla(true); // sunucu: seviye atlayınca can ve mana tamamen dolar
      hud.mesaj(`Level up! You are now level ${oyuncu.seviye}.`, 'sistem');
      envanterYenile();
    }
  };

  const vurusZamanlayici: { kalan: number; hedef: Canavar; beceri?: BeceriKurali }[] = [];
  const oyuncuGuncelle = (dt: number) => {
    oyuncu.model?.guncelle(dt);
    oyuncu.savastanBeri += dt;
    oyuncu.animKilidi = Math.max(0, oyuncu.animKilidi - dt);
    ses.dinleyici.copy(oyuncu.konum);
    // Elde taşınan silah/kalkan modeli (ekipman değişince yenilenir)
    oyuncu.grup.visible = !oyuncu.blinkli || Math.floor(simdiSn() * 6) % 2 === 0; // göz kırpma: titreşir
    oyuncu.model?.giyimAyarla(oyuncu.ekipman);
    oyuncu.model?.silahAyarla(oyuncu.ekipman[6]?.tip ?? 0);
    if (oyuncu.model) oyuncu.model.savasDurusu = !!oyuncu.hedef && !oyuncu.hedef.olu;
    void oyuncu.model?.plugTak('sag', oyuncu.ekipman[6]?.no ?? 0);
    void oyuncu.model?.plugTak('sol', oyuncu.ekipman[8]?.no ?? 0);
    if (oyuncu.olu) return;
    const oncekiKonum = oyuncu.konum.clone();
    for (const b of oyuncu.buflar.filter((x) => x.bitis <= simdiSn())) hud.mesaj(`${b.ad} has worn off.`, 'sistem');
    oyuncu.buflar = oyuncu.buflar.filter((x) => x.bitis > simdiSn());
    // Yenilenme (savaş dışında hızlı)
    const oturuyor = !!oyuncu.model?.oturuyor;
    const yenilenme = oyuncu.savastanBeri > 6 ? 8 : 0.6;
    oyuncu.can = Math.min(oyuncu.enCok, oyuncu.can + yenilenme * dt + (oturuyor ? oyuncu.enCok * OTURMA_CAN_ORANI * dt : 0));
    oyuncu.mana = Math.min(oyuncu.enCokMana, oyuncu.mana + 3 * dt + (oturuyor ? oyuncu.enCokMana * OTURMA_MANA_ORANI * dt : 0));

    // Klavye (Knight Online gibi): A/D karakteri döndürür (basılı kaldıkça 360° sürekli), W karakterin baktığı yöne ilerler, S geri gider.
    // Kamera karakterle birlikte döner ve ilerlerken yavaşça karakterin arkasına geçer.
    let ikiTus = false;
    if (sol.basili && !oyuncu.olu) {
      isin.setFromCamera(new THREE.Vector2((sol.x / innerWidth) * 2 - 1, -(sol.y / innerHeight) * 2 + 1), kamera.kamera);
      const z = isin.intersectObject(arazi.mesh)[0];
      if (kamera.suruklenirken) { // sol + sağ tuş birlikte: karakter baktığı yönde düz ilerler (yön kameradan değil, kullanıcıdan gelir: A/D ile çevrilir)
        oyuncu.yuruHedef = null; oyuncu.hedef = null; acilacakKutu = null; acilacakNpc = null; ikiTus = true;
      } else if (z) { oyuncu.yuruHedef = new THREE.Vector2(z.point.x, -z.point.z); oyuncu.hedef = null; acilacakKutu = null; acilacakNpc = null; }
    }
    const donusHam = (tuslar.has('KeyA') ? 1 : 0) - (tuslar.has('KeyD') ? 1 : 0);
    // Sol + sağ tuş birlikteyken karakter kamerayla BİRLİKTE döner (WoW gibi): A/D kamerayı çevirir, karakter her kare kameranın baktığı yöne bakar.
    if (ikiTus && donusHam !== 0) kamera.aciEkle(-donusHam * DIREKSIYON_HIZI * dt);
    const donus = ikiTus ? 0 : donusHam;
    // Orijinal: Home/End basılıyken kamera eğimi saniyede 45° değişir (Home = aşağı bakış)
    const egimTus = (tuslar.has('Home') ? 1 : 0) - (tuslar.has('End') ? 1 : 0);
    if (egimTus !== 0) kamera.egimKaydir(egimTus * 45 * dt);
    if (otoIleri && (tuslar.has('KeyW') || tuslar.has('KeyS') || oyuncu.yuruHedef || oyuncu.olu || oyuncu.model?.oturuyor)) otoIleri = false;
    const ilerigeri = Math.max(ikiTus || otoIleri ? 1 : 0, (tuslar.has('KeyW') ? 1 : 0) - (tuslar.has('KeyS') ? 1 : 0));
    if (oyuncu.hedef?.olu) oyuncu.hedef = null;
    if (!oyuncu.hedef) oyuncu.saldiriyor = false;
    oyuncu.yuruAcisi = null;
    // Oturuyorken yeni bir hareket/saldırı isteği gelirse ayağa kalkılır
    if (oyuncu.model?.oturuyor && (donus !== 0 || ilerigeri !== 0 || oyuncu.hedef || oyuncu.yuruHedef)) kalk();
    // Yürümeye başlayınca ya da başka canavara geçilince açık ganimet kutusu kapanır
    if (hud.kutuAcik && (donus !== 0 || ilerigeri !== 0 || oyuncu.hedef || (oyuncu.yuruHedef && !acilacakKutu))) hud.ganimetAc(null);
    if (donus !== 0) {
      const dh = donus * DIREKSIYON_HIZI * dt;
      const h = oyuncu.bakisAcisi + dh;
      oyuncu.bak(new THREE.Vector2(oyuncu.konum.x + Math.cos(h), oyuncu.konum.y + Math.sin(h)));
    }

    if (ikiTus) { const f = kamera.ileriYon(); oyuncu.bak(new THREE.Vector2(oyuncu.konum.x + f.x, oyuncu.konum.y + f.y)); oyuncu.yon = oyuncu.hedefYon; } // fareyle dönüş anında karaktere de yansır
    if (ilerigeri !== 0) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      const h = oyuncu.bakisAcisi;
      const yon = new THREE.Vector2(Math.cos(h), Math.sin(h));
      if (ilerigeri > 0) oyuncu.ilerle(yon, hizAl() * dt); else oyuncu.geriGit(yon.multiplyScalar(-1), YURUME_HIZI * oyuncu.hizCarpani * dt);
      oyuncu.model?.oynat(ilerigeri < 0 && oyuncu.model.var('geri') ? 'geri' : hareketAnimi()); // S: geri yürüme animasyonu
    } else if (donus !== 0 && !oyuncu.hedef) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      oyuncu.model?.oynat('bekle');
    } else if (oyuncu.hedef && oyuncu.saldiriyor) {
      const h = oyuncu.hedef;
      if (oyuncu.konum.distanceTo(h.konum) > SALDIRI_MENZILI) {
        oyuncu.yuru(h.konum, hizAl() * dt, SALDIRI_MENZILI - 0.3);
        oyuncu.model?.oynat(hareketAnimi());
      } else {
        oyuncu.bak(h.konum);
        oyuncu.saldiriSayaci -= dt;
        if (oyuncu.saldiriSayaci <= 0) {
          oyuncu.blinkBitis = 0; // saldırınca göz kırpma biter
          oyuncu.saldiriSayaci = vurusAraligi(oyuncu.silah); // silahın gecikmesi (eşya tablosu)
          oyuncu.savastanBeri = 0;
          oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08);
          ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
          vurusZamanlayici.push({ kalan: 0.45, hedef: h });
        } else if (oyuncu.saldiriSayaci < 0.4) oyuncu.model?.oynat('bekle'); // vuruşlar arasında silahlı bekleme duruşu
      }
    } else if (oyuncu.yuruHedef) {
      if (oyuncu.yuru(oyuncu.yuruHedef, hizAl() * dt, acilacakKutu ? 1.5 : acilacakNpc ? 2.5 : 0)) {
        oyuncu.yuruHedef = null;
        if (acilacakKutu && kutular.includes(acilacakKutu)) hud.ganimetAc(acilacakKutu);
        acilacakKutu = null;
        if (acilacakNpc) { const n = acilacakNpc; acilacakNpc = null; npcEtkilesim(n); }
        oyuncu.model?.oynat('bekle');
      } else oyuncu.model?.oynat(hareketAnimi());
    } else if (oyuncu.animKilidi > 0) {
      /* skill animasyonu oynuyor */
    } else if (oyuncu.saldiriSayaci <= 0.4 || !oyuncu.model?.aktifAd.startsWith('saldir')) {
      oyuncu.model?.oynat('bekle');
    }
    oyuncu.konum.x = THREE.MathUtils.clamp(oyuncu.konum.x, 2, arazi.genislik - 2);
    oyuncu.konum.y = THREE.MathUtils.clamp(oyuncu.konum.y, 2, arazi.genislik - 2);
    // Adım sesi: koşarken 2 m'de, yürürken 1 m'de bir (adım uzunluğu henüz orijinalden doğrulanmadı)
    adimMesafe += oyuncu.konum.distanceTo(oncekiKonum);
    if (adimMesafe >= (kosuyor ? 2 : 1)) { adimMesafe = 0; ses.adim(kosuyor); }
  };
  let adimMesafe = 0;

  const canavarlariGuncelle = (dt: number) => {
    for (let i = vurusZamanlayici.length - 1; i >= 0; i--) {
      const v = vurusZamanlayici[i];
      v.kalan -= dt;
      if (v.kalan > 0) continue;
      vurusZamanlayici.splice(i, 1);
      if (v.hedef.olu || oyuncu.olu) continue;
      if (v.hedef.agModu) { // sunucu canavarı: isabeti ve hasarı sunucu belirler, biz yalnızca saldırı isteriz
        if (sunucuOturumu && !v.beceri) sunucuOturumu.gonder(WIZ.SALDIRI, saldiriIstegi(v.hedef.agKimlik, (oyuncu.silah?.gecikme ?? 100) + 10, 10));
        continue;
      }
      let hasar: number;
      if (v.beceri?.tip1) { // skill vuruşu ıskalamaz (sunucu)
        hasar = beceriVurusu(oyuncu.savasVeri, v.hedef.tur, v.beceri.tip1);
        v.hedef.hasarAl(hasar);
        ses.modelSesi(v.hedef.tur.model, v.hedef.olu ? 'olum' : 'darbe', v.hedef.konum);
        hud.mesaj(`Your ${v.beceri.ad} hits ${v.hedef.tur.ad} for ${hasar} damage.`, 'bilgi');
      } else {
        const vurus = oyuncuVurusu(oyuncu.savasVeri, v.hedef.tur); // sunucu formülü (savas.ts)
        if (vurus.sonuc === 'iska') { hud.mesaj(`You missed ${v.hedef.tur.ad}.`, 'bilgi'); continue; }
        hasar = vurus.hasar;
        v.hedef.hasarAl(hasar);
        ses.modelSesi(v.hedef.tur.model, v.hedef.olu ? 'olum' : 'darbe', v.hedef.konum);
        hud.mesaj(`You hit ${v.hedef.tur.ad} for ${hasar} damage.`, 'bilgi');
      }
      if (v.hedef.olu) {
        hud.mesaj(`${v.hedef.tur.ad} has been defeated.`, 'sistem');
        deneyimKazan(v.hedef.tur.exp); // sunucu iExp (tek başına: tamamı, seviye çarpanı 1)
      }
    }
    for (const c of canavarlar) {
      const saldirdi = c.guncelle(dt, oyuncu);
      const vurus = saldirdi ? canavarVurusu(c.tur, oyuncu.savasVeri) : null; // sunucu formülü (savas.ts)
      if (saldirdi) ses.modelSesi(c.tur.model, 'saldir', c.konum);
      if (vurus && vurus.hasar <= 0) { hud.mesaj(`${c.tur.ad} attacks but misses.`, 'bilgi'); if (!oyuncu.hedef) { oyuncu.hedef = c; oyuncu.saldiriyor = true; } }
      if (vurus && vurus.hasar > 0) {
        const net = oyuncu.hasarAl(vurus.hasar);
        ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
        kalk(); // hasar alınca ayağa kalkılır
        hud.mesaj(`${c.tur.ad} hits you for ${net} damage.`, 'hasar');
        if (oyuncu.olu) {
          hud.mesaj(`You were slain by ${c.tur.ad}.`, 'hasar'); oyuncu.hedef = null;
          if (ayar.deneyimKaybi && oyuncu.seviye >= 6) { const kayip = Math.floor(gerekenDeneyim(oyuncu.seviye) / 20); deneyimKaybet(kayip); hud.mesaj(`You lost ${kayip.toLocaleString('en-US')} experience.`, 'hasar'); }
        }
        else if (!oyuncu.hedef) { oyuncu.hedef = c; oyuncu.saldiriyor = true; } // karşılık ver
      }
      if (c.olu) {
        if (!c.agModu && !c.ganimetBirakildi && c.oluSuresi > 1.2) { // sunucu canavarının ganimeti sunucudan gelir (sonraki adım)
          c.ganimetBirakildi = true;
          const g = ganimetUret(c.tur);
          const k = new GanimetKutusu(c.konum.x, c.konum.y, g.altin, g.esyalar);
          kutular.push(k); sahne.add(k.grup);
        }
        if (c.oluSuresi > 5) c.grup.visible = false;
        if (!c.agModu && c.oluSuresi > c.dogusSure) c.yenidenDog(); // sunucu RegTime (sunucu canavarı yeniden doğunca sunucu bildirir)
      }
      c.sahneyeYerlestir(arazi);
    }
    for (let i = kutular.length - 1; i >= 0; i--) {
      const k = kutular[i];
      k.guncelle(dt, arazi);
      if (k.omur <= 0) { sahne.remove(k.grup); kutular.splice(i, 1); }
    }
  };

  const npcleriGuncelle = (dt: number) => { for (const n of npcler) { n.model?.guncelle(dt); n.sahneyeYerlestir(arazi); } };

  const izdusum = (c: Canavar | Npc | Oyuncu | DigerOyuncu) => {
    const p = c.grup.position.clone(); p.y += c instanceof Npc ? 2.1 * (c.tanim.boyut / 100) : c instanceof Oyuncu || c instanceof DigerOyuncu ? 2.1 : c.boy + 0.1; // canavar adı isabet alanının hemen üstünde
    kamera.kamera.updateMatrixWorld(); // bu karenin kamera konumuna göre (önceki kareye göre kayma/gecikme olmasın)
    const ekran = p.project(kamera.kamera);
    return { x: (ekran.x * 0.5 + 0.5) * innerWidth, y: (-ekran.y * 0.5 + 0.5) * innerHeight, gorunur: ekran.z < 1 && c.konum.distanceTo(oyuncu.konum) < (c instanceof Npc ? 60 : 45) };
  };

  const saat = new THREE.Clock();
  document.getElementById('yukleniyor')?.remove();
  cizici.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.1);
    oyuncuGuncelle(dt);
    if (sunucuOturumu && oyuncu.hedef?.agModu && oyuncu.hedef !== sonIstenenHedef) { sonIstenenHedef = oyuncu.hedef; sunucuOturumu.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(oyuncu.hedef.agKimlik)); }
    if (hareketGonderici && !oyuncu.olu) hareketGonderici.guncelle(oyuncu.konum.x, oyuncu.konum.y, oyuncu.yuksek ?? 0, dt);
    yonetici?.guncelle(dt);
    canavarlariGuncelle(dt);
    npcleriGuncelle(dt);
    for (const d of digerOyuncular) { d.guncelle(dt); d.sahneyeYerlestir(arazi); }
    oyuncu.sahneyeYerlestir(arazi);
    gokyuzu?.guncelle(kamera.kamera.position);
    nesneAnimasyonunuIlerlet(dokuAnimlari, performance.now() / 1000);
    su?.guncelle(performance.now() / 1000);
    efektDeneme?.guncelle(efektTanecikleri, dt, sahne);
    kamera.guncelle(oyuncu.grup.position, (x, z) => arazi.yukseklikAl(x, -z), dt,
      arazi.carpisma ? (a, b) => arazi.carpisma!.dogruKesisimi(a.x, a.y, -a.z, b.x, b.y, -b.z) : undefined); // sahne z'si = −z (KO dünyası)
    hud.guncelle(oyuncu, oyuncu.hedef);
    arayuz?.guncelle(dt);
    hud.etiketGuncelle(canavarlar, izdusum, oyuncu.hedef);
    kamera.kamera.updateMatrixWorld(); // etiketler bu karenin kamera konumuna göre hesaplanır (gecikme/kayma olmasın)
    hud.npcEtiketGuncelle(npcler, izdusum);
    hud.digerEtiketGuncelle(digerOyuncular, izdusum);
    hud.oyuncuEtiketGuncelle(oyuncu.ad, izdusum(oyuncu), oyuncu.partide);
    // Hedef (agro) halkası: oyunun kendi yeşil halka resmi (Misc/target_symbol_plane), seçili canavarın ayağında
    const th = oyuncu.hedef && !oyuncu.hedef.olu ? oyuncu.hedef : null;
    halka.visible = !!th;
    if (th) { halka.position.set(th.grup.position.x, th.grup.position.y + 0.06, th.grup.position.z); halka.scale.setScalar(Math.max(1.2, th.secimYaricapi * 2.6)); }
    cizici.render(sahne, kamera.kamera);
  });
  (window as unknown as { ke: unknown }).ke = { npcler, sahne, kamera, oyuncu, canavarlar, digerOyuncular, kutular, arazi, hud, savas, yonetici, ses, npcTikla: npcEtkilesim, arayuz: () => arayuz, deneyimKaybet, ganimetUret,
    // DENEYSEL: .fxb tahmini efekt denemesi, oyuncunun önünde oynatır. Gerçek bir skill'e bağlı değildir (bkz. dunya/efektDeneme.ts).
    efektDene: () => { if (!efektDeneme) return; const k = oyuncu.grup.position.clone(); k.y += 0.3; efektTanecikleri.push(...efektDeneme.oynat(sahne, k)); },
    efektSayisi: () => efektTanecikleri.length,
    /**
     * Sunucu modu (Aşama 4, deneysel): köprü + Myko sunucusu çalışırken konsoldan `await ke.sunucuyaBaglan(hesap, sifre)`.
     * Giriş sunucusundan geçip karakteri seçer, oyuna girer ve gelen karakter verisini (seviye, statlar, can/mana, altın, eşyalar, konum) oyuncuya uygular.
     */
    sunucuyaBaglan: async (hesap: string, sifre: string, kopru?: string, karakter?: string, secici?: Parameters<typeof sunucuyaBaglan>[4]) => {
      sunucuDunyasi?.tumunuKaldir(); sunucuOturumu?.kapat(); hareketGonderici = null;
      const s = await sunucuyaBaglan(hesap, sifre, kopru, karakter, secici);
      sunucuOturumu = s;
      const ozet = sunucuVerisiniUygula(oyuncu, s.benim, arazi, s.bolge, HARITA);
      oyuncu.ad = s.benim.ad; hud.adAyarla(s.benim.ad);
      await oyuncu.modelDegistir(irkModeli(s.benim.irk)).catch((e) => console.warn('Irk modeli yüklenemedi', s.benim.irk, e)); // kadın/barbar/Karus görünümü
      hud.mesaj(`Connected to ${s.sunucuAdi} as ${s.benim.ad} (Lv ${s.benim.seviye}).`, 'sistem');
      if (s.karsilama) hud.mesaj(s.karsilama, 'sistem');
      // Canlı dünya: yerel (tek oyunculu) canavarlar kaldırılır; canavarlar artık sunucudan gelir.
      yonetici = null;
      for (const c of canavarlar) { sahne.remove(c.grup); hud.etiketKaldir(c); }
      canavarlar.length = 0; oyuncu.hedef = null; oyuncu.saldiriyor = false;
      sunucuDunyasi = new SunucuDunyasi(sahne, canavarlar, digerOyuncular, hud, s.benim.soketNo, oyuncu, {
        canavarSaldirdi: (c) => ses.modelSesi(c.tur.model, 'saldir', c.konum),
        canavarVuruldu: (c) => ses.modelSesi(c.tur.model, 'darbe', c.konum),
        oyuncuVuruldu: () => {
          kalk(); ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
          if (oyuncu.olu) { oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.model?.oynatRastgele('olum', 3, false, 0.1); } else oyuncu.model?.oynatRastgele('darbe', 3, false, 0.05);
        },
        seviyeAtlandi: () => envanterYenile(),
        parti: (p) => {
          if (p.tur === 'hata') { partidayiz = false; hud.mesaj(p.metin, 'sistem'); }
          else if (p.tur === 'davet') {
            // Biri bizi partiye çağırıyor: kabul/ret sunucuya bildirilir
            const kabul = confirm(`${p.ad} invites you to a party. Accept?`);
            sunucuOturumu?.gonder(WIZ.PARTI, partiDavetCevabi(kabul));
            hud.mesaj(kabul ? `You accepted ${p.ad}'s party invitation.` : 'You declined the party invitation.', 'sistem');
          }
        },
        yenidenDogdu: (x, z) => { oyuncu.isinla(x, z, arazi); oyuncu.hedef = null; oyuncu.yuruHedef = null; oyuncu.buflar = []; kalk(); oyuncu.model?.oynat('bekle'); hud.mesaj('You have been revived.', 'sistem'); },
      });
      const dunya = sunucuDunyasi;
      s.akisaGec((p) => dunya.paketIsle(p));
      // Hareketi sunucuya bildir (savaşçı/büyücü/rahip sınıflarında sunucu hız sınırı 6,7 m/sn, diğerlerinde 4,5).
      hareketGonderici = new HareketGonderici((govde) => s.gonder(WIZ.HAREKET, govde), [1, 5, 6].includes(oyuncu.sinif % 100) ? 67 : 45);
      if (ozet.esyaEslesmeyen.length) hud.mesaj(`${ozet.esyaEslesmeyen.length} item(s) are not in the client item list yet.`, 'sistem');
      return { ad: s.benim.ad, seviye: s.benim.seviye, altin: s.benim.altin, can: s.benim.can, bolge: s.bolge, ...ozet };
    },
    sunucudanAyril: () => { hareketGonderici = null; sunucuDunyasi?.tumunuKaldir(); sunucuDunyasi = null; sunucuOturumu?.kapat(); sunucuOturumu = null; },
    /** Hata ayıklama: sunucu dünyasındaki canavar sayısı ve gelen paket sayaçları. */
    sunucuDurumu: () => sunucuDunyasi ? { canavar: sunucuDunyasi.canavarlar.size, oyuncu: sunucuDunyasi.oyuncular.size, sayac: { ...sunucuDunyasi.sayac }, bilinmeyenTurler: [...sunucuDunyasi.bilinmeyenTurler] } : null };
}

// Giriş ekranı (hesap/şifre → karakter seçimi). Otomatik tarayıcılarda (testler) kapalıdır; ?giris=1 zorla açar, ?giris=0 kapatır.
async function girisEkraniAc(): Promise<void> {
  const g = new URLSearchParams(location.search).get('giris');
  if (g === '0' || (g !== '1' && navigator.webdriver)) return;
  const ke = (window as unknown as { ke: { sunucuyaBaglan: (h: string, s: string, k?: string, c?: string, sec?: Parameters<typeof sunucuyaBaglan>[4]) => Promise<unknown> } }).ke;
  const ekran = new GirisEkrani({
    kok: document.getElementById('arayuz')!,
    baglan: async (hesap, sifre, sec) => { await ke.sunucuyaBaglan(hesap, sifre, undefined, undefined, async (yuvalar) => sec(yuvalar.map((y) => ({ ad: y.ad, seviye: y.seviye, sinif: y.sinif })))); },
    cevrimdisi: () => {},
  });
  await ekran.ac();
}

basla().then(girisEkraniAc).catch((e) => { durum('Error: ' + (e as Error).message); console.error(e); });
