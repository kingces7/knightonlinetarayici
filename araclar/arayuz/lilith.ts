// `.lilith` = şifreli UIF (arayüz) dosyası. Anti-cheat (LilithACS) bunları RC4 ile şifreler.
//   anahtar = SHA-1(parolanın İLK 29 karakteri) ilk 16 bayt (CryptoAPI CryptDeriveKey, RC4 128 bit); parola xCODE/uif.ini KEY'idir.
// Her ReadFile CryptDecrypt(Final=TRUE) ile çözüldüğü için anahtar akışı her okumada baştan başlar; dosya düz bir
// okuyucudan geçmediği için `blok` baytlık parçalarda çözülür (ayrıntı: docs/formatlar/uif.md).
import crypto from 'node:crypto';

export const LILITH_PAROLA = '(A;dq1DPVFgVs1Aez$VS3R0hge@NvM_TJvblD5.bt0f@l7xTvx';
const HASH_UZUNLUGU = 29;

function akisUret(n: number): Buffer {
  const anahtar = crypto.createHash('sha1').update(Buffer.from(LILITH_PAROLA, 'latin1').subarray(0, HASH_UZUNLUGU)).digest().subarray(0, 16);
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + anahtar[i & 15]) & 255; const t = s[i]; s[i] = s[j]; s[j] = t; }
  const c = Buffer.alloc(n);
  let a = 0; j = 0;
  for (let k = 0; k < n; k++) { a = (a + 1) & 255; j = (j + s[a]) & 255; const t = s[a]; s[a] = s[j]; s[j] = t; c[k] = s[(s[a] + s[j]) & 255]; }
  return c;
}
const AKIS = akisUret(1 << 16);

/**
 * Dosya: 4 bayt şifresiz başlık (int32 0), ardından her biri `blok` (32) baytlık parçalar; her parçada anahtar akışı
 * baştan başlar. Son parça kısa olabilir. (Kanıt: şifreli veri 32 bayt periyotlu ve 4 bayt kaymalı.)
 */
export function lilithCoz(veri: Buffer, blok = 32, basl = 4): Buffer {
  const c = Buffer.from(veri);
  for (let i = basl; i < veri.length; i++) c[i] = veri[i] ^ AKIS[(i - basl) % blok];
  return c;
}

/** Blok boyu dosyaya göre 31 ya da 32'dir; düz metinde en çok sıfır çıkan boyut seçilir. */
export function lilithOtomatikCoz(veri: Buffer): Buffer {
  let en = { blok: 32, oran: -1 };
  const n = Math.min(veri.length, 6000);
  for (const blok of [32, 31]) {
    const c = lilithCoz(veri, blok);
    let s = 0; for (let i = 0; i < n; i++) if (c[i] === 0) s++;
    if (s / n > en.oran) en = { blok, oran: s / n };
  }
  return lilithCoz(veri, en.blok);
}
