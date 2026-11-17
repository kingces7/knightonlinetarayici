// Sabit sürüm sunucusu (port 5180): derlenmiş client'ı (dist-oyun) ve oyun dosyalarını (../donusturulmus/web) sunar. Kod değişince kendiliğinden yenilenmez.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const k = path.dirname(fileURLToPath(import.meta.url)), kok = path.resolve(k, '..');
const KLASORLER = [path.join(kok, 'dist-oyun'), path.resolve(kok, '../donusturulmus/web')];
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.bin': 'application/octet-stream', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
http.createServer((i, o) => {
  let yol = decodeURIComponent(new URL(i.url, 'http://x').pathname); if (yol.endsWith('/')) yol += 'index.html';
  for (const d of KLASORLER) {
    const f = path.join(d, yol); if (!f.startsWith(d) || !fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    o.writeHead(200, { 'content-type': TUR[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(o); return;
  }
  o.writeHead(404); o.end('yok');
}).listen(5180, '0.0.0.0', () => console.log('Sabit sürüm: http://localhost:5180'));
