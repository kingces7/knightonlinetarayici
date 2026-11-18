// Tarama sonucunu Markdown ve JSON rapor olarak yazar.
import fs from 'node:fs';
import path from 'node:path';
import { DEPO_KOKU } from '../ortak/yollar.ts';
import { ONEM_SIRASI, type Toplayici } from './tur.ts';

/** Bu tarayıcının hiç bakmadığı alanlar. Rapor "temiz" derken bunları da açıkça söylemelidir. */
export const KAPSAM_DISI = [
  'Doğuş noktasının yürünebilir zeminde olması (smd karoOlay değerlerinin anlamı bölgeler arasında tutarsız çıktı, doğrulanmadı)',
  'Yetenek (skill) ve görev (quest) tabloları, eşya istatistik dengesi, ganimet oranlarının oyun dengesi',
  'Model (.n3*), doku, ses ve arayüz dosyalarının içeriği; client kaynak kodunun mantığı',
  'Paket protokolü ve canlı sunucu davranışı (bu bir statik veri taramasıdır)',
];

export function raporYaz(t: Toplayici, dizin = path.join(DEPO_KOKU, 'docs', 'raporlar')): { md: string; json: string } {
  fs.mkdirSync(dizin, { recursive: true });
  const tarih = new Date().toISOString().slice(0, 10);
  const md = path.join(dizin, `tarama-${tarih}.md`), json = path.join(dizin, `tarama-${tarih}.json`);
  const sirali = [...t.bulgular].sort((a, b) => ONEM_SIRASI.indexOf(a.onem) - ONEM_SIRASI.indexOf(b.onem) || a.kod.localeCompare(b.kod));
  const say = (o: string) => sirali.filter((b) => b.onem === o).length;

  const s: string[] = [];
  s.push(`# Veri tarama raporu — ${tarih}`, '');
  s.push('Araç: `npm run tara` (araclar/tarama). Bu rapor yalnızca ölçülen veriyi içerir; hiçbir dosya ya da kayıt değiştirilmedi.', '');
  s.push('## Özet', '');
  s.push('| Önem | Bulgu |', '|---|---|', ...ONEM_SIRASI.map((o) => `| ${o} | ${say(o)} |`), '');
  s.push(`Çalışan kontrol: ${t.bulgular.length + t.gecenler.length} (bulgu çıkan ${t.bulgular.length}, temiz geçen ${t.gecenler.length}). Atlanan: ${t.atlananlar.length}.`, '');

  s.push('## Bulgular', '');
  if (!sirali.length) s.push('Bulgu yok.', '');
  for (const b of sirali) {
    s.push(`### [${b.onem}] ${b.kod} — ${b.baslik}`, '');
    s.push(`- **Etkilenen:** ${b.sayi} / ${b.kontrolEdilen} kontrol edilen kayıt`);
    s.push(`- **Neden önemli:** ${b.aciklama}`);
    s.push(`- **Öneri:** ${b.oneri}`);
    if (b.ornekler.length) { s.push('- **Örnekler:**'); for (const o of b.ornekler) s.push(`  - ${o.replace(/\|/g, '\\|')}`); }
    s.push('');
  }

  s.push('## Temiz geçen kontroller', '', '| Kod | Kontrol | Bakılan kayıt |', '|---|---|---|');
  for (const g of t.gecenler) s.push(`| ${g.kod} | ${g.baslik} | ${g.kontrolEdilen} |`);
  s.push('');

  s.push('## Atlanan kontroller', '');
  if (!t.atlananlar.length) s.push('Yok.', '');
  for (const a of t.atlananlar) s.push(`- ${a.kod} ${a.baslik}: ${a.neden}`);
  if (t.atlananlar.length) s.push('');

  s.push('## Bu taramanın kapsamı dışında', '');
  for (const k of KAPSAM_DISI) s.push(`- ${k}`);
  s.push('');

  fs.writeFileSync(md, s.join('\n'), 'utf8');
  fs.writeFileSync(json, JSON.stringify({ tarih, bulgular: sirali, gecenler: t.gecenler, atlananlar: t.atlananlar, kapsamDisi: KAPSAM_DISI }, null, 2), 'utf8');
  return { md, json };
}
