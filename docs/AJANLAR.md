# Ajanlar

Bu dosya, Claude Code'da kullanılabilen ajanların listesidir. Ajan, Claude'un belirli bir işi
kendi başına yapmak için çağırdığı yardımcıdır. Her ajanın kendi araçları ve sınırları vardır.

Bir ajanı çağırmak için sohbette adını ve ne yapmasını istediğini yazman yeterli.
Örnek: "Explore ajanıyla `.tbl` formatını ara."

## Genel ajanlar (Claude Code ile birlikte gelir)

| # | Ajan | Ne için | Dosya değiştirir mi? |
|---|------|---------|----------------------|
| 1 | claude | Genel amaçlı, her işe uyan ajan | Evet |
| 2 | general-purpose | Araştırma, kod arama, çok adımlı işler | Evet |
| 3 | Explore | Çok sayıda dosyada hızlı arama ve keşif | Hayır |
| 4 | Plan | Bir işe başlamadan önce adım adım plan çıkarma | Hayır |
| 5 | claude-code-guide | Claude Code, Claude API ve Agent SDK soruları | Hayır |
| 6 | web-fetch | İnternet sayfalarını okuma | Hayır |
| 7 | statusline-setup | Claude Code durum çubuğunu ayarlama | Evet (sadece ayar) |

## Bu projede kullanım önerileri

- **Explore:** Oyun dosyası formatlarını ararken (`KnightEmpire/` içinde) ya da kod tabanında bir şeyi bulurken.
- **Plan:** Yeni bir aşamaya (örneğin Aşama 2: harita ve model) başlamadan önce.
- **general-purpose:** Okuyucu ve dönüştürücü yazma, test etme işlerinde.
- **web-fetch:** Three.js, glTF veya WebSocket gibi dış dokümanları okurken.
- **claude-code-guide:** Claude Code'un kendisi hakkında bir şey sorarken.
- **statusline-setup:** Durum çubuğunu değiştirmek istersen.

## Projeye özel ajanlar

Bu ajanlar `.claude/agents/` klasöründe tutulur ve bu klasör depoya girer.
Sürekli tekrarlanan işler için yenisi eklenebilir.

| Ajan | Ne için | Araçları | Dosya değiştirir mi? |
|------|---------|----------|----------------------|
| format-cozucu | Okunamayan oyun dosyası formatlarını çözer; önce kaynak koddan öğrenir, kanıtlı belgeler, okuyucu ve test yazar, raporlar | Read, Write, Edit, Glob, Grep, Bash | Evet (`araclar/`, `docs/`, `donusturulmus/`); oyun dosyalarına asla dokunmaz |

Dosya: `.claude/agents/format-cozucu.md`. Kullanım örneği: "format-cozucu ajanıyla `.tct` dosyasını çöz."
İlk görevi: sürüm 7 (şifreli) dokuların çözülmesi.

| Ajan | Ne için | Araçları | Dosya değiştirir mi? |
|------|---------|----------|----------------------|
| hata-tarayici | Veritabanı, harita dosyaları ve client ayarındaki eksik/tutarsız/yanlış kodlanmış veriyi bulur, her bulguyu doğrular, müdüre kanıtlı rapor yazar | Read, Write, Glob, Grep, Bash | Yalnız rapor (`docs/raporlar/`) ve `araclar/tarama/` kuralları; düzeltme için onay ister |

Dosya: `.claude/agents/hata-tarayici.md`. Kullanım: "hata-tarayici ajanıyla veri taraması yap." Aracı: `npm run tara` (araclar klasöründe).
**bugger** bu ajanın yan sekmede (ayrı oturum) çalışan sürümüdür; aynı kurallarla çalışır, raporlarını `docs/raporlar/` altına yazar, müdüre (ana oturum) kullanıcı iletir.

## Oturum talimatları

Ayrı oturumların (müdür, ross, bugger) talimatları `docs/ajanlar/` klasöründedir; her oturum işe başlarken kendi dosyasını okur. Liste ve iş bölümü: `docs/ajanlar/README.md`.

## Kurallar

- İnternetten ajan indirip yüklemeyiz. Gerekirse önce kodunu inceleyip sonra karar veririz.
- Orijinal oyun dosyalarını ajanlar da değiştirmez. Sadece okunur (`CLAUDE.md` kuralı).
