# Ajan ve oturum talimatları

Her ajan/oturum, işe başlarken **kendi talimat dosyasını okur**. Önce kökteki `CLAUDE.md` (proje kuralları), sonra aşağıdaki kendi dosyası.
Yeni bir ajan ya da oturum eklenince buraya bir satır ve bir talimat dosyası eklenir.

| Ad | Ne | Talimat dosyası |
|---|---|---|
| müdür | Ana oturum: veri, eşyalar, sunucu, protokol, GM işleri; diğerlerini yönlendirir | `docs/ajanlar/mudur.md` |
| ross | Alt ajan (Claude Code çağırır): arayüz, butonlar, pencereler | `.claude/agents/ross.md` |
| bugger | Ayrı oturum: veri hata taraması ve rapor | `docs/ajanlar/bugger.md` (+ `.claude/agents/hata-tarayici.md`) |
| fast | Ayrı oturum: harita formatı, dönüştürme, hızlı erişim | `docs/ajanlar/fast.md` |
| hata-tarayici | Alt ajan (Claude Code çağırır): veri hata taraması | `.claude/agents/hata-tarayici.md` |
| format-cozucu | Alt ajan: okunamayan dosya formatlarını çözer | `.claude/agents/format-cozucu.md` |
| Genel ajanlar (Explore, Plan, general-purpose…) | Claude Code ile gelir | Ayrı talimat gerekmez; liste `docs/AJANLAR.md` |

Alt ajanların talimatı `.claude/agents/*.md` dosyasında durur ve çağrılınca otomatik yüklenir; aynı metni burada tekrar etmeyiz (iki kopya birbirinden ayrılır).
Ayrı oturumların (ross, bugger, müdür) talimatı bu klasördedir ve oturum açılışında elle okunur: "docs/ajanlar/<ad>.md dosyasını oku ve uygula".
