// KnightEmpire — tarayıcı istemcisi giriş noktası (tek oyunculu mod).
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';
import { animBilgisiYukle } from './dunya/karakter';
import { Hud } from './arayuz/hud';
import { Canavar, GanimetKutusu, Npc, type NpcTanimi, Oyuncu, Varlik } from './oyun/varliklar';
import { HARITALAR, VARSAYILAN_AYAR } from './oyun/haritalar';
import { CANAVARLAR, OYUNCU_MODELI, esyalariYukle, ganimetUret, gerekenDeneyim, rastgele, rastgeleTam } from './oyun/veri';

const parametre = new URLSearchParams(location.search);
const HARITA = parametre.get('harita') ?? 'new_runawar';
const ayar = HARITALAR[HARITA] ?? VARSAYILAN_AYAR;
const SIS = new THREE.Color(0x9fb4c8);
const SALDIRI_MENZILI = 2.6;
const OYUNCU_HIZI = 6.5;

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
  await Promise.all([animBilgisiYukle(), esyalariYukle()]);

  const hud = new Hud();
  const oyuncu = new Oyuncu();
  Varlik.arazi = arazi;
  const baslangic = new THREE.Vector2(...(ayar.baslangic ?? [arazi.genislik / 2, arazi.genislik / 2]));
  oyuncu.isinla(baslangic.x, baslangic.y, arazi);
  await oyuncu.modelYukle(OYUNCU_MODELI);
  sahne.add(oyuncu.grup);

  // Canavarlar: başlangıç noktasının çevresine, türüne göre ayrı bölgelere (güvenli şehirlerde yok)
  const canavarlar: Canavar[] = [];
  for (const [i, tur] of (ayar.canavar ? CANAVARLAR : []).entries()) {
    const aci = (i / CANAVARLAR.length) * Math.PI * 2;
    const merkez = new THREE.Vector2(baslangic.x + Math.cos(aci) * (22 + i * 9), baslangic.y + Math.sin(aci) * (22 + i * 9));
    for (let k = 0; k < tur.adet; k++) {
      const c = new Canavar(tur, merkez.x + rastgele(-10, 10), merkez.y + rastgele(-10, 10));
      try { await c.modelYukle(); } catch (e) { console.warn('Canavar modeli yüklenemedi', tur.ad, e); continue; }
      sahne.add(c.grup);
      canavarlar.push(c);
    }
  }
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
  const boyut = () => { cizici.setSize(innerWidth, innerHeight, false); kamera.boyutlandir(innerWidth, innerHeight); };
  addEventListener('resize', boyut); boyut();

  hud.mesaj('Welcome to KnightEmpire!', 'sistem');
  hud.mesaj(ayar.canavar ? 'Hunt monsters, open the chests they drop and level up.' : 'You are in a safe town. Explore with WASD or by clicking the ground.', 'sistem');

  // ---------------- Olaylar ----------------
  const envanterYenile = () => hud.envanterCiz(oyuncu);
  envanterYenile();
  hud.esyaKusan = (i) => {
    const e = oyuncu.envanter[i];
    if (!e) return;
    if (e.tur === 'silah') { oyuncu.envanter[i] = oyuncu.silah; oyuncu.silah = e; }
    else { oyuncu.envanter[i] = oyuncu.zirh; oyuncu.zirh = e; }
    hud.mesaj(`You equipped ${e.ad}.`, 'sistem');
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
    oyuncu.hedef = null; oyuncu.yuruHedef = null; oyuncu.model?.oynat('bekle');
    hud.mesaj('You have been revived.', 'sistem');
  };

  const tuslar = new Set<string>();
  addEventListener('keydown', (e) => {
    tuslar.add(e.code);
    if (e.code === 'KeyI') hud.envanterAcKapa();
    if (e.code === 'Tab') {
      e.preventDefault();
      const yakin = canavarlar.filter((c) => !c.olu && c.konum.distanceTo(oyuncu.konum) < 40 && c !== oyuncu.hedef)
        .sort((a, b) => a.konum.distanceTo(oyuncu.konum) - b.konum.distanceTo(oyuncu.konum))[0];
      if (yakin) oyuncu.hedef = yakin;
    }
    if (e.code === 'Escape') { oyuncu.hedef = null; hud.ganimetAc(null); }
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
      oyuncu.enCok += 25; oyuncu.can = oyuncu.enCok;
      oyuncu.enCokMana += 10; oyuncu.mana = oyuncu.enCokMana;
      hud.mesaj(`Level up! You are now level ${oyuncu.seviye}.`, 'sistem');
      envanterYenile();
    }
  };

  const vurusZamanlayici: { kalan: number; hedef: Canavar }[] = [];
  const oyuncuGuncelle = (dt: number) => {
    oyuncu.model?.guncelle(dt);
    oyuncu.savastanBeri += dt;
    if (oyuncu.olu) return;
    // Yenilenme (savaş dışında hızlı)
    const yenilenme = oyuncu.savastanBeri > 6 ? 8 : 0.6;
    oyuncu.can = Math.min(oyuncu.enCok, oyuncu.can + yenilenme * dt);
    oyuncu.mana = Math.min(oyuncu.enCokMana, oyuncu.mana + 3 * dt);

    const ileri = kamera.ileriYon();
    const sag = new THREE.Vector2(-ileri.y, ileri.x);
    const hareket = new THREE.Vector2();
    if (tuslar.has('KeyW')) hareket.add(ileri);
    if (tuslar.has('KeyS')) hareket.sub(ileri);
    if (tuslar.has('KeyD')) hareket.add(sag);
    if (tuslar.has('KeyA')) hareket.sub(sag);
    if (oyuncu.hedef?.olu) oyuncu.hedef = null;

    if (hareket.lengthSq() > 0) {
      oyuncu.yuruHedef = null; acilacakKutu = null;
      hareket.normalize().multiplyScalar(OYUNCU_HIZI * dt);
      const hedefNokta = new THREE.Vector2(oyuncu.konum.x + hareket.x, oyuncu.konum.y - hareket.y);
      oyuncu.yuru(hedefNokta, OYUNCU_HIZI * dt);
      oyuncu.model?.oynat('kos');
    } else if (oyuncu.hedef) {
      const h = oyuncu.hedef;
      if (oyuncu.konum.distanceTo(h.konum) > SALDIRI_MENZILI) {
        oyuncu.yuru(h.konum, OYUNCU_HIZI * dt, SALDIRI_MENZILI - 0.3);
        oyuncu.model?.oynat('kos');
      } else {
        oyuncu.bak(h.konum);
        oyuncu.saldiriSayaci -= dt;
        if (oyuncu.saldiriSayaci <= 0) {
          oyuncu.saldiriSayaci = 1.2;
          oyuncu.savastanBeri = 0;
          oyuncu.model?.oynat(Math.random() < 0.5 ? 'saldir0' : 'saldir1', false, 0.08);
          vurusZamanlayici.push({ kalan: 0.45, hedef: h });
        } else if (oyuncu.saldiriSayaci < 0.4) oyuncu.model?.oynat('savun');
      }
    } else if (oyuncu.yuruHedef) {
      if (oyuncu.yuru(oyuncu.yuruHedef, OYUNCU_HIZI * dt, acilacakKutu ? 1.5 : 0)) {
        oyuncu.yuruHedef = null;
        if (acilacakKutu && kutular.includes(acilacakKutu)) hud.ganimetAc(acilacakKutu);
        acilacakKutu = null;
        oyuncu.model?.oynat('bekle');
      } else oyuncu.model?.oynat('kos');
    } else if (oyuncu.saldiriSayaci <= 0.4 || !oyuncu.model?.aktifAd.startsWith('saldir')) {
      oyuncu.model?.oynat('bekle');
    }
    oyuncu.konum.x = THREE.MathUtils.clamp(oyuncu.konum.x, 2, arazi.genislik - 2);
    oyuncu.konum.y = THREE.MathUtils.clamp(oyuncu.konum.y, 2, arazi.genislik - 2);
  };

  const canavarlariGuncelle = (dt: number) => {
    for (let i = vurusZamanlayici.length - 1; i >= 0; i--) {
      const v = vurusZamanlayici[i];
      v.kalan -= dt;
      if (v.kalan > 0) continue;
      vurusZamanlayici.splice(i, 1);
      if (v.hedef.olu || oyuncu.olu) continue;
      const [h0, h1] = oyuncu.hasarAraligi();
      const kritik = Math.random() < 0.1;
      const hasar = Math.round(rastgeleTam(h0, h1) * (kritik ? 1.8 : 1));
      v.hedef.hasarAl(hasar);
      hud.mesaj(`${kritik ? 'Critical! ' : ''}You hit ${v.hedef.tur.ad} for ${hasar} damage.`, 'bilgi');
      if (v.hedef.olu) {
        hud.mesaj(`${v.hedef.tur.ad} has been defeated.`, 'sistem');
        deneyimKazan(v.hedef.tur.seviye * 18 + rastgeleTam(0, 6));
      }
    }
    for (const c of canavarlar) {
      const hasar = c.guncelle(dt, oyuncu);
      if (hasar > 0) {
        const net = oyuncu.hasarAl(hasar);
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
        if (c.oluSuresi > 25) c.yenidenDog();
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
    canavarlariGuncelle(dt);
    npcleriGuncelle(dt);
    oyuncu.sahneyeYerlestir(arazi);
    kamera.guncelle(oyuncu.grup.position, (x, z) => arazi.yukseklikAl(x, -z));
    hud.guncelle(oyuncu, oyuncu.hedef);
    hud.etiketGuncelle(canavarlar, izdusum, oyuncu.hedef);
    hud.npcEtiketGuncelle(npcler, izdusum);
    cizici.render(sahne, kamera.kamera);
  });
  (window as unknown as { ke: unknown }).ke = { npcler, sahne, kamera, oyuncu, canavarlar, kutular, arazi, hud };
}

basla().catch((e) => { durum('Error: ' + (e as Error).message); console.error(e); });
