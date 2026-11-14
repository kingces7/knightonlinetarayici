// KnightEmpire — tarayıcı istemcisi giriş noktası.
import * as THREE from 'three';
import { Arazi } from './dunya/arazi';
import { nesneleriYukle } from './dunya/nesneler';
import { TakipKamerasi } from './dunya/kamera';

const HARITA = new URLSearchParams(location.search).get('harita') ?? 'new_runawar';
const SIS = new THREE.Color(0x9fb4c8);

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

  // Geçici oyuncu (karakter modeli gelene kadar)
  const oyuncu = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.0, 4, 12), new THREE.MeshLambertMaterial({ color: 0xc8a050 }));
  const konum = new THREE.Vector2(arazi.genislik / 2, arazi.genislik / 2); // Knight Online (x, z)
  const yukseklik = (x: number, zSahne: number) => arazi.yukseklikAl(x, -zSahne);
  sahne.add(oyuncu);

  const kamera = new TakipKamerasi(tuval);
  const boyut = () => { cizici.setSize(innerWidth, innerHeight, false); kamera.boyutlandir(innerWidth, innerHeight); };
  addEventListener('resize', boyut); boyut();

  // Kontroller: WASD + sol tık ile yürüme
  const tuslar = new Set<string>();
  addEventListener('keydown', (e) => tuslar.add(e.code));
  addEventListener('keyup', (e) => tuslar.delete(e.code));
  let hedef: THREE.Vector2 | null = null;
  const isin = new THREE.Raycaster();
  tuval.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isin.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera.kamera);
    const h = isin.intersectObject(arazi.mesh)[0];
    if (h) hedef = new THREE.Vector2(h.point.x, -h.point.z);
  });

  const HIZ = 6; // m/sn (koşu)
  const saat = new THREE.Clock();
  document.getElementById('yukleniyor')?.remove();
  cizici.setAnimationLoop(() => {
    const dt = Math.min(saat.getDelta(), 0.1);
    const ileri = kamera.ileriYon(); // sahne (x, z)
    const sag = new THREE.Vector2(-ileri.y, ileri.x);
    const hareket = new THREE.Vector2();
    if (tuslar.has('KeyW')) hareket.add(ileri);
    if (tuslar.has('KeyS')) hareket.sub(ileri);
    if (tuslar.has('KeyD')) hareket.add(sag);
    if (tuslar.has('KeyA')) hareket.sub(sag);
    if (hareket.lengthSq() > 0) {
      hedef = null;
      hareket.normalize().multiplyScalar(HIZ * dt);
      konum.x += hareket.x; konum.y -= hareket.y; // sahne z = -KO z
    } else if (hedef) {
      const fark = hedef.clone().sub(konum);
      const d = fark.length();
      if (d < 0.2) hedef = null; else konum.add(fark.multiplyScalar(Math.min(1, (HIZ * dt) / d)));
    }
    konum.x = THREE.MathUtils.clamp(konum.x, 1, arazi.genislik - 1);
    konum.y = THREE.MathUtils.clamp(konum.y, 1, arazi.genislik - 1);
    const y = arazi.yukseklikAl(konum.x, konum.y);
    oyuncu.position.set(konum.x, y + 0.95, -konum.y);
    kamera.guncelle(new THREE.Vector3(konum.x, y, -konum.y), yukseklik);
    cizici.render(sahne, kamera.kamera);
  });
  (window as unknown as { oyun: unknown }).oyun = { sahne, kamera, konum, arazi };
}

basla().catch((e) => { durum('Error: ' + (e as Error).message); console.error(e); });
