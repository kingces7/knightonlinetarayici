// Harita suyu (nehir, kanal, deniz): .gtd dosyasının karo listesinden sonraki kuyruğu (CN3River düzeni; N3River.h başlığı + ikili inceleme).
// Köşe: 44 bayt = x,y,z, nx,ny,nz, D3DCOLOR (ARGB), u,v (dalga dokusu), u2,v2 (ikinci doku). Alan sırası hizasızdır (köşe dizileri 4 bayta oturmaz).
// İki biçim bulundu (14th_oldmoradon: 4 şerit + 2 ızgara):
//   - "serit": nehir/kanal; iki kıyı arasında zikzak ilerleyen üçgen şeridi (64–160 köşe). Köşelerden sonra int (indeks sayısı) ve dalga dokusu adı gelir.
//   - "izgara": deniz; 15 sütunlu satırlar (225 köşe = 15×15), dalga dokusu adı köşelerden ÖNCE gelir (öncesinde int 225 ve 15).
// Doğrulama: nehir köşeleri mini haritadaki (Zones/<harita>.dxt) nehir ve kanal yataklarına düşüyor (scripts değil, araclar/harita/nehir.test.ts).
export interface NehirKose { x: number; y: number; z: number; renk: number; u: number; v: number; u2: number; v2: number }
export interface Nehir { tur: 'serit' | 'izgara'; genislik: number; koseler: NehirKose[]; doku: string }

const KOSE = 44;

function makul(b: Buffer, o: number): boolean {
  if (o < 0 || o + KOSE > b.length) return false;
  const x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8), L = Math.hypot(b.readFloatLE(o + 12), b.readFloatLE(o + 16), b.readFloatLE(o + 20));
  return x > -3000 && x < 4200 && z > -3000 && z < 4200 && y > -200 && y < 200 && L > 0.95 && L < 1.05 && Math.abs(x) + Math.abs(z) > 1;
}

/** `kuyruk` = .gtd içinde karo listesinden sonraki bayt dizisi (gtdOku().bitis'ten itibaren). */
export function nehirleriOku(kuyruk: Buffer): Nehir[] {
  const sonuc: Nehir[] = [];
  for (let o = 0; o + KOSE <= kuyruk.length;) {
    if (!makul(kuyruk, o)) { o++; continue; }
    let n = 0; while (makul(kuyruk, o + n * KOSE)) n++;
    if (n < 6) { o++; continue; }
    const koseler: NehirKose[] = [];
    for (let i = 0; i < n; i++) {
      const p = o + i * KOSE;
      koseler.push({ x: kuyruk.readFloatLE(p), y: kuyruk.readFloatLE(p + 4), z: kuyruk.readFloatLE(p + 8), renk: kuyruk.readUInt32LE(p + 24), u: kuyruk.readFloatLE(p + 28), v: kuyruk.readFloatLE(p + 32), u2: kuyruk.readFloatLE(p + 36), v2: kuyruk.readFloatLE(p + 40) });
    }
    // Izgara mı? İlk 15 köşe aynı satırda (z neredeyse sabit), 16. köşe yeni satır
    const zs = koseler.slice(0, 15).map((k) => k.z);
    const izgara = n >= 30 && n % 15 === 0 && Math.max(...zs) - Math.min(...zs) < 8 && Math.abs(koseler[15].z - koseler[0].z) > 20;
    // Dalga dokusu adı: köşelerin hemen önünde (ızgara) ya da hemen sonrasında (şerit) ".dxt" metni
    const pencere = izgara ? kuyruk.subarray(Math.max(0, o - 40), o) : kuyruk.subarray(o + n * KOSE, o + n * KOSE + 40);
    const ad = /[A-Za-z0-9_]+\.dxt/i.exec(pencere.toString('latin1'))?.[0] ?? '';
    sonuc.push({ tur: izgara ? 'izgara' : 'serit', genislik: izgara ? 15 : 2, koseler, doku: ad });
    o += n * KOSE;
  }
  return sonuc;
}

/** Üçgen indeksleri: şerit için zikzak üçgen şeridi, ızgara için satır-sütun dörtgenleri. */
export function nehirUcgenleri(r: Nehir): number[] {
  const n = r.koseler.length, ind: number[] = [];
  if (r.tur === 'serit' && n % 4 === 0) { // 4 köşe genişliğinde ızgara (kıyı, orta, orta, kıyı); zikzak şerit sanılınca çapraz geniş dörtgenler çıkıyordu
    for (let s = 0; s + 1 < n / 4; s++) for (let c = 0; c < 3; c++) { const a = s * 4 + c, d = a + 4; ind.push(a, a + 1, d, a + 1, d + 1, d); }
  } else if (r.tur === 'serit') {
    for (let i = 0; i + 2 < n; i++) ind.push(...(i % 2 === 0 ? [i, i + 1, i + 2] : [i + 1, i, i + 2]));
  } else {
    const w = r.genislik, h = n / w;
    for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) { const a = y * w + x; ind.push(a, a + 1, a + w, a + 1, a + w + 1, a + w); }
  }
  return ind;
}
