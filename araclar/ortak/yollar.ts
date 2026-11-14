// Oyun dosyalarına ve çıktı klasörlerine giden yollar tek bir yerden gelir.
// Oyun klasörü varsayılan olarak deponun bir üstündeki "KnightEmpire" klasörüdür.
// Başka bir yer kullanmak için KE_OYUN_DIZINI ortam değişkeni verilebilir.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buKlasor = path.dirname(fileURLToPath(import.meta.url));

/** Deponun kök klasörü (knightonlinetarayici). */
export const DEPO_KOKU = path.resolve(buKlasor, '..', '..');

/** Orijinal oyun (client) klasörü. Sadece okunur. */
export const OYUN_DIZINI = path.resolve(
  process.env.KE_OYUN_DIZINI ?? path.join(DEPO_KOKU, '..', 'KnightEmpire'),
);

/** Dönüştürülmüş çıktılar (git'e girmez). */
export const CIKTI_DIZINI = path.join(DEPO_KOKU, 'donusturulmus');

/**
 * Yazılacak bir yolun orijinal oyun klasörünün içinde olmadığını garanti eder.
 * Proje kuralı: orijinal dosyalar asla değiştirilmez.
 */
export function oyunDisindaOlmali(hedef: string): void {
  const goreli = path.relative(OYUN_DIZINI, path.resolve(hedef));
  if (!goreli.startsWith('..') && !path.isAbsolute(goreli)) {
    throw new Error(
      `Güvenlik: "${hedef}" orijinal oyun klasörünün içinde. Orijinal dosyalar değiştirilmez; başka bir çıktı yolu seçin.`,
    );
  }
}
