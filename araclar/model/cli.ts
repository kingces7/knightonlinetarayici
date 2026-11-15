// Karakter/canavar dışa aktarma (araclar/ klasöründe):
//   npm run karakter -- 100 200          -> NPC_Looks tablosundaki 100 ve 200 numaralı modelleri .glb yapar
//   npm run karakter -- ara kecoon       -> adında "kecoon" geçen canavarları listeler
//   npm run karakter -- 931137=31137:Chr/upc_el_rm_chitin_w.n3chr  -> özel görünüm (temel görünümün iskeleti + .n3chr parçaları)
// Çıktı: donusturulmus/web/karakter/<no>.glb ve karakterler.json (ad, animasyon listesi)
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { tbldenOku } from '../tbl/tablo.ts';
import { karakterGlb } from './karakterGlb.ts';
import { chrOku } from './karakter.ts';

function tablo(od: OyunDosyalari, yol: string) {
  return tbldenOku(od.oku(yol), 'windows-1252').satirlar;
}

function main(argv: string[]): number {
  const od = new OyunDosyalari();
  const gorunum = new Map(tablo(od, 'Data/NPC_Looks.tbl').map((s) => [Number(s[0]), s]));
  const adlar = new Map<number, string>();
  for (const s of tablo(od, 'Data/MON.tbl')) adlar.set(Number(s[2]), String(s[1]));
  for (const s of tablo(od, 'Data/MON.tbl')) adlar.set(Number(s[0]), String(s[1]));

  if (argv[0] === 'ara') {
    const q = (argv[1] ?? '').toLowerCase();
    for (const [no, s] of gorunum) {
      const ad = adlar.get(no) ?? '';
      if (ad.toLowerCase().includes(q) || String(s[2]).toLowerCase().includes(q)) console.log(no, ad, s[2]);
    }
    return 0;
  }
  const hedef = path.join(CIKTI_DIZINI, 'web', 'karakter');
  fs.mkdirSync(hedef, { recursive: true });
  const dizinYolu = path.join(hedef, 'karakterler.json');
  const dizin: Record<string, unknown> = fs.existsSync(dizinYolu) ? JSON.parse(fs.readFileSync(dizinYolu, 'utf8')) : {};
  for (const a of argv) {
    // Özel görünüm: <yeniNo>=<temelNo>:<chr dosyası>  (iskelet/animasyon temel görünümden, parçalar .n3chr dosyasından; ör. 931137=31137:Chr/upc_el_rm_chitin_w.n3chr)
    const ozel = /^([0-9]+)=([0-9]+):(.+)$/.exec(a);
    if (ozel) {
      const [, yeniNo, temelNo, chr] = ozel;
      const t = gorunum.get(Number(temelNo));
      if (!t) { console.log(`! ${a}: temel görünüm ${temelNo} yok`); continue; }
      const ad = `${adlar.get(Number(temelNo)) ?? 'npc_' + temelNo}_${path.basename(chr, path.extname(chr))}`;
      const { glb, rapor } = karakterGlb(od, { ad, iskelet: String(t[2]), animasyon: String(t[3]), parcalar: chrOku(od.oku(chr)).parcalar });
      fs.writeFileSync(path.join(hedef, `${yeniNo}.glb`), glb);
      dizin[yeniNo] = { ad, dosya: `${yeniNo}.glb`, animasyonlar: rapor.animBilgi };
      console.log(`${yeniNo} ${ad}: ${rapor.kemik} kemik, ${rapor.parca} parça, ${rapor.animasyonlar.length} animasyon, ${(rapor.boyut / 1024).toFixed(0)} KB`);
      continue;
    }
    const no = Number(a);
    const s = gorunum.get(no);
    if (!s) { console.log(`! ${a}: NPC_Looks içinde yok`); continue; }
    const ad = adlar.get(no) ?? `npc_${no}`;
    // Parça sütununda .n3chr varsa gerçek parçalar onun içindedir.
    const parcalar = s.slice(4, 17).map(String).flatMap((p) => p.toLowerCase().endsWith(".n3chr") ? chrOku(od.oku(p)).parcalar : [p]);
    const { glb, rapor } = karakterGlb(od, { ad, iskelet: String(s[2]), animasyon: String(s[3]), parcalar });
    fs.writeFileSync(path.join(hedef, `${no}.glb`), glb);
    dizin[no] = { ad, dosya: `${no}.glb`, animasyonlar: rapor.animBilgi };
    console.log(`${no} ${ad}: ${rapor.kemik} kemik, ${rapor.parca} parça, ${rapor.animasyonlar.length} animasyon (${rapor.animasyonlar.slice(0, 8).join(', ')}…), ${(rapor.boyut / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(dizinYolu, JSON.stringify(dizin, null, 2));
  od.kapat();
  return 0;
}

try { process.exit(main(process.argv.slice(2))); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
