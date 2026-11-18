// KnightEmpire — tarayıcı istemcisi giriş noktası (tek oyunculu mod).
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle, nesneAnimasyonunuIlerlet, type DokuAnimasyonu } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';
import { animBilgisiYukle, silahBilgisiYukle } from './dunya/karakter';
import { Hud } from './arayuz/hud';
import { OyunArayuzu } from './arayuz/oyunArayuzu';
import { Canavar, DigerOyuncu, GanimetKutusu, Npc, type NpcTanimi, type YuvaKonumu, Oyuncu, Varlik, acıyaYaklas } from './oyun/varliklar';
import { BOLGE_HARITASI, HARITALAR, VARSAYILAN_AYAR } from './oyun/haritalar';
import { BOLGE_DEGISIMI, bolgeDegisimiIstegi, bolgeIsinlanmasi, kapiSecimiIstegi, nesneOlayiIstegi } from '../../kopru/protokol/isinlanma.ts';
import { type BeceriKurali, canavarTurleri, kurallar, OYUNCU_MODELI, IRK_MODELLERI, modeldenIrk, giyimEkipmani, elSilahiTipi, solSilahTipi, OK_NO, YAY_TURLERI, OYUNCU_SES_MODELI, irkModeli, kurallariYukle, tumEsyalariYukle, esyaBulSunucu, esyalariYukle, ganimetUret, ganimetYukle, gerekenDeneyim, magazaSayfalari, magazaKonum, magazaYukle, rastgele, type EsyaTanimi } from './oyun/veri';
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
import { liderDevretIstegi, partiDavetCevabi, partiDavetiIstegi, partidenCikarIstegi, partiyiDagitIstegi, type PartiUyesi } from '../../kopru/protokol/parti.ts';
import { ALTIN_NO as BANKA_ALTIN, BANKA_ISLEMI, SAYFA_YUVASI, bankaAcIstegi, bankaIslemIstegi, type BankaCevabi } from '../../kopru/protokol/banka.ts';
import { oturmaIstegi, statArtirmaIstegi } from '../../kopru/protokol/karakter.ts';
import { MAGAZA_HATALARI, MAGAZA_MENZILI, satinAlmaIstegi, satisIstegi, type MagazaCevabi } from '../../kopru/protokol/magaza.ts';
import { SOHBET_TURU, ozelHedefIstegi, sohbetIstegi, type SohbetPaketi } from '../../kopru/protokol/sohbet.ts';
import { skillPuaniIstegi } from '../../kopru/protokol/skillPuani.ts';
import { OldurmeSayaci } from './arayuz/oldurmeSayaci';
import { gorevSecimiIstegi, type GorevPaketi } from '../../kopru/protokol/gorev.ts';
import { diyalogVerisi, uygunGorevler } from './oyun/diyalogVeri';
import { npcOlayiIstegi, secimCevabi, type SecimMesaji } from '../../kopru/protokol/diyalog.ts';
import { ESYA_YONU, esyaSilmeCevabi, esyaSilmeIstegi, esyaTamirIstegi, esyaTasimaIstegi, type TasimaCevabi } from '../../kopru/protokol/envanter.ts';
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
  hud.oyuncuOzeti = () => ({ altin: oyuncu.altin, seviye: oyuncu.seviye, sinif: oyuncu.sinif, irk: oyuncu.modelNo ? modeldenIrk(oyuncu.modelNo) : 12, stat: oyuncu.stat });
  const ses = new Ses();
  await ses.yukle();
  if (ayar.bolge) ses.muzikCal(ayar.bolge);
  const oyuncu = new Oyuncu();
  let sunucuOturumu: SunucuOturumu | null = null;
  let sunucuDunyasi: SunucuDunyasi | null = null;
  let pvpSaldiriyor = false; // R ile seçili oyuncuya sürekli temel saldırı
  let pvpSonCanSn = 0;
  let secilenOyuncu: DigerOyuncu | null = null; // tıklanarak seçilen diğer oyuncu (parti daveti için)
  let partidayiz = false; // davet gönderdiysek parti kurulmuştur (sonraki davetler PARTY_INSERT)
  /** Parti üyeleri, sunucunun gönderdiği sırayla (ilk üye = lider). */
  let partiUyeleri: PartiUyesi[] = [];
  /** Son skill attığımız düşman oyuncu: o oyuncu birkaç sn içinde ölürse öldürme sayılır (Moradon PK bölgesi olmadığı için sunucu KILLASSIST yollamaz). */
  let sonPvpHedefi: { id: number; t: number } | null = null; let pvpSeri = 0, pvpSonOldurme = -999;
  const partiTemizle = () => { partiUyeleri = []; partidayiz = false; };
  /** Parti listesi: lider kendini sunucudan almaz (sunucu yalnızca katılanları bildirir); bu yüzden kendimiz listeye başa eklenir. */
  const partiListesi = (): PartiUyesi[] => (partiUyeleri.length && !partiUyeleri.some((u) => u.id === benimSoketNo) ? [{ id: benimSoketNo, ad: oyuncu.ad, enCokCan: oyuncu.enCok, can: Math.ceil(oyuncu.can), seviye: oyuncu.seviye, sinif: oyuncu.sinif, enCokMana: oyuncu.enCokMana, mana: Math.ceil(oyuncu.mana), ulus: Math.floor(oyuncu.sinif / 100) }, ...partiUyeleri] : partiUyeleri);
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
  void tumEsyalariYukle(); // tüm eşya tablosu: zırh görünüm kaynakları için
  await oyuncu.modelYukle(Number(parametre.get('model')) || IRK_MODELLERI[12]); // çıplak El Morad erkek + eşyaya göre giyinme
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

  // Işınlanma kapıları: sunucu haritasındaki WARP_GATE (tür 5) nesneleri; sağ tıkla kullanılır (yanına gider, kapı listesi açılır).
  const kapilar: { indeks: number; sahip: number; konum: THREE.Vector2; kutu: THREE.Mesh }[] = [];
  try {
    const sj = await (await fetch(`/harita/${HARITA}/sunucu.json`)).json() as { nesneOlaylari: { sahip: number; indeks: number; tur: number; durum: number; x: number; y: number; z: number }[] };
    for (const n of sj.nesneOlaylari) {
      if (n.tur !== 5 || n.durum !== 1) continue;
      const kutu = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6, 10), new THREE.MeshBasicMaterial({ visible: false }));
      kutu.position.set(n.x, Math.max(n.y, arazi.yukseklikAl(n.x, -n.z)) + 3, -n.z); sahne.add(kutu);
      kapilar.push({ indeks: n.indeks, sahip: n.sahip, konum: new THREE.Vector2(n.x, n.z), kutu });
    }
  } catch { /* bu haritada kapı verisi yok */ }

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
    if (otur && hareketEdiyor) return; // koşarken/yürürken C (oturma) devre dışı (kullanıcı isteği)
    if (otur && oyuncu.savastanBeri < OTURMA_SAVAS_BEKLEME) { hud.mesaj('You cannot sit down during combat.', 'sistem'); return; }
    if (otur) { oyuncu.hedef = null; oyuncu.yuruHedef = null; acilacakKutu = null; oyuncu.yuruAcisi = null; oyuncu.model.oynat('bekle'); }
    oyuncu.model.oturPozu(otur);
    sunucuOturumu?.gonder(WIZ.DURUM_DEGISTI, oturmaIstegi(otur)); // sunucu oturma sırasında yenilenmeyi hızlandırır
    hud.mesaj(otur ? 'You sit down. Health and mana recover quickly.' : 'You stand up.', 'sistem');
  };
  const kalk = () => { if (oyuncu.model?.oturuyor) { oyuncu.model.oturPozu(false); sunucuOturumu?.gonder(WIZ.DURUM_DEGISTI, oturmaIstegi(false)); } }; // sunucuya da bildirilir (yenilenme hızı oturma durumuna bağlı)
  const yuruKosDegistir = () => { kosuyor = !kosuyor; hud.mesaj(kosuyor ? 'You are running.' : 'You are walking.', 'sistem'); };
  /** GM hızlanması: yetkisi GM olan karakter Shift'e basılı tutunca bu kat hızlanır. */
  const GM_SHIFT_HIZI = 5, GM_SHIFT2_HIZI = 7; // Shift: 5 kat; Shift + 2: 7 kat
  const gmCarpan = () => { if (!oyuncu.gm || !(tuslar.has('ShiftLeft') || tuslar.has('ShiftRight'))) return 1; return tuslar.has('Digit2') || tuslar.has('Numpad2') ? GM_SHIFT2_HIZI : GM_SHIFT_HIZI; };
  const hizAl = () => (kosuyor ? OYUNCU_HIZI : YURUME_HIZI) * oyuncu.hizCarpani * gmCarpan(); // hız buff'ı (Sprint) dahil
  const hareketAnimi = () => (kosuyor ? 'kos' : 'yuru');

  const simdiSn = () => performance.now() / 1000;
  /** Skill kullanımı (sunucu MagicInstance): seviye, MP, tekrar kullanım süresi; Type1 hedef ister, Type4 buff kendine uygulanır. */
  let benimSoketNo = 0;
  /** Skill efekt numaraları (Sprint'te altın toplanma yok: kullanıcı kararı). */
  /** Sprint (tüm sınıf ve terfi sayfalarında xx2002, hız buff'ı): altın toplanma efekti (Ability_cast 2701) yok, yalnız rüzgâr izi (kullanıcı kararı). */
  /** Skill adı (sunucu tablosunda boş ya da küçük harfliyse client tablosundaki ad), baş harfi büyük. */
  const buyuAdi = (v: { ad: string }, no: number) => { const s = (arayuz?.beceriAdi(no) || v.ad || 'The skill').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const sprintMi = (no: number) => no % 1000 === 2 && kurallar?.beceri[String(no)]?.tip4?.turu === 6;
  /**
   * Skill animasyonu. Oyuncu iskeletinde yakın dövüş skill animasyonları silah ailesine göre ayrılır (112–135: axe, dagger, dual, blunt, polearm, spear, sword, twoH_axe, twoH_sword; çift numara A, tek numara B).
   * Hoodwink ve Leg cutting (Warrior 1. ağaç) animasyonu elindeki silaha uyar: tablodaki kılıç animasyonu (131 sword02_B) yerine silahın kendi ailesinin B animasyonu oynar. Leg cutting, Hoodwink ile aynı animasyonu kullanır.
   */
  const SILAH_AILESI_ANIM: Record<number, number> = { 11: 116, 21: 128, 31: 112, 41: 120, 51: 126, 22: 134, 32: 132, 42: 122, 52: 124 }; // silah türü (tip) → ailenin A animasyonu
  const animSec = (no: number): number | undefined => {
    const tabloAnim = arayuz?.beceriAnimNo(no);
    const agacBir = [1055, 1065, 2055, 2065].includes(Math.floor(no / 100)) && (no % 100 === 5 || no % 100 === 20); // Hoodwink, Leg cutting
    if (!agacBir) return tabloAnim;
    const aile = SILAH_AILESI_ANIM[oyuncu.silah?.tip ?? 0];
    return aile !== undefined ? aile + 1 : 131; // B animasyonu; silah tanınmazsa Hoodwink'in tablodaki animasyonu
  };
  /** Yakın dövüş skill animasyonu: çok vuruşlu skill'lerde orijinaldeki gibi iAct[0..2] art arda oynar (eskiden yalnız ilki oynuyordu). Toplam süreyi döndürür. */
  const beceriAnimiOynat = (no: number, animNo: number | undefined): number => {
    const kombo = arayuz?.beceriKombo(no);
    if (!kombo || kombo.length < 2 || animNo !== arayuz?.beceriAnimNo(no)) return oyuncu.model?.beceriOynat(animNo) || 0.8; // silaha göre değişen (Hoodwink…) ya da tek vuruş
    let toplam = oyuncu.model?.beceriOynat(kombo[0]) || 0.8;
    for (let i = 1; i < kombo.length; i++) {
      const an = kombo[i], baslangic = toplam;
      setTimeout(() => { if (!oyuncu.olu && oyuncu.model) oyuncu.model.beceriOynat(an); }, baslangic * 1000);
      toplam += oyuncu.model?.numaraSure(an) || 0.8;
    }
    return toplam;
  };
  const efektNo = (no: number) => ({ ...arayuz?.beceriEfekt(no) ?? { kendi: null, hedef: null, ucan: null }, ...(sprintMi(no) ? { kendi: null } : {}) });
  /** Sunucu modunda skill: isteği yollar; MP/hasar/buff sonucunu sunucu bildirir (0x18, 0x22, 0x31). Burada yalnız animasyon, ses ve istek vardır. */
  /** Süreli büyü (hazırlık > 0): hazırlanırken hedef/skill; yürümek iptal eder. */
  let buyuHazirlik: { no: number; hedefId: number } | null = null;
  /** Uçan efektler (kaynaktan hedefe giden küre): kaynak noktası, varış noktası, geçen süre. */
  const ucanEfektler: { nesne: THREE.Object3D; bas: THREE.Vector3; bit: THREE.Vector3; t: number; sure: number }[] = [];
  const ucanEfektOynat = (efektNoUcan: number | null, kaynak: THREE.Object3D | null, hedef: THREE.Object3D | null) => {
    if (!efektNoUcan || !kaynak || !hedef) return;
    const nesne = new THREE.Object3D(); const bas = kaynak.position.clone().add(new THREE.Vector3(0, 1.3, 0)), bit = hedef.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    nesne.position.copy(bas); sahne.add(nesne); void efektler.oynat(efektNoUcan, nesne, { sure: 0.7 });
    ucanEfektler.push({ nesne, bas, bit, t: 0, sure: Math.max(0.25, Math.min(0.7, bas.distanceTo(bit) / 28)) });
  };
  /** Sunucu modunda skill: isteği yollar; MP/hasar/buff sonucunu sunucu bildirir (0x18, 0x22, 0x31). Hazırlık süresi olan büyülerde sıra 1 (hazırla) → bekle → 2 (uçuş) → 3 (etki). */
  const sunucuBecerisi = (no: number, v: NonNullable<typeof kurallar>['beceri'][string], hedef: Canavar | null, dost: DigerOyuncu | null, merkezNokta?: THREE.Vector2) => {
    // Alan skill'leri (moral ≥ 10: düşman alanı, kendi çevresi…): sunucu hedef kimliğini −1 ister; etki merkezi sData[0], sData[2] konumundadır (hedef varsa hedefin, yoksa kendi konumu)
    const alan = (v.moral ?? 0) >= 10;
    const merkez = hedef ?? oyuncu, alanVeri = alan ? (merkezNokta ? [Math.round(merkezNokta.x), Math.round(arazi.yukseklikAl(merkezNokta.x, merkezNokta.y)), Math.round(merkezNokta.y)] : [Math.round(merkez.konum.x), Math.round(merkez.grup.position.y), Math.round(merkez.konum.y)]) : [];
    const hedefId = alan ? 0xffff : hedef ? hedef.agKimlik : dost ? dost.kimlik : benimSoketNo;
    const hedefGrup = hedef ? hedef.grup : dost ? dost.grup : oyuncu.grup;
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // aynı skill'in art arda gönderilmemesi için yerel bekleme (sunucu da kontrol eder)
    const gonder = (komut: number) => sunucuOturumu?.gonder(WIZ.BECERI, beceriIstegi(komut, no, benimSoketNo, hedefId, alanVeri));
    const animNo = animSec(no);
    const asil = hedef ?? dost; // canavar ya da (düşman/dost) oyuncu: yön, okçuluk ve uçan efekt için ortak
    if (dost && (v.moral ?? 0) === 7) sonPvpHedefi = { id: dost.kimlik, t: simdiSn() }; // düşman oyuncuya skill: öldürürsek sayaç artar
    if (asil) { if (hedef) oyuncu.savastanBeri = 0; if (!hareketEdiyor) oyuncu.bak(asil.konum); }
    const sure = (v.hazirlik ?? 0) * 0.1;
    if (v.tip === 2 && asil) { // okçuluk: 1 hazırla (yay gerilir) → ≈1,05 sn sonra 2 uçuş (ok harcanır, hasar işlenir) → ok hedefe varınca 3 etki. Sunucu uçuşu 0,31–1,25 sn arasında kabul eder.
      buyuHazirlik = { no, hedefId };
      const veri = () => [Math.round(asil.konum.x), Math.round(asil.grup.position.y), Math.round(asil.konum.y), 1];
      gonder(BECERI_KOMUTU.HAZIRLAMA);
      if (!hareketEdiyor) { oyuncu.animKilidi = 1.4; oyuncu.model?.beceriOynat(animNo ?? 26, true); }
      setTimeout(() => {
        if (buyuHazirlik?.no !== no || oyuncu.olu) return; buyuHazirlik = null;
        sunucuOturumu?.gonder(WIZ.BECERI, beceriIstegi(BECERI_KOMUTU.UCUS, no, benimSoketNo, hedefId, veri()));
        ucanEfektOynat(efektNo(no).ucan, oyuncu.grup, hedefGrup);
        const ucus = Math.max(0.25, Math.min(0.7, oyuncu.konum.distanceTo(asil.konum) / 28));
        setTimeout(() => sunucuOturumu?.gonder(WIZ.BECERI, beceriIstegi(BECERI_KOMUTU.ETKI, no, benimSoketNo, hedefId, veri())), ucus * 1000 + 50);
      }, 1050);
    } else if (sure > 0) { // süreli büyü
      buyuHazirlik = { no, hedefId };
      gonder(BECERI_KOMUTU.HAZIRLAMA);
      if (!hareketEdiyor) oyuncu.animKilidi = Math.max(sure, oyuncu.model?.beceriOynat(animNo) ?? 0);
      setTimeout(() => {
        if (buyuHazirlik?.no !== no) return; buyuHazirlik = null; // iptal edildi (yürüdün ya da öldün)
        if (oyuncu.olu) return;
        gonder(BECERI_KOMUTU.UCUS); ucanEfektOynat(efektNo(no).ucan, oyuncu.grup, hedefGrup);
        // Orijinal (MagicSkillMng): hazırlık süresi olan yakın dövüş skill'inde (Sword dancing, Howling sword…) hazırlık animasyonundan sonra VURUŞ animasyonu (iAct) oynar
        const vurus = v.tip === 1 ? arayuz?.beceriVurusAnim(no) : undefined;
        if (vurus && !hareketEdiyor) oyuncu.animKilidi = Math.max(oyuncu.animKilidi, oyuncu.model?.beceriOynat(vurus) ?? 0);
        setTimeout(() => gonder(BECERI_KOMUTU.ETKI), 350); // uçuş süresi
      }, sure * 1000);
    } else {
      gonder(BECERI_KOMUTU.ETKI);
      if ((v.tip === 1 || v.tip === 7) && (hedef || animNo)) oyuncu.animKilidi = beceriAnimiOynat(no, animNo); // duruyorken de koşarken/yürürken de AYNI (tam gövde) skill animasyonu; bitince hareket animasyonuna döner
    }
    if ((v.tip === 1 || v.tip === 7) && (hedef || animNo)) ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
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
    const kivilcim = e.hedef === 10002 && hedefGrup === kaynak; // tablodaki vuruş kıvılcımı, kendine uygulanan buff/iyileştirmede anlamsız: oynatılmaz
    if (e.hedef && hedefGrup && !kivilcim) void efektler.oynat(e.hedef, hedefGrup, v?.tip4 ? { sure: 1.2 } : { sure: 0.15, azamiSure: 0.25 });
    if (benim && v?.tip4) { // buff sunucuda kabul edildi
      oyuncu.buflar = oyuncu.buflar.filter((b) => b.no !== p.no);
      oyuncu.buflar.push({ no: p.no, ad: v.ad || arayuz?.beceriAdi(p.no) || '', bitis: simdiSn() + v.tip4.sure, hiz: v.tip4.turu === 6 ? v.tip4.hiz : 0, ac: v.tip4.ac, sure: v.tip4.sure });
      hud.mesaj(`${buyuAdi(v, p.no)} is active for ${v.tip4.sure} seconds.`, 'sistem');
    }
  };
  // ---- Alan skill'i hedefleme (ör. Provoke): skill'e basınca yerde etki alanı halkası imleci izler; sol tık atar, sağ tık / Esc / skill'e tekrar basmak iptal eder.
  type Kural = NonNullable<typeof kurallar>['beceri'][string];
  let alanHedefi: { no: number; v: Kural } | null = null;
  let alanBasildi = false; const alanNoktasi = new THREE.Vector2();
  const alanHalka = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 96), new THREE.MeshBasicMaterial({ color: 0x8fd6e6, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthTest: false }));
  alanHalka.rotation.x = -Math.PI / 2; alanHalka.renderOrder = 999; alanHalka.visible = false; sahne.add(alanHalka);
  const alanHedeflemeBasla = (no: number, v: Kural) => {
    if (alanHedefi?.no === no) { alanHedeflemeBitir(); hud.mesaj('Area targeting cancelled.', 'sistem'); return; }
    alanHedefi = { no, v };
    const yaricap = Math.max(2, Math.min(v.tip7?.yaricap ?? v.tip3?.yaricap ?? 10, 40));
    alanHalka.scale.set(yaricap, yaricap, 1); alanHalka.visible = true;
    hud.mesaj(`${arayuz?.beceriAdi(no) ?? v.ad}: left-click to cast, right-click or Esc to cancel.`, 'sistem');
  };
  const alanHedeflemeBitir = () => { alanHedefi = null; alanHalka.visible = false; };
  const alanYeri = (e: PointerEvent | MouseEvent): THREE.Vector3 | null => {
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    return isin.intersectObject(arazi.mesh)[0]?.point ?? null;
  };
  const beceriKullan = (no: number) => {
    const v = kurallar?.beceri[String(no)];
    if (!v && !oyuncu.olu) { hud.mesaj("This skill is not available on the server yet.", "sistem"); return; } // ör. Magic blade: sunucu veritabanında tanımı yok
    if (!v || oyuncu.olu) return;
    if (oyuncu.blinkli) { hud.mesaj('You cannot use skills while blinking.', 'sistem'); return; } // sunucu: m_bCanUseSkills = false (10 sn)
    if (v.seviye > 70) { hud.mesaj(`${v.ad} is not available.`, 'sistem'); return; } // oyunda skill'ler 70'e kadar
    const agac = (v.sayfa ?? 0) % 10; // terfi ağaçlarında (5–8) gereken, karakter seviyesi değil o ağaca verilen skill puanıdır
    if (agac >= 5 && agac <= 8 ? oyuncu.skillPuanlari[agac] < v.seviye : oyuncu.seviye < v.seviye) { hud.mesaj(agac >= 5 && agac <= 8 ? `${v.ad} requires ${v.seviye} skill points in this tree.` : `${v.ad} requires level ${v.seviye}.`, 'sistem'); return; }
    const hazir = oyuncu.beceriBekleme.get(no) ?? 0;
    if (hazir > simdiSn()) { hud.mesaj(`${v.ad} is not ready yet.`, 'sistem'); return; }
    if (oyuncu.mana < v.msp) { hud.mesaj('Not enough MP.', 'sistem'); return; }
    let hedef: Canavar | null = null, dost: DigerOyuncu | null = null;
    if (v.tip === 2) { // okçuluk: yay (sol elde) ve ok gerekir
      if (!YAY_TURLERI.includes(oyuncu.ekipman[8]?.tip ?? 0) && !YAY_TURLERI.includes(oyuncu.ekipman[6]?.tip ?? 0)) { hud.mesaj('You need to equip a bow first.', 'sistem'); return; }
      if (!oyuncu.envanter.some((e) => e && (e.sunucuNo ?? e.no) === OK_NO && (e.adet ?? 1) > 0)) { hud.mesaj('You are out of arrows.', 'sistem'); return; }
      if (!sunucuOturumu) { hud.mesaj(`${v.ad} needs a server connection.`, 'sistem'); return; }
    }
    const diger = v.tip === 0 || v.tip > 4; // terfi skill'leri: tür 0, 5–9 (iyileştirme, diriltme, dönüşüm…): hedef türü MORAL'den (7 düşman; 1–4 kendine/dosta), etkiyi sunucu uygular
    if (!sunucuOturumu && v.tip !== 1 && v.tip !== 4) { hud.mesaj(`${v.ad} needs a server connection.`, 'sistem'); return; }
    const alanDusman = diger && v.moral === 10; // düşman alanı (ör. Provoke): kullananın çevresinde etki eder, hedef seçmek gerekmez
    if (alanDusman) { /* hedefsiz */ } else if (v.tip === 1 || v.tip === 2 || ((v.tip === 3 || diger) && v.moral === 7)) { // düşmana (yakın dövüş, okçuluk ya da büyü)
      hedef = oyuncu.hedef && !oyuncu.hedef.olu ? oyuncu.hedef : null;
      if (!hedef && sunucuOturumu && secilenOyuncu && digerOyuncular.includes(secilenOyuncu)) { // PvP: seçili başka oyuncuya düşman skill'i (sunucu düşmanlığı denetler)
        dost = secilenOyuncu;
        const menzilO = v.tip === 1 ? 6 : v.tip === 2 ? 35 : (v.menzil ?? 25);
        if (oyuncu.konum.distanceTo(dost.konum) > menzilO) { hud.mesaj('The target is too far away.', 'sistem'); return; }
      } else {
      if (!hedef) { hud.mesaj('Select a target first.', 'sistem'); return; }
      const menzil = v.tip === 1 ? menzilDe(hedef) + 0.5 : v.tip === 2 ? 35 : (v.menzil ?? 25);
      if (oyuncu.konum.distanceTo(hedef.konum) > menzil) { hud.mesaj('The target is too far away.', 'sistem'); return; }
      }
    } else if (v.tip === 3 || v.tip === 4 || (diger && [1, 2, 3, 4].includes(v.moral ?? 0))) { // kendine ya da dosta (iyileştirme, buff)
      if ((v.moral ?? 1) !== 1) { if (secilenOyuncu && digerOyuncular.includes(secilenOyuncu) && oyuncu.konum.distanceTo(secilenOyuncu.konum) <= (v.menzil ?? 25)) dost = secilenOyuncu; }
      if (v.tip === 3 && !sunucuOturumu) { hud.mesaj(`${v.ad} needs a server connection.`, 'sistem'); return; }
    } else { hud.mesaj(`${v.ad} cannot be used yet.`, 'sistem'); return; }
    kalk();
    if (sunucuOturumu && alanDusman && !alanBasildi) { alanHedeflemeBasla(no, v); return; } // alan skill'i: yer seçilir (halka imleci izler), sol tıkla atılır
    if (sunucuOturumu) { sunucuBecerisi(no, v, hedef, dost, alanBasildi ? alanNoktasi : undefined); return; } // sunucu modu: kuralları sunucu uygular (MP, hasar, buff, bekleme)
    // Efekt istisnaları: Sprint'te altın toplanma (Ability_cast) yok, yalnız mavi rüzgâr izi (kullanıcı kararı); Defense tabloya uygun altın efektini kullanır.
    const efektId = { ...arayuz?.beceriEfekt(no) ?? { kendi: null, hedef: null }, ...(sprintMi(no) ? { kendi: null } : {}) };
    if (efektId?.kendi) void efektler.oynat(efektId.kendi, oyuncu.grup, { sure: v.tip4 ? 1.2 : 0.6 }); // kullanan kişide efekt
    oyuncu.mana -= v.msp;
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // sunucu: ReCastTime × 90 ms
    oyuncu.savastanBeri = v.tip === 1 ? 0 : oyuncu.savastanBeri;
    if (v.tip === 1 && hedef) {
      if (!hareketEdiyor) { oyuncu.bak(hedef.konum); oyuncu.animKilidi = oyuncu.model?.beceriOynat(animSec(no)) || 0.8; } else oyuncu.animKilidi = oyuncu.model?.beceriOynat(animSec(no)) || 0.8; // skill tablosundaki animasyon; yürürken üst gövdede oynar
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
      vurusZamanlayici.push({ kalan: 0.45, hedef, beceri: v, hedefEfekt: efektId?.hedef ?? null });
    } else if (v.tip4) {
      // Buff skill'lerinde (Sprint, Defense…) karakter animasyonu oynatılmaz (kullanıcı isteği); yalnız efekt çıkar.
      oyuncu.buflar = oyuncu.buflar.filter((b) => b.no !== no);
      oyuncu.buflar.push({ no, ad: v.ad, bitis: simdiSn() + v.tip4.sure, hiz: v.tip4.turu === 6 ? v.tip4.hiz : 0, ac: v.tip4.ac, sure: v.tip4.sure });
      if (efektId?.hedef) void efektler.oynat(efektId.hedef, oyuncu.grup, { sure: 1.2 }); // buff'ta hedef efekti de kullanana uygulanır
      hud.mesaj(`${buyuAdi(v, no)} is active for ${v.tip4.sure} seconds.`, 'sistem');
    }
  };

  let esyaCikar: (p: number) => void = () => {};
  let eliHazirla: (e: EsyaTanimi, p: number) => boolean = () => true;
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
        if (e && k.tur === 'c' && h.tur === 'e' && Oyuncu.uygunYuvalar(e).includes(h.i) && !eliHazirla(e, h.i)) return; // iki elli silah: öbür el önce boşaltılır
        if (sunucuOturumu) { // sunucu modu: mesaj sunucu onayından sonra
          const ms = e && h.tur === 'e' ? `You equipped ${e.ad}.` : e && k.tur === 'e' ? `You unequipped ${e.ad}.` : undefined;
          if (!sunucuTasi(k, h, ms) && e) hud.mesaj('You cannot move the item there.', 'sistem'); else envanterYenile();
          return;
        }
        if (!oyuncu.esyaTasi(k, h)) { if (e) hud.mesaj('You cannot move the item there.', 'sistem'); return; }
        if (e && h.tur === 'e') hud.mesaj(`You equipped ${e.ad}.`, 'sistem'); else if (e && k.tur === 'e') hud.mesaj(`You unequipped ${e.ad}.`, 'sistem');
        envanterYenile();
      },
      ipucuGoster: (e, ev, satin, tamir) => hud.ipucuGoster(e, ev, satin, tamir), tamirEt: (k) => tamirEt(k), tamirmi: () => !!aktifMagaza && aktifMagaza.npc.tanim.tur === 22, ipucuGizle: () => hud.ipucuGizle(),
      mesaj: (t) => hud.mesaj(t, 'sistem'), statDegisti: () => {},
      partiDavet: () => partiDavetEt(),
      // Town: Moradon'da şehir noktası (305, 342). Sunucuda ışınlanma "durağan" hareket paketiyle bildirilir (test araçlarındaki yöntem).
      sehreDon: () => {
        const [x, z] = ayar.sehir ?? ayar.baslangic ?? SEHIR_NOKTASI; // her haritanın kendi town noktası (aynı bölge: sunucuyla uyumlu) kalk(); oyuncu.isinla(x, z, arazi); oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.yuruHedef = null;
        if (sunucuOturumu) { const p = (m: number) => Math.round(m * 10); const y = p(arazi.yukseklikAl(x, z)); sunucuOturumu.gonder(WIZ.HAREKET, new PaketYazici().u16(p(x)).u16(p(z)).u16(y).i16(0).u8(0).u16(p(x)).u16(p(z)).u16(y).baytlar()); }
        hud.mesaj('You returned to town.', 'sistem');
      },
      emote: (no) => { if (oyuncu.olu || !oyuncu.model) return; kalk(); oyuncu.yuruHedef = null; oyuncu.animKilidi = oyuncu.model.numaraOynat(no) || 0; }, otur: () => oturDegistir(), yuruKos: () => yuruKosDegistir(), esyaCikar: (p) => esyaCikar(p), beceriKullan: (no) => beceriKullan(no), magazaSatinAl: (e) => magazaSatinAl(e), magazaSat: (i, adet) => magazaSat(i, adet), ganimetAl: (k, s) => hud.ganimetAl(k, s), haritaBilgi: () => ({ ad: HARITA, genislik: arazi.genislik }), npcler: () => npcler.map((n) => ({ ad: n.ad, x: n.konum.x, y: n.konum.y })),
      skillPuaniVer: (agac) => {
        const o = oyuncu.skillPuanlari;
        if (!sunucuOturumu) { hud.mesaj('Skill points need a server connection.', 'sistem'); return; }
        if (o[0] < 1) { hud.mesaj('You have no skill points left.', 'sistem'); return; }
        o[0]--; o[agac]++; // sunucu yalnız reddederse geri alınır
        sunucuOturumu.gonder(WIZ.SKILL_PUANI, skillPuaniIstegi(agac));
      },
      gorevler: () => [...gorevDurumlari.entries()],
      parti: () => ({ uyeler: partiListesi(), benimId: benimSoketNo }),
      hedefOyuncu: () => (secilenOyuncu && digerOyuncular.includes(secilenOyuncu) ? secilenOyuncu : null),
      partiSec: (id) => { const d = digerOyuncular.find((x) => x.kimlik === id); if (d) { secilenOyuncu = d; oyuncu.hedef = null; } }, // parti penceresinde üyeye tıklayınca o oyuncu seçilir (buff/iyileştirme ona gider)
      partiAyril: (id) => sunucuOturumu?.gonder(WIZ.PARTI, partidenCikarIstegi(id)),
      partiLider: (id) => sunucuOturumu?.gonder(WIZ.PARTI, liderDevretIstegi(id)),
      partiDagit: () => sunucuOturumu?.gonder(WIZ.PARTI, partiyiDagitIstegi()),
      diyalogSec: (sira) => { if (aktifDiyalog?.lua) sunucuOturumu?.gonder(WIZ.SECIM_MESAJI, secimCevabi(sira, aktifDiyalog.lua)); },
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
  /** İki elli silah (ya da öbür elde iki elli silah varken tek elli) giyilirken öbür eldeki eşya önce çantaya alınır; çanta doluysa false. */
  eliHazirla = (e: EsyaTanimi, p: number): boolean => {
    if ((p !== 6 && p !== 8) || !oyuncu.elCakismasi(e, p)) return true;
    const diger = p === 6 ? 8 : 6, o = oyuncu.ekipman[diger]; if (!o) return true;
    const f = oyuncu.envanter.indexOf(null); if (f < 0) { hud.mesaj('Your inventory is full.', 'sistem'); return false; }
    if (sunucuOturumu) return sunucuTasi({ tur: 'e', i: diger }, { tur: 'c', i: f }, `You unequipped ${o.ad}.`);
    if (!oyuncu.esyaTasi({ tur: 'e', i: diger }, { tur: 'c', i: f })) return false;
    hud.mesaj(`You unequipped ${o.ad}.`, 'sistem'); return true;
  };
  hud.esyaKusan = (i) => {
    if (sunucuOturumu) { // sunucu modu
      const e = oyuncu.envanter[i]; if (!e) return;
      const p = Oyuncu.ekipmanYuvasi(e); if (p < 0) { hud.mesaj('You cannot equip this item.', 'sistem'); return; }
      if (!eliHazirla(e, p)) return;
      if (sunucuTasi({ tur: 'c', i }, { tur: 'e', i: p }, `You equipped ${e.ad}.`)) envanterYenile();
      return;
    }
    { const a = oyuncu.envanter[i]; if (a) { const p = Oyuncu.ekipmanYuvasi(a); if (p >= 0 && !eliHazirla(a, a.yuva === 0 ? 6 : p)) return; } }
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
    k.altinSatiri = k.agAltinYuva; k.yerler = k.agYuvalar.map((y) => y.yuva); // pencere satırı = sunucudaki kutu yuvası (alınan eşya diğerlerini kaydırmaz)
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
      if (k) { const i = k.agYuvalar.findIndex((y) => y.yuva === a.kutuYuvasi); if (i >= 0) { k.esyalar.splice(i, 1); k.agYuvalar.splice(i, 1); k.yerler.splice(i, 1); } }
    }
    envanterYenile();
    if (k) { if (k.bos) { k.omur = 0; hud.ganimetAc(null); } else hud.ganimetAc(k); }
  };
  hud.ganimetAl = (k, secim) => {
    if (k.agTorba) { sunucuGanimetAl(k, secim); return; } // sunucu modu: alma sunucuda yapılır, sonuç 0x26 ile gelir
    const al = (i: number): boolean => {
      const e = k.esyalar[i];
      if (!oyuncu.esyaEkle(e)) { hud.mesaj('Your inventory is full.', 'sistem'); return false; }
      hud.mesaj(`You obtained ${e.ad}.`, 'odul'); k.esyalar.splice(i, 1); k.yerler.splice(i, 1); return true;
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
    if (!e.repeat && !(oyuncu.gm && e.shiftKey && e.code === 'Digit2') && arayuz?.tus(e.code)) { // GM: Shift+2 hızlanma kombinasyonudur, 2. skill çubuğu yuvasını kullanmaz
      e.preventDefault(); if (e.code === 'Escape') { /* pencere kapandı */ } return; }
    // Hedef seçimi: Z en yakın canavar, Q ve Tab bir sonraki yakın canavar (yalnızca seçer); R seçili hedefe temel saldırıyı başlatır
    const yakinlar = () => canavarlar.filter((c) => !c.olu && c.konum.distanceTo(oyuncu.konum) < 40).sort((a, b) => a.konum.distanceTo(oyuncu.konum) - b.konum.distanceTo(oyuncu.konum));
    if (!e.repeat && (e.code === 'KeyZ' || e.code === 'KeyQ' || e.code === 'Tab')) {
      e.preventDefault();
      const l = yakinlar();
      const yeni = e.code === 'KeyZ' ? l[0] : (l.find((c) => c !== oyuncu.hedef && (!oyuncu.hedef || c.konum.distanceTo(oyuncu.konum) >= oyuncu.hedef.konum.distanceTo(oyuncu.konum))) ?? l[0]);
      if (yeni && yeni !== oyuncu.hedef) { oyuncu.hedef = yeni; oyuncu.saldiriyor = false; }
      if (e.code === 'KeyZ' && yeni) oyuncu.bak(yeni.konum); // orijinal: en yakın düşmanı seçince ona döner (RotateTo)
    }
    // B: yanındaki en yakın NPC'yi seçer (sol tıkla aynı: yalnız hedef halkası; menzil 5 m)
    if (!e.repeat && e.code === 'KeyB' && !oyuncu.olu) {
      const n = npcler.filter((x) => x.konum.distanceTo(oyuncu.konum) < 5).sort((p, q) => p.konum.distanceTo(oyuncu.konum) - q.konum.distanceTo(oyuncu.konum))[0];
      if (n) { e.preventDefault(); secilenNpc = n; oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null; }
      else hud.mesaj('There is no NPC nearby.', 'sistem');
    }
    if (e.code === 'KeyS') oyuncu.saldiriyor = false; // S: temel saldırıyı durdurur (hedef seçili kalır)
    if (!e.repeat && e.code === 'KeyR' && !oyuncu.hedef && sunucuOturumu && secilenOyuncu && digerOyuncular.includes(secilenOyuncu)) { // PvP: R seçili oyuncuya sürekli saldırıyı aç/kapa
      pvpSaldiriyor = !pvpSaldiriyor; hud.mesaj(pvpSaldiriyor ? 'Auto attack on.' : 'Auto attack off.', 'sistem'); return;
    }
    if (!e.repeat && e.code === 'KeyR' && oyuncu.saldiriyor) { oyuncu.saldiriyor = false; hud.mesaj('Auto attack off.', 'sistem'); } // R: sürekli saldırıyı aç/kapa (orijinal CommandToggleAttackContinous)
    else if (!e.repeat && e.code === 'KeyR') {
      if (!oyuncu.hedef || oyuncu.hedef.olu) { hud.mesaj('Select a target first.', 'sistem'); return; } // hedefi oyuncu seçer: R kendiliğinden en yakın canavara agro almaz
      if (oyuncu.hedef && !oyuncu.hedef.olu) oyuncu.saldiriyor = true; // orijinalde yürürken de R ile saldırı açılır; yürüme sürer
    }
    if (e.code === 'Escape' && alanHedefi) { alanHedeflemeBitir(); return; }
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
  /** Sol tık / B ile seçilen NPC (yalnız hedef halkası; dükkân/konuşma sağ tıkla açılır). */
  let secilenNpc: Npc | null = null;
  /** NPC'ye tıklayınca: satış grubu olan tüccar mağaza açar; diğer NPC işlevleri henüz yok. */
  /** Açık mağaza: hangi NPC'nin hangi satış grubu (sunucu alım/satımı bunu ister). */
  let aktifMagaza: { npc: Npc; grup: number } | null = null;
  const magazaBekleyen: { tur: 'al' | 'sat'; e: EsyaTanimi; yuva: number; adet?: number }[] = [];
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
  /** Tamir (sunucu ItemRepair): istek yollanır, sonuç 0x3B ile gelir. Eşya yalnızca tamirci NPC'nin (Blacksmith/Armor/Weapon/Sundries) mağazası açıkken tamir edilir. */
  const tamirBekleyen: { k: YuvaKonumu; e: EsyaTanimi }[] = [];
  const tamirEt = (k: YuvaKonumu) => {
    const e = k.tur === 'c' ? oyuncu.envanter[k.i] : oyuncu.ekipman[k.i]; if (!e) return;
    if (!sunucuOturumu) { hud.mesaj('Repairs need a server connection.', 'sistem'); return; }
    const azami = e.dayanim ?? 0, simdiki = e.suru ?? azami;
    if (azami <= 1 || simdiki >= azami) { hud.mesaj('This item does not need repairs.', 'sistem'); return; }
    const h = magazaHazir(); if (!h) return;
    tamirBekleyen.push({ k, e });
    sunucuOturumu.gonder(WIZ.ESYA_TAMIR, esyaTamirIstegi(k.tur === 'e' ? 1 : 2, k.i, h.id, e.sunucuNo ?? e.no));
  };
  const tamirCevabiSunucudan = (c: { basarili: boolean; altin: number }) => {
    const b = tamirBekleyen.shift(); oyuncu.altin = c.altin;
    if (!c.basarili) { hud.mesaj('The item could not be repaired (not enough Noah?).', 'sistem'); envanterYenile(); return; }
    if (b) { b.e.suru = b.e.dayanim ?? b.e.suru; hud.mesaj(`${b.e.ad} has been repaired.`, 'sistem'); }
    envanterYenile();
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
      const kalan = (b.e.adet ?? 1) - (b.adet ?? b.e.adet ?? 1); const yuvadaki = oyuncu.envanter[b.yuva];
      if (kalan > 0 && yuvadaki) yuvadaki.adet = kalan; else oyuncu.envanter[b.yuva] = null; // kısmi satışta kalan yığın yuvada durur
      hud.mesaj(`You sold ${(b.adet ?? 1) > 1 ? `${b.adet} × ` : ''}${b.e.ad} for ${(c.fiyat ?? 0).toLocaleString('en-US')} Noah.`, 'odul');
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
      const mevcutAltin = i.tur === 'altin-yatir' ? o.altin : o.depoAltin, miktar = Math.max(0, Math.min(i.miktar ?? mevcutAltin, mevcutAltin)); if (miktar <= 0) return true;
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(i.tur === 'altin-yatir' ? BANKA_ISLEMI.YATIR : BANKA_ISLEMI.CEK, id, BANKA_ALTIN, 0, 0, 0, miktar));
      bankaBekleyen.push(() => { if (i.tur === 'altin-yatir') { o.depoAltin += miktar; o.altin -= miktar; hud.mesaj(`${miktar.toLocaleString('en-US')} Noah deposited.`, 'sistem'); } else { o.altin += miktar; o.depoAltin -= miktar; hud.mesaj(`${miktar.toLocaleString('en-US')} Noah withdrawn.`, 'sistem'); } });
    } else if (i.tur === 'banka-ici') { // aynı sayfada banka yuvasından yuvasına (sunucu WAREHOUSE_MOVE: hedef boş olmalı)
      const e = o.depo[i.kaynak]; if (!e || o.depo[i.hedef]) return true;
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.BANKA_ICI_TASI, id, e.sunucuNo ?? e.no, Math.floor(i.kaynak / SAYFA_YUVASI), i.kaynak % SAYFA_YUVASI, i.hedef % SAYFA_YUVASI, e.adet ?? 1));
      bankaBekleyen.push(() => { o.depo[i.hedef] = e; o.depo[i.kaynak] = null; });
    } else if (i.tur === 'canta-ici') { // çanta içinde yuvadan yuvaya (sunucu WAREHOUSE_INVENMOVE)
      const e = o.envanter[i.kaynak]; if (!e || o.envanter[i.hedef]) return true;
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.CANTA_ICI_TASI, id, e.sunucuNo ?? e.no, 0, i.kaynak, i.hedef, e.adet ?? 1));
      bankaBekleyen.push(() => { o.envanter[i.hedef] = e; o.envanter[i.kaynak] = null; });
    } else if (i.tur === 'esya-yatir') {
      const e = o.envanter[i.canta]; if (!e) return true;
      const j = i.hedef ?? o.depo.indexOf(null), n = Math.max(1, Math.min(i.adet ?? e.adet ?? 1, e.adet ?? 1));
      const mevcut = j >= 0 ? o.depo[j] : null, ayni = !!mevcut && !!e.sayilabilir && mevcut.no === e.no; // aynı yığına ekleme
      if (j < 0 || (mevcut && !ayni)) { hud.mesaj('Your warehouse is full.', 'sistem'); return true; }
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.YATIR, id, e.sunucuNo ?? e.no, Math.floor(j / SAYFA_YUVASI), i.canta, j % SAYFA_YUVASI, n));
      bankaBekleyen.push(() => {
        if (mevcut && ayni) mevcut.adet = (mevcut.adet ?? 1) + n; else o.depo[j] = e.sayilabilir ? { ...e, adet: n } : e;
        const kalan = (e.adet ?? 1) - n; o.envanter[i.canta] = kalan > 0 && e.sayilabilir ? { ...e, adet: kalan } : null;
      });
    } else {
      const e = o.depo[i.banka]; if (!e) return true;
      const f = i.hedef ?? o.envanter.indexOf(null), n = Math.max(1, Math.min(i.adet ?? e.adet ?? 1, e.adet ?? 1));
      const mevcut = f >= 0 ? o.envanter[f] : null, ayni = !!mevcut && !!e.sayilabilir && mevcut.no === e.no;
      if (f < 0 || (mevcut && !ayni)) { hud.mesaj('Your inventory is full.', 'sistem'); return true; }
      sunucuOturumu.gonder(WIZ.BANKA, bankaIslemIstegi(BANKA_ISLEMI.CEK, id, e.sunucuNo ?? e.no, Math.floor(i.banka / SAYFA_YUVASI), i.banka % SAYFA_YUVASI, f, n));
      bankaBekleyen.push(() => {
        if (mevcut && ayni) mevcut.adet = (mevcut.adet ?? 1) + n; else o.envanter[f] = e.sayilabilir ? { ...e, adet: n } : e;
        const kalan = (e.adet ?? 1) - n; o.depo[i.banka] = kalan > 0 && e.sayilabilir ? { ...e, adet: kalan } : null;
      });
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
    if (sayfalar && arayuz) { // mağazası olan her NPC (Inn Hostess hariç: o ayrı menü): önce orijinal konuşma menüsü (alışveriş / tamir / takas / ayrıl)
      const magazaAc = (tamir: boolean) => { arayuz.diyalogKapat(); aktifMagaza = { npc: n, grup: n.tanim.satis }; arayuz.magazaAc(n.ad, sayfalar); if (tamir) hud.mesaj('Right-click an item to repair it.', 'sistem'); };
      arayuz.diyalogDuz(n.ad, 'A great blacksmith like me is hard to find. Tell me if you need anything...', [
        { yazi: 'I want to trade.', sec: () => magazaAc(false) },
        { yazi: 'I want to repair.', sec: () => magazaAc(true) },
        { yazi: 'I want to exchange.', sec: () => undefined, pasif: true },
        { yazi: 'Walk away.', sec: () => arayuz.diyalogKapat() }]);
      return;
    }
    if (sayfalar && arayuz) { aktifMagaza = { npc: n, grup: n.tanim.satis }; arayuz.magazaAc(n.ad, sayfalar); return; }
    if (n.tanim.tur === 31 && n.tanim.sid !== 19999 && arayuz) { // Inn Hostess: orijinal konuşma menüsü (Clan Bank ayrı, henüz yok)
      arayuz.diyalogDuz(n.ad, 'There are lots of exciting things happening at our inn.  What are you here for?', [
        { yazi: 'Access Storage.', sec: () => { arayuz.diyalogKapat(); if (sunucuOturumu) bankaAcSunucu(n); else arayuz.depoAc(); } },
        { yazi: 'Create a Clan', sec: () => { arayuz.diyalogKapat(); hud.mesaj('Clan creation is not available yet.', 'sistem'); } },
        { yazi: 'Power Up Store', sec: () => { arayuz.diyalogKapat(); hud.mesaj('The Power Up Store is not available yet.', 'sistem'); } }]);
      return;
    }
    if (sunucuOturumu) { // diğer NPC'ler: sunucu Lua betiği konuşma menüsünü yollar (WIZ_SELECT_MSG)
      const id = npcSunucuKimligi(n);
      if (!id) { hud.mesaj(`${n.ad}: (this NPC is not available on the server)`, 'bilgi'); return; }
      if (oyuncu.konum.distanceTo(n.konum) > MAGAZA_MENZILI - 0.5) { hud.mesaj('You are too far from the NPC.', 'sistem'); return; }
      aktifDiyalog = { npc: n, lua: '' };
      sunucuOturumu.gonder(WIZ.NPC_OLAYI, npcOlayiIstegi(id));
      return;
    }
    hud.mesaj(`${n.ad}: (conversation needs a server connection)`, 'bilgi');
  };
  let aktifDiyalog: { npc: Npc; lua: string } | null = null;
  /** Sunucudan gelen görev durumları (görev no → durum); NPC'nin hangi görev satırlarını sunacağı buna göre seçilir. */
  const gorevDurumlari = new Map<number, number>();
  const oldurmeSayaci = new OldurmeSayaci(document.getElementById('arayuz') ?? document.body); // PvP öldürme sayacı (üst orta)
  const gorevSunucudan = async (g: GorevPaketi) => {
    if (g.durumlar) { if (g.alt === 1) gorevDurumlari.clear(); for (const d of g.durumlar) gorevDurumlari.set(d.gorev, d.durum); return; }
    if (g.alt !== 7 || !aktifDiyalog || g.metinNo === undefined || g.npcSid === undefined) return;
    const v = await diyalogVerisi(), npc = aktifDiyalog.npc;
    const satirlar = uygunGorevler(v, g.npcSid, oyuncu.seviye, oyuncu.sinif, gorevDurumlari);
    arayuz?.diyalogMetinle(npc.ad, g.metinNo, satirlar.map((s) => ({ metinNo: s.menuMetni, sec: () => sunucuOturumu?.gonder(WIZ.GOREV, gorevSecimiIstegi(s.satir)) })));
  };
  const diyalogSunucudan = (m: SecimMesaji) => {
    if (!aktifDiyalog) return;
    aktifDiyalog.lua = m.lua;
    arayuz?.diyalogGoster(aktifDiyalog.npc.ad, m.baslik, m.dugmeler);
  };
  /** Mağazaya satış (sunucu NPCHandler.cpp): fiyat = alış fiyatı / 6 (varsayılan kural). */
  /** Mağazaya satış; `adet` verilirse yığının yalnız o kadarı satılır (varsayılan: tamamı). */
  const magazaSat = (yuva: number, adet?: number) => {
    const e = oyuncu.envanter[yuva]; if (!e) return;
    const toplam = e.adet ?? 1, n = Math.max(1, Math.min(adet ?? toplam, toplam));
    if (sunucuOturumu) { // sunucu modu: fiyatı ve satışı sunucu belirler
      const h = magazaHazir(); if (!h) return;
      magazaBekleyen.push({ tur: 'sat', e, yuva, adet: n });
      sunucuOturumu.gonder(WIZ.ESYA_ALIM_SATIM, satisIstegi(h.grup, h.id, [{ no: e.sunucuNo ?? e.no, yuva, adet: n }]));
      return;
    }
    const fiyat = Math.floor(e.fiyat / 6) * n;
    if (fiyat <= 0) { hud.mesaj('This item cannot be sold.', 'sistem'); return; }
    if (n < toplam) e.adet = toplam - n; else oyuncu.envanter[yuva] = null; // yığının kalanı yuvada durur
    oyuncu.altin += fiyat;
    hud.mesaj(`You sold ${n > 1 ? `${n} × ` : ''}${e.ad} for ${fiyat.toLocaleString('en-US')} Noah.`, 'odul');
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
  /** Kutu menzil içindeyse (sunucu yağma menzili ~7 m) karakter KIPIRDAMADAN açılır; yalnız uzaktaysa menzile girecek kadar yürür. */
  const KUTU_MENZIL = 6;
  const kutuyaGit = (k: GanimetKutusu) => {
    oyuncu.hedef = null;
    if (oyuncu.konum.distanceTo(k.konum) <= KUTU_MENZIL) { acilacakKutu = null; oyuncu.yuruHedef = null; hud.ganimetAc(k); return; }
    acilacakKutu = k; oyuncu.yuruHedef = k.konum.clone();
  };
  // Sağ tık (sürüklemeden, kısa): kutuyu / ölü canavarı açar; sürüklenirse kamera döner, hiçbir şey açılmaz.
  const sag = { x: 0, y: 0, t: 0 };
  // ---- Işınlanma: kapıya gidip kullanma, kapı listesi, bölge değişimi (harita yeniden yüklenir)
  let acilacakKapi: { k: (typeof kapilar)[number]; hedef: THREE.Vector2 } | null = null;
  let sonKapiIndeksi = 0;
  const KAPI_MENZILI = 6; // sunucu MAX_OBJECT_RANGE = 10 m
  const kapiKullan = (k: (typeof kapilar)[number]) => { sonKapiIndeksi = k.indeks; sunucuOturumu?.gonder(WIZ.NESNE_OLAYI, nesneOlayiIstegi(k.indeks)); };
  const kapiyaGit = (k: (typeof kapilar)[number]) => {
    if (!sunucuOturumu) { hud.mesaj('The gate needs a server connection.', 'sistem'); return; }
    oyuncu.hedef = null; acilacakKutu = null; acilacakNpc = null;
    if (oyuncu.konum.distanceTo(k.konum) <= KAPI_MENZILI) { oyuncu.yuruHedef = null; kapiKullan(k); return; }
    const hedef = k.konum.clone(); oyuncu.yuruHedef = hedef; acilacakKapi = { k, hedef };
  };
  const KAPI_ADLARI: Record<number, string> = { 2111: 'Luferson Castle', 2121: 'El Morad Castle', 2114: 'Luna Valley Entrance', 2124: 'Luna Valley Entrance', 2116: 'Ardream', 2126: 'Ardream', 2113: 'Ronark Land', 2123: 'Ronark Land', 2115: 'Delos', 2125: 'Delos' };
  const kapiListesiGoster = (kapilarSunucu: { no: number; ad: string; bolge: number; ucret: number }[]) => {
    const indeks = sonKapiIndeksi;
    arayuz?.diyalogDuz('Warp Gate', 'Where would you like to go?', [
      ...kapilarSunucu.map((g) => ({
        yazi: `${KAPI_ADLARI[g.no] ?? g.ad}${g.ucret ? `  (${g.ucret.toLocaleString('en-US')} Noah)` : ''}`,
        pasif: !BOLGE_HARITASI[g.bolge], // haritası henüz dönüştürülmemiş bölgeler gri
        sec: () => { arayuz?.diyalogKapat(); sunucuOturumu?.gonder(WIZ.ISINLANMA_LISTESI, kapiSecimiIstegi(indeks, g.no)); },
      })),
      { yazi: 'Cancel', sec: () => arayuz?.diyalogKapat() }]);
  };
  const ISINLANMA_HATALARI: Record<number, string> = { 0: 'You cannot use this gate right now.', 3: 'You cannot enter during the Castle Siege War.', 4: 'You cannot enter during the Lunar War.', 5: 'You cannot enter when you have 0 national points.', 255: 'You cannot use this gate.' };
  let bekleyenBolge: { harita: string } | null = null;
  const haritayaGec = (harita: string, gecikmeMs: number) => {
    const q = new URLSearchParams(location.search); q.set('harita', harita);
    hud.mesaj('Loading the map…', 'sistem'); sunucuOturumu?.kapat(); sunucuOturumu = null; hareketGonderici = null;
    setTimeout(() => { location.search = `?${q.toString()}`; }, gecikmeMs); // sunucu eski bağlantıyı kapatıp kaydedene kadar beklenir (aynı hesapla çifte giriş olmasın)
  };

  tuval.addEventListener('pointerdown', (e) => { if (e.button === 2) { sag.x = e.clientX; sag.y = e.clientY; sag.t = performance.now(); } });
  tuval.addEventListener('pointerup', (e) => {
    if (e.button !== 2 || oyuncu.olu || performance.now() - sag.t > 350 || Math.hypot(e.clientX - sag.x, e.clientY - sag.y) > 6) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const k = tiklananGanimetKutusu(); if (k) { kutuyaGit(k); return; }
    const kapiVurus = isin.intersectObjects(kapilar.map((x) => x.kutu))[0]; // ışınlanma kapısı
    if (kapiVurus) { const k = kapilar.find((x) => x.kutu === kapiVurus.object)!; kapiyaGit(k); return; }
    // Sağ tık NPC'ye: yanına gider ve dükkânını/konuşmasını açar (sol tık yalnızca seçer)
    const npcVurus = isin.intersectObjects(npcler.map((x) => x.secimKutusu))[0];
    if (npcVurus) {
      const n = npcler.find((x) => x.secimKutusu === npcVurus.object)!;
      secilenNpc = n; oyuncu.hedef = null; oyuncu.yuruHedef = n.konum.clone(); acilacakKutu = null; acilacakNpc = n;
      if (oyuncu.konum.distanceTo(n.konum) < 3) { oyuncu.yuruHedef = null; acilacakNpc = null; npcEtkilesim(n); }
    }
  });
  // Oyun alanına (pencere dışına) sol tıklayınca açık bütün pencereler kapanır
  tuval.addEventListener('pointerdown', (e) => { if (e.button === 0) arayuz?.tumPencereleriKapat(); });
  tuval.addEventListener('pointermove', (e) => { if (!alanHedefi) return; const n = alanYeri(e); if (n) alanHalka.position.set(n.x, n.y + 0.06, n.z); });
  tuval.addEventListener('pointerdown', (e) => {
    if (!alanHedefi) return;
    e.stopImmediatePropagation(); // alan seçerken tıklama yürüme/seçme yapmaz
    if (e.button === 2) { alanHedeflemeBitir(); return; }
    if (e.button !== 0) return;
    const n = alanYeri(e); if (!n) return;
    const { no, v } = alanHedefi;
    const mesafe = oyuncu.konum.distanceTo(new THREE.Vector2(n.x, -n.z));
    if (mesafe > Math.min(v.menzil ?? 30, 60)) { hud.mesaj('The target area is too far away.', 'sistem'); return; }
    alanNoktasi.set(n.x, -n.z); alanHedeflemeBitir(); alanBasildi = true; try { beceriKullan(no); } finally { alanBasildi = false; }
  }, true);
  tuval.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || oyuncu.olu) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const npcVurus = isin.intersectObjects(npcler.map((n) => n.secimKutusu))[0];
    if (npcVurus) {
      const n = npcler.find((x) => x.secimKutusu === npcVurus.object)!;
      // Sol tık NPC'ye yalnızca onu seçer (hedef halkası); alışveriş/konuşma SAĞ tıkla açılır.
      secilenNpc = n; oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
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
    if (zemin) { secilenOyuncu = null; secilenNpc = null; oyuncu.yuruHedef = new THREE.Vector2(zemin.point.x, -zemin.point.z); oyuncu.hedef = null; acilacakKutu = null; acilacakNpc = null; sol.basili = true; sol.x = e.clientX; sol.y = e.clientY; }
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
    oyuncu.model?.giyimAyarla(giyimEkipmani(oyuncu.ekipman), modeldenIrk(oyuncu.modelNo));
    oyuncu.model?.silahAyarla(elSilahiTipi(oyuncu.ekipman), solSilahTipi(oyuncu.ekipman));
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
    const pvpHedef = secilenOyuncu && digerOyuncular.includes(secilenOyuncu) ? secilenOyuncu : null;
    if (!pvpHedef || oyuncu.olu || oyuncu.hedef) pvpSaldiriyor = false;
    const menzilde = !!oyuncu.hedef && oyuncu.saldiriyor && oyuncu.konum.distanceTo(oyuncu.hedef.konum) <= menzilDe(oyuncu.hedef);
    hareketEdiyor = ilerigeri !== 0 || !!oyuncu.yuruHedef;
    if (hareketEdiyor && arayuz?.npcPencereAcik()) arayuz.npcPencereleriniKapat(); // NPC mağazası/bankası açıkken hareket edince kapanır
    if (buyuHazirlik && hareketEdiyor) { sunucuOturumu?.gonder(WIZ.BECERI, beceriIstegi(BECERI_KOMUTU.IPTAL, buyuHazirlik.no, benimSoketNo, buyuHazirlik.hedefId)); buyuHazirlik = null; oyuncu.animKilidi = 0; hud.mesaj('Casting was cancelled.', 'sistem'); }
    if (ilerigeri !== 0) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      const h = oyuncu.bakisAcisi;
      const yon = new THREE.Vector2(Math.cos(h), Math.sin(h));
      if (ilerigeri > 0) oyuncu.ilerle(yon, hizAl() * dt); else oyuncu.geriGit(yon.multiplyScalar(-1), YURUME_HIZI * oyuncu.hizCarpani * dt);
      if (oyuncu.animKilidi <= 0) oyuncu.model?.oynat(ilerigeri < 0 && oyuncu.model.var('geri') ? 'geri' : hareketAnimi()); // S: geri yürüme animasyonu
      if (menzilde && oyuncu.hedef) saldirTik(oyuncu.hedef, true);
    } else if (donus !== 0 && !oyuncu.hedef) {
      oyuncu.yuruHedef = null; acilacakKutu = null; acilacakNpc = null;
      oyuncu.model?.oynat('bekle');
    } else if (oyuncu.yuruHedef) {
      if (oyuncu.yuru(oyuncu.yuruHedef, hizAl() * dt, acilacakKutu ? KUTU_MENZIL - 1 : acilacakNpc ? 2.5 : 0)) {
        oyuncu.yuruHedef = null;
        if (acilacakKutu && kutular.includes(acilacakKutu)) hud.ganimetAc(acilacakKutu);
        acilacakKutu = null;
        if (acilacakNpc) { const n = acilacakNpc; acilacakNpc = null; npcEtkilesim(n); }
        oyuncu.model?.oynat('bekle');
      } else { if (oyuncu.animKilidi <= 0) oyuncu.model?.oynat(hareketAnimi()); if (menzilde && oyuncu.hedef) saldirTik(oyuncu.hedef, true); }
    } else if (pvpHedef && pvpSaldiriyor && !oyuncu.hedef) { // PvP temel saldırı: menzile yürü, bak, vur (isabet/hasarı sunucu belirler)
      const menzil = SALDIRI_MENZILI + 0.3;
      if (oyuncu.konum.distanceTo(pvpHedef.konum) > menzil) {
        oyuncu.yuru(pvpHedef.konum, hizAl() * dt, menzil - 0.5);
        if (oyuncu.animKilidi <= 0) oyuncu.model?.oynat(hareketAnimi());
        hareketEdiyor = true;
      } else {
        oyuncu.bak(pvpHedef.konum);
        if (oyuncu.saldiriSayaci <= 0 && oyuncu.animKilidi <= 0 && !pvpHedef.olu) {
          oyuncu.blinkBitis = 0; oyuncu.saldiriSayaci = vurusAraligi(oyuncu.silah); oyuncu.savastanBeri = 0;
          oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08);
          ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
          const id = pvpHedef.kimlik; setTimeout(() => { sunucuOturumu?.gonder(WIZ.SALDIRI, saldiriIstegi(id, (oyuncu.silah?.gecikme ?? 100) + 10, 10)); sunucuOturumu?.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(id)); }, 350);
        }
        if (oyuncu.saldiriSayaci > 0 && oyuncu.saldiriSayaci < 0.4 && oyuncu.animKilidi <= 0) oyuncu.model?.oynat('bekle');
      }
    } else if (oyuncu.hedef && oyuncu.saldiriyor) {
      const h = oyuncu.hedef;
      if (oyuncu.konum.distanceTo(h.konum) > menzilDe(h)) { // menzil dışı: hedefe yürü (hareket eden canavarı da izler)
        oyuncu.yuru(h.konum, hizAl() * dt, menzilDe(h) - 0.3);
        if (oyuncu.animKilidi <= 0) oyuncu.model?.oynat(hareketAnimi());
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
    oyuncu.konum.x = THREE.MathUtils.clamp(oyuncu.konum.x, oyuncu.kenarPayi, arazi.genislik - oyuncu.kenarPayi);
    oyuncu.konum.y = THREE.MathUtils.clamp(oyuncu.konum.y, oyuncu.kenarPayi, arazi.genislik - oyuncu.kenarPayi);
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
    // Sunucu canavarlarının konumunu SUNUCU belirler (orijinalde canavarlar birbirini itmez); itersek sunucu konumuna geri yürürken sürekli çekişirler. Yalnız yerel (çevrimdışı) canavarlar ayrılır.
    const canli = canavarlar.filter((c) => !c.olu && c.grup.visible && !c.agModu);
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
    const p = c.grup.position.clone();
    // Oyuncu adları baş kemiğinin hizasına oturur: model grubun orijininden yana kaydığında (yakın zumda) ad karakterin soluna/sağına kaymasın.
    if ((c instanceof Oyuncu || c instanceof DigerOyuncu) && c.model) { const b = new THREE.Vector3(); if (c.model.basKonumu(b)) { p.x = b.x; p.z = b.z; } }
    p.y += c instanceof Npc ? Math.max(c.boy, c.etiketY) + 0.1 : c instanceof Oyuncu || c instanceof DigerOyuncu ? 2.1 : Math.max(c.boy, c.etiketY) + 0.1; // canavar adı isabet alanının hemen üstünde
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
    for (let i = ucanEfektler.length - 1; i >= 0; i--) { const u = ucanEfektler[i]; u.t += dt; u.nesne.position.lerpVectors(u.bas, u.bit, Math.min(1, u.t / u.sure)); if (u.t > u.sure + 0.6) { sahne.remove(u.nesne); ucanEfektler.splice(i, 1); } }
    kamera.guncelle(oyuncu.grup.position, (x, z) => arazi.yukseklikAl(x, -z), dt,
      arazi.carpisma ? (a, b) => arazi.carpisma!.dogruKesisimi(a.x, a.y, -a.z, b.x, b.y, -b.z) : undefined); // sahne z'si = −z (KO dünyası)
    if (secilenOyuncu && !digerOyuncular.includes(secilenOyuncu)) { secilenOyuncu = null; pvpSaldiriyor = false; }
    if (sunucuOturumu && secilenOyuncu && !oyuncu.hedef && simdiSn() - pvpSonCanSn > 1) { pvpSonCanSn = simdiSn(); sunucuOturumu.gonder(WIZ.HEDEF_CAN, hedefCanIstegi(secilenOyuncu.kimlik)); } // seçili oyuncunun canı saniyede bir istenir
    if (acilacakKapi) { // kapıya yürürken menzile girince kapı kullanılır; başka bir yere gidilirse iptal
      if (oyuncu.yuruHedef !== acilacakKapi.hedef) acilacakKapi = null;
      else if (oyuncu.konum.distanceTo(acilacakKapi.k.konum) <= KAPI_MENZILI) { const k = acilacakKapi.k; acilacakKapi = null; oyuncu.yuruHedef = null; kapiKullan(k); }
    }
    hud.guncelle(oyuncu, oyuncu.hedef, !oyuncu.hedef && secilenOyuncu ? secilenOyuncu : null);
    arayuz?.guncelle(dt);
    hud.etiketGuncelle(canavarlar, izdusum, oyuncu.hedef);
    kamera.kamera.updateMatrixWorld(); // etiketler bu karenin kamera konumuna göre hesaplanır (gecikme/kayma olmasın)
    hud.npcEtiketGuncelle(npcler, izdusum);
    hud.digerEtiketGuncelle(digerOyuncular, izdusum);
    hud.oyuncuEtiketGuncelle(oyuncu.ad, izdusum(oyuncu), oyuncu.partide);
    // Hedef (agro) halkası: oyunun kendi yeşil halka resmi (Misc/target_symbol_plane), seçili canavarın ayağında
    if (oyuncu.hedef) secilenNpc = null; // canavar hedefi seçilince NPC seçimi kalkar
    if (secilenNpc && secilenNpc.konum.distanceTo(oyuncu.konum) > 40) secilenNpc = null;
    const th: { grup: THREE.Group; secimYaricapi: number } | null = oyuncu.hedef && !oyuncu.hedef.olu ? oyuncu.hedef : secilenNpc;
    halka.visible = !!th;
    if (th) { halka.position.set(th.grup.position.x, th.grup.position.y + 0.06, th.grup.position.z); halka.scale.setScalar(Math.max(1.2, th.secimYaricapi * 2.6)); }
    cizici.render(sahne, kamera.kamera);
  });
  (window as unknown as { ke: unknown }).ke = { dostNpclar: () => [...(sunucuDunyasi?.dostNpclar.values() ?? [])], cizici, kapilar, kapiyaGit, partiUyeleri: () => partiListesi(), oldurmeSayaci, efektler, gorevDurumlari, secilenAyarla: (d: DigerOyuncu | null) => { secilenOyuncu = d; }, npcler, sahne, kamera, oyuncu, canavarlar, digerOyuncular, kutular, arazi, hud, savas, yonetici, ses, npcTikla: npcEtkilesim, arayuz: () => arayuz, deneyimKaybet, ganimetUret,
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
      const hedefHarita = BOLGE_HARITASI[s.bolge]; // karakter başka bir bölgedeyse (ör. Luferson) o haritaya geçilir; kayıtlı giriş yeniden girer
      if (hedefHarita && hedefHarita !== HARITA.toLowerCase() && (!navigator.webdriver || parametre.has('bolgeYonlendir'))) {
        haritayaGec(hedefHarita, 3500);
        return { ad: s.benim.ad, seviye: s.benim.seviye, altin: s.benim.altin, can: s.benim.can, bolge: s.bolge, yonlendirildi: hedefHarita } as never;
      }
      const ozet = sunucuVerisiniUygula(oyuncu, s.benim, arazi, s.bolge, HARITA);
      (window as unknown as { ke: Record<string, unknown> }).ke.benimBilgi = s.benim; // geliştirme: giriş paketindeki ham karakter bilgisi
      oyuncu.ad = s.benim.ad; hud.adAyarla(s.benim.ad);
      arayuz?.sinifAyarla(oyuncu.sinif); // sınıfa göre skill listesi ve çubuğu
      await oyuncu.modelDegistir(irkModeli(s.benim.irk)).catch((e) => console.warn('Irk modeli yüklenemedi', s.benim.irk, e)); // kadın/barbar/Karus görünümü
      hud.mesaj(`Connected to ${s.sunucuAdi} as ${s.benim.ad} (Lv ${s.benim.seviye}).`, 'sistem');
      if (s.karsilama) hud.mesaj(s.karsilama, 'sistem');
      // Canlı dünya: yerel (tek oyunculu) canavarlar kaldırılır; canavarlar artık sunucudan gelir.
      yonetici = null;
      for (const c of canavarlar) { sahne.remove(c.grup); hud.etiketKaldir(c); }
      canavarlar.length = 0; oyuncu.hedef = null; oyuncu.saldiriyor = false;
      benimSoketNo = s.benim.soketNo;
      sunucuDunyasi = new SunucuDunyasi(sahne, canavarlar, digerOyuncular, hud, s.benim.soketNo, oyuncu, {
        gonder: (op, govde) => sunucuOturumu?.gonder(op, govde),
        canavarSaldirdi: (c) => ses.modelSesi(c.tur.model, 'saldir', c.konum),
        canavarVuruldu: (c) => ses.modelSesi(c.tur.model, 'darbe', c.konum),
        oyuncuVuruldu: () => {
          kalk(); ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
          if (oyuncu.olu) { oyuncu.hedef = null; oyuncu.saldiriyor = false; oyuncu.model?.oynatRastgele('olum', 3, false, 0.1); } else oyuncu.model?.darbeOynat(true);
        },
        seviyeAtlandi: () => envanterYenile(),
        beceri: (p) => beceriSunucudan(p),
        skillPuaniReddedildi: (agac, puan) => { const o = oyuncu.skillPuanlari; o[0] += Math.max(0, o[agac] - puan); o[agac] = puan; hud.mesaj('You cannot add a skill point there.', 'sistem'); },
        sinifDegisti: (s) => { arayuz?.sinifAyarla(s); envanterYenile(); hud.mesaj('Congratulations! You have been promoted.', 'odul'); },
        oyuncuOldu: (id) => { if (sonPvpHedefi?.id === id && simdiSn() - sonPvpHedefi.t < 5) { sonPvpHedefi = null; pvpSeri = simdiSn() - pvpSonOldurme < 30 ? pvpSeri + 1 : 1; pvpSonOldurme = simdiSn(); oldurmeSayaci.ekle(pvpSeri); } },
        oldurme: (o) => { if (o.tur !== 1) return; if (o.alt === 1) oldurmeSayaci.ekle(o.sayi ?? 1, o.ad); else if (o.alt === 2) oldurmeSayaci.sifirla(); },
        diyalog: diyalogSunucudan, gorev: (g) => { void gorevSunucudan(g); }, ganimetDustu: ganimetDustuSunucudan, tasimaCevabi: tasimaCevabiSunucudan, dayanim: (yuva, d) => { const e = yuva < 14 ? oyuncu.ekipman[yuva] : oyuncu.envanter[yuva - 14]; if (e) { e.suru = d; envanterYenile(); } }, tamirCevabi: tamirCevabiSunucudan, esyaAdedi: (l) => { for (const g of l) { const e = oyuncu.envanter[g.yuva]; if (e && (e.sunucuNo ?? e.no) === g.no) { if (g.adet <= 0) oyuncu.envanter[g.yuva] = null; else e.adet = g.adet; } } envanterYenile(); }, esyaSilindi: silmeSunucudan, magaza: magazaSunucudan, banka: bankaSunucudan, sohbet: sohbetSunucudan, ozelHedef: ozelHedefSunucudan, kutuIcerigi: kutuIcerigiSunucudan, almaCevabi: almaCevabiSunucudan,
        parti: (p) => {
          if (p.tur === 'hata') { partidayiz = false; hud.mesaj(p.metin, 'sistem'); }
          else if (p.tur === 'uye') { const i = partiUyeleri.findIndex((u) => u.id === p.uye.id); if (i >= 0) partiUyeleri[i] = p.uye; else { partiUyeleri.push(p.uye); if (p.uye.id !== benimSoketNo) hud.mesaj(`${p.uye.ad} joined the party.`, 'sistem'); } partidayiz = true; if (partiUyeleri.length >= 2 && arayuz && !arayuz.genel.acik('re_el_party')) void arayuz.genel.ac('re_el_party'); }
          else if (p.tur === 'cikti') { const u = partiUyeleri.find((x) => x.id === p.id); if (p.id === benimSoketNo) { partiTemizle(); hud.mesaj('You left the party.', 'sistem'); } else if (u) { partiUyeleri = partiUyeleri.filter((x) => x.id !== p.id); hud.mesaj(`${u.ad} left the party.`, 'sistem'); if (partiUyeleri.length < 2) partiTemizle(); } }
          else if (p.tur === 'dagildi') { partiTemizle(); hud.mesaj('The party was disbanded.', 'sistem'); }
          else if (p.tur === 'can') { const u = partiUyeleri.find((x) => x.id === p.id); if (u) { u.enCokCan = p.enCokCan; u.can = p.can; u.enCokMana = p.enCokMana; u.mana = p.mana; } }
          else if (p.tur === 'seviye') { const u = partiUyeleri.find((x) => x.id === p.id); if (u) u.seviye = p.seviye; }
          else if (p.tur === 'sinif') { const u = partiUyeleri.find((x) => x.id === p.id); if (u) u.sinif = p.sinif; }
          else if (p.tur === 'davet') {
            // Biri bizi partiye çağırıyor: kabul/ret sunucuya bildirilir
            const kabul = confirm(`${p.ad} invites you to a party. Accept?`);
            sunucuOturumu?.gonder(WIZ.PARTI, partiDavetCevabi(kabul));
            hud.mesaj(kabul ? `You accepted ${p.ad}'s party invitation.` : 'You declined the party invitation.', 'sistem');
          }
        },
        isinlanma: (p) => {
          if (p.tur === 'liste') kapiListesiGoster(p.kapilar);
          else if (p.kod === 2) hud.mesaj(`You need to be at least level ${p.enDusukSeviye ?? '?'} to enter.`, 'sistem');
          else if (p.kod !== 1) hud.mesaj(ISINLANMA_HATALARI[p.kod] ?? 'You cannot use this gate.', 'sistem');
        },
        nesneOlayi: () => hud.mesaj('You cannot use this gate.', 'sistem'),
        bolgeDegisimi: (govde) => {
          const alt = govde[0];
          if (alt === BOLGE_DEGISIMI.ISINLANMA) {
            const b = bolgeIsinlanmasi(govde), harita = b ? BOLGE_HARITASI[b.bolge] : undefined;
            if (!b || !harita) { hud.mesaj('This zone is not available in the browser client yet.', 'sistem'); return; }
            if (harita === HARITA.toLowerCase()) { oyuncu.isinla(b.x, b.z, arazi); return; } // aynı harita (ör. Luna Valley girişi): yalnız konum değişir
            bekleyenBolge = { harita }; sunucuOturumu?.gonder(WIZ.BOLGE_DEGISIMI, bolgeDegisimiIstegi(BOLGE_DEGISIMI.YUKLENIYOR));
          } else if (alt === BOLGE_DEGISIMI.YUKLENDI && bekleyenBolge) {
            const h = bekleyenBolge.harita; bekleyenBolge = null;
            sunucuOturumu?.gonder(WIZ.BOLGE_DEGISIMI, bolgeDegisimiIstegi(BOLGE_DEGISIMI.YUKLENDI));
            setTimeout(() => haritayaGec(h, 3500), 400);
          }
        },
        yenidenDogdu: (x, z) => { oyuncu.isinla(x, z, arazi); oyuncu.hedef = null; oyuncu.yuruHedef = null; oyuncu.buflar = []; kalk(); oyuncu.model?.oynat('bekle'); hud.mesaj('You have been revived.', 'sistem'); },
      });
      const dunya = sunucuDunyasi;
      s.akisaGec((p) => dunya.paketIsle(p));
      // Hareketi sunucuya bildir (savaşçı/büyücü/rahip sınıflarında sunucu hız sınırı 6,7 m/sn, diğerlerinde 4,5).
      hareketGonderici = new HareketGonderici((govde) => s.gonder(WIZ.HAREKET, govde), oyuncu.gm ? 400 : [1, 5, 6].includes(oyuncu.sinif % 100) ? 67 : 45); // GM: sunucu hız sınırı uygulamaz
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
