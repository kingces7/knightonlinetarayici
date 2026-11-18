// Giriş ekranını oyunun ORİJİNAL (resmî USKO 1298) giriş görseline çevirir: Myko'nun "Lilith" arka planı ve gül animasyonu kaldırılır.
//   node arayuz/giris-orijinal.ts   (önce: npm run arayuz -- re_login_intro ; orijinal client: "Knight All in one/Original USKO Client v1298")
// Görsel: UI_US/ka_login01-03_img_us.dxt (resmî client; üçü 1024x768'e birleşir: 01 sol üst, 02 sağ üst, 03'ün üst yarısı sol alt, alt yarısı sağ alt — ka_login_intro_us.uif düzeni).
// Çıktı: donusturulmus/web/arayuz/doku/orijinal_giris_arka.png ve re_login_intro.json yaması (arka plan + gül animasyonu gizlenir).
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, DEPO_KOKU } from '../ortak/yollar.ts';
import { OyunDosyalari } from '../ortak/oyunDosyalari.ts';
import { dxtOku, rgbayaCevir } from '../doku/dxt.ts';
import { pngKodla } from '../ortak/png.ts';

const orijinal = path.resolve(DEPO_KOKU, '..', 'Knight All in one', 'Original USKO Client v1298', 'Client v1298');
const od = new OyunDosyalari(orijinal);
const parca = (n: number) => rgbayaCevir(dxtOku(od.oku(`UI_US/ka_login0${n}_img_us.dxt`)));
const W = 1024, H = 768, c = new Uint8Array(W * H * 4);
const kopyala = (k: Uint8Array, sy: number, h: number, dx: number, dy: number) => { for (let y = 0; y < h; y++) for (let x = 0; x < 512; x++) { const s = ((sy + y) * 512 + x) * 4, d = ((dy + y) * W + dx + x) * 4; c[d] = k[s]; c[d + 1] = k[s + 1]; c[d + 2] = k[s + 2]; c[d + 3] = 255; } };
kopyala(parca(1), 0, 512, 0, 0); kopyala(parca(2), 0, 512, 512, 0);
const u = parca(3); kopyala(u, 0, 256, 0, 512); kopyala(u, 256, 256, 512, 512);
const doku = path.join(CIKTI_DIZINI, 'web', 'arayuz', 'doku'); fs.mkdirSync(doku, { recursive: true });
fs.writeFileSync(path.join(doku, 'orijinal_giris_arka.png'), pngKodla(W, H, c));

const yol = path.join(CIKTI_DIZINI, 'web', 'arayuz', 're_login_intro.json');
const j = JSON.parse(fs.readFileSync(yol, 'utf8').replace(/^﻿/, '')) as { dokular: Record<string, { w: number; h: number }>; kok: Record<string, unknown> };
let degisen = 0;
const gez = (n: Record<string, unknown>): void => {
  if (n.d === 'lilith.dxt') { n.d = 'orijinal_giris_arka.dxt'; n.k = [0, 0, 1024, 768]; n.uv = [0, 0, 1, 1]; degisen++; }
  if (n.id === 'Rose Anim') n.gizli = true;
  for (const k of (n.c as Record<string, unknown>[] | undefined) ?? []) gez(k);
};
gez(j.kok); j.dokular['orijinal_giris_arka.dxt'] = { w: W, h: H };
fs.writeFileSync(yol, JSON.stringify(j));
console.log(`orijinal giriş görseli yazıldı; ${degisen} arka plan düğümü değiştirildi`);
