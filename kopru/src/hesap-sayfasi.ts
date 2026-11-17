// Yerel test hesabı açma sayfası. Yalnızca bu bilgisayardan (127.0.0.1) erişilir; hesap, yerel SQL Server'daki LILITH_MYKO veritabanına yazılır.
// Kullanım:  node src/hesap-sayfasi.ts   →  tarayıcıda http://localhost:8090
// Şifre dosyaya/günlüğe yazılmaz. Kullanıcı adı ve şifre yalnızca harf/rakam kabul edilir (SQL'e doğrudan koyulabildiği için).
import http from 'node:http';
import { execFile } from 'node:child_process';

const PORT = 8090;
const SQL = ['-S', '.\\SQLEXPRESS', '-E', '-d', 'LILITH_MYKO', '-b', '-h', '-1', '-W'];

function sorgu(q: string): Promise<string> {
  return new Promise((coz, red) => execFile('sqlcmd', [...SQL, '-Q', q], { windowsHide: true }, (hata, cikti, hatamsg) => (hata ? red(new Error((cikti + hatamsg).trim() || hata.message)) : coz(cikti))));
}

async function hesapAc(ad: string, sifre: string): Promise<string> {
  if (!/^[A-Za-z0-9]{4,20}$/.test(ad)) return 'Kullanıcı adı 4-20 karakter, yalnız harf ve rakam olmalı.';
  if (!/^[A-Za-z0-9]{4,20}$/.test(sifre)) return 'Şifre 4-20 karakter, yalnız harf ve rakam olmalı.';
  const var_ = await sorgu(`SET NOCOUNT ON; SELECT COUNT(*) FROM TB_USER WHERE strAccountID='${ad}'`);
  if (Number(var_.trim().split(/\s+/)[0]) > 0) return 'Bu kullanıcı adı zaten var.';
  await sorgu(`SET NOCOUNT ON; BEGIN TRAN;
    INSERT INTO TB_USER (strAccountID, strPasswd, strSealPasswd, OTPPassword, strClientIP, bPremiumType, dtPremiumTime, sHours, dtCreateTime, CashPoint, strAuthority, BonusCashPoint, PunishmentPeriod, AccountCheck, promotioncheck, strGenieTime)
      VALUES ('${ad}','${sifre}','12345678','123456','127.0.0.1',0,GETDATE(),0,GETDATE(),0,1,0,0,1,0,0);
    INSERT INTO CHECK_ACCOUNT (strAccountID, gm, logintimestatus, reason, bancount, opencount, updatetime) VALUES ('${ad}','-',1,'-',0,0,GETDATE());
    INSERT INTO ACCOUNT_PREMIUM_DATA (strAccountID, strPremium, sPremiumCount, sPremiumInUse, sPremiumTime) VALUES ('${ad}',0x000000000000000000000000000000000000000000000000000000000000,0,0,0);
    COMMIT TRAN;`);
  return `OK: "${ad}" hesabı açıldı. Oyuna bu adla giriş yapabilirsin.`;
}

const sayfa = (mesaj = '') => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test Hesabı</title>
<style>body{font:16px system-ui;background:#14161c;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}form{background:#1f232c;padding:28px;border-radius:12px;width:min(340px,90vw);display:grid;gap:12px}
input,button{font:inherit;padding:10px;border-radius:8px;border:1px solid #444;background:#12141a;color:#eee}button{background:#c9a24a;color:#111;font-weight:700;cursor:pointer;border:0}.m{min-height:1.4em;color:#9fd}h1{margin:0;font-size:20px}small{color:#999}</style></head>
<body><form method="post" action="/kayit"><h1>Knight Empire — test hesabı</h1><small>Yalnız bu bilgisayardaki yerel sunucu için.</small>
<input name="ad" placeholder="Kullanıcı adı (4-20, harf/rakam)" autocomplete="off" required><input name="sifre" type="password" placeholder="Şifre (4-20, harf/rakam)" autocomplete="new-password" required>
<button>Hesap aç</button><div class="m">${mesaj}</div></form></body></html>`;

http.createServer((istek, yanit) => {
  const yaz = (m = '') => { yanit.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); yanit.end(sayfa(m)); };
  if (istek.method === 'POST' && istek.url === '/kayit') {
    let govde = ''; istek.on('data', (d) => { govde += d; if (govde.length > 2000) istek.destroy(); });
    istek.on('end', () => { const p = new URLSearchParams(govde); hesapAc(p.get('ad') ?? '', p.get('sifre') ?? '').then(yaz).catch((e) => yaz('Hata: ' + String(e.message).slice(0, 200).replace(/[<>&]/g, ''))); });
  } else yaz();
}).listen(PORT, '127.0.0.1', () => console.log(`Test hesabı sayfası: http://localhost:${PORT}`));
