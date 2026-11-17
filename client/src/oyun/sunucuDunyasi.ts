// Canlı dünya (Aşama 5): sunucudan gelen NPC/canavar ve diğer oyuncu paketlerini sahneye yansıtır.
//   Canavarlar : 0x1D NPC listesi (bölgeye girince/oyun başlarken), 0x0A giriş/çıkış/yeniden doğuş, 0x0B hareket.
//   Oyuncular  : 0x16 oyuncu listesi, 0x07 giriş/çıkış, 0x06 hareket.
// Şimdilik yalnızca CANAVARLAR sunucudan gelir (tür 1); sabit dost NPC'ler (tür 2) yerel npc.json'dan görünmeye devam eder (aynı veritabanından, hareket etmezler).
// Sunucu canavarında hasar/ölüm henüz sunucuya bağlı değil (saldırı paketleri sonraki adım).
import * as THREE from 'three';
import { Canavar, DigerOyuncu, type Oyuncu, YON_OFSET } from './varliklar';
import { YAY_TURLERI, canavarTuruSid, esyaKaynagi, esyaTablo, irkModeli } from './veri';
import type { Hud } from '../arayuz/hud';
import type { Paket } from '../ag/sunucu';
import {
  GIRIS_CIKIS, kullaniciGirisCikis, kullaniciHareketi, kullaniciListesi, npcGirisCikis, npcHareket, npcListesi, npcBolgesi, kullaniciBolgesi, kimlikIstegi,
  type KullaniciBilgisi, type NpcBilgisi,
} from '../../../kopru/protokol/paketler.ts';
import { WIZ } from '../../../kopru/protokol/opcode.ts';
import { partiPaketi, type PartiPaketi } from '../../../kopru/protokol/parti.ts';
import { beceriPaketi, manaDegisti, type BeceriPaketi } from '../../../kopru/protokol/beceri.ts';
import { bankaCevabi, type BankaCevabi } from '../../../kopru/protokol/banka.ts';
import { STAT_ANAHTARLARI, statCevabi } from '../../../kopru/protokol/karakter.ts';
import { magazaCevabi, type MagazaCevabi } from '../../../kopru/protokol/magaza.ts';
import { ozelHedefCevabi, sohbetPaketi, type SohbetPaketi } from '../../../kopru/protokol/sohbet.ts';
import { esyaAdediDegisti, esyaSilmeCevabi, esyaTasimaCevabi, type TasimaCevabi } from '../../../kopru/protokol/envanter.ts';
import { almaCevabi, kutuIcerigi, type AlmaCevabi, type KutuIcerigi } from '../../../kopru/protokol/ganimet.ts';
import {
  SALDIRI_SONUCU, esyaDustu, canDegisti, deneyimDegisti, hedefCan, olum, saldiriSonucu, seviyeDegisti, yenidenDogusCevabi,
} from '../../../kopru/protokol/savas.ts';

/** Savaş olaylarında ana döngünün yapacağı yan işler (ses, ayağa kalkma, arayüz yenileme). */
export interface SavasKancalari {
  /** Sunucuya paket yollar (bölge listesindeki bilmediğimiz NPC/oyuncuların ayrıntısını istemek için). */
  gonder?: (opcode: number, govde: Uint8Array) => void;
  canavarSaldirdi?: (c: Canavar) => void;
  canavarVuruldu?: (c: Canavar, hasar: number) => void;
  /** Kendi canımız değişti (düştüyse `hasar` > 0). */
  oyuncuVuruldu?: (hasar: number) => void;
  seviyeAtlandi?: () => void;
  yenidenDogdu?: (x: number, z: number) => void;
  /** Sunucudan parti paketi geldi (davet, hata…). */
  parti?: (p: PartiPaketi) => void;
  /** Sunucudan skill paketi geldi (bölgedeki biri skill kullandı ya da reddedildi). */
  beceri?: (p: BeceriPaketi) => void;
  /** Canavar ganimet bıraktı: torba no ve (biliniyorsa) canavarın yeri. */
  ganimetDustu?: (torbaNo: number, konum: { x: number; z: number; yaricap: number } | null, canavar: Canavar | null) => void;
  /** Kutu içeriği (0x24) ve alma cevabı (0x26) geldi. */
  kutuIcerigi?: (k: KutuIcerigi) => void;
  almaCevabi?: (a: AlmaCevabi) => void;
  /** Eşya taşıma/giyme isteğinin sonucu (0x1F). */
  tasimaCevabi?: (c: TasimaCevabi) => void;
  esyaSilindi?: (tamam: boolean) => void;
  /** Yığın adedi değişti (ok atınca…): çanta yuvası, eşya, yeni adet. */
  esyaAdedi?: (l: { yuva: number; no: number; adet: number }[]) => void;
  /** Sohbet mesajı geldi; özel sohbet alıcı sorgusunun sonucu (bulundu mu). */
  magaza?: (c: MagazaCevabi) => void;
  statDegisti?: () => void;
  banka?: (c: BankaCevabi) => void;
  sohbet?: (s: SohbetPaketi) => void;
  ozelHedef?: (bulundu: boolean) => void;
}

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
  private oyuncu: Oyuncu | null;
  private kancalar: SavasKancalari;
  /** Sunucunun bildirdiği son can (yerel can yenilenmesi kesirli değer üretir; hasar bu değere göre hesaplanır). */
  private sonSunucuCan: number | null = null;

  /** `liste`/`oyuncuListesi`: oyun döngüsünün gezdiği diziler (varlıklar yüklenince buraya eklenir, kalkınca çıkarılır). */
  constructor(sahne: THREE.Scene, liste: Canavar[], oyuncuListesi: DigerOyuncu[], hud: Hud, benimSoketNo: number, oyuncu: Oyuncu | null = null, kancalar: SavasKancalari = {}) {
    this.sahne = sahne; this.liste = liste; this.oyuncuListesi = oyuncuListesi; this.hud = hud; this.benimSoketNo = benimSoketNo;
    this.oyuncu = oyuncu; this.kancalar = kancalar;
  }

  paketIsle(p: Paket): void {
    switch (p.opcode) {
      case WIZ.NPC_BOLGESI: this.npcBolgesi(npcBolgesi(p.govde)); break;
      case WIZ.KULLANICI_BOLGESI: { const l = kullaniciBolgesi(p.govde); if (l) this.oyuncuBolgesi(l); break; }
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
      case WIZ.BECERI: this.kancalar.beceri?.(beceriPaketi(p.govde)); break;
      case WIZ.MANA_DEGISTI: { const m = manaDegisti(p.govde); if (this.oyuncu) { this.oyuncu.enCokMana = m.enCok; this.oyuncu.mana = m.mana; } break; }
      case WIZ.ESYA_DUSTU: { const d = esyaDustu(p.govde); const c = this.canavarlar.get(d.canavarId); this.kancalar.ganimetDustu?.(d.torbaNo, c ? { x: c.konum.x, z: c.konum.y, yaricap: c.secimYaricapi } : null, c ?? null); break; }
      case WIZ.KUTU_AC: this.kancalar.kutuIcerigi?.(kutuIcerigi(p.govde)); break;
      case WIZ.ESYA_AL: this.kancalar.almaCevabi?.(almaCevabi(p.govde)); break;
      case WIZ.ESYA_ADEDI: this.kancalar.esyaAdedi?.(esyaAdediDegisti(p.govde)); break;
      case WIZ.ESYA_SIL: this.kancalar.esyaSilindi?.(esyaSilmeCevabi(p.govde)); break;
      case WIZ.ESYA_TASI: this.kancalar.tasimaCevabi?.(esyaTasimaCevabi(p.govde)); break;
      case WIZ.BANKA: this.kancalar.banka?.(bankaCevabi(p.govde)); break;
      case WIZ.STAT_DEGISTI: { // stat puanı harcandı: sunucu yeni değeri ve türev değerleri bildirir
        const s = statCevabi(p.govde), o = this.oyuncu; if (!o) break;
        o.stat[STAT_ANAHTARLARI[s.statNo - 1]] = s.deger; o.bonusPuan = Math.max(0, o.bonusPuan - 1);
        o.enCok = s.azamiCan; o.enCokMana = s.azamiMana; o.can = s.can; o.mana = s.mana; this.kancalar.statDegisti?.(); break;
      }
      case WIZ.ESYA_ALIM_SATIM: this.kancalar.magaza?.(magazaCevabi(p.govde)); break;
      case WIZ.SOHBET: this.kancalar.sohbet?.(sohbetPaketi(p.govde)); break;
      case WIZ.SOHBET_HEDEFI: this.kancalar.ozelHedef?.(ozelHedefCevabi(p.govde).bulundu); break;
      case WIZ.PARTI: this.kancalar.parti?.(partiPaketi(p.govde)); break;
      case WIZ.SALDIRI: this.saldiri(saldiriSonucu(p.govde)); break;
      case WIZ.HEDEF_CAN: this.hedefCan(hedefCan(p.govde)); break;
      case WIZ.CAN_DEGISTI: this.canDegisti(canDegisti(p.govde)); break;
      case WIZ.OLUM: this.olum(olum(p.govde).id); break;
      case WIZ.DENEYIM_DEGISTI: this.deneyim(deneyimDegisti(p.govde)); break;
      case WIZ.SEVIYE_DEGISTI: this.seviye(seviyeDegisti(p.govde)); break;
      case WIZ.YENIDEN_DOGUS: { const y = yenidenDogusCevabi(p.govde); this.kancalar.yenidenDogdu?.(y.x, y.z); break; }
      default: break; // diğer paketler sonraki adımlarda
    }
  }

  // ---------------------------------------------------------------- canavarlar
  /** Sunucudaki dost NPC'ler (mağaza, banka…): client'ın yerel NPC'leri bunlarla (K_NPC no + konum) eşleştirilir; alım/satım sunucu kimliğiyle yapılır. */
  readonly dostNpclar = new Map<number, NpcBilgisi>();
  private ekle(n: NpcBilgisi): void {
    if (n.tur !== 1) { this.dostNpclar.set(n.id, n); return; } // dost NPC: görüntüsü yerelde, kimliği burada
    const var_ = this.canavarlar.get(n.id);
    if (var_) { if (var_.olu) var_.agCanlan(n.x, n.z); else { var_.konum.set(n.x, n.z); var_.agHedef = null; } return; } // zaten var: yeniden doğdu ya da yeni konum
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

  /**
   * Bölge değişince sunucu yalnızca bölgedeki NPC KİMLİKLERİNİ yollar (0x1C); ayrıntı client'tan istenir (0x1D). Yeni bölgedeki canavarlar böyle görünür,
   * listede olmayanlar (bölgeden çıkılanlar) kaldırılır; ölüler (ganimeti beklenen) kalır.
   */
  private npcBolgesi(idler: number[]): void {
    const liste = new Set(idler);
    for (const [id, c] of [...this.canavarlar]) if (!liste.has(id) && !c.olu) this.kaldir(id);
    const eksik = idler.filter((id) => !this.canavarlar.has(id) && !this.dostNpclar.has(id));
    if (eksik.length) this.kancalar.gonder?.(WIZ.NPC_LISTESI, kimlikIstegi(eksik));
  }
  /** Aynısı oyuncular için (0x15 → 0x16). */
  private oyuncuBolgesi(idler: number[]): void {
    const liste = new Set(idler);
    for (const id of [...this.oyuncular.keys()]) if (!liste.has(id)) this.oyuncuKaldir(id);
    const eksik = idler.filter((id) => id !== this.benimSoketNo && !this.oyuncular.has(id));
    if (eksik.length) this.kancalar.gonder?.(WIZ.KULLANICI_LISTESI, kimlikIstegi(eksik));
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
    // Hız 0 = "varış noktası şurası": sunucu çoğu hareketten hemen sonra aynı noktaya bir de hız-0 paketi yollar (Npc.cpp: "Move to target... then stop").
    // Orijinal client bunda durmaz: yalnızca hedefi günceller ve önceki hızla yürümeye devam eder (PlayerNPC::MoveTo/Tick). Durursak canavar donup sonra yürür.
    if (hiz > 0) c.agHiz = hiz; else if (c.agHiz <= 0) c.agHiz = Math.max(0.5, c.konum.distanceTo(hedef)); // hiç hızı yoksa kalan yolu 1 sn'de alır (orijinal)
    c.agHedef = hedef;
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
      // Görünen eşyalar: zırh parçaları ve eldeki silah/kalkan (sunucu kullanıcı kaydındaki giyili yuvalar)
      const e = k.esyalar, kaynak = (no: number) => (no ? esyaKaynagi(no) : 0);
      o.model?.giyimUygula(k.irk, { bas: kaynak(e.kask.no), govde: kaynak(e.govde.no), bacak: kaynak(e.bacak.no), el: kaynak(e.eldiven.no), ayak: kaynak(e.ayak.no) });
      const sag = esyaTablo(e.sagEl.no), sol = esyaTablo(e.solEl.no);
      o.model?.silahAyarla(sag?.tip ?? (sol && YAY_TURLERI.includes(sol.tip) ? sol.tip : 0), sol?.tip ?? 0); void o.model?.plugTak('sag', sag?.no ?? 0); void o.model?.plugTak('sol', sol?.no ?? 0);
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

  // ---------------------------------------------------------------- savaş (sunucu belirler; biz yalnızca gösteririz)
  private saldiri(s: { tur: number; sonuc: number; saldiran: number; hedef: number }): void {
    const o = this.oyuncu;
    if (s.saldiran === this.benimSoketNo) { // bizim saldırımız
      const c = this.canavarlar.get(s.hedef);
      if (c && s.sonuc === SALDIRI_SONUCU.ISKA) this.hud.mesaj(`You missed ${c.tur.ad}.`, 'bilgi');
      if (c && (s.sonuc === SALDIRI_SONUCU.HEDEF_OLDU || s.sonuc === SALDIRI_SONUCU.HEDEF_OLDU_TAMAM)) this.hud.mesaj(`${c.tur.ad} has been defeated.`, 'sistem');
      return;
    }
    const c = this.canavarlar.get(s.saldiran);
    if (c && s.hedef === this.benimSoketNo && o) { // canavar bize saldırdı
      c.bak(o.konum); c.model?.oynatRastgele('saldir', 2, false, 0.1);
      this.kancalar.canavarSaldirdi?.(c);
      if (s.sonuc === SALDIRI_SONUCU.ISKA) this.hud.mesaj(`${c.tur.ad} attacks but misses.`, 'bilgi');
    }
  }

  private hedefCan(h: { id: number; enCok: number; can: number; hasar: number; saldiran: number }): void {
    const c = this.canavarlar.get(h.id); if (!c) return;
    c.enCok = h.enCok; c.can = h.can;
    if (h.hasar > 0 && h.saldiran === this.benimSoketNo) {
      this.hud.mesaj(`You hit ${c.tur.ad} for ${h.hasar} damage.`, 'bilgi');
      c.agDarbe(); this.kancalar.canavarVuruldu?.(c, h.hasar);
    }
  }

  private canDegisti(d: { enCok: number; can: number; saldiran: number }): void {
    const o = this.oyuncu; if (!o) return;
    const once = this.sonSunucuCan ?? Math.round(o.can);
    this.sonSunucuCan = d.can;
    o.enCok = d.enCok; o.can = d.can;
    const hasar = once - d.can;
    if (hasar > 0) {
      const c = this.canavarlar.get(d.saldiran);
      this.hud.mesaj(c ? `${c.tur.ad} hits you for ${hasar} damage.` : `You took ${hasar} damage.`, 'hasar');
      if (d.can <= 0) this.hud.mesaj(c ? `You were slain by ${c.tur.ad}.` : 'You were slain.', 'hasar');
      this.kancalar.oyuncuVuruldu?.(hasar);
    }
  }

  private olum(id: number): void {
    if (id === this.benimSoketNo) { if (this.oyuncu && this.oyuncu.can > 0) { this.oyuncu.can = 0; this.kancalar.oyuncuVuruldu?.(0); } return; }
    this.canavarlar.get(id)?.agOlum();
  }

  private deneyim(d: { tur: number; deneyim: bigint }): void {
    const o = this.oyuncu; if (!o) return;
    const yeni = Number(d.deneyim), fark = yeni - o.deneyim;
    o.deneyim = yeni;
    if (fark > 0) this.hud.mesaj(`You gained ${fark} experience.`, 'odul');
  }

  private seviye(s: { id: number; seviye: number; bosPuan: number; azamiDeneyim: bigint; deneyim: bigint; enCokCan: number; can: number; enCokMana: number; mana: number }): void {
    if (s.id !== this.benimSoketNo) { const d = this.oyuncular.get(s.id); if (d) d.seviye = s.seviye; return; }
    const o = this.oyuncu; if (!o) return;
    const yukseldi = s.seviye > o.seviye;
    o.seviye = s.seviye; o.bonusPuan = s.bosPuan; o.azamiDeneyimSunucu = Number(s.azamiDeneyim); o.deneyim = Number(s.deneyim);
    o.enCok = s.enCokCan; o.can = s.can; o.enCokMana = s.enCokMana; o.mana = s.mana;
    this.sonSunucuCan = s.can;
    this.hud.mesaj(yukseldi ? `Level up! You are now level ${s.seviye}.` : `You are now level ${s.seviye}.`, 'sistem');
    this.kancalar.seviyeAtlandi?.();
  }

  /** Bağlantı kapanırken ya da sunucudan ayrılırken: sunucudan gelen her şeyi sahneden kaldırır. */
  tumunuKaldir(): void {
    for (const id of [...this.canavarlar.keys()]) this.kaldir(id);
    for (const id of [...this.oyuncular.keys()]) this.oyuncuKaldir(id);
  }
}
