// Orijinal arayüz pencerelerini (LilithACS/*.lilith = şifreli UIF) web için dışa aktarır (araclar/ klasöründe):
//   npm run arayuz                          -> varsayılan pencere listesi
//   npm run arayuz -- re_el_page_state ...  -> belirtilen pencereler
// Çıktı: donusturulmus/web/arayuz/<pencere>.json (sadeleştirilmiş ağaç) ve donuşturulmus/web/arayuz/doku/<ad>.png
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, OYUN_DIZINI } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dokuPng } from '../model/dokuYardim.ts';
import { lilithOku, uifOku, type UiDugum } from './uif.ts';

const VARSAYILAN = ['re_el_hpbar', 're_el_taskbar_main', 're_el_page_state', 're_el_skill', 're_el_inventory', 're_el_chatting_box', 're_el_information_box'];

/** İstemcinin kullandığı sade düğüm. */
interface Sade {
  t: number; id?: string; st?: number; tp?: string; k: [number, number, number, number]; m?: [number, number, number, number]; r?: number;
  d?: string; uv?: [number, number, number, number];
  y?: { b: number; c: number; f: number; s: string; font: string };
  tk?: [number, number, number, number]; c?: Sade[];
}

const BOLU = String.fromCharCode(92);
const ad = (yol: string) => yol.toLowerCase().replaceAll(BOLU, "/").split("/").pop()!;

function sadeLestir(d: UiDugum, dokular: Set<string>): Sade {
  const s: Sade = { t: d.tur, k: d.kutu };
  if (d.id) s.id = d.id;
  if (d.stil) s.st = d.stil;
  if (d.ipucu) s.tp = d.ipucu;
  if (d.tasi.some((v) => v)) s.m = d.tasi;
  if (d.ayrik) s.r = d.ayrik;
  if (d.doku) { s.d = ad(d.doku); dokular.add(s.d); s.uv = d.uv; }
  if (d.yazi) s.y = { b: d.yazi.boy, c: d.yazi.renk, f: d.yazi.bayrak, s: d.yazi.metin, font: d.yazi.font };
  if (d.tikla && d.tikla.some((v) => v)) s.tk = d.tikla;
  if (d.cocuklar.length) s.c = d.cocuklar.map((c) => sadeLestir(c, dokular));
  return s;
}

function main(argv: string[]): number {
  const od = new OyunDosyalari();
  const liste = argv.length ? argv : VARSAYILAN;
  const hedef = path.join(CIKTI_DIZINI, 'web', 'arayuz');
  fs.mkdirSync(path.join(hedef, 'doku'), { recursive: true });
  const yazilan = new Map<string, { w: number; h: number }>();
  for (const pencere of liste) {
    // Önce LilithACS/<ad>.lilith (şifreli), yoksa paket içindeki ui/<ad>.uif (düz)
    const dosya = path.join(OYUN_DIZINI, 'LilithACS', `${pencere}.lilith`);
    const duzYol = `ui/${pencere}.uif`;
    if (!fs.existsSync(dosya) && !od.var(duzYol)) { console.log(`! ${pencere}: dosya yok`); continue; }
    const dokular = new Set<string>();
    const kok = sadeLestir(fs.existsSync(dosya) ? lilithOku(fs.readFileSync(dosya)) : uifOku(od.oku(duzYol)), dokular);
    const boyutlar: Record<string, { w: number; h: number }> = {};
    for (const dk of dokular) {
      if (!yazilan.has(dk)) {
        const p = dokuPng(od, "ui" + BOLU + dk, 4096);
        if (!p) { console.log(`  uyarı: ${pencere}: doku ${dk} bulunamadı`); continue; }
        fs.writeFileSync(path.join(hedef, 'doku', dk.replace(/\.dxt$/i, '.png')), p.png);
        yazilan.set(dk, { w: p.png.readUInt32BE(16), h: p.png.readUInt32BE(20) });
      }
      boyutlar[dk] = yazilan.get(dk) ?? { w: 1, h: 1 };
    }
    fs.writeFileSync(path.join(hedef, `${pencere}.json`), JSON.stringify({ ad: pencere, dokular: boyutlar, kok }));
    console.log(`${pencere}: ${kok.k.join(',')} · ${[...dokular].join(', ')}`);
  }
  return 0;
}

try { process.exit(main(process.argv.slice(2))); } catch (e) { console.log('HATA: ' + (e as Error).stack); process.exit(1); }
