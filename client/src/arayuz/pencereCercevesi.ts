// Character Report / Quest / Clan / Friend sayfalarının ORTAK üst çerçevesi: sol üstteki el süsü, sekmelerin arkasındaki koyu şerit ve kapatma (X) düğmesi.
// Quest ve Clan pencereleri bunları kendi dosyalarında taşır (re_el_page_quest: el süsü (1,2,55,41), şerit (0,40,286,81), X (9,18,29,38));
// Character Report (re_el_page_state) ve Friend (re_el_page_friend) dosyalarında yoktur, bu yüzden aynı resimlerle buradan eklenir.
// Konumlar pencere dosyasının koordinatlarındadır (kök sol kenarı çıkarılır); böylece sekmeler arasında geçerken X hep aynı yerde kalır.
import type { UiPencere } from './orijinal';

const MYINFO = '/arayuz/doku/ui_el_myinfo.png';
const X_DOKU = `/arayuz/doku/${encodeURIComponent('ui_el_transaction_person trade.png')}`;

/** Doku parçasını (piksel UV) verilen kutuya oturan bir öğe yapar. Doku 512×512'dir. */
function parca(url: string, u: number, v: number, uw: number, vh: number, sol: number, ust: number, w: number, h: number): HTMLElement {
  const e = document.createElement('div');
  Object.assign(e.style, {
    position: 'absolute', left: `${sol}px`, top: `${ust}px`, width: `${w}px`, height: `${h}px`, backgroundImage: `url("${url}")`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${(512 * w) / uw}px ${(512 * h) / vh}px`, backgroundPosition: `${-(u * w) / uw}px ${-(v * h) / vh}px`,
  });
  return e;
}

/** Üst çerçeveyi ekler: el süsü + şerit (sekme düğmelerinin arkasında) ve kapatma düğmesi (en üstte). `kapat` X'e basılınca çağrılır. */
export function ustCerceveEkle(p: UiPencere, kapat: () => void): void {
  const [kokSol] = p.kokKutu;
  const s = (x: number) => x - kokSol;
  const el = parca(MYINFO, 4, 3, 54, 39, s(1), 2, 54, 39);
  const serit = parca(MYINFO, 4, 41, 286, 41, s(0), 40, 286, 41);
  for (const e of [serit, el]) e.style.zIndex = '1';
  p.el.append(serit, el);

  // Kapatma düğmesi: Quest penceresindekiyle aynı resim ve yer (20×20; normal, üzerinde, basılı)
  const x = parca(X_DOKU, 38, 56, 20, 20, s(9), 18, 20, 20);
  const goster = (u: number) => { x.style.backgroundPosition = `${-u}px ${-56}px`; };
  Object.assign(x.style, { zIndex: '5', cursor: 'pointer' });
  x.title = 'Close';
  goster(38);
  x.addEventListener('pointerenter', () => goster(82)); x.addEventListener('pointerleave', () => goster(38));
  x.addEventListener('pointerdown', (e) => { e.stopPropagation(); goster(60); }); x.addEventListener('pointerup', () => goster(82));
  x.addEventListener('click', kapat);
  p.el.appendChild(x);
  p.sinirTemizle();
}
