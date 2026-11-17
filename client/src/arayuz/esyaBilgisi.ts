// Orijinal eşya bilgisi penceresi (client UIImageTooltipDlg::CalcTooltipStringNumAndWrite): satır sırası ve metinler orijinalden (Texts_us.tbl 2501-2530, 4501-4564).
// Sıra (kullanıcının oyun ekran görüntülerine göre): ad (ortalı; yükseltilmişse mor) → tür → ırk → meslek (uymuyorsa kırmızı) → saldırı gücü/hızı/menzil → dayanıklılık → savunma →
//       gereken seviye/güç/dayanıklılık/çeviklik/zekâ/büyü gücü (yetmeyen kırmızı) → Item Grade (yeşil) → fiyat. Ağırlık ve zırh/silah açıklaması gösterilmez.
import type { EsyaTanimi } from '../oyun/veri';

export interface OyuncuOzeti { altin?: number; seviye: number; sinif: number; irk: number; stat: { str: number; sta: number; dex: number; int: number; cha: number } }

/** Eşya türü (Item.Kind) → orijinal tür yazısı (IDS_ITEM_CLASS_*). */
const TUR_YAZISI: Record<number, string> = {
  11: 'Dagger', 21: 'One-handed Sword', 22: 'Two-handed Sword', 31: 'Axe', 32: 'Two-handed Axe', 41: 'Club', 42: 'Two-handed Club', 51: 'Spear', 52: 'Long Spear',
  60: 'Shield', 70: 'Bow', 71: 'Crossbow', 110: 'Staff', 210: 'Warrior Armor', 220: 'Rogue Armor', 230: 'Magician Armor', 240: 'Priest Armor',
};
/** IDS_CLASS_KINDOF_* (1304-1315): eşyanın istediği meslek yazısı; oyuncu sınıfının taban kodları sunucu ItemClassAvailable'dan. */
const MESLEK_YAZISI = ['Warrior', 'Rogue', 'Magician', 'Priest', 'Offensive Warrior', 'Defensive Warrior', 'Archer', 'Assassin', 'Offensive Magician', 'Pet Magician', 'Healing Priest', 'Cursing Priest']; // oyunun kullandığı Texts.tbl
const MESLEK_TABAN: Record<number, number[]> = { 1: [1, 5, 6], 2: [2, 7, 8], 3: [3, 9, 10], 4: [4, 11, 12], 5: [5, 6], 6: [6], 7: [7, 8], 8: [8], 9: [9, 10], 10: [10], 11: [11, 12], 12: [12] };
const IRK_YAZISI: Record<number, string> = { 1: 'Arch Tuarek', 2: 'Tuarek', 3: 'Wrinkle Tuarek', 4: 'Puri Tuarek', 11: 'Barbarian', 12: 'Male El Moradian', 13: 'Female El Moradian' };
/** Eşya sınıfı (Item_Org sütun 36): 1 düşük, 2 orta, 3 yüksek (5: yüksek sınıfın yükseltme çeşidi). IDS_TOOLTIP_LOW/MIDDLE/HIGH_CLASS (4562-4564). */
export const ESYA_SINIFI_YAZISI: Record<number, string> = { 1: 'low Class', 2: 'middle Class', 3: 'high Class', 5: 'high Class' }; // Texts.tbl 4562-4564 (küçük harfle)

const AKSA = '#ffffff', KIRMIZI = '#ff4545', YESIL = '#7fff00', MOR = '#c98be0';

function satir(metin: string, renk = AKSA, ortali = false): HTMLElement {
  const d = document.createElement('div'); d.textContent = metin; d.style.color = renk;
  if (ortali) d.style.textAlign = 'center';
  return d;
}

/** Eşya bilgisi gövdesini üretir. `satin`: mağaza penceresindeki eşya (alış fiyatı), değilse satış fiyatı. */
export function esyaBilgisiOlustur(e: EsyaTanimi, o: OyuncuOzeti | null, satin: boolean, tamir = 0): HTMLElement {
  const kok = document.createElement('div'); kok.className = 'esya-bilgi';
  // Yükseltme: orijinal ad sonuna (+N) ekler (N = eşya numarasının son hanesi); yükseltilmiş eşyanın adı mor görünür.
  const arti = (e.sunucuNo ?? e.no) % 10, adMetni = arti > 0 && !/\(\+\d+\)/.test(e.ad) ? `${e.ad}(+${arti})` : e.ad;
  const ad = satir(e.adet && e.adet > 1 ? `${adMetni} (${e.adet})` : adMetni, arti > 0 || /\(\+[1-9]\d*\)/.test(e.ad) ? MOR : AKSA, true);
  ad.classList.add('baslik'); kok.appendChild(ad);
  if (!e.sayilabilir && TUR_YAZISI[e.tip]) kok.appendChild(satir(TUR_YAZISI[e.tip], AKSA, true));
  if (e.irk) kok.appendChild(satir(IRK_YAZISI[e.irk] ?? 'Unconfirmed race', o && o.irk !== e.irk ? KIRMIZI : AKSA, true));
  if (e.sinif) {
    const taban = o ? o.sinif % 100 : 0;
    kok.appendChild(satir(MESLEK_YAZISI[e.sinif - 1] ?? 'Unconfirmed Specialty', o && !(MESLEK_TABAN[e.sinif] ?? [e.sinif]).includes(taban) ? KIRMIZI : AKSA, true));
  }
  if (e.hasar) kok.appendChild(satir(`Attack Power : ${e.hasar}`));
  if (e.tur === 'silah' && e.gecikme) {
    const g = e.gecikme;
    kok.appendChild(satir(`Attack Speed : ${g <= 89 ? 'Very Fast' : g <= 110 ? 'Fast' : g <= 130 ? 'Normal' : g <= 150 ? 'Slow' : 'Very Slow'}`));
  }
  if (e.menzil) kok.appendChild(satir(`Effective Range : ${(e.menzil / 10).toFixed(2)}`));
  if (e.dayanim && e.dayanim !== 1) { kok.appendChild(satir(`Max Durability : ${e.dayanim}`)); const su = Math.min(e.suru ?? e.dayanim, e.dayanim); kok.appendChild(satir(`Current Durability : ${su}`, su <= 0 ? KIRMIZI : AKSA)); }
  if (e.savunma) kok.appendChild(satir(`Defense Ability : ${e.savunma}`));
  const gerek = (yazi: string, deger: number | undefined, sahip: number | undefined) => {
    if (deger && deger > 0) kok.appendChild(satir(`${yazi} : ${deger}`, o && (sahip ?? 0) < deger ? KIRMIZI : AKSA));
  };
  gerek('Required Level', e.gerekSeviye, o?.seviye);
  gerek('Required Strength', e.gerekGuc, o?.stat.str);
  gerek('Required Health', e.gerekSta, o?.stat.sta);
  gerek('Required Dexterity', e.gerekCev, o?.stat.dex);
  gerek('Required Intelligence', e.gerekZeka, o?.stat.int);
  gerek('Required Magic Power', e.gerekBuyu, o?.stat.cha);
  const donanim = e.tur === 'silah' || e.tur === 'zirh' || e.tur === 'kalkan';
  const derece = ESYA_SINIFI_YAZISI[e.sinifDerece ?? 0];
  if (derece && donanim) kok.appendChild(satir(`Item Grade : ${derece}`, YESIL)); // oyundaki sıra: şartlardan sonra, fiyattan önce; parlak yeşil
  if (e.aciklama && !donanim) { const a = satir(e.aciklama, '#d0d0d0'); a.classList.add('aciklama'); kok.appendChild(a); } // silah/zırhta açıklama gösterilmez
  if (e.fiyat > 0 || satin) {
    const fiyat = satin ? e.fiyat : Math.max(1, Math.floor(e.fiyat / 6));
    kok.appendChild(satir(`${satin ? 'Purchasing' : 'Selling'} Price : ${fiyat.toLocaleString('en-US')}`, satin && o && o.altin !== undefined && o.altin < fiyat ? KIRMIZI : AKSA)); // paran yetmiyorsa fiyat kırmızı
  }
  if (tamir > 0) kok.appendChild(satir(`Repair Cost : ${tamir.toLocaleString('en-US')}`, YESIL)); // tamir modunda eşyanın tamir ücreti
  return kok;
}
