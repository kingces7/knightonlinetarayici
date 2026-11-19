// Sohbet (Shout) kuralları — arayüz tarafı.
// Shout (bağırma) mana harcar: her mesaj, azami mana'nın 1/SHOUT_MANA_BOLEN'i kadar; dolu manayla SHOUT_MANA_BOLEN mesaj yazılır.
// Mana'yı SUNUCU düşürür (GameServer/ChatHandler.cpp, SHOUT_CHAT: `MSpChange(-(m_MaxMp / 5))`). Bu bölen sunucudakiyle AYNI olmalı;
// aksi hâlde client "yeterli mana var" der, sunucu mesajı sessizce yok sayar (ya da tersi). Sunucudaki bölen 4'e çekilene kadar fark vardır
// (bkz. docs/YAPILACAKLAR.md "Shout").
export const SHOUT_MANA_BOLEN = 4;

/** Bir Shout mesajının mana bedeli. */
export function shoutManaBedeli(enCokMana: number): number { return Math.floor(enCokMana / SHOUT_MANA_BOLEN); }

/** Orijinal sohbet kutusunun ön ekleri (UIChat.cpp): `!` bağırma, `#` parti, `$` klan. Seçili sekmeyi geçersiz kılar. */
export const SOHBET_ON_EKLERI: Record<string, 'shout' | 'party' | 'clan'> = { '!': 'shout', '#': 'party', '$': 'clan' };
