// KnightOnline.exe içindeki düz metinleri (ASCII + UTF-16) çıkarır; yöntem 2 (docs/istemci-kodu.md).
// Kullanım: node exe/dizeler.ts <exe yolu> <çıktı.txt>   Çıktı satırı: ofset(hex) \t A|W \t metin
import fs from 'node:fs';

const [exe, cikti] = process.argv.slice(2);
if (!exe || !cikti) { console.log('kullanım: node exe/dizeler.ts <exe> <cikti.txt>'); process.exit(1); }
const b = fs.readFileSync(exe);
const satir: string[] = [];
let bas = -1;
for (let i = 0; i <= b.length; i++) {
  const c = i < b.length ? b[i] : 0;
  if (c >= 32 && c < 127) { if (bas < 0) bas = i; } else { if (bas >= 0 && i - bas >= 5) satir.push(`${bas.toString(16)}\tA\t${b.toString('latin1', bas, i)}`); bas = -1; }
}
let b16 = -1, n = 0;
for (let i = 0; i + 1 < b.length; i += 2) {
  const c = b[i], h = b[i + 1];
  if (h === 0 && c >= 32 && c < 127) { if (b16 < 0) b16 = i; n++; } else { if (b16 >= 0 && n >= 5) satir.push(`${b16.toString(16)}\tW\t${b.toString('utf16le', b16, b16 + n * 2)}`); b16 = -1; n = 0; }
}
fs.writeFileSync(cikti, satir.join('\n'));
console.log(`${satir.length} dize -> ${cikti}`);
