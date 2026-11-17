// Karakterin baskın olduğu yetenek grubu (stat) pastel okyanus mavisiyle boyanır: karakter yaratma ekranında ve oyun içi karakter (stat) penceresinde.
// Baskın stat, sınıfın başlangıç değerlerindeki (NewChrValue) en yüksek statlardır: Warrior STR + STA, Rogue DEX, Mage INT + DEX, Priest INT.
export type Stat = 'str' | 'sta' | 'dex' | 'int';

/** Pastel, göz yormayan okyanus mavisi. */
export const OKYANUS_MAVISI = '#8fd6e6';

/** Meslek (1 Warrior, 2 Rogue, 3 Mage, 4 Priest; terfi sınıfları aynı mesleğe bağlanır) → baskın statlar. */
export function baskinStatlar(meslek: number): Stat[] {
  switch (meslek) {
    case 1: return ['str', 'sta'];
    case 2: return ['dex'];
    case 3: return ['int', 'dex'];
    case 4: return ['int'];
    default: return ['str'];
  }
}
/** Sınıf numarasından (201–212, 101–112) meslek: 1 Warrior, 2 Rogue, 3 Mage, 4 Priest. */
export function sinifMesleki(sinif: number): number {
  const m = sinif % 100;
  if ([1, 5, 6].includes(m)) return 1; if ([2, 7, 8].includes(m)) return 2; if ([3, 9, 10].includes(m)) return 3; if ([4, 11, 12].includes(m)) return 4;
  return 1;
}

/** Yazı düğümünün rengini baskınsa okyanus mavisine çevirir; değilse özgün rengine döndürür. */
export function statRengiUygula(el: HTMLElement | undefined, baskin: boolean): void {
  if (!el) return;
  if (el.dataset.renk0 === undefined) el.dataset.renk0 = el.style.color;
  el.style.color = baskin ? OKYANUS_MAVISI : el.dataset.renk0;
  const ic = el.querySelector<HTMLElement>('span'); if (ic) ic.style.color = '';
}

/** Seçili skill sekmesinin yazı rengi: pastel, göz yormayan gri. */
export const SEKME_SECILI_RENK = '#c4c9ce';
/** Yazı düğümünün rengini verilen renge çevirir (null = özgün renk). */
export function statRengiUygulaRenk(el: HTMLElement, renk: string | null): void {
  if (el.dataset.renk0 === undefined) el.dataset.renk0 = el.style.color;
  el.style.color = renk ?? el.dataset.renk0;
  const ic = el.querySelector<HTMLElement>('span'); if (ic) ic.style.color = '';
}
