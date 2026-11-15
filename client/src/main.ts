// KnightEmpire — tarayıcı istemcisi giriş noktası (tek oyunculu mod).
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';
import { animBilgisiYukle, silahBilgisiYukle } from './dunya/karakter';
import { Hud } from './arayuz/hud';
import { OyunArayuzu } from './arayuz/oyunArayuzu';
import { Canavar, GanimetKutusu, Npc, type NpcTanimi, Oyuncu, Varlik, acıyaYaklas } from './oyun/varliklar';
import { HARITALAR, VARSAYILAN_AYAR } from './oyun/haritalar';
import { type BeceriKurali, canavarTurleri, kurallar, OYUNCU_MODELI, OYUNCU_SES_MODELI, kurallariYukle, esyalariYukle, ganimetUret, gerekenDeneyim, rastgele } from './oyun/veri';
import * as savas from './oyun/savas';
import { Ses } from './oyun/ses';
import { CanavarYoneticisi, type YerlesimKaydi } from './oyun/yerlesim';
import { beceriVurusu, canavarVurusu, oyuncuVurusu, vurusAraligi } from './oyun/savas';

const parametre = new URLSearchParams(location.search);
const HARITA = parametre.get('harita') ?? 'new_runawar';
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
const DIREKSIYON_HIZI = 2.4;
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
  sahne.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b5a45, 1.6));
  const gunes = new THREE.DirectionalLight(0xfff2dd, 1.8);
  gunes.position.set(40, 80, -30);
  sahne.add(gunes);

  durum('Loading terrain…');
  const arazi = await Arazi.yukle(`/harita/${HARITA}`);
  arazi.sisAyarla(SIS, 150, 600);
  sahne.add(arazi.mesh);
  durum('Loading objects…');
  try { sahne.add(await nesneleriYukle(`/harita/${HARITA}/nesneler.glb`)); } catch (e) { console.warn('Nesneler yüklenemedi', e); }
  durum('Loading characters…');
  await Promise.all([animBilgisiYukle(), silahBilgisiYukle(), esyalariYukle(), kurallariYukle()]);

  const hud = new Hud();
  const ses = new Ses();
  await ses.yukle();
  if (ayar.bolge) ses.muzikCal(ayar.bolge);
  const oyuncu = new Oyuncu();
  oyuncu.kurallariUygula();
  oyuncu.baslangicEsyalariVer();
  Varlik.arazi = arazi;
  const baslangic = new THREE.Vector2(...(ayar.baslangic ?? [arazi.genislik / 2, arazi.genislik / 2]));
  oyuncu.isinla(baslangic.x, baslangic.y, arazi);
  await oyuncu.modelYukle(Number(parametre.get('model')) || OYUNCU_MODELI);
  sahne.add(oyuncu.grup);

  // Canavarlar: başlangıç noktasının çevresine, türüne göre ayrı bölgelere (güvenli şehirlerde yok)
  const canavarlar: Canavar[] = [];
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
  // Orijinal kamera ayarı (Data/DefaultCamera.N3Camera): 55° görüş açısı, yakın 0,7, uzak 512; sis de uzak düzlemde biter.
  try {
    const ka = await (await fetch('/oyun/kamera.json')).json() as { fov: number; yakin: number; uzak: number };
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
  const hizAl = () => (kosuyor ? OYUNCU_HIZI : OYUNCU_HIZI * 0.5) * oyuncu.hizCarpani; // hız buff'ı (Sprint) dahil
  const hareketAnimi = () => (kosuyor ? 'kos' : 'yuru');

  const simdiSn = () => performance.now() / 1000;
  /** Skill kullanımı (sunucu MagicInstance): seviye, MP, tekrar kullanım süresi; Type1 hedef ister, Type4 buff kendine uygulanır. */
  const beceriKullan = (no: number) => {
    const v = kurallar?.beceri[String(no)];
    if (!v || oyuncu.olu) return;
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
    kalk();
    oyuncu.mana -= v.msp;
    oyuncu.beceriBekleme.set(no, simdiSn() + v.yenidenKullanim * 0.09); // sunucu: ReCastTime × 90 ms
    oyuncu.savastanBeri = v.tip === 1 ? 0 : oyuncu.savastanBeri;
    if (v.tip === 1 && hedef) {
      oyuncu.bak(hedef.konum);
      oyuncu.animKilidi = oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08) || 0.8;
      ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
      oyuncu.saldiriSayaci = Math.max(oyuncu.saldiriSayaci, 0.6);
      vurusZamanlayici.push({ kalan: 0.45, hedef, beceri: v });
    } else if (v.tip4) {
      oyuncu.animKilidi = oyuncu.model?.oynat('buyu1', false, 0.1) || 0.8;
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
      esyaKusan: (i) => hud.esyaKusan(i), ipucuGoster: (e, ev) => hud.ipucuGoster(e, ev), ipucuGizle: () => hud.ipucuGizle(),
      mesaj: (t) => hud.mesaj(t, 'sistem'), statDegisti: () => {},
      otur: () => oturDegistir(), yuruKos: () => yuruKosDegistir(), esyaCikar: (p) => esyaCikar(p), beceriKullan: (no) => beceriKullan(no),
      durum: () => ({ oturuyor: !!oyuncu.model?.oturuyor, kosuyor }),
    });
    await a.baslat(); arayuz = a;
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
  hud.yenidenDog = () => {
    oyuncu.isinla(baslangic.x, baslangic.y, arazi); oyuncu.can = oyuncu.enCok; oyuncu.mana = oyuncu.enCokMana;
    oyuncu.hedef = null; oyuncu.yuruHedef = null; oyuncu.buflar = []; kalk(); oyuncu.model?.oynat('bekle');
    hud.mesaj('You have been revived.', 'sistem');
  };

  const tuslar = new Set<string>();
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return; // sohbet yazarken oyun tuşları çalışmasın
    tuslar.add(e.code);
    if (!e.repeat && arayuz?.tus(e.code)) { e.preventDefault(); if (e.code === 'Escape') { /* pencere kapandı */ } return; }
    if (e.code === 'Tab') {
      e.preventDefault();
      const yakin = canavarlar.filter((c) => !c.olu && c.konum.distanceTo(oyuncu.konum) < 40 && c !== oyuncu.hedef)
        .sort((a, b) => a.konum.distanceTo(oyuncu.konum) - b.konum.distanceTo(oyuncu.konum))[0];
      if (yakin) oyuncu.hedef = yakin;
    }
    if (e.code === 'Escape') { oyuncu.hedef = null; hud.ganimetAc(null); }
    if (!e.repeat && e.code === 'KeyC') oturDegistir();
    if (!e.repeat && e.code === 'KeyT') yuruKosDegistir();
    if (!e.repeat && e.code === 'KeyM') hud.mesaj(ses.sessizDegistir() ? 'Sound is off.' : 'Sound is on.', 'sistem');
  });
  addEventListener('keyup', (e) => tuslar.delete(e.code));

  const isin = new THREE.Raycaster();
  let acilacakKutu: GanimetKutusu | null = null;
  tuval.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || oyuncu.olu) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const npcVurus = isin.intersectObjects(npcler.map((n) => n.secimKutusu))[0];
    if (npcVurus) {
      const n = npcler.find((x) => x.secimKutusu === npcVurus.object)!;
      oyuncu.hedef = null; oyuncu.yuruHedef = n.konum.clone(); acilacakKutu = null;
      hud.mesaj(`${n.ad}: (conversation is not available yet)`, 'bilgi');
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
      oyuncu.hedef = canavarlar.find((c) => c.secimKutusu === canavarVurus.object) ?? null;
      oyuncu.yuruHedef = null; acilacakKutu = null;
      return;
    }
    const zemin = isin.intersectObject(arazi.mesh)[0];
    if (zemin) { oyuncu.yuruHedef = new THREE.Vector2(zemin.point.x, -zemin.point.z); oyuncu.hedef = null; acilacakKutu = null; }
  });

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

  let sonTusSayisi = 0;
  let yonKilidi: number | null = null;
  const vurusZamanlayici: { kalan: number; hedef: Canavar; beceri?: BeceriKurali }[] = [];
  const oyuncuGuncelle = (dt: number) => {
    oyuncu.model?.guncelle(dt);
    oyuncu.savastanBeri += dt;
    oyuncu.animKilidi = Math.max(0, oyuncu.animKilidi - dt);
    ses.dinleyici.copy(oyuncu.konum);
    // Elde taşınan silah/kalkan modeli (ekipman değişince yenilenir)
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

    const ileri = kamera.ileriYon();
    const sag = new THREE.Vector2(-ileri.y, ileri.x);
    const hareket = new THREE.Vector2();
    if (tuslar.has('KeyW')) hareket.add(ileri);
    if (tuslar.has('KeyS')) hareket.sub(ileri);
    if (tuslar.has('KeyD')) hareket.add(sag);
    if (tuslar.has('KeyA')) hareket.sub(sag);
    if (oyuncu.hedef?.olu) oyuncu.hedef = null;
    if (hareket.lengthSq() === 0) oyuncu.yuruAcisi = null;
    // Oturuyorken yeni bir hareket/saldırı isteği gelirse ayağa kalkılır
    if (oyuncu.model?.oturuyor && (hareket.lengthSq() > 0 || oyuncu.hedef || oyuncu.yuruHedef)) kalk();

    // Basılı yön tuşu sayısı: bir tuş bırakılınca (hâlâ başka tuş basılıyken) yön kilitlenir, yeni tuşa basılana ya da hepsi bırakılana kadar korunur.
    const tusSayisi = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].filter((k) => tuslar.has(k)).length;
    if (tusSayisi === 0 || tusSayisi > sonTusSayisi) yonKilidi = null;
    else if (tusSayisi < sonTusSayisi && yonKilidi === null) yonKilidi = oyuncu.yuruAcisi ?? oyuncu.bakisAcisi;
    sonTusSayisi = tusSayisi;

    if (hareket.lengthSq() > 0) {
      oyuncu.yuruHedef = null; acilacakKutu = null;
      hareket.normalize();
      // İstenen yön (kamera yönü (x, -z) → dünya (x, z)); gidiş yönü ona sınırlı hızla döner → yumuşak kavisler.
      const direksiyon = tuslar.has('KeyW') && tuslar.has('KeyA') !== tuslar.has('KeyD'); // W + A ya da D: tuş basılı kaldıkça sürekli dön
      const istenen = yonKilidi ?? Math.atan2(-hareket.y, hareket.x);
      if (direksiyon) oyuncu.yuruAcisi = (oyuncu.yuruAcisi ?? oyuncu.bakisAcisi) + (tuslar.has('KeyA') ? 1 : -1) * DIREKSIYON_HIZI * dt;
      else oyuncu.yuruAcisi = acıyaYaklas(oyuncu.yuruAcisi ?? oyuncu.bakisAcisi, istenen, YURUME_DONUS_HIZI * dt);
      let fark = Math.abs(istenen - oyuncu.yuruAcisi) % (Math.PI * 2);
      if (fark > Math.PI) fark = Math.PI * 2 - fark;
      const hizCarpani = direksiyon ? 1 : 0.55 + 0.45 * Math.max(0, Math.cos(fark)); // dönerken yavaşlar
      oyuncu.ilerle(new THREE.Vector2(Math.cos(oyuncu.yuruAcisi), Math.sin(oyuncu.yuruAcisi)), hizAl() * dt * hizCarpani);
      oyuncu.model?.oynat(hareketAnimi());
    } else if (oyuncu.hedef) {
      const h = oyuncu.hedef;
      if (oyuncu.konum.distanceTo(h.konum) > SALDIRI_MENZILI) {
        oyuncu.yuru(h.konum, hizAl() * dt, SALDIRI_MENZILI - 0.3);
        oyuncu.model?.oynat(hareketAnimi());
      } else {
        oyuncu.bak(h.konum);
        oyuncu.saldiriSayaci -= dt;
        if (oyuncu.saldiriSayaci <= 0) {
          oyuncu.saldiriSayaci = vurusAraligi(oyuncu.silah); // silahın gecikmesi (eşya tablosu)
          oyuncu.savastanBeri = 0;
          oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08);
          ses.modelSesi(OYUNCU_SES_MODELI, 'saldir');
          vurusZamanlayici.push({ kalan: 0.45, hedef: h });
        } else if (oyuncu.saldiriSayaci < 0.4) oyuncu.model?.oynat('savun');
      }
    } else if (oyuncu.yuruHedef) {
      if (oyuncu.yuru(oyuncu.yuruHedef, hizAl() * dt, acilacakKutu ? 1.5 : 0)) {
        oyuncu.yuruHedef = null;
        if (acilacakKutu && kutular.includes(acilacakKutu)) hud.ganimetAc(acilacakKutu);
        acilacakKutu = null;
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
      if (vurus && vurus.hasar <= 0) { hud.mesaj(`${c.tur.ad} attacks but misses.`, 'bilgi'); if (!oyuncu.hedef) oyuncu.hedef = c; }
      if (vurus && vurus.hasar > 0) {
        const net = oyuncu.hasarAl(vurus.hasar);
        ses.modelSesi(OYUNCU_SES_MODELI, oyuncu.olu ? 'olum' : 'darbe');
        kalk(); // hasar alınca ayağa kalkılır
        hud.mesaj(`${c.tur.ad} hits you for ${net} damage.`, 'hasar');
        if (oyuncu.olu) { hud.mesaj(`You were slain by ${c.tur.ad}.`, 'hasar'); oyuncu.hedef = null; }
        else if (!oyuncu.hedef) oyuncu.hedef = c; // karşılık ver
      }
      if (c.olu) {
        if (!c.ganimetBirakildi && c.oluSuresi > 1.2) {
          c.ganimetBirakildi = true;
          const g = ganimetUret(c.tur.seviye);
          const k = new GanimetKutusu(c.konum.x, c.konum.y, g.altin, g.esyalar);
          kutular.push(k); sahne.add(k.grup);
        }
        if (c.oluSuresi > 5) c.grup.visible = false;
        if (c.oluSuresi > c.dogusSure) c.yenidenDog(); // sunucu RegTime
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

  const izdusum = (c: Canavar | Npc) => {
    const p = c.grup.position.clone(); p.y += c instanceof Npc ? 2.1 * (c.tanim.boyut / 100) : 2.3 * c.tur.olcek;
    const ekran = p.project(kamera.kamera);
    return { x: (ekran.x * 0.5 + 0.5) * innerWidth, y: (-ekran.y * 0.5 + 0.5) * innerHeight, gorunur: ekran.z < 1 && c.konum.distanceTo(oyuncu.konum) < (c instanceof Npc ? 60 : 45) };
  };

  const saat = new THREE.Clock();
  document.getElementById('yukleniyor')?.remove();
  cizici.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.1);
    oyuncuGuncelle(dt);
    yonetici?.guncelle(dt);
    canavarlariGuncelle(dt);
    npcleriGuncelle(dt);
    oyuncu.sahneyeYerlestir(arazi);
    kamera.guncelle(oyuncu.grup.position, (x, z) => arazi.yukseklikAl(x, -z), dt,
      arazi.carpisma ? (a, b) => arazi.carpisma!.dogruKesisimi(a.x, a.y, -a.z, b.x, b.y, -b.z) : undefined); // sahne z'si = −z (KO dünyası)
    hud.guncelle(oyuncu, oyuncu.hedef);
    arayuz?.guncelle(dt);
    hud.etiketGuncelle(canavarlar, izdusum, oyuncu.hedef);
    hud.npcEtiketGuncelle(npcler, izdusum);
    cizici.render(sahne, kamera.kamera);
  });
  (window as unknown as { ke: unknown }).ke = { npcler, sahne, kamera, oyuncu, canavarlar, kutular, arazi, hud, savas, yonetici, ses };
}

basla().catch((e) => { durum('Error: ' + (e as Error).message); console.error(e); });
