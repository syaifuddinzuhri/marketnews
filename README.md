# Telegram Auto Translator

Aplikasi Node.js + TypeScript yang mendukung dua mode operasional:

- `temporary`: hanya menggunakan Telegram Bot API dan MyMemory, tanpa GramJS.
- `live`: menggunakan GramJS untuk membaca source chats yang diizinkan dan Bot API untuk mengirim hasil ke chat pribadi.

## Prasyarat

- Node.js LTS
- npm
- Akun Telegram aktif
- Bot Telegram dibuat dengan BotFather
- Untuk mode `live`, akses ke channel/grup publik dan kredensial MTProto

## Konfigurasi lingkungan

```dotenv
NODE_ENV=development
TELEGRAM_MODE=temporary
TELEGRAM_BOT_TOKEN=123456:ABCDEF
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION=
TELEGRAM_CHAT_ID=
SOURCE_CHATS=@example_channel
MYMEMORY_EMAIL=
TRANSLATE_ONLY_ENGLISH=true
ENABLE_SOURCE_LINK=true
LOG_LEVEL=debug
```

### Perbedaan mode

#### `TELEGRAM_MODE=temporary`

- Tidak menginisialisasi GramJS.
- Membutuhkan `TELEGRAM_BOT_TOKEN`.
- Tidak membutuhkan `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, atau `TELEGRAM_SESSION`.
- Mendukung bot commands: `/start`, `/help`, dan `/translate <teks>`.
- Menggunakan MyMemory untuk translate.
- Cocok untuk pengujian cepat dan bot interaktif.

#### `TELEGRAM_MODE=live`

- Wajib validasi `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION`, `TELEGRAM_CHAT_ID`, dan `SOURCE_CHATS`.
- GramJS aktif untuk membaca pesan baru dari `SOURCE_CHATS`.
- Hentikan startup jika konfigurasi tidak valid.
- Bot API digunakan untuk pengiriman ke chat pribadi.

## Persiapan proyek

```bash
npm install
cp .env.example .env
```

Isi `.env` sesuai mode yang dipilih.

## Mode temporary

1. Atur `NODE_ENV=development` atau `production`.
2. Set `TELEGRAM_MODE=temporary`.
3. Pastikan `TELEGRAM_BOT_TOKEN` diisi.
4. Jalankan:

```bash
npm run dev
```

Lalu kirim ke bot:

```text
/start
/help
/translate Gold prices rise as the dollar weakens.
```

## Mode live

1. Buka https://my.telegram.org dan ambil `api_id` dan `api_hash`.
2. Isi `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, dan `TELEGRAM_SESSION`.
3. Pastikan akun Telegram pengguna sudah bergabung ke source chat.
4. Set `TELEGRAM_CHAT_ID` ke chat pribadi yang didaftarkan agar hasil terkirim.
5. Atur `SOURCE_CHATS` dengan username publik seperti `@example_channel`.
6. Jalankan:

```bash
npm run dev
```

Aplikasi akan memantau pesan baru dari channel yang dikonfigurasi dan mengirim terjemahan ke `TELEGRAM_CHAT_ID`.

## Logging

- `NODE_ENV=development`: logging debug aman.
- `NODE_ENV=production`: logging production.
- Tidak pernah mencetak token, API hash, session, atau isi pesan penuh.

## Troubleshooting

- `TELEGRAM_MODE` tidak valid: gunakan `temporary` atau `live`.
- Live mode tanpa API ID/hash: startup akan gagal dengan pesan jelas.
- `SOURCE_CHATS` kosong: mode live akan gagal.
- `TELEGRAM_CHAT_ID` kosong: mode live akan gagal.
- Session GramJS kosong atau file sesi tidak ada: mode live akan gagal.
- Bot token salah: cek `TELEGRAM_BOT_TOKEN` dan jalankan `npm run check-bot`.
- Bot belum di-Start: tekan Start di bot penerima.
- Webhook aktif: hapus webhook agar polling bot dapat berjalan.

## Menjalankan di VPS / PM2

```bash
npm run build
pm2 start "npm start" --name telegram-auto-translator
```

## Menghentikan proses dan membersihkan session

```bash
Ctrl+C
rm -f data/telegram-session.txt
```

## Keamanan

- `.env`, file session, dan file chat registration tidak boleh di-commit.
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`, dan `TELEGRAM_SESSION` harus dijaga seperti password.
- Session GramJS memberi akses ke akun Telegram.

## Catatan

- MVP hanya memproses pesan baru setelah aplikasi berjalan.
- Tidak ada database, web dashboard, atau layanan OpenAI.
- MyMemory hadir sebagai provider penerjemahan; kuota dan terms dapat berubah.
