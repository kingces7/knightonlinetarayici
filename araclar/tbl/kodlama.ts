// Tablolardaki metinler tek baytlık Windows kod sayfasıyla yazılmıştır.
// Burada her bayt tam olarak bir karaktere karşılık gelir (256 ↔ 256), böylece
// "çöz → düzenle → geri yaz" sırasında hiçbir bayt kaybolmaz.
// Oyun İngilizce olacak: varsayılan windows-1252. Sadece Türkçe tablolar (_tk, _tr) windows-1254 ile açılır.
// Not: tablolardaki Korece iç adlar (EUC-KR) her iki kod sayfasında da anlamsız görünür ama bayt bayt korunur.

export type KodSayfasi = 'windows-1254' | 'windows-1252' | 'windows-1250' | 'windows-1251';

/** Dosya adına göre uygun kod sayfası. */
export function varsayilanKodSayfasi(dosyaAdi: string): KodSayfasi {
  return /_(tk|tr)\.[^.]+$/i.test(dosyaAdi) ? 'windows-1254' : 'windows-1252';
}

interface Tablolar { baytToKar: string[]; karToBayt: Map<string, number> }
const onbellek = new Map<KodSayfasi, Tablolar>();

function tablolar(ks: KodSayfasi): Tablolar {
  let t = onbellek.get(ks);
  if (t) return t;
  const cozucu = new TextDecoder(ks);
  const baytToKar: string[] = [];
  const karToBayt = new Map<string, number>();
  for (let b = 0; b < 256; b++) {
    const kar = cozucu.decode(Uint8Array.of(b));
    baytToKar.push(kar);
    if (karToBayt.has(kar)) throw new Error(`${ks}: ${b} baytı tek bir karaktere eşlenmiyor`);
    karToBayt.set(kar, b);
  }
  t = { baytToKar, karToBayt };
  onbellek.set(ks, t);
  return t;
}

export function metneCevir(baytlar: Uint8Array, ks: KodSayfasi): string {
  const { baytToKar } = tablolar(ks);
  let s = '';
  for (const b of baytlar) s += baytToKar[b];
  return s;
}

export function bayta(metin: string, ks: KodSayfasi): Uint8Array {
  const { karToBayt } = tablolar(ks);
  const cikti = new Uint8Array(metin.length);
  let i = 0;
  for (const kar of metin) {
    const b = karToBayt.get(kar);
    if (b === undefined) {
      throw new Error(`"${kar}" karakteri ${ks} kod sayfasında yok (metin: "${metin.slice(0, 40)}")`);
    }
    cikti[i++] = b;
  }
  return cikti.slice(0, i);
}
