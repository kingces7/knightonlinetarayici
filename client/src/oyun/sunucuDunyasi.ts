// Canlı dünya (Aşama 5): sunucudan gelen NPC/canavar ve diğer oyuncu paketlerini sahneye yansıtır.
//   Canavarlar : 0x1D NPC listesi (bölgeye girince/oyun başlarken), 0x0A giriş/çıkış/yeniden doğuş, 0x0B hareket.
//   Oyuncular  : 0x16 oyuncu listesi, 0x07 giriş/çıkış, 0x06 hareket.
// Şimdilik yalnızca CANAVARLAR sunucudan gelir (tür 1); sabit dost NPC'ler (tür 2) yerel npc.json'dan görünmeye devam eder (aynı veritabanından, hareket etmezler).
// Sunucu canavarında hasar/ölüm henüz sunucuya bağlı değil (saldırı paketleri sonraki adım).
import * as THREE from 'three';
import { Canavar, DigerOyuncu, YON_OFSET } from './varliklar';
import { canavarTuruSid, irkModeli } from './veri';
import type { Hud } from '../arayuz/hud';
import type { Paket } from '../ag/sunucu';
import {
  GIRIS_CIKIS, kullaniciGirisCikis, kullaniciHareketi, kullaniciListesi, npcGirisCikis, npcHareket, npcListesi,
  type KullaniciBilgisi, type NpcBilgisi,
} from '../../../kopru/protokol/paketler.ts';
import { WIZ } from '../../../kopru/protokol/opcode.ts';

/** Bu uzaklıktan (m) fazla geride kalan varlık varış noktasına ışınlanır (sekme/bağlantı gecikmesi). */
const ISINLAMA_ESIGI = 6;
const OYUNCU_ISINLAMA_ESIGI = 15;

export class SunucuDunyasi {
  /** Sunucudaki kimlik → sahnedeki canavar. */
  readonly canavarlar = new Map<number, Canavar>();
  /** Sunucudaki soket numarası → sahnedeki diğer oyuncu. */
  readonly oyuncular = new Map<number, DigerOyuncu>();
  /** İstemcide tanımı olmadığı için gösterilemeyen canavar prototip numaraları (sonraki iş: tür listesini genişletmek). */
  readonly bilinmeyenTurler = new Set<number>();
  /** Gelen paket sayıları (hata ayıklama). */
  readonly sayac = { liste: 0, giris: 0, cikis: 0, hareket: 0, oyuncuGiris: 0, oyuncuCikis: 0, oyuncuHareket: 0 };
  private sahne: THREE.Scene;
  private liste: Canavar[];
  private oyuncuListesi: DigerOyuncu[];
  private hud: Hud;
  private benimSoketNo: number;

  /** `liste`/`oyuncuListesi`: oyun döngüsünün gezdiği diziler (varlıklar yüklenince buraya eklenir, kalkınca çıkarılır). */
  constructor(sahne: THREE.Scene, liste: Canavar[], oyuncuListesi: DigerOyuncu[], hud: Hud, benimSoketNo: number) {
    this.sahne = sahne; this.liste = liste; this.oyuncuListesi = oyuncuListesi; this.hud = hud; this.benimSoketNo = benimSoketNo;
  }

  paketIsle(p: Paket): void {
    switch (p.opcode) {
      case WIZ.NPC_LISTESI: { this.sayac.liste++; for (const n of npcListesi(p.govde).npcler) this.ekle(n); break; }
      case WIZ.NPC_GIRIS_CIKIS: {
        const g = npcGirisCikis(p.govde);
        if (g.tur === GIRIS_CIKIS.CIKIS) { this.sayac.cikis++; this.kaldir(g.id); } else if (g.npc) { this.sayac.giris++; this.ekle(g.npc); }
        break;
      }
      case WIZ.NPC_HAREKET: { this.sayac.hareket++; const h = npcHareket(p.govde); this.hareket(h.id, h.x, h.z, h.hiz); break; }
      case WIZ.KULLANICI_LISTESI: { for (const k of kullaniciListesi(p.govde).oyuncular) this.oyuncuEkle(k); break; }
      case WIZ.KULLANICI_GIRIS_CIKIS: {
        const g = kullaniciGirisCikis(p.govde);
        if (g.tur === GIRIS_CIKIS.CIKIS) { this.sayac.oyuncuCikis++; this.oyuncuKaldir(g.id); } else if (g.oyuncu) { this.sayac.oyuncuGiris++; this.oyuncuEkle(g.oyuncu); }
        break;
      }
      case WIZ.HAREKET: { this.sayac.oyuncuHareket++; const h = kullaniciHareketi(p.govde); this.oyuncuHareketi(h.id, h.x, h.z, h.hiz, h.yanki); break; }
      default: break; // diğer paketler sonraki adımlarda
    }
  }

  // ---------------------------------------------------------------- canavarlar
  private ekle(n: NpcBilgisi): void {
    if (n.tur !== 1) return; // dost NPC: yerelde
    const var_ = this.canavarlar.get(n.id);
    if (var_) { var_.konum.set(n.x, n.z); var_.agHedef = null; return; } // zaten var: yeni konum
    const tur = canavarTuruSid(n.protoNo, 1);
    if (!tur) { this.bilinmeyenTurler.add(n.protoNo); return; }
    const c = new Canavar(tur, n.x, n.z);
    c.agKimlik = n.id;
    const r = (n.yon * Math.PI) / 180;
    c.yon = Math.atan2(Math.cos(r), Math.sin(r)) + YON_OFSET;
    this.canavarlar.set(n.id, c);
    c.modelYukle().then(() => {
      if (this.canavarlar.get(n.id) !== c) return; // yüklenirken sunucu çıkış yolladıysa ekleme
      this.sahne.add(c.grup); this.liste.push(c);
    }).catch((e) => { console.warn('Canavar modeli yüklenemedi', tur.ad, e); this.canavarlar.delete(n.id); });
  }

  private kaldir(id: number): void {
    const c = this.canavarlar.get(id); if (!c) return;
    this.canavarlar.delete(id);
    this.sahne.remove(c.grup);
    const i = this.liste.indexOf(c); if (i >= 0) this.liste.splice(i, 1);
    this.hud.etiketKaldir(c);
  }

  private hareket(id: number, x: number, z: number, hiz: number): void {
    const c = this.canavarlar.get(id); if (!c) return;
    const hedef = new THREE.Vector2(x, z);
    if (c.konum.distanceTo(hedef) > ISINLAMA_ESIGI) { c.konum.copy(hedef); c.agHedef = null; return; }
    c.agHedef = hedef; c.agHiz = hiz;
  }

  // ---------------------------------------------------------------- diğer oyuncular
  private oyuncuEkle(k: KullaniciBilgisi): void {
    if (k.id === this.benimSoketNo) return; // kendimiz
    const var_ = this.oyuncular.get(k.id);
    if (var_) { var_.konum.set(k.x, k.z); var_.agHedef = null; var_.ad = k.ad; var_.seviye = k.seviye; return; }
    const o = new DigerOyuncu(k.id, k.ad, k.seviye, k.ulus, k.x, k.z);
    this.oyuncular.set(k.id, o);
    o.modelYukle(irkModeli(k.irk)).then(() => {
      if (this.oyuncular.get(k.id) !== o) return;
      this.sahne.add(o.grup); this.oyuncuListesi.push(o);
    }).catch((e) => { console.warn('Oyuncu modeli yüklenemedi', k.ad, e); this.oyuncular.delete(k.id); });
  }

  private oyuncuKaldir(id: number): void {
    const o = this.oyuncular.get(id); if (!o) return;
    this.oyuncular.delete(id);
    this.sahne.remove(o.grup);
    const i = this.oyuncuListesi.indexOf(o); if (i >= 0) this.oyuncuListesi.splice(i, 1);
    this.hud.digerEtiketKaldir(o);
  }

  /** Yankı 0 = durdu (varış = şimdiki konum): oraya hızla yetişip durur; 1/3 = varış noktasına verilen hızla yürür. */
  private oyuncuHareketi(id: number, x: number, z: number, hiz: number, yanki: number): void {
    if (id === this.benimSoketNo) return; // sunucu kendi hareketimizi de yansıtır
    const o = this.oyuncular.get(id); if (!o) return;
    const hedef = new THREE.Vector2(x, z);
    if (o.konum.distanceTo(hedef) > OYUNCU_ISINLAMA_ESIGI) { o.konum.copy(hedef); o.agHedef = null; return; }
    o.agHedef = hedef; o.agHiz = yanki === 0 ? 6 : hiz;
    o.suruyor = yanki !== 0; o.sonPaketSn = performance.now() / 1000;
    const fark = hedef.clone().sub(o.konum); if (fark.lengthSq() > 1e-4) o.yonV.copy(fark.normalize());
  }

  /** Bağlantı kapanırken ya da sunucudan ayrılırken: sunucudan gelen her şeyi sahneden kaldırır. */
  tumunuKaldir(): void {
    for (const id of [...this.canavarlar.keys()]) this.kaldir(id);
    for (const id of [...this.oyuncular.keys()]) this.oyuncuKaldir(id);
  }
}
