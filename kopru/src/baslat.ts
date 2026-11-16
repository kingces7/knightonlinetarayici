// Köprüyü başlatır:  npm run baslat   (kopru/ klasöründe)
// Ayarlar ortam değişkenleriyle değiştirilebilir:
//   KOPRU_PORT (8081)   GIRIS_HEDEF (127.0.0.1:15100)   OYUN_HEDEF (127.0.0.1:15001)   KOPRU_KOKENLER (virgülle ayrılmış ek izinli adlar)
import { kopruBaslat, type Hedef } from './kopru.ts';

function hedefOku(ad: string, varsayilan: string): Hedef {
  const m = /^(.+):(\d{1,5})$/.exec(process.env[ad] ?? varsayilan);
  if (!m) throw new Error(`${ad} "adres:port" biçiminde olmalı`);
  return { host: m[1], port: Number(m[2]) };
}

const port = Number(process.env.KOPRU_PORT ?? 8081);
const ek = (process.env.KOPRU_KOKENLER ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const k = await kopruBaslat({
  port,
  hedefler: { '/giris': hedefOku('GIRIS_HEDEF', '127.0.0.1:15100'), '/oyun': hedefOku('OYUN_HEDEF', '127.0.0.1:15001') },
  izinliKokenler: ['localhost', '127.0.0.1', '[::1]', ...ek],
  gunluk: (s) => console.log(new Date().toLocaleTimeString('tr-TR'), s),
});
console.log(`Köprü hazır: ws://127.0.0.1:${k.port}/giris  ve  ws://127.0.0.1:${k.port}/oyun   (durdurmak için Ctrl+C)`);
process.on('SIGINT', () => { void k.kapat().then(() => process.exit(0)); });
