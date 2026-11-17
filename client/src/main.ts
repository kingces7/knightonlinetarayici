// KnightEmpire — tarayıcı istemcisi giriş noktası (tek oyunculu mod).
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle, nesneAnimasyonunuIlerlet, type DokuAnimasyonu } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';
import { animBilgisiYukle, silahBilgisiYukle } from './dunya/karakter';
import { Hud } from './arayuz/hud';
import { OyunArayuzu } from './arayuz/oyunArayuzu';
import { Canavar, DigerOyuncu, GanimetKutusu, Npc, type NpcTanimi, type YuvaKonumu, Oyuncu, Varlik, acıyaYaklas } from './oyun/varliklar';
import { HARITALAR, VARSAYILAN_AYAR } from './oyun/haritalar';
import { type BeceriKurali, canavarTurleri, kurallar, OYUNCU_MODELI, OYUNCU_SES_MODELI, irkModeli, kurallariYukle, tumEsyalariYukle, esyaBulSunucu, esyalariYukle, ganimetUret, ganimetYukle, gerekenDeneyim, magazaSayfalari, magazaKonum, magazaYukle, rastgele, type EsyaTanimi } from './oyun/veri';
import * as savas from './oyun/savas';
import { Ses } from './oyun/ses';
import { Gokyuzu } from './dunya/gokyuzu';
import { Su } from './dunya/su';
import { EfektDeneme, type Tanecik } from './dunya/efektDeneme';
import { EfektYoneticisi } from './dunya/efekt';
import { sunucuyaBaglan, type SunucuOturumu } from './ag/sunucu';
import { GirisEkrani } from './arayuz/girisEkrani';
import { sunucuVerisiniUygula } from './oyun/sunucuVerisi';
import { SunucuDunyasi } from './oyun/sunucuDunyasi';
import { HareketGonderici } from '../../kopru/protokol/hareket.ts';
import { WIZ } from '../../kopru/protokol/opcode.ts';
import { PaketYazici } from '../../kopru/protokol/ikili.ts';
import { partiDavetCevabi, partiDavetiIstegi } from '../../kopru/protokol/parti.ts';
import { ALTIN_NO as BANKA_ALTIN, BANKA_ISLEMI, SAYFA_YUVASI, bankaAcIstegi, bankaIslemIstegi, type BankaCevabi } from '../../kopru/protokol/banka.ts';
import { oturmaIstegi, statArtirmaIstegi } from '../../kopru/protokol/karakter.ts';
import { MAGAZA_HATALARI, MAGAZA_MENZILI, satinAlmaIstegi, satisIstegi, type MagazaCevabi } from '../../kopru/protokol/magaza.ts';
import { SOHBET_TURU, ozelHedefIstegi, sohbetIstegi, type SohbetPaketi } from '../../kopru/protokol/sohbet.ts';
import { ESYA_YONU, esyaSilmeCevabi, esyaSilmeIstegi, esyaTasimaIstegi, type TasimaCevabi } from '../../kopru/protokol/envanter.ts';
import { ALTIN_NO, GANIMET_HATALARI, esyaAlmaIstegi, kutuAcmaIstegi, type AlmaCevabi, type KutuIcerigi } from '../../kopru/protokol/ganimet.ts';
import { BECERI_HATALARI, BECERI_KOMUTU, beceriIstegi, type BeceriPaketi } from '../../kopru/protokol/beceri.ts';
import { hedefCanIstegi, saldiriIstegi, yenidenDogusIstegi } from '../../kopru/protokol/savas.ts';
import { CanavarYoneticisi, type YerlesimKaydi } from './oyun/yerlesim';
import { beceriVurusu, canavarVurusu, oyuncuVurusu, vurusAraligi } from './oyun/savas';

const parametre = new URLSearchParams(location.search);
const HARITA = parametre.get('harita') ?? '14th_oldmoradon';
const ayar = HARITALAR[HARITA] ?? VARSAYILAN_AYAR;
const SIS = new THREE.Color(0x9fb4c8);
/** Hedefin boyuna göre menzil: büyük canavarın merkezi uzaktadır (orijinal DistanceExceptRadius). */
const menzilDe = (h: { secimYaricapi: number }) => SALDIRI_MENZILI + Math.max(0, h.secimYaricapi - 0.8);
const SALDIRI_MENZILI = 5.0; // sunucu melee için 15 birim + silah menziline izin verir (User.cpp isInAttackRange); client temkinli ama içine girmeden vurur
/** Town komutunun ışınlandığı Moradon şehir noktası (kullanıcı verdi). */
const SEHIR_NOKTASI: [number, number] = [305, 342]; // yakın dövüş vuruş menzili (m); eskiden 2,6 (canavarın çok yakınına girmek gerekiyordu)
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
  // Işık şiddeti: eskiden hemi 1,6 + güneş 1,8 yüzeyleri 3 kata kadar aşırı aydınlatıyordu (zemin beyaza yanıyordu). Orijinal D3D ışığı gibi toplam ≈1. Deneme: ?isik=0.8 (çarpan)
  const ISIK = Number(parametre.get('isik') ?? 1);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6b5a45, 1.9 * ISIK);
  sahne.add(hemi);
  const gunes = new THREE.DirectionalLight(0xfff2dd, 1.5 * ISIK);
  gunes.position.set(40, 80, -30);
  sahne.add(gunes, gunes.target);

  durum('Loading terrain…');
  const arazi = await Arazi.yukle(`/harita/${HARITA}`);
  arazi.sisAyarla(SIS, 150, 600);
  sahne.add(arazi.mesh);
  durum('Loading objects…');
  const su = await Su.yukle(`/harita/${HARITA}/su.json`, sahne, (x, z) => arazi.yukseklikAl(x, z)); // nehir, kanal, deniz (yoksa su yok)
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
  let sonCanIstegi = 0;
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
  // Skill efektleri (.fxb, OpenKO kaynağındaki parça mantığıyla): skill kullanılınca kendinde ve hedefte oynar
  const efektler = new EfektYoneticisi(sahne, kamera.kamera);
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
    sunucuOturumu?.gonder(WIZ.DURUM_DEGISTI, oturmaIstegi(otur)); // sunucu oturma sırasında yenilenmeyi hızlandırır
    hud.mesaj(otur ? 'You sit down. Health and mana recover quickly.' : 'You stand up.', 'sistem');
  };
  const kalk = () => { if (oyuncu.model?.oturuyor) { oyuncu.model.oturPozu(false); sunucuOturumu?.gonder(WIZ.DURUM_DEGISTI, oturmaIstegi(false)); } }; // sunucuya da bildirilir (yenilenme hızı oturma durumuna bağlı)
  const yuruKosDegistir = () => { kosuyor = !kosuyor; hud.mesaj(kosuyor ? 'You are running.' : 'You are walking.', 'sistem'); };
  const hizAl = () => (kosuyor ? OYUNCU_HIZI : YURUME_HIZI) * oyuncu.hizCarpani; // hız buff'ı (Sprint) dahil
  const hareketAnimi = () => (kosuyor ? 'kos' : 'yuru');

  const simdiSn = () => performance.now() / 1000;
  /** Skill kullanımı (sunucu MagicInstance): seviye, MP, tekrar kullanım süresi; Type1 hedef ister, Type4 buff kendine uygulanır. */
  let benimSoketNo = 0;
  /** Skill efekt numaraları (Sprint'te altın toplanma yok: kullanıcı kararı). */
  const efektNo = (no: number) => ({ ...arayuz?.beceriEfekt(no) ?? { kendi: null, hedef: null }, ...(no === 201002 ? { kendi: null } : {}) });
  /** Sunucu modunda skill: isteği yollar; MP/hasar/buff sonucunu sunucu bildirir (0x18, 0x22, 0x31). Burada yalnız animasyon, ses ve istek vardır. */
  const sunucuBecerisi = (no: number, v: NonNullable<typeof kurallar>['beceri'][string], hedef: Canavar | null) => {
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // aynı skill'in art arda gönderilmemesi için yerel bekleme (sunucu da kontrol eder)
    sunucuOturumu!.gonder(WIZ.BECERI, beceriIstegi(BECERI_KOMUTU.ETKI, no, benimSoketNo, v.tip === 1 && hedef ? hedef.agKimlik : benimSoketNo));
    if (v.tip === 1 && hedef) {
      oyuncu.savastanBeri = 0;
      if (!hareketEdiyor) { oyuncu.bak(hedef.konum); oyuncu.animKilidi = oyuncu.model?.beceriOynat(arayuz?.beceriAnimNo(no)) || 0.8; } else oyuncu.model?.ustSaldiri(arayuz?.beceriAnimNo(no)); // yürürken: üst gövde skill animasyonu, bacaklar yürümeye devam
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
    }
  };
  /** Sunucudan gelen skill paketi: başarıda efektler (ve kendi buff'ımız), reddedilirse mesaj. */
  const beceriSunucudan = (p: BeceriPaketi) => {
    const benim = p.kullanan === benimSoketNo;
    const kaynak = benim ? oyuncu.grup : sunucuDunyasi?.oyuncular.get(p.kullanan)?.grup ?? null;
    if (p.komut === BECERI_KOMUTU.BASARISIZ) {
      if (benim) { oyuncu.beceriBekleme.delete(p.no); hud.mesaj(BECERI_HATALARI[p.veri[3]] ?? 'The skill failed.', 'sistem'); }
      return;
    }
    if (p.komut !== BECERI_KOMUTU.ETKI) return;
    const e = efektNo(p.no), v = kurallar?.beceri[String(p.no)];
    if (e.kendi && kaynak) void efektler.oynat(e.kendi, kaynak, { sure: v?.tip4 ? 1.2 : 0.6 });
    const hedefGrup = p.hedef === benimSoketNo ? oyuncu.grup : sunucuDunyasi?.canavarlar.get(p.hedef)?.grup ?? sunucuDunyasi?.oyuncular.get(p.hedef)?.grup ?? null;
    if (e.hedef && hedefGrup) void efektler.oynat(e.hedef, hedefGrup, v?.tip4 ? { sure: 1.2 } : { sure: 0.15, azamiSure: 0.25 });
    if (benim && v?.tip4) { // buff sunucuda kabul edildi
      oyuncu.buflar = oyuncu.buflar.filter((b) => b.no !== p.no);
      oyuncu.buflar.push({ no: p.no, ad: v.ad, bitis: simdiSn() + v.tip4.sure, hiz: v.tip4.turu === 6 ? v.tip4.hiz : 0, ac: v.tip4.ac });
      hud.mesaj(`${v.ad} is active for ${v.tip4.sure} seconds.`, 'sistem');
    }
  };
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
      if (oyuncu.konum.distanceTo(hedef.konum) > menzilDe(hedef) + 0.5) { hud.mesaj('The target is too far away.', 'sistem'); return; }
    } else if (v.tip !== 4) { hud.mesaj(`${v.ad} cannot be used yet.`, 'sistem'); return; }
    kalk();
    if (sunucuOturumu) { sunucuBecerisi(no, v, hedef); return; } // sunucu modu: kuralları sunucu uygular (MP, hasar, buff, bekleme)
    // Efekt istisnaları: Sprint'te altın toplanma (Ability_cast) yok, yalnız mavi rüzgâr izi (kullanıcı kararı); Defense tabloya uygun altın efektini kullanır.
    const efektId = { ...arayuz?.beceriEfekt(no) ?? { kendi: null, hedef: null }, ...(no === 201002 ? { kendi: null } : {}) };
    if (efektId?.kendi) void efektler.oynat(efektId.kendi, oyuncu.grup, { sure: v.tip4 ? 1.2 : 0.6 }); // kullanan kişide efekt
    oyuncu.mana -= v.msp;
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // sunucu: ReCastTime × 90 ms
    oyuncu.savastanBeri = v.tip === 1 ? 0 : oyuncu.savastanBeri;
    if (v.tip === 1 && hedef) {
      if (!hareketEdiyor) { oyuncu.bak(hedef.konum); oyuncu.animKilidi = oyuncu.model?.beceriOynat(arayuz?.beceriAnimNo(no)) || 0.8; } else oyuncu.model?.ustSaldiri(arayuz?.beceriAnimNo(no)); // skill tablosundaki animasyon; yürürken üst gövdede oynar
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
      vurusZamanlayici.push({ kalan: 0.45, hedef, beceri: v, hedefEfekt: efektId?.hedef ?? null });
    } else if (v.tip4) {
      // Buff skill'lerinde (Sprint, Defense…) karakter animasyonu oynatılmaz (kullanıcı isteği); yalnız efekt çıkar.
      oyuncu.buflar = oyuncu.buflar.filter((b) => b.no !== no);
      oyuncu.buflar.push({ no, ad: v.ad, bitis: simdiSn() + v.tip4.sure, hiz: v.tip4.turu === 6 ? v.tip4.hiz : 0, ac: v.tip4.ac });
      if (efektId?.hedef) void efektler.oynat(efektId.hedef, oyuncu.grup, { sure: 1.2 }); // buff'ta hedef efekti de kullanana uygulanır
      hud.mesaj(`${v.ad} is active for ${v.tip4.sure} seconds.`, 'sistem');
    }
  };

  let esyaCikar: (p: number) => void = () => {};
  // Orijinal arayüz (oyunun kendi UIF pencereleri); yüklenemezse eski basit arayüz kalır.
  let arayuz: OyunArayuzu | null = null;
  try {
    const a = new OyunArayuzu({
      kok: document.getElementById('arayuz')!, oyuncu, kamera,
      esyaKusan: (i) => hud.esyaKusan(i), esyaAt: (k) => esyaAt(k),
      bankaIslem: (i) => bankaIslemSunucu(i),
      statSunucu: (ad) => {
        if (!sunucuOturumu) return false;
        if (ad === 'reset') { hud.mesaj('Stat points are reset by an NPC.', 'sistem'); return true; }
        const no = ['str', 'sta', 'dex', 'int'].indexOf(ad) + 1;
        if (no > 0 && oyuncu.bonusPuan > 0) sunucuOturumu.gonder(WIZ.STAT_DEGISTI, statArtirmaIstegi(no));
        return true;
      }, sohbetGonder: (mod, m) => sohbetGonder(mod, m),
      esyaTasi: (k, h) => {
        const e = k.tur === 'c' ? oyuncu.envanter[k.i] : oyuncu.ekipman[k.i];
        if (sunucuOturumu) { // sunucu modu: mesaj sunucu onayından sonra
          const ms = e && h.tur === 'e' ? `You equipped ${e.ad}.` : e && k.tur === 'e' ? `You unequipped ${e.ad}.` : undefined;
          if (!sunucuTasi(k, h, ms) && e) hud.mesaj('You cannot move the item there.', 'sistem'); else envanterYenile();
          return;
        }
        if (!oyuncu.esyaTasi(k, h)) { if (e) hud.mesaj('You cannot move the item there.', 'sistem'); return; }
        if (e && h.tur === 'e') hud.mesaj(`You equipped ${e.ad}.`, 'sistem'); else if (e && k.tur === 'e') hud.mesaj(`You unequipped ${e.ad}.`, 'sistem');
        envanterYenile();
      },
      ipucuGoster: (e, ev) => hud.ipucuGoster(e, ev), ipucuGizle: () => hud.ipucuGizle(),
      mesaj: (t) => hud.mesaj(t, 'sistem'), statDegisti: () => {},
      partiDavet: () => partiDavetEt(),
      // Town: Moradon'da şehir noktası (305, 342). Sunucuda ışınlanma "durağan" hareket paketiyle bildirilir (test araçlarındaki yöntem).
      sehreDon: () => {
        const [x, z] = SEHIR_NOKTASI; kalk(); oyuncu.isinla(x, z, arazi); oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.yuruHedef = null;
        if (sunucuOturumu) { const p = (m: number) => Math.round(m * 10); const y = p(arazi.yukseklikAl(x, z)); sunucuOturumu.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(y).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(y).baytlar()); }
        hud.mesaj('You returned to town.', 'sistem');
      },
      emote: (no) => { if (oyuncu.olu || !oyuncu.model) return; kalk(); oyuncu.yuruHedef = null; oyuncu.animKilidi = oyuncu.model.numaraOynat(no) || 0; }, otur: () => oturDegistir(), yuruKos: () => yuruKosDegistir(), esyaCikar: (p) => esyaCikar(p), beceriKullan: (no) => beceriKullan(no), magazaSatinAl: (e) => magazaSatinAl(e), magazaSat: (i) => magazaSat(i), ganimetAl: (k, s) => hud.ganimetAl(k, s), haritaBilgi: () => ({ ad: HARITA, genislik: arazi.genislik }), npcler: () => npcler.map((n) => ({ ad: n.ad, x: n.konum.x, y: n.konum.y })),
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
  /**
   * Sunucu modunda eşya taşıma/giyme/çıkarma: yerel kurallarla hemen uygulanır (akıcı), istek sunucuya gider; sunucu reddederse (0x1F "01 00") önceki hal geri yüklenir.
   * Cevaplar sırayla geldiği için bekleyen istekler kuyrukta tutulur.
   */
  const tasimaBekleyen: { env: (EsyaTanimi | null)[]; ekp: (EsyaTanimi | null)[]; mesaj?: string }[] = [];
  const sunucuTasi = (k: YuvaKonumu, h: YuvaKonumu, mesaj?: string): boolean => {
    const e = k.tur === 'c' ? oyuncu.envanter[k.i] : oyuncu.ekipman[k.i]; if (!e) return false;
    const once = { env: oyuncu.envanter.map((x) => (x ? { ...x } : null)), ekp: oyuncu.ekipman.map((x) => (x ? { ...x } : null)) };
    if (!oyuncu.esyaTasi(k, h)) return false;
    tasimaBekleyen.push({ ...once, mesaj });
    const yon = k.tur === 'c' ? (h.tur === 'c' ? ESYA_YONU.CANTADAN_CANTAYA : ESYA_YONU.CANTADAN_YUVAYA) : (h.tur === 'c' ? ESYA_YONU.YUVADAN_CANTAYA : ESYA_YONU.YUVADAN_YUVAYA);
    sunucuOturumu?.gonder(WIZ.ESYA_TASI, esyaTasimaIstegi(yon, e.sunucuNo ?? e.no, k.i, h.i));
    return true;
  };
  const tasimaCevabiSunucudan = (c: TasimaCevabi) => {
    const once = tasimaBekleyen.shift();
    if (!c.basarili) {
      if (once) { oyuncu.envanter.splice(0, oyuncu.envanter.length, ...once.env); oyuncu.ekipman.splice(0, oyuncu.ekipman.length, ...once.ekp); tasimaBekleyen.length = 0; }
      hud.mesaj('You cannot move the item there.', 'sistem'); envanterYenile(); return;
    }
    if (once?.mesaj) hud.mesaj(once.mesaj, 'sistem');
    if (c.azamiCan) oyuncu.enCok = c.azamiCan; if (c.azamiMana) oyuncu.enCokMana = c.azamiMana;
  };
  /** Sohbet (sunucu modu): mesaj sunucuya gider, herkes (kendimiz dahil) sunucudan geri alır. "/ad mesaj" özel mesajdır (alıcı önce sorgulanır, sunucu göndereni yankılamaz). */
  let ozelBekleyen: { ad: string; mesaj: string } | null = null;
  const sohbetGonder = (mod: string, mesaj: string): boolean => {
    if (!sunucuOturumu) return false;
    const ozel = /^\/(\S+)\s+(.+)$/.exec(mesaj);
    if (ozel) { ozelBekleyen = { ad: ozel[1], mesaj: ozel[2] }; sunucuOturumu.gonder(WIZ.SOHBET_HEDEFI, ozelHedefIstegi(ozel[1])); return true; }
    const tur = mod === 'shout' ? SOHBET_TURU.BAGIRMA : mod === 'party' ? SOHBET_TURU.PARTI : mod === 'clan' ? SOHBET_TURU.KLAN : SOHBET_TURU.GENEL;
    if (tur === SOHBET_TURU.PARTI && !partidayiz) { hud.mesaj('You are not in a party.', 'sistem'); return true; }
    sunucuOturumu.gonder(WIZ.SOHBET, sohbetIstegi(tur, mesaj)); return true;
  };
  const sohbetSunucudan = (s: SohbetPaketi) => {
    const ad = { [SOHBET_TURU.GENEL]: 'Normal', [SOHBET_TURU.OZEL]: 'Private', [SOHBET_TURU.PARTI]: 'Party', [SOHBET_TURU.BAGIRMA]: 'Shout', [SOHBET_TURU.KLAN]: 'Clan' }[s.tur as number];
    const renk = { [SOHBET_TURU.OZEL]: '#8cff8c', [SOHBET_TURU.PARTI]: '#6bb8ff', [SOHBET_TURU.BAGIRMA]: '#ffa545', [SOHBET_TURU.KLAN]: '#ffe066' }[s.tur as number] ?? '#ffffff';
    arayuz?.sohbetYaz(s.gonderen ? `[${ad ?? s.tur}] ${s.gonderen}: ${s.mesaj}` : s.mesaj, renk);
  };
  const ozelHedefSunucudan = (bulundu: boolean) => {
    const b = ozelBekleyen; ozelBekleyen = null; if (!b) return;
    if (!bulundu) { hud.mesaj(`${b.ad} is not online.`, 'sistem'); return; }
    sunucuOturumu?.gonder(WIZ.SOHBET, sohbetIstegi(SOHBET_TURU.OZEL, b.mesaj));
    arayuz?.sohbetYaz(`[To ${b.ad}] ${b.mesaj}`, '#8cff8c');
  };
  /** Çöp kutusu: sunucu modunda sunucu onayıyla, yerelde hemen. */
  const silmeBekleyen: { k: YuvaKonumu; e: EsyaTanimi }[] = [];
  const esyaAt = (k: YuvaKonumu) => {
    const e = k.tur === 'c' ? oyuncu.envanter[k.i] : oyuncu.ekipman[k.i]; if (!e) return;
    if (sunucuOturumu) { silmeBekleyen.push({ k, e }); sunucuOturumu.gonder(WIZ.ESYA_SIL, esyaSilmeIstegi(k.tur === 'e', k.i, e.sunucuNo ?? e.no)); return; }
    if (k.tur === 'c') oyuncu.envanter[k.i] = null; else oyuncu.ekipman[k.i] = null;
    hud.mesaj(`You destroyed ${e.ad}.`, 'sistem'); envanterYenile();
  };
  const silmeSunucudan = (tamam: boolean) => {
    const b = silmeBekleyen.shift(); if (!b) return;
    if (!tamam) { hud.mesaj('You cannot destroy that item.', 'sistem'); return; }
    if (b.k.tur === 'c') oyuncu.envanter[b.k.i] = null; else oyuncu.ekipman[b.k.i] = null;
    hud.mesaj(`You destroyed ${b.e.ad}.`, 'sistem'); envanterYenile();
  };
  hud.esyaKusan = (i) => {
    if (sunucuOturumu) { // sunucu modu
      const e = oyuncu.envanter[i]; if (!e) return;
      const p = Oyuncu.ekipmanYuvasi(e); if (p < 0) { hud.mesaj('You cannot equip this item.', 'sistem'); return; }
      if (sunucuTasi({ tur: 'c', i }, { tur: 'e', i: p }, `You equipped ${e.ad}.`)) envanterYenile();
      return;
    }
    const e = oyuncu.esyaKusan(i);
    if (!e) { hud.mesaj('You cannot equip this item.', 'sistem'); return; }
    hud.mesaj(`You equipped ${e.ad}.`, 'sistem');
    envanterYenile();
  };
  esyaCikar = (p) => {
    const e = oyuncu.ekipman[p];
    if (!e) return;
    if (sunucuOturumu) {
      const f = oyuncu.envanter.indexOf(null); if (f < 0) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
      if (sunucuTasi({ tur: 'e', i: p }, { tur: 'c', i: f }, `You unequipped ${e.ad}.`)) envanterYenile();
      return;
    }
    if (!oyuncu.esyaCikar(p)) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
    hud.mesaj(`You unequipped ${e.ad}.`, 'sistem');
    envanterYenile();
  };
  /** Sunucu kutusundan al: istek yollanır; envanter/Noah/kutu ancak sunucunun 0x26 cevabıyla değişir. */
  const sunucuGanimetAl = (k: GanimetKutusu, secim: 'altin' | 'hepsi' | number) => {
    const gonder = (no: number, yuva: number) => sunucuOturumu?.gonder(WIZ.ESYA_AL, esyaAlmaIstegi(k.agTorba, no, yuva));
    if ((secim === 'altin' || secim === 'hepsi') && k.altin > 0 && k.agAltinYuva >= 0) gonder(ALTIN_NO, k.agAltinYuva);
    if (secim === 'hepsi') for (const y of [...k.agYuvalar]) gonder(y.no, y.yuva);
    else if (typeof secim === 'number' && k.agYuvalar[secim]) gonder(k.agYuvalar[secim].no, k.agYuvalar[secim].yuva);
  };
  const kutuBul = (torba: number) => kutular.find((k) => k.agTorba === torba);
  /** Ganimet kutusu canavarın görüntüsünün üstünde değil, yanında belirir (canavar boyutuna göre ~1,6–2,4 m yana; yön torba/kimlik numarasından türetilir, böylece aynı yerde ölenlerin kutuları üst üste binmez). */
  const kutuYani = (x: number, z: number, tohum: number, yaricap = 0.8): [number, number] => {
    const aci = (tohum * 2.399963) % (Math.PI * 2), uzak = 1.6 + yaricap * 0.9;
    return [x + Math.cos(aci) * uzak, z + Math.sin(aci) * uzak];
  };
  const ganimetDustuSunucudan = (torba: number, konum: { x: number; z: number; yaricap: number } | null, canavar: Canavar | null) => {
    const [kx, kz] = kutuYani(konum?.x ?? oyuncu.konum.x, konum?.z ?? oyuncu.konum.y, torba, konum?.yaricap);
    const k = new GanimetKutusu(kx, kz, 0, []);
    k.sahip = canavar; k.agTorba = torba; k.icerikGeldi = false; kutular.push(k); sahne.add(k.grup);
    sunucuOturumu?.gonder(WIZ.KUTU_AC, kutuAcmaIstegi(torba)); // içerik hemen istenir: kutuya tıklanınca simgeler hazır olsun
  };
  const kutuIcerigiSunucudan = (ic: KutuIcerigi) => {
    const k = kutuBul(ic.torbaNo); if (!k) return;
    k.altin = 0; k.esyalar = []; k.agYuvalar = []; k.agAltinYuva = -1;
    for (const y of ic.yuvalar) {
      if (y.no === ALTIN_NO) { k.altin += y.adet; k.agAltinYuva = y.yuva; continue; }
      const t = esyaBulSunucu(y.no); if (t.simge) new Image().src = t.simge;
      k.esyalar.push(t.sayilabilir ? { ...t, adet: y.adet } : { ...t }); k.agYuvalar.push({ yuva: y.yuva, no: y.no });
    }
    k.altinYuvasi = k.altin > 0; k.icerikGeldi = true;
    if (!ic.dolu || k.bos) k.omur = 0;
  };
  const almaCevabiSunucudan = (a: AlmaCevabi) => {
    if (a.torbaNo === undefined) { const m = GANIMET_HATALARI[a.kod]; if (m) hud.mesaj(m, 'sistem'); return; } // 3/4: parti bildirimleri (parti sonraki adım)
    const k = kutuBul(a.torbaNo);
    if (a.altin !== undefined) oyuncu.altin = a.altin;
    if (a.no === ALTIN_NO) { hud.mesaj(`You obtained ${a.adet ?? ''} Noah.`.replace('  ', ' '), 'odul'); if (k) k.altin = 0; }
    else if (a.no !== undefined) {
      const t = esyaBulSunucu(a.no);
      if (a.cantaYuvasi !== undefined && a.cantaYuvasi >= 0) oyuncu.envanter[a.cantaYuvasi] = t.sayilabilir ? { ...t, adet: a.adet } : { ...t }; // sunucunun yuvası ve (yığınlıysa) toplam adedi
      hud.mesaj(`You obtained ${t.ad}.`, 'odul');
      if (k) { const i = k.agYuvalar.findIndex((y) => y.yuva === a.kutuYuvasi); if (i >= 0) { k.esyalar.splice(i, 1); k.agYuvalar.splice(i, 1); } }
    }
    envanterYenile();
    if (k) { if (k.bos) { k.omur = 0; hud.ganimetAc(null); } else hud.ganimetAc(k); }
  };
  hud.ganimetAl = (k, secim) => {
    if (k.agTorba) { sunucuGanimetAl(k, secim); return; } // sunucu modu: alma sunucuda yapılır, sonuç 0x26 ile gelir
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
      if (oyuncu.hedef && !oyuncu.hedef.olu) oyuncu.saldiriyor = true; // orijinalde yürürken de R ile saldırı açılır; yürüme sürer
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
  /** Açık mağaza: hangi NPC'nin hangi satış grubu (sunucu alım/satımı bunu ister). */
  let aktifMagaza: { npc: Npc; grup: number } | null = null;
  const magazaBekleyen: { tur: 'al' | 'sat'; e: EsyaTanimi; yuva: number }[] = [];
  /** Yerel NPC'nin sunucudaki kimliği: aynı K_NPC numarası ve en yakın konum (en çok 5 m). */
  const npcSunucuKimligi = (n: Npc): number => {
    let en = 0, mesafe = 5;
    for (const d of sunucuDunyasi?.dostNpclar.values() ?? []) { if (d.protoNo !== n.tanim.sid) continue; const u = Math.hypot(d.x - n.konum.x, d.z - n.konum.y); if (u < mesafe) { mesafe = u; en = d.id; } }
    return en;
  };
  /** Sunucu mağaza işlemi için ortak denetim: açık mağaza + sunucu kimliği + menzil. */
  const magazaHazir = (): { id: number; grup: number } | null => {
    if (!aktifMagaza) return null;
    const id = npcSunucuKimligi(aktifMagaza.npc);
    if (!id) { hud.mesaj('This merchant is not available on the server.', 'sistem'); return null; }
    if (oyuncu.konum.distanceTo(aktifMagaza.npc.konum) > MAGAZA_MENZILI - 0.5) { hud.mesaj('You are too far from the merchant.', 'sistem'); return null; }
    return { id, grup: aktifMagaza.grup };
  };
  const magazaSunucudan = (c: MagazaCevabi) => {
    const b = magazaBekleyen.shift();
    if (!c.basarili) { hud.mesaj(MAGAZA_HATALARI[c.hata ?? 1] ?? 'The transaction failed.', 'sistem'); return; }
    if (c.altin !== undefined) oyuncu.altin = c.altin;
    if (b?.tur === 'al') {
      const var_ = b.e.sayilabilir ? oyuncu.envanter[b.yuva] : null;
      if (var_) var_.adet = (var_.adet ?? 1) + (b.e.adet ?? 1); else oyuncu.envanter[b.yuva] = { ...b.e, sunucuNo: b.e.no };
      hud.mesaj(`You bought ${b.e.ad} for ${(c.fiyat ?? 0).toLocaleString('en-US')} Noah.`, 'odul');
    } else if (b?.tur === 'sat') {
      oyuncu.envanter[b.yuva] = null;
      hud.mesaj(`You sold ${b.e.ad} for ${(c.fiyat ?? 0).toLocaleString('en-US')} Noah.`, 'odul');
    }
    envanterYenile();
  };
  // ---- Banka (sunucu modu): açılış cevabı depoyu doldurur; yatır/çek işlemleri sunucu onayıyla uygulanır.
  let aktifBanka: { npc: Npc; id: number } | null = null;
  const bankaBekleyen: (() => void)[] = [];
  const bankaAcSunucu = (n: Npc) => {
    const id = npcSunucuKimligi(n);
    if (!id) { hud.mesaj('This bank is not available on the server.', 'sistem'); return; }
    if (oyuncu.konum.distanceTo(n.konum) > MAGAZA_MENZILI - 0.5) { hud.mesaj('You are too far from the bank.', 'sistem'); return; }
    aktifBanka = { npc: n, id }; bankaBekleyen.length = 0;
    sunucuOturumu?.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(id)); // sunucu bankayı hedeflenen NPC'ye göre açar
    sunucuOturumu?.gonder(WIZ.BANKA, bankaAcIstegi());
  };
  const bankaIslemSunucu = (i: Parameters<NonNullable<ConstructorParameters<typeof OyunArayuzu>[0]['bankaIslem']>>[0]): boolean => {
    if (!sunucuOturumu) return false;
    if (!aktifBanka) return true;
    const id = aktifBanka.id, o = oyuncu;
    if (i.tur === 'altin-yatir' || i.tur === 'altin-cek') {
      const miktar = i.tur === 'altin-yatir' ? o.altin : o.depoAltin; if (miktar <= 0) return true;
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(i.tur === 'altin-yatir' ? BANKA_ISLEMI.YATIR : BANKA_ISLEMI.CEK, id, BANKA_ALTIN, 0, 0, 0, miktar));
      bankaBekleyen.push(() => { if (i.tur === 'altin-yatir') { o.depoAltin += miktar; o.altin -= miktar; hud.mesaj(`${miktar.toLocaleString('en-US')} Noah deposited.`, 'sistem'); } else { o.altin += miktar; o.depoAltin -= miktar; hud.mesaj(`${miktar.toLocaleString('en-US')} Noah withdrawn.`, 'sistem'); } });
    } else if (i.tur === 'esya-yatir') {
      const e = o.envanter[i.canta]; if (!e) return true;
      const j = o.depo.indexOf(null); if (j < 0) { hud.mesaj('Your warehouse is full.', 'sistem'); return true; }
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.YATIR, id, e.sunucuNo ?? e.no, Math.floor(j / SAYFA_YUVASI), i.canta, j % SAYFA_YUVASI, e.adet ?? 1));
      bankaBekleyen.push(() => { o.depo[j] = e; o.envanter[i.canta] = null; });
    } else {
      const e = o.depo[i.banka]; if (!e) return true;
      const f = o.envanter.indexOf(null); if (f < 0) { hud.mesaj('Your inventory is full.', 'sistem'); return true; }
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.CEK, id, e.sunucuNo ?? e.no, Math.floor(i.banka / SAYFA_YUVASI), i.banka % SAYFA_YUVASI, f, e.adet ?? 1));
      bankaBekleyen.push(() => { o.envanter[f] = e; o.depo[i.banka] = null; });
    }
    return true;
  };
  const bankaSunucudan = (c: BankaCevabi) => {
    if (c.islem === BANKA_ISLEMI.AC) {
      if (!c.basarili || !c.yuvalar) { hud.mesaj('You cannot open the bank here.', 'sistem'); return; }
      oyuncu.depoAltin = c.altin ?? 0;
      oyuncu.depo = c.yuvalar.map((y) => (y ? (() => { const t = esyaBulSunucu(y.no); return t.sayilabilir ? { ...t, adet: y.adet } : { ...t }; })() : null));
      arayuz?.depoAc(); return;
    }
    const uygula = bankaBekleyen.shift();
    if (!c.basarili) { hud.mesaj('The bank transaction failed.', 'sistem'); bankaBekleyen.length = 0; return; }
    uygula?.(); envanterYenile();
  };
  const npcEtkilesim = (n: Npc) => {
    const sayfalar = n.tanim.satis > 0 ? magazaSayfalari(n.tanim.satis) : null;
    if (sayfalar && arayuz) { aktifMagaza = { npc: n, grup: n.tanim.satis }; arayuz.magazaAc(n.ad, sayfalar); return; }
    if (n.tanim.tur === 31 && n.tanim.sid !== 19999 && arayuz) { if (sunucuOturumu) { bankaAcSunucu(n); return; } arayuz.depoAc(); return; } // Inn Hostess = banka (Clan Bank ayrı, henüz yok)
    hud.mesaj(`${n.ad}: (conversation is not available yet)`, 'bilgi');
  };
  /** Mağazaya satış (sunucu NPCHandler.cpp): fiyat = alış fiyatı / 6 (varsayılan kural). */
  const magazaSat = (yuva: number) => {
    const e = oyuncu.envanter[yuva]; if (!e) return;
    if (sunucuOturumu) { // sunucu modu: fiyatı ve satışı sunucu belirler
      const h = magazaHazir(); if (!h) return;
      magazaBekleyen.push({ tur: 'sat', e, yuva });
      sunucuOturumu.gonder(WIZ.ESYA_ALIM_SATIM, satisIstegi(h.grup, h.id, [{ no: e.sunucuNo ?? e.no, yuva, adet: e.adet ?? 1 }]));
      return;
    }
    const fiyat = Math.floor(e.fiyat / 6) * (e.adet ?? 1); // yığının tamamı satılır
    if (fiyat <= 0) { hud.mesaj('This item cannot be sold.', 'sistem'); return; }
    oyuncu.envanter[yuva] = null; oyuncu.altin += fiyat;
    hud.mesaj(`You sold ${e.adet && e.adet > 1 ? `${e.adet} × ` : ''}${e.ad} for ${fiyat.toLocaleString('en-US')} Noah.`, 'odul');
  };
  /** Mağazadan satın alma: sunucu mantığı gibi Noah yetmiyorsa ya da çanta doluysa olmaz. */
  const magazaSatinAl = (e: EsyaTanimi) => {
    if (sunucuOturumu) { // sunucu modu: Noah, ağırlık ve yer kontrolü sunucuda
      const h = magazaHazir(); if (!h) return;
      const yuva = e.sayilabilir ? oyuncu.envanter.findIndex((x) => x && x.no === e.no) : -1;
      const hedef = yuva >= 0 ? yuva : oyuncu.envanter.indexOf(null);
      if (hedef < 0) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
      const k = magazaKonum(h.grup, e.no); if (!k) return;
      magazaBekleyen.push({ tur: 'al', e, yuva: hedef });
      sunucuOturumu.gonder(WIZ.ESYA_ALIM_SATIM, satinAlmaIstegi(h.grup, h.id, [{ no: e.no, yuva: hedef, adet: e.adet ?? 1, sayfa: k.sayfa, sira: k.sira }]));
      return;
    }
    if (oyuncu.altin < e.fiyat) { hud.mesaj('You do not have enough Noah.', 'sistem'); return; }
    if (!oyuncu.esyaEkle(e)) { hud.mesaj('Your inventory is full.', 'sistem'); return; }
    oyuncu.altin -= e.fiyat;
    hud.mesaj(`You bought ${e.ad} for ${e.fiyat.toLocaleString('en-US')} Noah.`, 'odul');
  };
  // Oyun imleci: tıklayınca ikinci resim, canavarın üstünde kılıç resmi (stil.css .imlec-*)
  addEventListener('pointerdown', (e) => { if (e.button === 2) document.body.classList.add('kamera-donuyor'); });
  addEventListener('pointerup', (e) => { if (e.button === 2) document.body.classList.remove('kamera-donuyor'); });
  addEventListener('blur', () => document.body.classList.remove('kamera-donuyor'));
  addEventListener('pointerdown', () => document.body.classList.add('imlec-basili'));
  addEventListener('pointerup', () => document.body.classList.remove('imlec-basili'));
  tuval.addEventListener('pointermove', (e) => {
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    document.body.classList.remove('imlec-saldir'); // canavarın üstünde kılıç imleci yok: saldırı tamamen oyuncunun kararı
  });
  tuval.addEventListener('pointerleave', () => document.body.classList.remove('imlec-saldir'));
  const sol = { basili: false, x: 0, y: 0 };
  let fareSolBasili = false;
  addEventListener('pointerdown', (e) => { if (e.button === 0) fareSolBasili = true; });
  addEventListener('pointerup', (e) => { if (e.button === 0) fareSolBasili = false; });
  /** Fare altındaki ganimet kutusu: kutunun kendisi YA DA kutuyu bırakan ölü canavar (gövdesi hâlâ görünüyorsa). */
  const tiklananGanimetKutusu = (): GanimetKutusu | null => {
    const kv = isin.intersectObjects(kutular.map((k) => k.secimKutusu))[0];
    if (kv) return kutular.find((x) => x.secimKutusu === kv.object) ?? null;
    const olu = canavarlar.filter((c) => c.olu && c.grup.visible && kutular.some((k) => k.sahip === c));
    const cv = isin.intersectObjects(olu.map((c) => c.secimKutusu))[0];
    if (!cv) return null;
    const c = olu.find((x) => x.secimKutusu === cv.object); return kutular.find((k) => k.sahip === c) ?? null;
  };
  const kutuyaGit = (k: GanimetKutusu) => { acilacakKutu = k; oyuncu.hedef = null; oyuncu.yuruHedef = k.konum.clone(); };
  // Sağ tık (sürüklemeden, kısa): kutuyu / ölü canavarı açar; sürüklenirse kamera döner, hiçbir şey açılmaz.
  const sag = { x: 0, y: 0, t: 0 };
  tuval.addEventListener('pointerdown', (e) => { if (e.button === 2) { sag.x = e.clientX; sag.y = e.clientY; sag.t = performance.now(); } });
  tuval.addEventListener('pointerup', (e) => {
    if (e.button !== 2 || oyuncu.olu || performance.now() - sag.t > 350 || Math.hypot(e.clientX - sag.x, e.clientY - sag.y) > 6) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const k = tiklananGanimetKutusu(); if (k) kutuyaGit(k);
  });
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
    const tiklananKutu = tiklananGanimetKutusu();
    if (tiklananKutu) { kutuyaGit(tiklananKutu); return; }
    const canavarVurus = isin.intersectObjects(canavarlar.filter((c) => !c.olu).map((c) => c.secimKutusu))[0];
    if (canavarVurus) {
      // Sol tık yalnızca hedef seçer: karakter saldırmaz, kovalamaz. Saldırı R tuşu veya skill ile elle başlatılır.
      const yeniHedef = canavarlar.find((c) => c.secimKutusu === canavarVurus.object) ?? null;
      if (yeniHedef !== oyuncu.hedef) { oyuncu.saldiriyor = false; hud.ganimetAc(null); }
      oyuncu.hedef = yeniHedef;
      // Kısa tık yalnız seçer (karakter dönmez/yürümez). Tuş 0,3 sn'den uzun basılı kalırsa imlece doğru yürüme başlar.
      const tikZamani = performance.now(); sol.x = e.clientX; sol.y = e.clientY;
      const bekle = setTimeout(() => { if (fareSolBasili && performance.now() - tikZamani >= 280) { sol.basili = true; } }, 300);
      addEventListener('pointerup', () => clearTimeout(bekle), { once: true });
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
  addEventListener('pointermove', (e) => { if (sol.basili && !(e.buttons & 2)) { sol.x = e.clientX; sol.y = e.clientY; } }); // sağ tuş basılıyken imleç konumu dondurulur (orijinalde imleç geri alınır)
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

  const vurusZamanlayici: { kalan: number; hedef: Canavar; beceri?: BeceriKurali; hedefEfekt?: number | null }[] = [];
  const oyuncuGuncelle = (dt: number) => {
    oyuncu.model?.guncelle(dt);
    oyuncu.savastanBeri += dt;
    oyuncu.animKilidi = Math.max(0, oyuncu.animKilidi - dt);
    ses.dinleyici.copy(oyuncu.konum);
    // Elde taşınan silah/kalkan modeli (ekipman değişince yenilenir)
    oyuncu.grup.visible = !oyuncu.blinkli || Math.floor(simdiSn() * 6) % 2 === 0; // göz kırpma: titreşir
    oyuncu.model?.giyimAyarla(oyuncu.ekipman);
    oyuncu.model?.silahAyarla(oyuncu.ekipman[6]?.tip ?? 0);
    if (oyuncu.model) oyuncu.model.hareketCarpani = oyuncu.hizCarpani;
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
    if (!sunucuOturumu) { // sunucu modunda can/mana sunucudan gelir (0x17, 0x18)
    oyuncu.can = Math.min(oyuncu.enCok, oyuncu.can + yenilenme * dt + (oturuyor ? oyuncu.enCok * OTURMA_CAN_ORANI * dt : 0));
    oyuncu.mana = Math.min(oyuncu.enCokMana, oyuncu.mana + 3 * dt + (oturuyor ? oyuncu.enCokMana * OTURMA_MANA_ORANI * dt : 0));
    }

    // Klavye (Knight Online gibi): A/D karakteri döndürür (basılı kaldıkça 360° sürekli), W karakterin baktığı yöne ilerler, S geri gider.
    // Kamera karakterle birlikte döner ve ilerlerken yavaşça karakterin arkasına geçer.
    let ikiTus = false;
    if (sol.basili && !oyuncu.olu) {
      isin.setFromCamera(new THREE.Vector2((sol.x / innerWidth) * 2 - 1, -(sol.y / innerHeight) * 2 + 1), kamera.kamera);
      const z = isin.intersectObject(arazi.mesh)[0];
      if (kamera.suruklenirken) { // sol + sağ tuş birlikte: karakter baktığı yönde düz ilerler (yön kameradan değil, kullanıcıdan gelir: A/D ile çevrilir)
        oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null; ikiTus = true;
      } else if (z) { oyuncu.yuruHedef = new THREE.Vector2(z.point.x, -z.point.z); acilacakKutu = null; acilacakNpc = null; } // seçili canavar/otomatik saldırı korunur (yürürken Z/R/skill kullanılabilir)
    }
    const donusHam = (tuslar.has('KeyA') ? 1 : 0) - (tuslar.has('KeyD') ? 1 : 0);
    // Sol + sağ tuş birlikteyken karakter kamerayla BİRLİKTE döner (WoW gibi): A/D kamerayı çevirir, karakter her kare kameranın baktığı yöne bakar.
    if (ikiTus && donusHam !== 0) kamera.aciEkle(donusHam * DIREKSIYON_HIZI * dt);
    const donus = ikiTus ? 0 : donusHam;
    // Orijinal: Home/End basılıyken kamera eğimi saniyede 45° değişir (Home = aşağı bakış)
    const egimTus = (tuslar.has('Home') ? 1 : 0) - (tuslar.has('End') ? 1 : 0);
    if (egimTus !== 0) kamera.egimKaydir(egimTus * 45 * dt);
    if (otoIleri && (tuslar.has('KeyW') || tuslar.has('KeyS') || oyuncu.yuruHedef || oyuncu.olu || oyuncu.model?.oturuyor)) otoIleri = false;
    const tusYonu = (tuslar.has('KeyW') ? 1 : 0) - (tuslar.has('KeyS') ? 1 : 0); // W ileri, S geri (eskiden Math.max(0, …) geri yönü siliyordu)
    const ilerigeri = ikiTus || otoIleri ? Math.max(1, tusYonu) : tusYonu;
    if (oyuncu.hedef?.olu) oyuncu.hedef = null;
    if (!oyuncu.hedef) oyuncu.saldiriyor = false;
    oyuncu.saldiriSayaci = Math.max(0, oyuncu.saldiriSayaci - dt); // (eskiden yalnızca saldırı dalında düşüyordu: hedef ölünce saldırı duruşunda takılıyordu)
    oyuncu.yuruAcisi = null;
    // Oturuyorken yeni bir hareket/saldırı isteği gelirse ayağa kalkılır
    if (oyuncu.model?.oturuyor && (donus !== 0 || ilerigeri !== 0 || oyuncu.hedef || oyuncu.yuruHedef)) kalk();
    // Yürümeye başlayınca ya da başka canavara geçilince açık ganimet kutusu kapanır
    if (hud.kutuAcik && (donus !== 0 || ilerigeri !== 0 || (oyuncu.yuruHedef && !acilacakKutu))) hud.ganimetAc(null);
    if (donus !== 0) {
      const dh = donus * DIREKSIYON_HIZI * dt;
      const h = oyuncu.bakisAcisi + dh;
      oyuncu.bak(new THREE.Vector2(oyuncu.konum.x + Math.cos(h), oyuncu.konum.y + Math.sin(h)));
    }

    // Sol + sağ tuş: kameranın o karedeki dönüşü kadar karakter de döner (aynı yönde ve aynı derecede, yumuşak). Başlangıçta yön sıçraması olmaz:
    // karakter mevcut yönünde kalır, yalnızca kameranın değişimi eklenir. (Kamera açısı artınca karakter yönü de aynı miktarda artar.)
    const dAci = Math.atan2(Math.sin(kamera.aci - oncekiKameraAci), Math.cos(kamera.aci - oncekiKameraAci));
    oncekiKameraAci = kamera.aci;
    // Sol + sağ tuş birlikte: karakter kameranın dönüşüyle AYNI anda ve aynı derecede döner. Yalnız sağ tuşla bakarken (duruyorsan) karakter SABİT kalır, yalnız kamera döner.
    if (ikiTus && dAci !== 0) {
      const h = oyuncu.bakisAcisi + dAci;
      oyuncu.bak(new THREE.Vector2(oyuncu.konum.x + Math.cos(h), oyuncu.konum.y + Math.sin(h))); oyuncu.yon = oyuncu.hedefYon;
    }
    /** Hedef menzildeyse ve silah aralığı dolduysa vurur. Yürürken de vurulur (orijinal: IsAttackableTarget); yürürken saldırı animasyonu oynatılmaz. */
    const saldirTik = (h: Canavar, hareketli: boolean) => {
      // Orijinal (PlayerMySelf::Tick): skill adımı sürerken (m_iSkillStep > 0) sürekli saldırı bekler, adım bitince kendiliğinden devam eder.
      if (oyuncu.saldiriSayaci > 0 || oyuncu.animKilidi > 0) return;
      oyuncu.blinkBitis = 0; // saldırınca göz kırpma biter
      oyuncu.saldiriSayaci = vurusAraligi(oyuncu.silah); // silahın gecikmesi (eşya tablosu)
      oyuncu.savastanBeri = 0;
      let animSure = 0;
      if (!hareketli) animSure = oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08) ?? 0;
      else oyuncu.model?.ustSaldiri(); // orijinal: hareket ederken saldırı ANI_ATTACK_WITH_WEAPON_WHEN_MOVE (yalnız üst gövde)
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
      // Orijinal: darbe, silahın hareket izi hedefe değdiği anda (saldırı animasyonunun ortalarında) işler; sabit 0,45 sn yerine klibin ≈%55'i.
      vurusZamanlayici.push({ kalan: animSure > 0 ? Math.max(0.2, Math.min(0.8, animSure * 0.55)) : 0.45, hedef: h });
    };
    const menzilde = !!oyuncu.hedef && oyuncu.saldiriyor && oyuncu.konum.distanceTo(oyuncu.hedef.konum) <= menzilDe(oyuncu.hedef);
    hareketEdiyor = ilerigeri !== 0 || !!oyuncu.yuruHedef;
    if (ilerigeri !== 0) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      const h = oyuncu.bakisAcisi;
      const yon = new THREE.Vector2(Math.cos(h), Math.sin(h));
      if (ilerigeri > 0) oyuncu.ilerle(yon, hizAl() * dt); else oyuncu.geriGit(yon.multiplyScalar(-1), YURUME_HIZI * oyuncu.hizCarpani * dt);
      oyuncu.model?.oynat(ilerigeri < 0 && oyuncu.model.var('geri') ? 'geri' : hareketAnimi()); // S: geri yürüme animasyonu
      if (menzilde && oyuncu.hedef) saldirTik(oyuncu.hedef, true);
    } else if (donus !== 0 && !oyuncu.hedef) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      oyuncu.model?.oynat('bekle');
    } else if (oyuncu.yuruHedef) {
      if (oyuncu.yuru(oyuncu.yuruHedef, hizAl() * dt, acilacakKutu ? 1.5 : acilacakNpc ? 2.5 : 0)) {
        oyuncu.yuruHedef = null;
        if (acilacakKutu && kutular.includes(acilacakKutu)) hud.ganimetAc(acilacakKutu);
        acilacakKutu = null;
        if (acilacakNpc) { const n = acilacakNpc; acilacakNpc = null; npcEtkilesim(n); }
        oyuncu.model?.oynat('bekle');
      } else { oyuncu.model?.oynat(hareketAnimi()); if (menzilde && oyuncu.hedef) saldirTik(oyuncu.hedef, true); }
    } else if (oyuncu.hedef && oyuncu.saldiriyor) {
      const h = oyuncu.hedef;
      if (oyuncu.konum.distanceTo(h.konum) > menzilDe(h)) { // menzil dışı: hedefe yürü (hareket eden canavarı da izler)
        oyuncu.yuru(h.konum, hizAl() * dt, menzilDe(h) - 0.3);
        oyuncu.model?.oynat(hareketAnimi());
        hareketEdiyor = true;
      } else {
        oyuncu.bak(h.konum);
        saldirTik(h, false);
        if (oyuncu.saldiriSayaci > 0 && oyuncu.saldiriSayaci < 0.4 && oyuncu.animKilidi <= 0) oyuncu.model?.oynat('bekle'); // vuruşlar arasında silahlı bekleme duruşu
      }
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
  let hareketEdiyor = false; // bu karede yürünüyor mu (skill animasyonu yürümeyi bölmesin)
  let oncekiKameraAci = kamera.aci;

  const canavarlariGuncelle = (dt: number) => {
    for (let i = vurusZamanlayici.length - 1; i >= 0; i--) {
      const v = vurusZamanlayici[i];
      v.kalan -= dt;
      if (v.kalan > 0) continue;
      vurusZamanlayici.splice(i, 1);
      if (v.hedef.olu || oyuncu.olu) continue;
      if (v.hedefEfekt) void efektler.oynat(v.hedefEfekt, v.hedef.grup, { sure: 0.15, azamiSure: 0.25 }); // vuruş efekti hedefte
      if (v.hedef.agModu) { // sunucu canavarı: isabeti ve hasarı sunucu belirler, biz yalnızca saldırı isteriz
        if (sunucuOturumu && !v.beceri) { sunucuOturumu.gonder(WIZ.SALDIRI, saldiriIstegi(v.hedef.agKimlik, (oyuncu.silah?.gecikme ?? 100) + 10, 10)); sunucuOturumu.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(v.hedef.agKimlik)); } // vuruştan hemen sonra hedefin canı istenir: can çubuğu güncellensin
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
      if (vurus && vurus.hasar <= 0) { hud.mesaj(`${c.tur.ad} attacks but misses.`, 'bilgi'); } // karşılık verme yok: saldırıyı oyuncu kendisi seçer
      if (vurus && vurus.hasar > 0) {
        const net = oyuncu.hasarAl(vurus.hasar);
        ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
        kalk(); // hasar alınca ayağa kalkılır
        hud.mesaj(`${c.tur.ad} hits you for ${net} damage.`, 'hasar');
        if (oyuncu.olu) {
          hud.mesaj(`You were slain by ${c.tur.ad}.`, 'hasar'); oyuncu.hedef = null;
          if (ayar.deneyimKaybi && oyuncu.seviye >= 6) { const kayip = Math.floor(gerekenDeneyim(oyuncu.seviye) / 20); deneyimKaybet(kayip); hud.mesaj(`You lost ${kayip.toLocaleString('en-US')} experience.`, 'hasar'); }
        }
        // canavar vurunca otomatik saldırı başlamaz (kullanıcı isteği)
      }
      if (c.olu) {
        if (!c.agModu && !c.ganimetBirakildi && c.oluSuresi > 0.3) { // sunucu canavarının ganimeti sunucudan gelir (sonraki adım)
          c.ganimetBirakildi = true;
          const g = ganimetUret(c.tur);
          for (const e of g.esyalar) if (e.simge) new Image().src = e.simge; // simgeler kutu açılmadan önce yüklensin (açılınca anında görünsün)
          const [kx, kz] = kutuYani(c.konum.x, c.konum.y, c.tur.sid + Math.floor(c.konum.x * 7), c.secimYaricapi);
          const k = new GanimetKutusu(kx, kz, g.altin, g.esyalar); k.sahip = c;
          kutular.push(k); sahne.add(k.grup);
        }
        if (c.oluSuresi > 5) c.grup.visible = false;
        if (!c.agModu && c.oluSuresi > c.dogusSure) c.yenidenDog(); // sunucu RegTime (sunucu canavarı yeniden doğunca sunucu bildirir)
      }
      c.sahneyeYerlestir(arazi);
    }
    canavarlariAyir(dt);
    for (let i = kutular.length - 1; i >= 0; i--) {
      const k = kutular[i];
      k.guncelle(dt, arazi);
      if (k.omur <= 0) { sahne.remove(k.grup); kutular.splice(i, 1); }
    }
  };

  const npcleriGuncelle = (dt: number) => { for (const n of npcler) { n.model?.guncelle(dt); n.sahneyeYerlestir(arazi); } };

  /**
   * Canavarlar birbirinin içine girmesin: yakın çiftler yumuşakça ayrılır (yalnız görüntü konumu; sunucu kuralları değişmez).
   * Çarpışma yarıçapı modelin gövde boyutundan (secimYaricapi × 0,7, en az 0,5 m); kare başına itme hızı sınırlıdır, titreme olmasın.
   */
  const canavarlariAyir = (dt: number) => {
    const canli = canavarlar.filter((c) => !c.olu && c.grup.visible);
    for (let i = 0; i < canli.length; i++) for (let j = i + 1; j < canli.length; j++) {
      const a = canli[i], b = canli[j];
      const dx = b.konum.x - a.konum.x, dy = b.konum.y - a.konum.y;
      const r = Math.max(0.5, a.secimYaricapi * 0.7) + Math.max(0.5, b.secimYaricapi * 0.7);
      if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
      const d = Math.hypot(dx, dy); if (d >= r) continue;
      const nx = d > 0.001 ? dx / d : Math.cos(i * 2.4), ny = d > 0.001 ? dy / d : Math.sin(i * 2.4);
      const it = Math.min((r - d) / 2, 2.5 * dt); // her biri yarım örtüşme kadar, saniyede en çok 2,5 m
      a.konum.x -= nx * it; a.konum.y -= ny * it; b.konum.x += nx * it; b.konum.y += ny * it;
    }
  };
  const izdusum = (c: Canavar | Npc | Oyuncu | DigerOyuncu) => {
    const p = c.grup.position.clone(); p.y += c instanceof Npc ? 2.1 * (c.tanim.boyut / 100) : c instanceof Oyuncu || c instanceof DigerOyuncu ? 2.1 : Math.max(c.boy, c.etiketY) + 0.1; // canavar adı isabet alanının hemen üstünde
    kamera.kamera.updateMatrixWorld(); // bu karenin kamera konumuna göre (önceki kareye göre kayma/gecikme olmasın)
    const ekran = p.project(kamera.kamera);
    return { x: (ekran.x * 0.5 + 0.5) * innerWidth, y: (-ekran.y * 0.5 + 0.5) * innerHeight, gorunur: ekran.z < 1 && c.konum.distanceTo(oyuncu.konum) < (c instanceof Npc ? 60 : 45) };
  };

  const saat = new THREE.Clock();
  document.getElementById('yukleniyor')?.remove();
  cizici.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.1);
    oyuncuGuncelle(dt);
    // Orijinal (PACKET_INTERVAL_REQUEST_TARGET_HP = 2 sn): seçili sunucu canavarının canı 2 sn'de bir yeniden istenir.
    if (sunucuOturumu && oyuncu.hedef?.agModu && simdiSn() - sonCanIstegi > 2) { sonCanIstegi = simdiSn(); sunucuOturumu.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(oyuncu.hedef.agKimlik)); }
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
    efektler.guncelle(dt);
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
    /** Geliştirme: karakteri (x, z)'ye ışınlar ve sunucuya "durağan" konum paketiyle bildirir (Town ile aynı yöntem). */
    sunucuIsinla: (x: number, z: number) => { oyuncu.isinla(x, z, arazi); if (sunucuOturumu) { const p = (v: number) => Math.round(v * 10); const y = p(arazi.yukseklikAl(x, z)); sunucuOturumu.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(y).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(y).baytlar()); } },
    efektSayisi: () => efektTanecikleri.length, beceriKullan: (no: number) => beceriKullan(no),
    /**
     * Sunucu modu (Aşama 4, deneysel): köprü + Myko sunucusu çalışırken konsoldan `await ke.sunucuyaBaglan(hesap, sifre)`.
     * Giriş sunucusundan geçip karakteri seçer, oyuna girer ve gelen karakter verisini (seviye, statlar, can/mana, altın, eşyalar, konum) oyuncuya uygular.
     */
    sunucuyaBaglan: async (hesap: string, sifre: string, kopru?: string, karakter?: string, secici?: Parameters<typeof sunucuyaBaglan>[4]) => {
      await tumEsyalariYukle(); // sunucu her eşyayı verebilir: tüm eşya tablosu
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
      benimSoketNo = s.benim.soketNo;
      sunucuDunyasi = new SunucuDunyasi(sahne, canavarlar, digerOyuncular, hud, s.benim.soketNo, oyuncu, {
        canavarSaldirdi: (c) => ses.modelSesi(c.tur.model, 'saldir', c.konum),
        canavarVuruldu: (c) => ses.modelSesi(c.tur.model, 'darbe', c.konum),
        oyuncuVuruldu: () => {
          kalk(); ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
          if (oyuncu.olu) { oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.model?.oynatRastgele('olum', 3, false, 0.1); } else oyuncu.model?.darbeOynat(true);
        },
        seviyeAtlandi: () => envanterYenile(),
        beceri: (p) => beceriSunucudan(p),
        ganimetDustu: ganimetDustuSunucudan, tasimaCevabi: tasimaCevabiSunucudan, esyaSilindi: silmeSunucudan, magaza: magazaSunucudan, banka: bankaSunucudan, sohbet: sohbetSunucudan, ozelHedef: ozelHedefSunucudan, kutuIcerigi: kutuIcerigiSunucudan, almaCevabi: almaCevabiSunucudan,
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
    baglan: async (hesap, sifre, sec) => { await ke.sunucuyaBaglan(hesap, sifre, undefined, undefined, async (yuvalar, araclar) => sec(yuvalar.map((y) => ({ ad: y.ad, seviye: y.seviye, sinif: y.sinif })), araclar)); },
    cevrimdisi: () => {},
  });
  await ekran.ac();
}

basla().then(girisEkraniAc).catch((e) => { durum('Error: ' + (e as Error).message); console.error(e); });
