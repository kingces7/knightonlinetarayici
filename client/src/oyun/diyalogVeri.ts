// NPC diyalog verisi (araclar/oyun/diyalog.ts → /oyun/diyalog.json): konuşma ve düğme metinleri, görev yardımcısı satırları.
export interface DiyalogVerisi { talk: Record<string, string>; menu: Record<string, string>; yardimci: Record<string, number[][]> }
let yuklenen: Promise<DiyalogVerisi> | null = null;
export const diyalogVerisi = (): Promise<DiyalogVerisi> => (yuklenen ??= fetch('/oyun/diyalog.json').then((r) => r.json() as Promise<DiyalogVerisi>));

/** Sınıf numarasından sınıf grubu (görev tablosundaki bClass): 1 savaşçı, 2 hırsız, 3 büyücü, 4 rahip, 13 Kurian. */
export function sinifGrubu(sinif: number): number {
  const s = sinif % 100;
  if ([1, 5, 6].includes(s)) return 1;
  if ([2, 7, 8].includes(s)) return 2;
  if ([3, 9, 10].includes(s)) return 3;
  if ([4, 11, 12].includes(s)) return 4;
  return 13;
}

export interface GorevSatiri { satir: number; gorev: number; tetik: number; menuMetni: number }
/**
 * NPC'nin şu an sunabileceği görev satırları (sunucu QuestV2SearchEligibleQuest ile aynı kurallar): seviye/ulus/sınıf uygun, görev tamamlanmamış, görevin durumu satırın durumuna eşit
 * (kayıtsız görev = durum 0). Aynı görev için bir satır döner.
 */
export function uygunGorevler(v: DiyalogVerisi, npcSid: number, seviye: number, sinif: number, durumlar: ReadonlyMap<number, number>): GorevSatiri[] {
  const ulus = Math.floor(sinif / 100), grup = sinifGrubu(sinif), cikti: GorevSatiri[] = [], gorulen = new Set<number>();
  for (const [satir, lv, , sg, ul, gorev, durum, tetik, menu] of v.yardimci[String(npcSid)] ?? []) {
    if (lv > seviye || (ul !== 3 && ul !== ulus) || (sg !== 5 && sg !== grup)) continue;
    const mevcut = durumlar.get(gorev) ?? 0;
    if (mevcut === 2 || mevcut !== durum || gorulen.has(gorev)) continue;
    gorulen.add(gorev); cikti.push({ satir, gorev, tetik, menuMetni: menu });
  }
  return cikti;
}
