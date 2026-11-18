// Sunucu bölgeleri (ZONE_INFO1098) ve her bölgenin .smd haritasının gerçek boyutu.
import fs from 'node:fs';
import path from 'node:path';
import { SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';
import { sqlSorgu } from './sql.ts';

export interface BolgeBilgisi {
  no: number;
  ad: string;
  smd: string;
  /** 0 = sunucuda kapalı. */
  durum: number;
  smdVar: boolean;
  /** Dünya genişliği (metre) = (N-1) × birim. smd yoksa/okunamazsa null. */
  kenar: number | null;
}

/** .smd başlığından (ilk 8 bayt: int32 N, float birim) harita kenar uzunluğunu okur. */
function smdKenari(yol: string): number | null {
  const fd = fs.openSync(yol, 'r');
  try {
    const b = Buffer.alloc(8);
    if (fs.readSync(fd, b, 0, 8, 0) < 8) return null;
    const n = b.readInt32LE(0), birim = b.readFloatLE(4);
    return n >= 2 && n <= 4097 && birim > 0 ? (n - 1) * birim : null;
  } finally { fs.closeSync(fd); }
}

export function bolgeleriOku(): Map<number, BolgeBilgisi> {
  const dosyalar = new Map<string, string>();
  if (fs.existsSync(SUNUCU_HARITA_DIZINI)) for (const f of fs.readdirSync(SUNUCU_HARITA_DIZINI)) dosyalar.set(f.toLowerCase(), f);
  const sonuc = new Map<number, BolgeBilgisi>();
  for (const [no, ad, smd, durum] of sqlSorgu('SELECT ZoneNo, ISNULL(strZoneName,\'\'), ISNULL(strZoneSmdName,\'\'), ISNULL(Status,0) FROM ZONE_INFO1098')) {
    const gercek = dosyalar.get(smd.toLowerCase());
    sonuc.set(Number(no), {
      no: Number(no), ad, smd, durum: Number(durum),
      smdVar: gercek !== undefined,
      kenar: gercek ? smdKenari(path.join(SUNUCU_HARITA_DIZINI, gercek)) : null,
    });
  }
  return sonuc;
}
