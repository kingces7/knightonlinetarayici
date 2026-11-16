// LZF açıcı/sıkıştırıcı (liblzf'in basit biçimi): sunucu büyük/bazı paketleri `WIZ_COMPRESS_PACKET (0x42)` içinde LZF ile sıkıştırır.
// Biçim: kontrol baytı `c`; c < 32 → sonraki (c+1) bayt aynen kopyalanır; aksi hâlde geri başvuru: uzunluk = c>>5 (7 ise bir bayt daha eklenir) + 2,
// uzaklık = ((c & 0x1F) << 8) + sonraki bayt + 1; kopya bayt bayt yapılır (üst üste binebilir).

export class LzfHatasi extends Error {}

export function lzfAc(girdi: Uint8Array, beklenenUzunluk: number): Uint8Array {
  const cikti = new Uint8Array(beklenenUzunluk);
  let i = 0; let o = 0;
  while (i < girdi.length) {
    const c = girdi[i++];
    if (c < 32) {
      const n = c + 1;
      if (i + n > girdi.length || o + n > cikti.length) throw new LzfHatasi('Bozuk LZF: düz bölüm sınırı aşıyor');
      cikti.set(girdi.subarray(i, i + n), o);
      i += n; o += n;
    } else {
      let uzun = c >> 5;
      if (uzun === 7) { if (i >= girdi.length) throw new LzfHatasi('Bozuk LZF: uzunluk baytı yok'); uzun += girdi[i++]; }
      if (i >= girdi.length) throw new LzfHatasi('Bozuk LZF: uzaklık baytı yok');
      const ref = o - ((c & 0x1f) << 8) - 1 - girdi[i++];
      uzun += 2;
      if (ref < 0 || o + uzun > cikti.length) throw new LzfHatasi('Bozuk LZF: geri başvuru sınırı aşıyor');
      for (let k = 0; k < uzun; k++) cikti[o++] = cikti[ref + k];
    }
  }
  if (o !== beklenenUzunluk) throw new LzfHatasi(`LZF çıktı uzunluğu ${o}, beklenen ${beklenenUzunluk}`);
  return cikti;
}

/** Yalnızca testler için: sıkıştırmaz, düz bölümlere sarar (geçerli LZF üretir; geri başvuru kullanmaz). */
export function lzfDuzSar(veri: Uint8Array): Uint8Array {
  const parcalar: number[] = [];
  for (let i = 0; i < veri.length; i += 32) {
    const n = Math.min(32, veri.length - i);
    parcalar.push(n - 1, ...veri.subarray(i, i + n));
  }
  return Uint8Array.from(parcalar);
}
