// Geliştirme aracı: Moradon canavar slotlarını yürüyerek gezer; her slotta sunucunun gönderdiği canavarları sayar ve eksik olanları yazar.
// Kullanım: node src/slot-tarayici.ts <slotlar.csv>   (ID,NpcID,ad,NumNPC,LeftX,TopZ,iRange). Test hesabı: kotest1/KoTest (savaşçı).
import fs from 'node:fs';
import { PaketYazici } from '../protokol/ikili.ts';
import { WIZ } from '../protokol/opcode.ts';
import { HareketGonderici } from '../protokol/hareket.ts';
import { kimlikIstegi, npcBolgesi, npcGirisCikis, npcHareket, npcListesi, type NpcBilgisi } from '../protokol/paketler.ts';
import { bekle, girisYap } from './oyunBaglantisi.ts';

const slotlar = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const [id, npc, ad, adet, x, z, r] = l.split(','); return { id: +id, npc: +npc, ad, adet: +adet, x: +x, z: +z, r: +r }; });
const B = await girisYap('tarayici', 'kotest1', 'kotest1', 'KoTest');
const dunya = new Map<number, NpcBilgisi>(); let hatalar = 0, listeler = 0, girisler = 0;
let okunan = 0;
const isle = () => {
  while (okunan < B.o.kayit.length) {
    const k = B.o.kayit[okunan++]; const g = Buffer.from(k.hex, 'hex');
    try {
      if (k.opcode === WIZ.NPC_BOLGESI) { const ids = npcBolgesi(g); for (const id of [...dunya.keys()]) if (!ids.includes(id)) dunya.delete(id); const eksik = ids.filter((id) => !dunya.has(id)); if (eksik.length) B.o.gonder(WIZ.NPC_LISTESI, kimlikIstegi(eksik)); }
      else if (k.opcode === WIZ.NPC_LISTESI) { listeler++; for (const n of npcListesi(g).npcler) dunya.set(n.id, n); }
      else if (k.opcode === WIZ.NPC_GIRIS_CIKIS) { const r = npcGirisCikis(g); girisler++; if (r.npc) dunya.set(r.id, r.npc); else dunya.delete(r.id); }
      else if (k.opcode === WIZ.NPC_HAREKET) { const r = npcHareket(g); const n = dunya.get(r.id); if (n) { n.x = r.x; n.z = r.z; } }
    } catch (e) { hatalar++; console.log('AYRIŞTIRMA HATASI', k.opcode.toString(16), (e as Error).message); }
  }
};
const p = (m: number) => Math.round(m * 10);
let x = B.benim.x ?? 264, z = B.benim.z ?? 302;
const g = new HareketGonderici((govde) => B.o.gonder(WIZ.HAREKET, govde), 67);
const dt = 1 / 30, hiz = 6;
const yuru = async (hx: number, hz: number) => {
  while (Math.hypot(hx - x, hz - z) > 0.5 && !B.o.kapandi) { const d = Math.hypot(hx - x, hz - z), a = Math.min(d, hiz * dt); x += (hx - x) / d * a; z += (hz - z) / d * a; g.guncelle(x, z, 8.7, dt); isle(); await bekle(33); }
};
// en yakın komşu sırası
const kalan = [...slotlar]; const sirali: typeof slotlar = []; let cx = x, cz = z;
while (kalan.length) { kalan.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)); const s = kalan.shift()!; sirali.push(s); cx = s.x; cz = s.z; }
console.log('başlangıç', x, z, 'slot', sirali.length);
const sonuc: string[] = [];
for (const s of sirali) {
  await yuru(s.x, s.z); for (let i = 0; i < 12; i++) { g.guncelle(x, z, 8.7, dt); isle(); await bekle(100); }
  const yakin = [...dunya.values()].filter((n) => n.tur === 1 && n.protoNo === s.npc && Math.hypot(n.x - s.x, n.z - s.z) <= s.r + 15);
  const hepsi = [...dunya.values()].filter((n) => n.tur === 1 && Math.hypot(n.x - s.x, n.z - s.z) <= s.r + 15).length;
  const satir = `slot ${s.id} ${s.ad} (npc ${s.npc}) @${s.x},${s.z} r${s.r}: beklenen ${s.adet}, görülen ${yakin.length} (alandaki tüm canavar ${hepsi})`;
  console.log(yakin.length < s.adet ? 'EKSİK ' + satir : 'tamam ' + satir); if (yakin.length < s.adet) sonuc.push(satir);
}
console.log(`\nÖZET: ${sonuc.length}/${sirali.length} slot eksik; liste paketi ${listeler}, giriş/çıkış ${girisler}, ayrıştırma hatası ${hatalar}, dünyada ${dunya.size} NPC`);
B.o.kapat(); setTimeout(() => process.exit(0), 200);
