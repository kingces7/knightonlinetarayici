// Oyunun kendi yazı tipini (KnightEmpire/fonts/mg basic.ttf) web klasörüne kopyalar: canavar/NPC adları bununla yazılır.
//   npm run yazitipi   -> donusturulmus/web/fonts/mgbasic.ttf
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI } from '../ortak/yollar.ts';

const hedef = path.join(CIKTI_DIZINI, 'web', 'fonts');
fs.mkdirSync(hedef, { recursive: true });
fs.copyFileSync(path.join(OYUN_DIZINI, 'fonts', 'mg basic.ttf'), path.join(hedef, 'mgbasic.ttf'));
console.log(`yazı tipi -> ${hedef}`);
