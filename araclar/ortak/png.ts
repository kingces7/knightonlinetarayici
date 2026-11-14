// Küçük PNG kodlayıcı (RGBA, 8 bit). Dış kütüphane gerektirmez.
import zlib from 'node:zlib';

const CRC_TABLOSU = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLOSU[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function parca(tur: string, veri: Uint8Array): Buffer {
  const b = Buffer.alloc(12 + veri.length);
  b.writeUInt32BE(veri.length, 0);
  b.write(tur, 4, 'latin1');
  Buffer.from(veri).copy(b, 8);
  b.writeUInt32BE(crc32(b.subarray(4, 8 + veri.length)), 8 + veri.length);
  return b;
}

/** rgba: genişlik*yükseklik*4 bayt, satır satır yukarıdan aşağı. */
export function pngKodla(genislik: number, yukseklik: number, rgba: Uint8Array): Buffer {
  const satir = genislik * 4;
  const ham = Buffer.alloc((satir + 1) * yukseklik);
  for (let y = 0; y < yukseklik; y++) {
    ham[y * (satir + 1)] = 0; // filtre yok
    Buffer.from(rgba.buffer, rgba.byteOffset + y * satir, satir).copy(ham, y * (satir + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(genislik, 0);
  ihdr.writeUInt32BE(yukseklik, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    parca('IHDR', ihdr),
    parca('IDAT', zlib.deflateSync(ham, { level: 6 })),
    parca('IEND', new Uint8Array(0)),
  ]);
}
