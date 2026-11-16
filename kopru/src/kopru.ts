// WebSocket ↔ TCP köprüsü. Tarayıcı TCP açamaz; bu program tarayıcıdan gelen WebSocket bağlantısını sunucuya TCP olarak iletir.
// Köprü paketleri ANLAMAZ: baytları olduğu gibi taşır (çerçeve ve şifreleme tarayıcı tarafında, kopru/protokol/ içinde).
// Güvenlik: hedefler yalnızca ayarda tanımlı yollara bağlıdır (tarayıcı keyfi adrese bağlanamaz); yalnızca yerel adreste dinler;
// Origin başlığı varsa izinli listede olmalıdır.
import http from 'node:http';
import net from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';

export interface Hedef { host: string; port: number }

export interface KopruAyari {
  /** Köprünün dinlediği port (0 = boş bir port seç). */
  port: number;
  /** Dinlenen adres; varsayılan yalnızca bu bilgisayar. */
  adres?: string;
  /** Yol → TCP hedefi. Ör. `{ '/giris': {host:'127.0.0.1', port:15100}, '/oyun': {...} }`. */
  hedefler: Record<string, Hedef>;
  /** İzinli Origin ana bilgisayar adları (başlık yoksa, yani tarayıcı dışı bir araçsa, izin verilir). */
  izinliKokenler?: string[];
  /** Günlük satırı; varsayılan sessiz. */
  gunluk?: (satir: string) => void;
}

export interface Kopru {
  port: number;
  baglantiSayisi(): number;
  kapat(): Promise<void>;
}

const VARSAYILAN_KOKENLER = ['localhost', '127.0.0.1', '[::1]'];

function kokenIzinli(baslik: string | undefined, izinli: string[]): boolean {
  if (!baslik) return true;
  try { return izinli.includes(new URL(baslik).hostname.replace(/^(\[.*\])$/, '$1')); } catch { return false; }
}

export async function kopruBaslat(ayar: KopruAyari): Promise<Kopru> {
  const gunluk = ayar.gunluk ?? (() => {});
  const izinli = ayar.izinliKokenler ?? VARSAYILAN_KOKENLER;
  const sunucu = http.createServer((_, y) => { y.writeHead(426); y.end('WebSocket gerekli'); });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 16 });
  const acik = new Set<WebSocket>();

  sunucu.on('upgrade', (istek, soket, baslik) => {
    const yol = new URL(istek.url ?? '/', 'http://x').pathname;
    const hedef = Object.hasOwn(ayar.hedefler, yol) ? ayar.hedefler[yol] : undefined;
    if (!hedef) { soket.write('HTTP/1.1 404 Not Found\r\n\r\n'); soket.destroy(); gunluk(`red: bilinmeyen yol ${yol}`); return; }
    if (!kokenIzinli(istek.headers.origin, izinli)) { soket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); soket.destroy(); gunluk(`red: izinsiz köken ${istek.headers.origin}`); return; }
    wss.handleUpgrade(istek, soket, baslik, (ws) => baglan(ws, yol, hedef));
  });

  function baglan(ws: WebSocket, yol: string, hedef: Hedef): void {
    acik.add(ws);
    const tcp = net.connect(hedef.port, hedef.host);
    tcp.setNoDelay(true); // her WebSocket mesajı = tek TCP yazması (sunucu bölünmüş paketleri hoş görmez)
    let tcpHazir = false;
    const bekleyen: Buffer[] = [];
    gunluk(`bağlandı ${yol} → ${hedef.host}:${hedef.port}`);

    tcp.on('connect', () => { tcpHazir = true; for (const b of bekleyen.splice(0)) tcp.write(b); });
    tcp.on('data', (d) => { if (ws.readyState === ws.OPEN) ws.send(d, { binary: true }); });
    tcp.on('close', () => { gunluk(`TCP kapandı ${yol}`); if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close(1000, 'sunucu bağlantıyı kapattı'); });
    tcp.on('error', (e) => { gunluk(`TCP hatası ${yol}: ${e.message}`); if (ws.readyState === ws.OPEN) ws.close(1011, 'sunucuya bağlanılamadı'); tcp.destroy(); });

    ws.on('message', (veri, ikili) => {
      if (!ikili) return; // yalnızca ikili mesajlar paket sayılır
      const b = Buffer.isBuffer(veri) ? veri : Buffer.concat(veri as Buffer[]);
      if (tcpHazir) tcp.write(b); else bekleyen.push(b);
    });
    ws.on('close', () => { acik.delete(ws); gunluk(`WebSocket kapandı ${yol}`); tcp.destroy(); });
    ws.on('error', () => { tcp.destroy(); });
  }

  await new Promise<void>((coz, hata) => { sunucu.once('error', hata); sunucu.listen(ayar.port, ayar.adres ?? '127.0.0.1', () => coz()); });
  const port = (sunucu.address() as net.AddressInfo).port;
  gunluk(`köprü dinliyor: ${ayar.adres ?? '127.0.0.1'}:${port}`);

  return {
    port,
    baglantiSayisi: () => acik.size,
    kapat: () => new Promise<void>((coz) => {
      for (const ws of acik) ws.terminate();
      wss.close(() => sunucu.close(() => coz()));
      sunucu.closeAllConnections?.();
    }),
  };
}
