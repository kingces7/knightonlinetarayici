// Oyun açıkken tarayıcının kendi davranışlarını kapatır: sağ tık menüsü, metin seçme, sürükle-bırak, orta tık kaydırma ve sayfa kısayolları (kaydet/yazdır/kaynak).
// Yazı kutularında (giriş, sohbet) sağ tık ve seçim çalışır. F5 (yenile) ve F12 (geliştirici araçları) bilerek açık bırakıldı.
const yaziKutusu = (h: EventTarget | null): boolean => h instanceof HTMLElement && (h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.isContentEditable);

export function tarayiciKilidiniKur(): void {
  const durdur = (e: Event) => { if (!yaziKutusu(e.target)) e.preventDefault(); };
  addEventListener('contextmenu', durdur, true);
  addEventListener('dragstart', durdur, true);
  addEventListener('selectstart', durdur, true);
  addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }, true); // orta tık: otomatik kaydırma / yeni sekme
  addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); }, true);
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) e.preventDefault(); // kaydet, yazdır, sayfa kaynağı
  }, true);
  const stil = document.createElement('style');
  stil.textContent = 'html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; } input, textarea { -webkit-user-select: text; user-select: text; } img { -webkit-user-drag: none; }';
  document.head.appendChild(stil);
}
