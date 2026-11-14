// Karakter/canavar -> glTF (.glb): iskelet + deri + animasyonlar.
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { GlbYazici } from './gltf.ts';
import { dokuPng } from './dokuYardim.ts';
import { animOku, deriOku, eklemDizisi, eklemOku, parcaOku, type Eklem } from './karakter.ts';

const KARE_HIZI = 30; // Knight Online animasyon kare birimi (kare/sn)
/** .n3anim kayıt sırası her modelde aynı; özgün adlar modele göre değiştiği için standart adlar verilir. */
const ROLLER = ['bekle', 'yuru', 'kos', 'geri', 'saldir0', 'saldir1', 'darbe0', 'darbe1', 'darbe2', 'savun', 'olum0', 'olum1', 'konus0', 'konus1', 'konus2', 'konus3', 'buyu0', 'buyu1'];

/**
 * Standart animasyon adı. Özgün ad bilinen bir adsa ona göre (oturma animasyonları dahil), değilse eski sıra tablosuna göre verilir.
 * Aynı ad iki kez çıkarsa (ör. iki "attack0") ailedeki sıradaki boş ad seçilir (saldir0 → saldir1).
 */
const AILELER: [RegExp, string[]][] = [
  [/^breath$/i, ['bekle']], [/^walk$/i, ['yuru']], [/^run$/i, ['kos']], [/^walk_(reverse|backward)$/i, ['geri']],
  [/^attack\d?$/i, ['saldir0', 'saldir1', 'saldir2']], [/^struck\d$/i, ['darbe0', 'darbe1', 'darbe2']], [/^guard$/i, ['savun']],
  [/^dead\d$/i, ['olum0', 'olum1', 'olum2']], [/^talk\d$/i, ['konus0', 'konus1', 'konus2', 'konus3']],
  [/^(spellmagic\d|magic_attack)$/i, ['buyu0', 'buyu1']],
  [/^(breath_sit|sitdown_breath)$/i, ['otur']], [/^sitdown$/i, ['oturBasla']], [/^0?standup$/i, ['kalk']],
];
export function animAdi(ozgun: string, sira: number, kullanilan: string[]): string {
  for (const [desen, aile] of AILELER) {
    if (!desen.test(ozgun)) continue;
    const bos = aile.find((x) => !kullanilan.includes(x));
    if (bos) return bos;
    break;
  }
  const eski = ROLLER[sira];
  if (eski && !kullanilan.includes(eski)) return eski;
  let ad = `${sira}_${ozgun}`;
  while (kullanilan.includes(ad)) ad += '_';
  return ad;
}

// ---- 4x4 matris (sütun öncelikli, glTF düzeni) ----
type M4 = Float64Array;
function trs(t: number[], q: number[], s: number[]): M4 {
  const [x, y, z, w] = q;
  const m = new Float64Array(16);
  m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
  m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
  m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}
function carp(a: M4, b: M4): M4 {
  const c = new Float64Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
    c[i * 4 + j] = s;
  }
  return c;
}
function ters(m: M4): M4 {
  // Afin matris tersi (3x3 + öteleme)
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const r = new Float64Array(16);
  const inv = [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  r[0] = inv[0]; r[4] = inv[1]; r[8] = inv[2]; r[1] = inv[3]; r[5] = inv[4]; r[9] = inv[5]; r[2] = inv[6]; r[6] = inv[7]; r[10] = inv[8];
  const tx = m[12], ty = m[13], tz = m[14];
  r[12] = -(r[0] * tx + r[4] * ty + r[8] * tz); r[13] = -(r[1] * tx + r[5] * ty + r[9] * tz); r[14] = -(r[2] * tx + r[6] * ty + r[10] * tz); r[15] = 1;
  return r;
}
// Knight Online (sol el) -> glTF (sağ el) dönüşümleri
const kT = (t: number[]) => [t[0], t[1], -t[2]];
const kQ = (q: number[]) => [-q[0], -q[1], q[2], q[3]];

/**
 * Derinin bağlandığı (bind) poz: anahtar dizisinin 0. karesi. Başlıktaki poz (e.konum/e.donus) çoğu NPC iskeletinde buna eşittir,
 * ama oyuncu iskeletlerinde (upc_el_rm) başlıkta kollar aşağıdadır, deri ise 0. karedeki T-pozda modellenmiştir (kanıt: docs/formatlar/model.md).
 */
function baglanmaPozu(e: Eklem): { konum: [number, number, number]; donus: [number, number, number, number]; olcek: [number, number, number] } {
  const ilk = (k: { deger: Float32Array; bilesen: number } | null) => (k && k.deger.length >= k.bilesen ? Array.from(k.deger.subarray(0, k.bilesen)) : null);
  const k = ilk(e.kKonum), d = ilk(e.kDonus), o = ilk(e.kOlcek);
  return { konum: (k ?? e.konum) as [number, number, number], donus: (d ?? e.donus) as [number, number, number, number], olcek: (o ?? e.olcek) as [number, number, number] };
}

export interface KarakterTanimi { ad: string; iskelet: string; animasyon: string; parcalar: string[] }
export interface KarakterRaporu {
  kemik: number; parca: number; animasyonlar: string[]; boyut: number;
  animBilgi: Record<string, { hiz: number; vurus: number | null; sure: number }>;
}

export function karakterGlb(od: OyunDosyalari, t: KarakterTanimi): { glb: Buffer; rapor: KarakterRaporu } {
  const kok = eklemOku(od.oku(t.iskelet));
  const eklemler = eklemDizisi(kok);
  const g = new GlbYazici();

  // İskelet düğümleri (ön-sıra numaralarıyla aynı sırada)
  const dugumNo = new Map<Eklem, number>();
  const dunya = new Map<Eklem, M4>();
  const kur = (e: Eklem, ebeveyn: M4 | null): number => {
    const b = baglanmaPozu(e);
    const yerel = trs(kT(b.konum), kQ(b.donus), b.olcek);
    dunya.set(e, ebeveyn ? carp(ebeveyn, yerel) : yerel);
    const no = g.dugum({ ad: e.ad, konum: b.konum, donus: b.donus, olcek: b.olcek });
    dugumNo.set(e, no);
    const cocuklar = e.cocuklar.map((c) => kur(c, dunya.get(e)!));
    if (cocuklar.length) (g.json.nodes[no] as Record<string, unknown>).children = cocuklar;
    return no;
  };
  const kokNo = kur(kok, null);
  const ibm = new Float32Array(eklemler.length * 16);
  eklemler.forEach((e, i) => ibm.set(ters(dunya.get(e)!), i * 16));
  g.json.skins = [{ joints: eklemler.map((e) => dugumNo.get(e)!), inverseBindMatrices: g.erisimci(ibm, 'MAT4'), skeleton: kokNo }];

  // Deri parçaları
  const primitifler = [];
  for (const p of t.parcalar) {
    if (!p || !od.var(p)) continue;
    try {
      const parca = parcaOku(od.oku(p));
      if (!parca.deri || !od.var(parca.deri)) continue;
      const d = deriOku(od.oku(parca.deri));
      const doku = dokuPng(od, parca.doku);
      const mz = g.malzeme(parca.doku, doku?.png ?? null, doku?.alfa === 'BLEND' ? 'MASK' : doku?.alfa ?? 'OPAQUE', doku ? doku.alfa !== 'OPAQUE' : false);
      for (let i = 0; i < d.kemik.length; i++) if (d.kemik[i] >= eklemler.length) d.kemik[i] = 0;
      primitifler.push({ konum: d.konum, normal: d.normal, uv: d.uv, indeks: d.indeks, malzeme: mz, kemikler: d.kemik, agirliklar: d.agirlik });
    } catch (e) { console.log(`  uyarı: ${p}: ${(e as Error).message}`); }
  }
  const mesh = g.mesh(t.ad, primitifler);
  const govde = g.dugum({ ad: t.ad + '_govde', mesh, skin: 0 });
  g.dugum({ ad: t.ad, cocuklar: [kokNo, govde] }, true);

  // Animasyonlar: her kayıt eklem anahtarlarından bir zaman aralığı keser
  const animlar = od.var(t.animasyon) ? animOku(od.oku(t.animasyon)) : [];
  g.json.animations = [];
  const adlar: string[] = [];
  const hizlar: Record<string, { hiz: number; vurus: number | null; sure: number }> = {};
  for (const [sira, a] of animlar.entries()) {
    const t0 = a.bas / KARE_HIZI, t1 = Math.max(a.son, a.bas) / KARE_HIZI;
    const kanallar: Record<string, unknown>[] = [], ornekleyiciler: Record<string, unknown>[] = [];
    for (const e of eklemler) {
      for (const [yol, k] of [['translation', e.kKonum], ['rotation', e.kDonus], ['scale', e.kOlcek]] as const) {
        if (!k || k.oran <= 0) continue;
        const adet = k.deger.length / k.bilesen;
        const i0 = Math.max(0, Math.floor(t0 * k.oran)), i1 = Math.min(adet - 1, Math.ceil(t1 * k.oran));
        if (i1 < i0) continue;
        const zaman = new Float32Array(i1 - i0 + 1), deger = new Float32Array((i1 - i0 + 1) * k.bilesen);
        for (let i = i0; i <= i1; i++) {
          zaman[i - i0] = Math.max(0, i / k.oran - t0);
          const v = Array.from(k.deger.subarray(i * k.bilesen, (i + 1) * k.bilesen));
          deger.set(yol === 'translation' ? kT(v) : yol === 'rotation' ? kQ(v) : v, (i - i0) * k.bilesen);
        }
        ornekleyiciler.push({ input: g.erisimci(zaman, 'SCALAR', undefined, true), output: g.erisimci(deger, k.bilesen === 4 ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' });
        kanallar.push({ sampler: ornekleyiciler.length - 1, target: { node: dugumNo.get(e)!, path: yol } });
      }
    }
    if (!kanallar.length) continue;
    const ad = animAdi(a.ad, sira, adlar);
    g.json.animations.push({ name: ad, channels: kanallar, samplers: ornekleyiciler, extras: { ozgunAd: a.ad, hiz: a.hiz / KARE_HIZI, vurus: a.vurus > a.bas ? (a.vurus - a.bas) / KARE_HIZI : null } });
    adlar.push(ad);
    hizlar[ad] = { hiz: a.hiz / KARE_HIZI, vurus: a.vurus > a.bas ? (a.vurus - a.bas) / KARE_HIZI : null, sure: (Math.max(a.son, a.bas) - a.bas) / KARE_HIZI };
  }
  const glb = g.glb();
  return { glb, rapor: { kemik: eklemler.length, parca: primitifler.length, animasyonlar: adlar, animBilgi: hizlar, boyut: glb.length } };
}
