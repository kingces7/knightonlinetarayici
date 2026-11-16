import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { WebSocket } from 'ws';
import { kopruBaslat, type Kopru } from './kopru.ts';
import { PaketKanali, cerceveYap } from '../protokol/kanal.ts';
import { JvSifre } from '../protokol/jvSifre.ts';
import { crc32 } from '../protokol/crc32.ts';
import { PaketOkuyucu, PaketYazici } from '../protokol/ikili.ts';
import { LS, GIRIS_SONUCU } from '../protokol/opcode.ts';

// ---------- yardımcılar ----------
function tcpSunucu(isle: (s: net.Socket) => void): Promise<{ port: number; kapat: () => Promise<void> }> {
  return new Promise((coz) => {
    const baglar = new Set<net.Socket>();
    const s = net.createServer((c) => { baglar.add(c); c.on('close', () => baglar.delete(c)); isle(c); });
    s.listen(0, '127.0.0.1', () => coz({
      port: (s.address() as net.AddressInfo).port,
      kapat: () => new Promise<void>((k) => { for (const c of baglar) c.destroy(); s.close(() => k()); }),
    }));
  });
}

function wsAc(url: string, origin?: string): Promise<WebSocket> {
  return new Promise((coz, hata) => {
    const ws = new WebSocket(url, origin ? { origin } : {});
    ws.once('open', () => coz(ws));
    ws.once('error', hata);
    ws.once('unexpected-response', (_i, y) => hata(new Error(`HTTP ${y.statusCode}`)));
  });
}

function sonrakiMesaj(ws: WebSocket): Promise<Buffer> {
  return new Promise((coz, hata) => {
    ws.once('message', (d) => coz(d as Buffer));
    ws.once('close', () => hata(new Error('kapandı')));
  });
}

async function kurulum(isle: (s: net.Socket) => void, kokenler?: string[]): Promise<{ k: Kopru; kapat: () => Promise<void>; url: string }> {
  const hedef = await tcpSunucu(isle);
  const k = await kopruBaslat({ port: 0, hedefler: { '/giris': { host: '127.0.0.1', port: hedef.port } }, izinliKokenler: kokenler });
  return { k, url: `ws://127.0.0.1:${k.port}/giris`, kapat: async () => { await k.kapat(); await hedef.kapat(); } };
}

// ---------- köprü ----------
test('köprü: baytları iki yönde aynen taşır (küçük ve 60 KB)', async () => {
  const { url, kapat } = await kurulum((s) => s.on('data', (d) => s.write(d)));
  try {
    const ws = await wsAc(url);
    const kucuk = Buffer.from([0xaa, 0x55, 1, 0, 9, 0x55, 0xaa]);
    ws.send(kucuk);
    assert.deepEqual(await sonrakiMesaj(ws), kucuk);
    const buyuk = Buffer.alloc(60000, 0xab);
    ws.send(buyuk);
    let toplam = Buffer.alloc(0);
    while (toplam.length < buyuk.length) toplam = Buffer.concat([toplam, await sonrakiMesaj(ws)]); // TCP parçalayabilir
    assert.deepEqual(toplam, buyuk);
    ws.close();
  } finally { await kapat(); }
});

test('köprü: bağlantı kurulmadan gönderilen mesaj kaybolmaz, sırası bozulmaz', async () => {
  const gelen: Buffer[] = [];
  const { url, kapat } = await kurulum((s) => s.on('data', (d) => gelen.push(d)));
  try {
    const ws = await wsAc(url);
    for (let i = 0; i < 5; i++) ws.send(Buffer.from([i]));
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(Buffer.concat(gelen), Buffer.from([0, 1, 2, 3, 4]));
    ws.close();
  } finally { await kapat(); }
});

test('köprü: bilinmeyen yol 404, izinsiz Origin 403, yerel Origin kabul', async () => {
  const { k, url, kapat } = await kurulum((s) => s.on('data', (d) => s.write(d)));
  try {
    await assert.rejects(wsAc(`ws://127.0.0.1:${k.port}/baska`), /404/);
    await assert.rejects(wsAc(url, 'http://kotu-site.example'), /403/);
    const ws = await wsAc(url, 'http://localhost:5173');
    ws.close();
  } finally { await kapat(); }
});

test('köprü: hedef bağlantıyı kapatırsa WebSocket de kapanır; hedef yoksa WebSocket kapanır', async () => {
  const { url, kapat } = await kurulum((s) => { s.on('data', () => s.destroy()); });
  try {
    const ws = await wsAc(url);
    const kapandi = new Promise<number>((c) => ws.once('close', (kod) => c(kod)));
    ws.send(Buffer.from([1]));
    assert.equal(await kapandi, 1000);
  } finally { await kapat(); }
  const k = await kopruBaslat({ port: 0, hedefler: { '/giris': { host: '127.0.0.1', port: 1 } } }); // 1 numaralı portta kimse yok
  try {
    const ws = await wsAc(`ws://127.0.0.1:${k.port}/giris`);
    const kod = await new Promise<number>((c) => ws.once('close', (x) => c(x)));
    assert.equal(kod, 1011);
  } finally { await k.kapat(); }
});

// ---------- köprü + protokol: sahte login server ile uçtan uca ----------
// Sunucu tarafı, C++ kaynağındaki KOSocket::OnRead/Send mantığını bağımsız olarak taklit eder (kanal.ts kullanılmaz).
function sahteGirisSunucusu(s: net.Socket, acikAnahtar: bigint): void {
  let tampon = Buffer.alloc(0);
  let sifre: JvSifre | null = null;
  let beklenenSira = 0;
  const gonder = (opcode: number, govde: Uint8Array) => {
    let veri: Uint8Array;
    if (sifre) veri = sifre.donustur(Uint8Array.from([0xfc, 0x1e, 0, 0, 0, opcode, ...govde]));
    else veri = Uint8Array.from([opcode, ...govde]);
    s.write(cerceveYap(veri));
  };
  s.on('data', (d) => {
    tampon = Buffer.concat([tampon, d]);
    while (tampon.length >= 5) {
      assert.equal(tampon.readUInt16LE(0), 0x55aa); // AA 55
      const n = tampon.readUInt16LE(2);
      if (tampon.length < n + 6) return;
      assert.equal(tampon.readUInt16LE(4 + n), 0xaa55);
      let veri: Uint8Array = tampon.subarray(4, 4 + n);
      tampon = tampon.subarray(n + 6);
      let opcode: number; let govde: Uint8Array;
      if (sifre) {
        const c = sifre.donustur(veri);
        assert.equal(crc32(c.subarray(0, c.length - 4)), new DataView(c.buffer).getUint32(c.length - 4, true), 'CRC');
        assert.equal(new DataView(c.buffer).getUint32(0, true), ++beklenenSira, 'sıra no');
        opcode = c[4]; govde = c.subarray(5, c.length - 4);
      } else { opcode = veri[0]; govde = veri.subarray(1); }
      if (opcode === LS.SURUM) gonder(opcode, new PaketYazici().i16(1299).baytlar());
      else if (opcode === LS.SIFRELEME) { gonder(opcode, new PaketYazici().u64(acikAnahtar).baytlar()); sifre = new JvSifre(acikAnahtar); beklenenSira = 0; }
      else if (opcode === LS.GIRIS) {
        const o = new PaketOkuyucu(govde);
        const hesap = o.yazi(false); const sifreMetni = o.yazi(false);
        if (hesap === 'admin' && sifreMetni === 'admin') gonder(opcode, new PaketYazici().u16(0).u8(GIRIS_SONUCU.BASARILI).i16(-1).yazi(hesap, false).baytlar());
        else gonder(opcode, new PaketYazici().u16(0).u8(GIRIS_SONUCU.SIFRE_YANLIS).baytlar());
      }
    }
  });
}

test('uçtan uca: tarayıcı protokolü → köprü → (sahte) login server: sürüm, şifreleme, giriş', async () => {
  const acik = 0x0123456789abcdefn;
  const { url, kapat } = await kurulum((s) => sahteGirisSunucusu(s, acik));
  try {
    const ws = await wsAc(url);
    const kanal = new PaketKanali();
    const cevapAl = async () => { for (;;) { const p = kanal.al(await sonrakiMesaj(ws)); if (p.length) return p[0]; } };

    ws.send(kanal.paketYap(LS.SURUM));
    const surum = await cevapAl();
    assert.equal(surum.opcode, LS.SURUM); assert.equal(new PaketOkuyucu(surum.govde).i16(), 1299);

    ws.send(kanal.paketYap(LS.SIFRELEME));
    const anahtar = await cevapAl();
    assert.equal(anahtar.opcode, LS.SIFRELEME);
    kanal.sifrelemeyiAc(new PaketOkuyucu(anahtar.govde).u64());
    assert.equal(kanal.sifreli, true);

    ws.send(kanal.paketYap(LS.GIRIS, new PaketYazici().yazi('admin', false).yazi('admin', false).baytlar()));
    const giris = await cevapAl();
    assert.equal(giris.opcode, LS.GIRIS);
    const o = new PaketOkuyucu(giris.govde);
    assert.equal(o.u16(), 0); assert.equal(o.u8(), GIRIS_SONUCU.BASARILI); assert.equal(o.i16(), -1); assert.equal(o.yazi(false), 'admin');

    ws.send(kanal.paketYap(LS.GIRIS, new PaketYazici().yazi('admin', false).yazi('yanlis', false).baytlar()));
    const red = await cevapAl();
    const o2 = new PaketOkuyucu(red.govde); o2.u16();
    assert.equal(o2.u8(), GIRIS_SONUCU.SIFRE_YANLIS);
    ws.close();
  } finally { await kapat(); }
});
