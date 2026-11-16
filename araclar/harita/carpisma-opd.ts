// İstemcinin kendi çarpışma yüzlerini (.opd) carpisma.bin olarak yazar (sunucu .smd'si yerine). Kullanım: node harita/carpisma-opd.ts moradon 14th_oldmoradon
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { opdYuzleri } from '../model/n3.ts';

const od = new OyunDosyalari();
for (const harita of process.argv.slice(2)) {
  const yol = `Zones/${harita}.opd`;
  if (!od.var(yol)) { console.log(`${harita}: .opd yok, atlandı`); continue; }
  const f = opdYuzleri(od.oku(yol));
  const hedef = path.join(CIKTI_DIZINI, 'web', 'harita', harita.toLowerCase(), 'carpisma.bin');
  fs.writeFileSync(hedef, Buffer.from(f.buffer, f.byteOffset, f.byteLength));
  console.log(`${harita}: ${f.length / 9} yüz -> ${hedef}`);
}
od.kapat();
