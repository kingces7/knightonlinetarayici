// Harita dosyaları (donusturulmus/web/harita), kapılar ve client harita ayarı (haritalar.ts) kontrolleri.
import fs from 'node:fs';
import path from 'node:path';
import { CIKTI_DIZINI, SUNUCU_HARITA_DIZINI } from '../ortak/yollar.ts';
import { smdOku } from '../harita/smd.ts';
import { BOLGE_HARITASI, HARITALAR } from '../../client/src/oyun/haritalar.ts';
import { KAPI_ADLARI } from '../../client/src/oyun/kapiAdlari.ts';
import { sqlSorgu } from './sql.ts';
import type { BolgeBilgisi } from './bolgeler.ts';
import { Toplayici } from './tur.ts';

const WEB_HARITA = path.join(CIKTI_DIZINI, 'web', 'harita');
const ZORUNLU = ['arazi.json', 'arazi.bin', 'karolar.png', 'nesneler.glb', 'sunucu.json', 'carpisma.bin', 'renk.bin', 'gokyuzu.json'];
const ASCII_DISI = /[^\x20-\x7e]/;

function jsonOku(yol: string): { veri: unknown } | { hata: string } {
  // Tarayıcılar (fetch → response.json) UTF-8 BOM'u atar; Node'un JSON.parse'ı atmaz. Client için sorun olmayan BOM'u hata sayma.
  try { return { veri: JSON.parse(fs.readFileSync(yol, 'utf8').replace(/^﻿/, '')) }; } catch (e) { return { hata: (e as Error).message }; }
}

function kenarlar(arazi: { boyut: number; birim: number }): number { return (arazi.boyut - 1) * arazi.birim; }

export function dosyaKontrolleri(t: Toplayici, bolgeler: Map<number, BolgeBilgisi>): void {
  if (!fs.existsSync(WEB_HARITA)) { t.atla('DOS-*', 'Harita dosyası kontrolleri', `${WEB_HARITA} yok (npm run harita ile üretilir)`); return; }
  const diskteki = fs.readdirSync(WEB_HARITA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const kullanilan = Object.keys(HARITALAR);

  // DOS-01: haritalar.ts'te tanımlı her harita diskte ve eksiksiz mi
  const eksikler: string[] = [];
  for (const h of kullanilan) {
    if (!diskteki.includes(h)) { eksikler.push(`${h}: klasör yok`); continue; }
    for (const d of ZORUNLU) if (!fs.existsSync(path.join(WEB_HARITA, h, d))) eksikler.push(`${h}: ${d} yok`);
  }
  t.kaydet({
    kod: 'DOS-01', kategori: 'Harita', onem: 'KRITIK', baslik: 'Oyunda kullanılan haritanın zorunlu dosyası eksik',
    aciklama: `haritalar.ts'te tanımlı haritalar için şu dosyalar gerekir: ${ZORUNLU.join(', ')}. Eksik olan harita yüklenemez ya da yarım görünür.`,
    oneri: 'npm run harita -- <harita> ile yeniden üret (araclar klasöründe).',
  }, eksikler.length, kullanilan.length * ZORUNLU.length, eksikler);

  // DOS-02: JSON dosyaları geçerli mi
  const jsonHatalari: string[] = [];
  let jsonSayisi = 0;
  for (const h of kullanilan.filter((x) => diskteki.includes(x))) {
    for (const d of ['arazi.json', 'sunucu.json', 'gokyuzu.json', 'npc.json', 'canavar.json', 'su.json']) {
      const yol = path.join(WEB_HARITA, h, d);
      if (!fs.existsSync(yol)) continue;
      jsonSayisi++;
      const r = jsonOku(yol);
      if ('hata' in r) jsonHatalari.push(`${h}/${d}: ${r.hata}`);
    }
  }
  t.kaydet({
    kod: 'DOS-02', kategori: 'Harita', onem: 'KRITIK', baslik: 'Harita JSON dosyası okunamıyor',
    aciklama: 'JSON söz dizimi bozuk; client harita yüklerken hata verir.', oneri: 'Dosyayı yeniden üret.',
  }, jsonHatalari.length, jsonSayisi, jsonHatalari);

  // DOS-03: arazi.bin boyutu ve arazi.json ↔ sunucu haritası boyutu
  const boyutHatalari: string[] = [], uyusmazlik: string[] = [];
  let araziSayisi = 0;
  for (const h of kullanilan.filter((x) => diskteki.includes(x))) {
    const j = jsonOku(path.join(WEB_HARITA, h, 'arazi.json'));
    if ('hata' in j) continue;
    const a = j.veri as { boyut: number; birim: number };
    araziSayisi++;
    const bin = path.join(WEB_HARITA, h, 'arazi.bin');
    const beklenen = a.boyut * a.boyut * 10;
    if (fs.existsSync(bin) && fs.statSync(bin).size !== beklenen) boyutHatalari.push(`${h}: arazi.bin ${fs.statSync(bin).size} bayt, beklenen ${beklenen}`);
    const bolge = HARITALAR[h].bolge, b = bolge === undefined ? undefined : bolgeler.get(bolge);
    if (b?.kenar != null && Math.abs(b.kenar - kenarlar(a)) > 0.5) uyusmazlik.push(`${h}: client arazisi ${kenarlar(a)} m, sunucu haritası (${b.smd}) ${b.kenar} m`);
  }
  t.kaydet({
    kod: 'DOS-03', kategori: 'Harita', onem: 'YUKSEK', baslik: 'arazi.bin boyutu arazi.json ile uyuşmuyor',
    aciklama: 'Dosya N×N×10 bayt olmalı (yükseklik, 2 doku, 2 yön). Uyuşmazsa arazi bozuk okunur.', oneri: 'Haritayı yeniden üret.',
  }, boyutHatalari.length, araziSayisi, boyutHatalari);
  t.kaydet({
    kod: 'DOS-04', kategori: 'Harita', onem: 'YUKSEK', baslik: 'Client haritası ile sunucu haritasının boyutu farklı',
    aciklama: 'Client arazisi ile bölgenin .smd haritası aynı dünyayı anlatmalı. Farklıysa konumlar ve çarpışma kayar.',
    oneri: 'Bölgenin sunucu haritasını (ZONE_INFO1098.strZoneSmdName) client haritasıyla eşleştir.',
  }, uyusmazlik.length, araziSayisi, uyusmazlik);

  // DOS-05: haritalar.ts ayarları
  const ayarHatalari: string[] = [];
  for (const [bolge, harita] of Object.entries(BOLGE_HARITASI)) {
    if (!bolgeler.has(Number(bolge))) ayarHatalari.push(`BOLGE_HARITASI: bölge ${bolge} sunucuda tanımlı değil`);
    if (!HARITALAR[harita]) ayarHatalari.push(`BOLGE_HARITASI: bölge ${bolge} → "${harita}" HARITALAR'da yok`);
  }
  for (const [harita, ayar] of Object.entries(HARITALAR)) {
    if (ayar.bolge !== undefined && BOLGE_HARITASI[ayar.bolge] !== undefined && BOLGE_HARITASI[ayar.bolge] !== harita) ayarHatalari.push(`HARITALAR.${harita}: bölge ${ayar.bolge}, ama BOLGE_HARITASI bu bölgeyi "${BOLGE_HARITASI[ayar.bolge]}" yapıyor (iki harita aynı bölgeyi iddia ediyor)`);
    const b = ayar.bolge === undefined ? undefined : bolgeler.get(ayar.bolge);
    const noktalar: [string, [number, number] | null | undefined][] = [['baslangic', ayar.baslangic], ['sehir', ayar.sehir]];
    for (const [ad, n] of noktalar) {
      if (!n || b?.kenar == null) continue;
      if (n[0] < 0 || n[1] < 0 || n[0] > b.kenar || n[1] > b.kenar) ayarHatalari.push(`HARITALAR.${harita}.${ad} (${n[0]}, ${n[1]}) harita sınırı (${b.kenar} m) dışında`);
    }
  }
  t.kaydet({
    kod: 'DOS-05', kategori: 'Client', onem: 'YUKSEK', baslik: 'haritalar.ts ayarı tutarsız',
    aciklama: 'BOLGE_HARITASI, HARITALAR ve sunucu bölgeleri birbirini tutmalı; başlangıç/şehir noktaları harita içinde olmalı.',
    oneri: 'client/src/oyun/haritalar.ts dosyasını düzelt.',
  }, ayarHatalari.length, Object.keys(HARITALAR).length + Object.keys(BOLGE_HARITASI).length, ayarHatalari);

  kapiKontrolleri(t, bolgeler);
  yerlesimDosyalari(t, diskteki, kullanilan, bolgeler);
  kullanilmayanHaritalar(t, diskteki, kullanilan, bolgeler);
}

/** Kapıları doğrudan sunucu .smd dosyasından okur (sunucu.json'daki kopya eskimiş olabilir). */
function kapiKontrolleri(t: Toplayici, bolgeler: Map<number, BolgeBilgisi>): void {
  const adlar = new Set(Object.keys(KAPI_ADLARI).map(Number));
  const hedefHatalari: string[] = [], sinirHatalari: string[] = [], kapaliHedef: string[] = [], korece: string[] = [], korecePasif: string[] = [], yinelenen: string[] = [];
  let kapiSayisi = 0;
  for (const [bolgeNo, harita] of Object.entries(BOLGE_HARITASI)) {
    const b = bolgeler.get(Number(bolgeNo));
    if (!b?.smdVar) continue;
    const dosya = fs.readdirSync(SUNUCU_HARITA_DIZINI).find((f) => f.toLowerCase() === b.smd.toLowerCase());
    if (!dosya) continue;
    const s = smdOku(fs.readFileSync(path.join(SUNUCU_HARITA_DIZINI, dosya)));
    const gorulen = new Set<number>();
    for (const k of s.kapilar) {
      kapiSayisi++;
      const etiket = `${harita} kapı ${k.id} "${k.ad}" → bölge ${k.bolge} (${k.x}, ${k.z})`;
      if (gorulen.has(k.id)) yinelenen.push(`${harita}: kapı numarası ${k.id} birden çok kez var`);
      gorulen.add(k.id);
      const hedef = bolgeler.get(k.bolge);
      if (!hedef) { hedefHatalari.push(`${etiket}: hedef bölge sunucuda tanımlı değil`); continue; }
      if (hedef.durum === 0) kapaliHedef.push(`${etiket}: hedef "${hedef.ad}" sunucuda kapalı (Status 0)`);
      if (hedef.kenar !== null && (k.x < 0 || k.z < 0 || k.x > hedef.kenar || k.z > hedef.kenar)) sinirHatalari.push(`${etiket}: hedef harita "${hedef.ad}" ${hedef.kenar} m, varış noktası dışında`);
      if (ASCII_DISI.test(k.ad)) (adlar.has(k.id) ? korecePasif : korece).push(`${harita} kapı ${k.id}: "${k.ad}"`);
    }
  }
  t.kaydet({
    kod: 'DOS-06', kategori: 'Kapı', onem: 'YUKSEK', baslik: 'Kapının varış bölgesi sunucuda tanımlı değil',
    aciklama: 'Kapı olmayan bir bölgeye ışınlıyor; oyuncu takılır ya da sunucu hata verir.', oneri: 'smd kapı kaydını ya da ZONE_INFO1098\'i düzelt.',
  }, hedefHatalari.length, kapiSayisi, hedefHatalari);
  t.kaydet({
    kod: 'DOS-07', kategori: 'Kapı', onem: 'YUKSEK', baslik: 'Kapı varış noktası hedef haritanın dışında',
    aciklama: 'Kapıdaki x/z, bulunduğun haritanın değil, ışınlanacağın bölgenin koordinatıdır. Hedef haritanın (N-1)×birim sınırının dışındaysa oyuncu haritanın dışına düşer.',
    oneri: 'Varış koordinatını hedef haritanın içine al.',
  }, sinirHatalari.length, kapiSayisi, sinirHatalari);
  t.kaydet({
    kod: 'DOS-08', kategori: 'Kapı', onem: 'BILGI', baslik: 'Kapı, sunucuda kapalı bölgeye gidiyor',
    aciklama: 'Hedef bölge Status 0. Client kapıyı gri gösterir; bilinçli kapatma olabilir.', oneri: 'Bölge açılacaksa ZONE_INFO1098.Status = 1 yap.',
  }, kapaliHedef.length, kapiSayisi, kapaliHedef);
  t.kaydet({
    kod: 'DOS-09', kategori: 'Kapı', onem: 'YUKSEK', baslik: 'Kapı adı Korece ve client\'ta İngilizce karşılığı yok',
    aciklama: 'Sunucu kapı adını doğrudan .smd dosyasından client\'a gönderir. client/src/main.ts KAPI_ADLARI listesinde olmayan Korece ad menüde bozuk görünür.',
    oneri: 'Kapı numarasını client KAPI_ADLARI listesine ekle.',
  }, korece.length, kapiSayisi, korece);
  t.kaydet({
    kod: 'DOS-10', kategori: 'Kapı', onem: 'DUSUK', baslik: 'Kapı adı Korece ama client İngilizceye çeviriyor',
    aciklama: 'Oyunda sorun yok: client menüde KAPI_ADLARI ile İngilizceye çeviriyor, sunucu.json da üretilirken çevriliyor (özgün metin adKorece alanında). Yalnızca sunucunun okuduğu .smd dosyasında ad Korece; duyuru metni client\'ta hiç gösterilmiyor.',
    oneri: 'Gerekmedikçe dokunma. .smd dosyası sunucu verisidir, değiştirmek gereksiz risktir.',
  }, korecePasif.length, kapiSayisi, korecePasif);
  t.kaydet({
    kod: 'DOS-11', kategori: 'Kapı', onem: 'ORTA', baslik: 'Aynı haritada yinelenen kapı numarası',
    aciklama: 'İki kapı aynı numarayı taşıyor; sunucu ilkini seçer.', oneri: '.smd kapı listesini kontrol et.',
  }, yinelenen.length, kapiSayisi, yinelenen);
}

/** Kullanılan haritaların npc.json / canavar.json dosyaları: varlık, kimlikler, koordinatlar. */
function yerlesimDosyalari(t: Toplayici, diskteki: string[], kullanilan: string[], bolgeler: Map<number, BolgeBilgisi>): void {
  const kimlikler = new Set(sqlSorgu('SELECT sSid FROM K_NPC UNION SELECT sSid FROM K_MONSTER').map((r) => Number(r[0])));
  const eksikDosya: string[] = [], bilinmeyen: string[] = [], disarida: string[] = [];
  let kayit = 0;
  for (const h of kullanilan.filter((x) => diskteki.includes(x))) {
    const bolge = HARITALAR[h].bolge;
    const b = bolge === undefined ? undefined : bolgeler.get(bolge);
    const kenar = b?.kenar ?? null;
    const beklenen = bolge === undefined ? [] : sqlSorgu(`SELECT SUM(CASE WHEN NpcID BETWEEN 10000 AND 29999 THEN 1 ELSE 0 END), SUM(CASE WHEN NpcID < 10000 THEN 1 ELSE 0 END) FROM K_NPCPOS1098 WHERE ZoneID = ${bolge}`)[0] ?? [];
    for (const [dosya, anahtar, sayiBekle] of [['npc.json', 'npc', Number(beklenen[0] || 0)], ['canavar.json', 'yerlesim', Number(beklenen[1] || 0)]] as const) {
      const yol = path.join(WEB_HARITA, h, dosya);
      if (!fs.existsSync(yol)) { if (sayiBekle > 0 && !(dosya === 'canavar.json' && HARITALAR[h].canavar === false)) eksikDosya.push(`${h}/${dosya}: veritabanında bölge ${bolge} için ${sayiBekle} kayıt var`); continue; }
      const r = jsonOku(yol);
      if ('hata' in r) continue; // DOS-02 zaten bildirdi
      const liste = ((r.veri as Record<string, unknown>)[anahtar] ?? []) as { sid: number; x: number; z: number }[];
      for (const e of liste) {
        kayit++;
        if (!kimlikler.has(e.sid)) bilinmeyen.push(`${h}/${dosya}: sid ${e.sid} veritabanında yok`);
        if (kenar !== null && (e.x < 0 || e.z < 0 || e.x > kenar || e.z > kenar)) disarida.push(`${h}/${dosya}: sid ${e.sid} (${e.x}, ${e.z}) harita sınırı (${kenar} m) dışında`);
      }
    }
  }
  t.kaydet({
    kod: 'DOS-12', kategori: 'Harita', onem: 'ORTA', baslik: 'Kullanılan haritada NPC/mob dosyası eksik',
    aciklama: 'Veritabanında o bölge için kayıt var ama dışa aktarılmış npc.json/canavar.json yok (canavar:false olan haritalarda canavar.json beklenmez).',
    oneri: 'araclar/sunucu/npc-disa-aktar.ps1 ve canavar-disa-aktar.ps1 ile yeniden dışa aktar.',
  }, eksikDosya.length, kullanilan.length * 2, eksikDosya);
  t.kaydet({
    kod: 'DOS-13', kategori: 'Harita', onem: 'YUKSEK', baslik: 'npc.json/canavar.json veritabanında olmayan kimlik içeriyor',
    aciklama: 'Dışa aktarılan dosya eski kalmış ya da kimlik silinmiş. Client yerleşimi eksik/bozuk çizer.',
    oneri: 'Dosyaları veritabanından yeniden dışa aktar.',
  }, bilinmeyen.length, kayit, bilinmeyen);
  t.kaydet({
    kod: 'DOS-14', kategori: 'Harita', onem: 'YUKSEK', baslik: 'npc.json/canavar.json koordinatı harita dışında',
    aciklama: 'Yerleşim noktası haritanın sınırı dışında.', oneri: 'Veritabanındaki koordinatı düzelt, sonra yeniden dışa aktar.',
  }, disarida.length, kayit, disarida);
}

/** haritalar.ts'te olmayan harita klasörleri: gerçekten gereksiz mi, yoksa sunucuda bölgesi var mı? */
function kullanilmayanHaritalar(t: Toplayici, diskteki: string[], kullanilan: string[], bolgeler: Map<number, BolgeBilgisi>): void {
  const notlar: string[] = [];
  for (const h of diskteki.filter((x) => !kullanilan.includes(x) && fs.existsSync(path.join(WEB_HARITA, x, 'arazi.json')))) {
    const sj = jsonOku(path.join(WEB_HARITA, h, 'sunucu.json'));
    const smd = 'veri' in sj ? (sj.veri as { kaynak?: string }).kaynak : undefined;
    if (!smd) { notlar.push(`${h}: sunucu eşi (.smd) yok → sunucuda bu haritayı kullanan bölge yok, oyunda kullanılamaz`); continue; }
    const zonlar = [...bolgeler.values()].filter((b) => b.smd.toLowerCase() === smd.toLowerCase());
    const ayrinti = zonlar.map((z) => {
      const [dost, mob] = sqlSorgu(`SELECT SUM(CASE WHEN NpcID BETWEEN 10000 AND 29999 THEN 1 ELSE 0 END), SUM(CASE WHEN NpcID < 10000 THEN 1 ELSE 0 END) FROM K_NPCPOS1098 WHERE ZoneID = ${z.no}`)[0] ?? [];
      return `bölge ${z.no} ${z.ad} (${Number(dost || 0)} dost NPC, ${Number(mob || 0)} mob)`;
    });
    notlar.push(`${h}: sunucu eşi ${smd}; ${zonlar.length ? `kullanan bölgeler: ${ayrinti.join('; ')}` : 'hiçbir bölge kullanmıyor'}; haritalar.ts'te tanımlı değil`);
  }
  t.kaydet({
    kod: 'DOS-15', kategori: 'Harita', onem: 'BILGI', baslik: 'haritalar.ts\'te tanımlı olmayan (kullanılmayan) harita klasörleri',
    aciklama: 'Bu klasörler dönüştürülmüş ama client\'ta açılamaz. Eksik npc.json/canavar.json bu haritalarda hata değil, yalnızca henüz bağlanmamış bölge anlamına gelir.',
    oneri: 'Sunucu bölgesi olan harita (ör. Kecoon Valley) oyuna alınacaksa haritalar.ts\'e eklenir ve ilgili bölgenin npc.json/canavar.json\'u dışa aktarılır.',
  }, notlar.length, diskteki.length, notlar);
}
