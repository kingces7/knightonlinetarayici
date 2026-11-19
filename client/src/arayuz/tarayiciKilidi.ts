// Oyun açıkken tarayıcının kendi davranışlarını kapatır: sağ tık menüsü (yazı kutularında da), metin seçme (yazı kutuları hariç), sürükle-bırak, orta tık kaydırma,
// sayfa kısayolları (kaydet/yazdır/kaynak) ve geliştirici araçları kısayolları (F12, Ctrl+Shift+I/J/C). F5 (yenile) açık bırakıldı.
// Not: tarayıcı menüsünden açılan geliştirici araçları sayfadan engellenemez.
const yaziKutusu = (h: EventTarget | null): boolean => h instanceof HTMLElement && (h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.isContentEditable);

export function tarayiciKilidiniKur(): void {
  const durdur = (e: Event) => e.preventDefault();
  addEventListener('contextmenu', durdur, true);
  addEventListener('dragstart', durdur, true);
  addEventListener('selectstart', (e) => { if (!yaziKutusu(e.target)) e.preventDefault(); }, true);
  addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }, true); // orta tık: otomatik kaydırma / yeni sekme
  addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); }, true);
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'F12' || (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (ctrl && ['s', 'p', 'u'].includes(k))) { e.preventDefault(); e.stopPropagation(); } // geliştirici araçları, kaydet, yazdır, sayfa kaynağı
  }, true);
  const stil = document.createElement('style');
  stil.textContent = 'html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; } input, textarea { -webkit-user-select: text; user-select: text; } img { -webkit-user-drag: none; }';
  document.head.appendChild(stil);
}
