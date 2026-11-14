// Oyuncu kuralları için yeni karakter değerlerini oyuncu.json'a ekler (önce: powershell -ExecutionPolicy Bypass -File sunucu\oyuncu-disa-aktar.ps1).
//   npm run oyuncu
// Kaynak: Data/NewChrValue.tbl (sütunlar: 0 sınıf no, 1 ad, 2 STR, 3 STA, 4 DEX, 5 INT, 6 CHA, 7 serbest puan).
// Doğrulama: sunucu kaynağı (UserLevelExperienceSystem.cpp) 297 + 3×seviye toplam statü kuralı; Warrior 65+65+60+50+50 + 10 = 300 (seviye 1).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';

const yol = path.join(CIKTI_DIZINI, 'web', 'oyun', 'oyuncu.json');
const json = JSON.parse(fs.readFileSync(yol, 'utf8').replace(/^\uFEFF/, ''));
const od = new OyunDosyalari();
const yeni: Record<string, unknown> = {};
for (const s of tbldenOku(od.oku('Data/NewChrValue.tbl'), 'windows-1252').satirlar) {
  yeni[String(s[0])] = {
    ad: String(s[1]), str: Number(s[2]), sta: Number(s[3]), dex: Number(s[4]), int: Number(s[5]), cha: Number(s[6]), puan: Number(s[7]),
    esyalar: [8, 9, 10, 11, 12, 13, 14].map((i) => Number(s[i])).filter((n) => n > 0), // başlangıç eşyaları (silahlar, zırh parçaları)
  };
}
od.kapat();
json.yeniKarakter = yeni;
fs.writeFileSync(yol, JSON.stringify(json));
console.log(`yeniKarakter: ${Object.keys(yeni).length} sınıf -> ${yol}`);
