// Tabloların CSV (virgülle ayrılmış değerler) biçimi.
// CSV, VS Code'daki "Edit CSV" eklentisiyle Excel benzeri bir ızgarada düzenlenebilir.
// Bir tablo iki dosyadan oluşur:
//   Ad.csv        -> düzenlenecek satırlar (ilk satır başlık: "1:DWORD,2:STRING,...")
//   Ad.meta.json  -> şifreleme, sütun türleri ve geri yazım için gereken diğer bilgiler (DOKUNULMAZ)
import type { Hucre, SutunTuru, Tablo, TabloJson } from './tablo.ts';
import type { KodSayfasi } from './kodlama.ts';

export type MetaJson = Omit<TabloJson, 'satirlar'>;

function alan(h: Hucre): string {
  const s = typeof h === 'number' ? String(h) : h;
  return /[",\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function csvyeCevir(t: Tablo): string {
  const baslik = t.sutunTurleri.map((tur, i) => `${i + 1}:${tur}`).join(',');
  const satirlar = t.satirlar.map((s) => s.map(alan).join(','));
  return [baslik, ...satirlar].join('\n') + '\n';
}

/** RFC 4180 CSV ayrıştırıcı (tırnak içindeki virgül, tırnak ve satır sonlarını destekler). */
export function csvAyristir(metin: string): string[][] {
  if (metin.charCodeAt(0) === 0xfeff) metin = metin.slice(1);
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let alanMetni = '';
  let tirnakta = false;
  let alanBasladi = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakta) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alanMetni += '"'; i++; } else tirnakta = false;
      } else alanMetni += c;
      continue;
    }
    if (c === '"' && !alanBasladi) { tirnakta = true; alanBasladi = true; }
    else if (c === ',') { satir.push(alanMetni); alanMetni = ''; alanBasladi = false; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      satir.push(alanMetni); satirlar.push(satir);
      satir = []; alanMetni = ''; alanBasladi = false;
    } else { alanMetni += c; alanBasladi = true; }
  }
  if (tirnakta) throw new Error('CSV: kapanmamış tırnak işareti var');
  if (alanBasladi || satir.length) { satir.push(alanMetni); satirlar.push(satir); }
  return satirlar;
}

const TAMSAYI = new Set<SutunTuru>(['CHAR', 'BYTE', 'SHORT', 'WORD', 'INT', 'DWORD']);

function hucreyeCevir(deger: string, tur: SutunTuru, yer: string): Hucre {
  if (tur === 'STRING') return deger;
  const d = deger.trim();
  if (d.startsWith('#f')) return d; // özel ondalık değerler (#f32:/#f64:) olduğu gibi
  if (TAMSAYI.has(tur)) {
    if (!/^-?\d+$/.test(d)) throw new Error(`${yer}: ${tur} için tam sayı bekleniyordu, "${deger}" geldi`);
    return Number(d);
  }
  if (tur === 'INT64') {
    if (!/^-?\d+$/.test(d)) throw new Error(`${yer}: INT64 için tam sayı bekleniyordu, "${deger}" geldi`);
    const n = Number(d);
    return Number.isSafeInteger(n) ? n : d;
  }
  // FLOAT / DOUBLE (ondalık ayracı nokta; virgül de kabul edilir)
  const n = Number(d.replace(',', '.'));
  if (d === '' || !Number.isFinite(n)) throw new Error(`${yer}: ${tur} için sayı bekleniyordu, "${deger}" geldi`);
  return n;
}

export function csvdenTablo(csv: string, meta: MetaJson): { tablo: Tablo; ks: KodSayfasi } {
  const satirlar = csvAyristir(csv);
  // Sondaki tamamen boş satırları yok say
  while (satirlar.length && satirlar[satirlar.length - 1].every((a) => a === '')) satirlar.pop();
  const [baslik, ...govde] = satirlar;
  const turler = meta.sutunTurleri;
  if (!baslik || baslik.length !== turler.length) {
    throw new Error(`CSV başlığında ${turler.length} sütun olmalı, ${baslik?.length ?? 0} var. Sütun eklemeyin/silmeyin.`);
  }
  const tablo: Tablo = {
    sifreleme: meta.sifreleme,
    onek: Uint8Array.from(Buffer.from(meta.onek ?? '', 'hex')),
    sutunTurleri: turler,
    satirlar: govde.map((s, si) => {
      if (s.length !== turler.length) {
        throw new Error(`CSV satır ${si + 2}: ${turler.length} değer olmalı, ${s.length} var`);
      }
      return s.map((d, ci) => hucreyeCevir(d, turler[ci], `CSV satır ${si + 2}, sütun ${ci + 1}`));
    }),
    artik: Uint8Array.from(Buffer.from(meta.artik ?? '', 'hex')),
    kuyruk: Uint8Array.from(Buffer.from(meta.kuyruk ?? '', 'hex')),
  };
  return { tablo, ks: meta.kodSayfasi };
}
