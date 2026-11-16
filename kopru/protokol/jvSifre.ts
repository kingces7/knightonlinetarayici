// "JvCryption" — sunucudaki shared/JvCryption.cpp'nin birebir karşılığı (docs/protokol.md §4).
// Akış şifresidir: aynı işlem hem şifreler hem çözer. Sunucu açık anahtarı (uint64) düz metin gönderir;
// gerçek anahtar `açık ^ özel` olur ve 8 baytlık little-endian dizi olarak kullanılır.
import { crc32 } from './crc32.ts';

/** Myko sunucu kaynağındaki ve açık kaynak 1299 sunucusundaki sabit "özel" anahtar. */
export const OZEL_ANAHTAR_MYKO = 0x1207500120128966n;
/** Resmî 1298 sunucu `.exe`'sinin kullandığı klasik "özel" anahtar (gerçek sunucuyla yapılan denemede doğrulandı, docs/protokol.md §4). */
export const OZEL_ANAHTAR_KLASIK = 0x1234567890123456n;
/** Varsayılan: Myko (hedef sunucumuz). */
export const OZEL_ANAHTAR = OZEL_ANAHTAR_MYKO;

export class JvSifre {
  readonly #anahtar = new Uint8Array(8);

  constructor(acikAnahtar: bigint, ozelAnahtar: bigint = OZEL_ANAHTAR) {
    if (BigInt.asUintN(64, acikAnahtar) === 0n) throw new Error('Açık anahtar 0: şifreleme açılmaz (sunucu 0 verirse düz metin konuşulur)');
    let t = BigInt.asUintN(64, acikAnahtar) ^ BigInt.asUintN(64, ozelAnahtar);
    for (let i = 0; i < 8; i++) { this.#anahtar[i] = Number(t & 0xffn); t >>= 8n; }
  }

  /** Şifreler/çözer (aynı işlem). Girişi değiştirmez. */
  donustur(veri: Uint8Array): Uint8Array {
    const cikis = new Uint8Array(veri.length);
    const lkey = (veri.length * 157) & 0xff;
    let rkey = 2157; // C'de `int`; Math.imul 32 bit taşmayı birebir taklit eder
    for (let i = 0; i < veri.length; i++) {
      const rsk = (rkey >> 8) & 0xff;
      cikis[i] = ((veri[i] ^ rsk) ^ this.#anahtar[i % 8]) ^ lkey;
      rkey = Math.imul(rkey, 2171);
    }
    return cikis;
  }

  /** Client → sunucu yönü: `[sıra no u32][opcode][gövde][CRC32 u32]` şifrelenir. */
  istemciPaketiSifrele(sira: number, opcode: number, govde: Uint8Array): Uint8Array {
    const dis = new Uint8Array(4 + 1 + govde.length + 4);
    const g = new DataView(dis.buffer);
    g.setUint32(0, sira >>> 0, true);
    dis[4] = opcode;
    dis.set(govde, 5);
    g.setUint32(5 + govde.length, crc32(dis.subarray(0, 5 + govde.length)), true);
    return this.donustur(dis);
  }
}
