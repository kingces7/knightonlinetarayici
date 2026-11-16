// CRC32 — sunucunun shared/crc32.c dosyasındaki işlevle aynı: polinom 0xEDB88320 (yansıtılmış), başlangıç değeri verilir,
// SON TERSLEME (xor 0xFFFFFFFF) YOK. Şifreli paketlerin sağlama toplamı bu işlevle `-1` (0xFFFFFFFF) başlangıcıyla hesaplanır.
// Standart CRC32 (ör. zlib) elde etmek için sonucu 0xFFFFFFFF ile xor'lamak gerekir.

const TABLO = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLO[i] = c >>> 0;
}

export function crc32(veri: Uint8Array, baslangic = 0xffffffff): number {
  let c = baslangic >>> 0;
  for (let i = 0; i < veri.length; i++) c = (TABLO[(c ^ veri[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return c >>> 0;
}
