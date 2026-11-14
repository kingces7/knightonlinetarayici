# KnightEmpire — Tarayıcıda Knight Online

Knight Online'ı tarayıcıda (Chrome / Edge / Firefox) oynanır hale getirme projesi.
Şu anki sürüm **tek oyunculu**: bir haritada yürüyüp canavar avlayabilir, düşen sandıklardan eşya toplayabilirsin.

## Oynamak için (bu bilgisayarda)

Gerekenler: Node.js (kurulu), oyun dosyaları `E:\Knight Online Browser Project\KnightEmpire\` içinde.

1. **Oyun verisini hazırla** (ilk sefer, ya da araçlar değişince). VS Code'da Terminal → New Terminal:
   ```
   cd araclar
   npm run web-hazirla
   ```
   Bu komut haritayı, karakter/canavar modellerini ve eşya listesini `donusturulmus/web/` içine üretir.
2. **Oyunu başlat:**
   ```
   cd client
   npm install      (sadece ilk sefer)
   npm run dev
   ```
3. Tarayıcıda **http://localhost:5173** adresini aç.

### Kontroller
| Tuş | İş |
|---|---|
| W A S D / sol tık zemine | Yürü |
| Sol tık canavara | Hedef al ve saldır |
| Tab | Sıradaki yakın canavarı hedef al |
| Sağ tuş basılı sürükle | Kamerayı döndür |
| Tekerlek | Yakınlaş / uzaklaş |
| Sol tık sandığa | Yanına git ve aç |
| I | Envanter (eşyaya tıklayınca kuşanır) |
| Esc | Hedefi / pencereyi bırak |

## Klasörler
| Klasör | İçerik |
|---|---|
| `araclar/` | Oyun dosyalarını çözen ve web biçimine çeviren araçlar (Node.js + TypeScript) |
| `client/` | Tarayıcı oyunu (Vite + TypeScript + Three.js) |
| `docs/` | Keşif raporu, ilerleme, **yapılacaklar listesi**, dosya formatı belgeleri |

Orijinal oyun dosyaları ve üretilen veriler depoya girmez (`.gitignore`).
