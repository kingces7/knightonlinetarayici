// Sunucudan gelen karakter verisini (WIZ_MYINFO) tek oyunculu moddaki `Oyuncu` nesnesine uygular.
// Yalnızca `window.ke.sunucuyaBaglan()` çağrılınca devreye girer; varsayılan tek oyunculu mod değişmez.
import type { BenimBilgim } from '../../../kopru/protokol/paketler.ts';
import type { Arazi } from '../dunya/arazi';
import { type EsyaTanimi, esyaBulSunucu } from './veri';
import type { Oyuncu } from './varliklar';
import { BOLGE_HARITASI, HARITALAR } from './haritalar';

export interface UygulamaOzeti {
  /** Konum uygulandı mı (yalnızca sunucudaki bölge, yüklü haritayla aynıysa). */
  konumUygulandi: boolean;
  /** İstemci eşya listesinde bulunup yerleştirilen eşya sayısı. */
  esyaEslesen: number;
  /** İstemci listesinde olmayan, atlanan sunucu eşya numaraları (sonraki iş: eşya listesini tüm tabloya genişletmek). */
  esyaEslesmeyen: number[];
}

export function sunucuVerisiniUygula(o: Oyuncu, m: BenimBilgim, arazi: Arazi, bolge: number, yuklenenHarita: string): UygulamaOzeti {
  o.sinif = m.sinif;
  o.seviye = m.seviye;
  o.deneyim = Number(m.deneyim);
  o.azamiDeneyimSunucu = Number(m.azamiDeneyim);
  o.altin = m.altin;
  o.bonusPuan = m.bosPuan;
  o.gm = m.yetki === 0; o.kenarPayi = o.gm ? 0.1 : 2; // GM: sunucunun izin verdiği son sınıra (harita genişliği) kadar
  o.skillPuanlari = [...m.skillPuanlari];
  o.stat = { str: m.statlar.str.deger, sta: m.statlar.sta.deger, dex: m.statlar.dex.deger, int: m.statlar.int.deger, cha: m.statlar.cha.deger };
  o.enCok = m.azamiCan; o.can = m.can;
  o.enCokMana = m.azamiMana; o.mana = m.mana;

  // Envanter: 0–13 giyili (istemci ekipman yuvalarıyla aynı KO sırası), 14–41 sırt çantası.
  const esyaEslesmeyen: number[] = [];
  let esyaEslesen = 0;
  o.ekipman.fill(null); o.envanter.fill(null);
  m.envanter.forEach((e, i) => {
    if (!e.no || i >= 14 + o.envanter.length) return;
    const t = esyaBulSunucu(e.no);
    if (!t.ad || t.ad.startsWith('Item ')) esyaEslesmeyen.push(e.no); // tabloda yok: yer tutucu yuvada durur
    esyaEslesen++;
    const kopya: EsyaTanimi = t.sayilabilir ? { ...t, adet: e.adet } : { ...t, suru: e.dayaniklilik };
    if (i < 14) o.ekipman[i] = kopya; else o.envanter[i - 14] = kopya;
  });

  // Konum: sunucu Moradon (21) bölgesinde ve istemcide Moradon haritası yüklüyse oraya yerleştir.
  // Birden çok bölge aynı haritayı kullanabilir (ör. Luferson Castle II, III): bölgenin haritası yüklü haritaysa da konum uygulanır.
  const konumUygulandi = BOLGE_HARITASI[bolge]?.toLowerCase() === yuklenenHarita.toLowerCase()
    || (HARITALAR[yuklenenHarita]?.bolge ?? (yuklenenHarita.toLowerCase().includes('moradon') ? 21 : -1)) === bolge;
  if (konumUygulandi) o.isinla(m.x, m.z, arazi);
  return { konumUygulandi, esyaEslesen, esyaEslesmeyen };
}
