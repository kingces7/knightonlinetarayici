// Fare olaylarıyla (pointer) yuvadan yuvaya sürükle-bırak. Tarayıcının HTML5 sürükleme sistemine bağlı değildir: Chrome, Edge ve Firefox'ta aynı çalışır.
// Sol tuşla yuvaya basılı tut, 5 px'ten fazla kıpırdat → eşyanın simgesi imleci izler; bırakınca altındaki yuva çözülür ve `birak` çağrılır.

export interface YuvaSurukleSecenek<T> {
  /** Olay hedefinden yuvayı çözer (yuva değilse null). */
  yuvaBul: (hedef: Element | EventTarget | null) => T | null;
  /** Sürüklenen yuvanın simge elemanı (arka plan resmi kopyalanır); boş yuvada null → sürükleme başlamaz. */
  kaynakEleman: (k: T) => HTMLElement | null;
  /** Bırakıldı: `hedef` bırakılan yuva (yuva dışıysa null). */
  birak: (kaynak: T, hedef: T | null) => void;
}

export function yuvaSurukle<T>(kok: HTMLElement, s: YuvaSurukleSecenek<T>): void {
  kok.addEventListener('pointerdown', (ev) => { // yakalama aşamasında dinlenir: pencerelerin olay yutması sürüklemeyi engellemesin
    if (ev.button !== 0) return;
    const k = s.yuvaBul(ev.target); if (!k) return;
    const el = s.kaynakEleman(k); if (!el) return;
    const x0 = ev.clientX, y0 = ev.clientY; let hayalet: HTMLElement | null = null;
    const tasi = (e: PointerEvent) => {
      if (!hayalet) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        hayalet = document.createElement('div');
        Object.assign(hayalet.style, { position: 'fixed', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, pointerEvents: 'none', zIndex: '2147483000', opacity: '.85', backgroundImage: cs.backgroundImage, backgroundSize: cs.backgroundSize, backgroundPosition: cs.backgroundPosition, backgroundRepeat: 'no-repeat' });
        document.body.appendChild(hayalet); el.style.opacity = '0.45';
      }
      hayalet.style.transform = `translate(${e.clientX - hayalet.offsetWidth / 2}px, ${e.clientY - hayalet.offsetHeight / 2}px)`;
    };
    const bitir = (e: PointerEvent) => {
      removeEventListener('pointermove', tasi); removeEventListener('pointerup', bitir); removeEventListener('pointercancel', bitir);
      if (!hayalet) return; // sürükleme başlamadıysa (kısa tık) hiçbir şey yapılmaz
      hayalet.remove(); el.style.opacity = '';
      const altinda = document.elementFromPoint(e.clientX, e.clientY);
      s.birak(k, s.yuvaBul(altinda));
      // sürükleme sonrası oluşan "click" olayı yutulur
      addEventListener('click', (c) => c.stopPropagation(), { capture: true, once: true });
    };
    addEventListener('pointermove', tasi); addEventListener('pointerup', bitir); addEventListener('pointercancel', bitir);
  }, true);
}
