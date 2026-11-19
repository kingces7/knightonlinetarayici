// Oyunda "Noah" diye bir para birimi yoktur: para birimi "Coin". Metinlerin çoğu koddan gelir ve doğrudan "Coin" yazar; oyun tablolarından (arayüz pencereleri,
// eşya/NPC açıklamaları) ve sunucu mesajlarından gelen "Noah" yazıları da ekranda Coin'e çevrilir. Yalnızca görünen metin değişir, veri dosyaları değişmez.
const KALIP = /\bNoah(s)?\b/g;
const duzelt = (t: string): string => t.replace(KALIP, (_m, s: string | undefined) => (s ? 'Coins' : 'Coin'));

function dugumDuzelt(d: Node): void {
  if (d.nodeType === Node.TEXT_NODE) {
    const t = d.nodeValue ?? '';
    if (t.includes('Noah')) d.nodeValue = duzelt(t);
    return;
  }
  if (d instanceof HTMLElement && d.title.includes('Noah')) d.title = duzelt(d.title);
  for (let c = d.firstChild; c; c = c.nextSibling) dugumDuzelt(c);
}

export function paraBirimiKur(): void {
  dugumDuzelt(document.body);
  new MutationObserver((kayitlar) => {
    for (const k of kayitlar) {
      if (k.type === 'characterData') dugumDuzelt(k.target);
      else for (const d of k.addedNodes) dugumDuzelt(d);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}
