// Ses verisini web için dışa aktarır: karakter/canavar sesleri (NPC_Looks), adım sesleri (Move_Sound), bölge müziği.
//   npm run ses   -> donusturulmus/web/ses/<dosya>.ogg  ve  donusturulmus/web/ses/ses.json
// Kaynaklar:
//   Data/NPC_Looks.tbl: sütun 22 yürüme, 23-24 saldırı, 25-26 darbe, 27 ölüm sesi (kimlikler Data/sound.tbl'ye; Kecoon/Bulcan/Worm… ile doğrulandı)
//   Data/Move_Sound.tbl: [tür, yürü1, yürü2, koş1, koş2, koş3] (sound.tbl kimlikleri); tür 11/12/13 = El Morad iri/normal/küçük erkek
//   Snd/<bölge>_<ad>.ogg: bölge müziği (21_moradon.ogg = bölge 21)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';

const BS = String.fromCharCode(92);
const dosyaAdi = (yol: string) => yol.split(BS).pop()!.split('/').pop()!;

function main(): number {
  const od = new OyunDosyalari();
  const tablo = (y: string) => tbldenOku(od.oku(y), 'windows-1252').satirlar;
  const sesAdi = new Map<number, string>(tablo('Data/sound.tbl').map((r) => [Number(r[0]), dosyaAdi(String(r[1]))]));
  od.kapat();

  const sndDizin = path.join(OYUN_DIZINI, 'Snd');
  const diskte = new Map<string, string>(fs.readdirSync(sndDizin).map((f) => [f.toLowerCase(), f]));
  const hedef = path.join(CIKTI_DIZINI, 'web', 'ses');
  fs.mkdirSync(hedef, { recursive: true });
  const kopyalanan = new Set<string>();
  const kopyala = (ad: string | undefined): string | null => {
    if (!ad) return null;
    const gercek = diskte.get(ad.toLowerCase());
    if (!gercek) return null;
    const kucuk = gercek.toLowerCase();
    if (!kopyalanan.has(kucuk)) { fs.copyFileSync(path.join(sndDizin, gercek), path.join(hedef, kucuk)); kopyalanan.add(kucuk); }
    return kucuk;
  };
  const al = (id: unknown): string | null => { const n = Number(id); return n > 0 ? kopyala(sesAdi.get(n)) : null; };

  const od2 = new OyunDosyalari();
  const looks = tbldenOku(od2.oku('Data/NPC_Looks.tbl'), 'windows-1252').satirlar;
  const moveSound = tbldenOku(od2.oku('Data/Move_Sound.tbl'), 'windows-1252').satirlar;
  od2.kapat();

  const model: Record<string, { yuru: string | null; saldir: string[]; darbe: string[]; olum: string | null }> = {};
  for (const r of looks) {
    const s = { yuru: al(r[22]), saldir: [al(r[23]), al(r[24])].filter(Boolean) as string[], darbe: [al(r[25]), al(r[26])].filter(Boolean) as string[], olum: al(r[27]) };
    if (s.yuru || s.saldir.length || s.darbe.length || s.olum) model[String(r[0])] = s;
  }
  const adim: Record<string, { yuru: string[]; kos: string[] }> = {};
  for (const r of moveSound) {
    adim[String(r[0])] = { yuru: [al(r[1]), al(r[2])].filter(Boolean) as string[], kos: [al(r[3]), al(r[4]), al(r[5])].filter(Boolean) as string[] };
  }
  const muzik: Record<string, string> = {};
  for (const [kucuk, gercek] of diskte) {
    const m = /^(\d+)_.+\.ogg$/.exec(kucuk);
    if (m && !muzik[m[1]]) { const k = kopyala(gercek); if (k) muzik[m[1]] = k; }
  }
  fs.writeFileSync(path.join(hedef, 'ses.json'), JSON.stringify({ model, adim, muzik }));
  console.log(`${kopyalanan.size} ses dosyası, ${Object.keys(model).length} model, ${Object.keys(adim).length} adım türü, ${Object.keys(muzik).length} bölge müziği -> ${hedef}`);
  return 0;
}

try { process.exit(main()); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
