# Telegram Auto Translator --- Spesifikasi untuk Codex

## Tujuan

Bangun aplikasi Node.js + TypeScript yang memantau pesan baru dari
grup/channel publik Telegram yang diikuti akun pengguna, menerjemahkan
pesan berbahasa Inggris ke Bahasa Indonesia tanpa OpenAI API, lalu
mengirim hasilnya ke chat pribadi dengan bot Telegram.

Gunakan: - Node.js LTS - TypeScript - GramJS (`telegram`) untuk membaca
pesan melalui akun Telegram pengguna (MTProto) - Telegram Bot API untuk
menerima `/start` dan mengirim terjemahan ke chat pribadi - MyMemory
Translation API (`https://api.mymemory.translated.net/get`) sebagai
provider terjemahan awal - `dotenv` untuk konfigurasi - `pino` atau
logger sederhana dengan penyamaran rahasia - Vitest untuk pengujian unit
(opsional tetapi disarankan)

Jangan menggunakan OpenAI API, API key OpenAI, atau layanan berbayar
sebagai ketergantungan wajib.

## Batasan dan perilaku penting

1.  Bot Telegram biasa tidak otomatis bisa membaca semua grup publik.
    Untuk grup yang tidak bisa ditambahkan bot, gunakan GramJS dengan
    akun Telegram pengguna yang telah bergabung ke grup tersebut.
2.  Bot penerima adalah identitas terpisah. Pengguna harus membuka bot
    penerima dan menekan **Start** terlebih dahulu agar bot dapat
    mengirim pesan pribadi kepadanya.
3.  Jangan meminta atau menyimpan password akun Telegram. Login MTProto
    dilakukan interaktif pada setup pertama menggunakan kode Telegram
    dan password 2FA bila diminta.
4.  Session string GramJS adalah kredensial sensitif. Jangan pernah
    mencetaknya ke log, meng-commit-nya ke Git, atau mengirimkannya ke
    chat.
5.  Jangan mencoba membaca grup yang tidak dapat diakses akun pengguna.
    Hormati aturan Telegram, privasi, hak akses, dan ketentuan layanan
    sumber.
6.  MyMemory versi translation-memory memiliki batas maksimum `q`
    sebesar 500 byte per request. Implementasikan pemotongan teks
    menjadi segmen yang aman berdasarkan batas byte, idealnya pada batas
    kalimat. Gabungkan hasil terjemahan secara berurutan.
7.  Batas gratis MyMemory dapat berubah. Saat ini dokumentasi menyebut
    5.000 karakter/hari untuk penggunaan anonim dan 50.000 karakter/hari
    bila memberikan email valid melalui parameter `de`. Jadikan email
    opsional melalui konfigurasi dan dokumentasikan batasnya. Tangani
    HTTP error, respons gagal, rate limit, dan timeout.
8.  Jangan menerjemahkan ulang pesan yang berasal dari akun sendiri,
    pesan kosong, atau pesan yang dikirim bot penerima.
9.  MVP hanya memproses **pesan baru setelah aplikasi berjalan**. Tidak
    perlu memindai seluruh histori grup.
10. Jangan menyimpan isi pesan sumber secara permanen. Log cukup
    mencatat status, waktu, dan sumber; hindari mencatat token, API
    hash, session string, kode login, atau isi pesan secara default.
11. Tangani duplikasi sebisa mungkin dengan kunci message ID + chat ID
    di cache bounded/in-memory. Jelaskan bahwa cache hilang saat proses
    restart.
12. Telegram membatasi panjang pesan bot. Jika format hasil akhir
    melebihi batas, pecah menjadi beberapa pesan dengan aman (maksimal
    4.096 karakter per pesan, beri margin untuk format).
13. Jika pesan mengandung media tanpa teks, abaikan pada MVP. Jika pesan
    berisi teks + caption, proses teks/caption yang tersedia.
14. Pesan yang hanya berisi URL, angka, atau teks yang jelas bukan
    bahasa Inggris boleh diabaikan menggunakan filter sederhana yang
    dapat dikonfigurasi. Jangan mengklaim deteksi bahasa yang sempurna.
15. Jangan gunakan `parse_mode` HTML/Markdown pada pesan keluar di MVP
    agar karakter dari pesan sumber tidak merusak format.

## Alur penggunaan yang diharapkan

1.  Pengguna membuat bot melalui `@BotFather` dan memperoleh
    `TELEGRAM_BOT_TOKEN`.
2.  Pengguna membuka `https://my.telegram.org`, login, membuka API
    development tools, lalu memperoleh `TELEGRAM_API_ID` dan
    `TELEGRAM_API_HASH`.
3.  Pengguna membuka bot penerima dan menekan Start. Bot membalas bahwa
    chat tujuan sudah terdaftar.
4.  Pengguna mengatur satu atau beberapa grup/channel sumber menggunakan
    username publik, misalnya `@nama_channel`, di `.env`.
5.  Pengguna menjalankan `npm run dev` untuk pertama kali. Program
    meminta nomor telepon, kode login Telegram, dan password 2FA bila
    diminta. Kode hanya dimasukkan ke terminal lokal.
6.  Program menyimpan session GramJS secara lokal ke file yang diabaikan
    Git, atau ke `.env` lokal dengan instruksi keamanan yang jelas.
    Pilih satu pendekatan aman dan konsisten.
7.  Program mulai mendengarkan pesan baru dari sumber yang
    dikonfigurasi.
8.  Ketika pesan teks berbahasa Inggris masuk, program menerjemahkannya
    ke Bahasa Indonesia dan mengirim ke chat ID yang telah didaftarkan
    oleh `/start`.
9.  Pengguna menghentikan aplikasi dengan Ctrl+C. Koneksi Telegram
    ditutup dengan baik.

## Struktur proyek yang diharapkan

Buat struktur yang sederhana dan terpisah:

``` text
telegram-auto-translator/
├── src/
│   ├── config.ts
│   ├── index.ts
│   ├── telegram/
│   │   ├── user-client.ts
│   │   ├── bot-api.ts
│   │   └── source-listener.ts
│   ├── translation/
│   │   ├── translator.interface.ts
│   │   └── mymemory-translator.ts
│   ├── services/
│   │   ├── message-processor.ts
│   │   └── chat-registration.ts
│   └── utils/
│       ├── split-text.ts
│       └── logger.ts
├── scripts/
│   └── check-bot.ts
├── tests/
│   ├── split-text.test.ts
│   └── message-processor.test.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

Boleh menyesuaikan struktur bila ada alasan teknis, tetapi pisahkan
konfigurasi, koneksi Telegram, provider terjemahan, dan pemrosesan
pesan.

## Variabel lingkungan

Sediakan `.env.example` tanpa rahasia nyata:

``` dotenv
# Telegram MTProto user account
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION=

# Telegram Bot API
TELEGRAM_BOT_TOKEN=

# Comma-separated public usernames, e.g. @channel_one,@public_group
SOURCE_CHATS=@example_channel

# Optional email for MyMemory quota identification
MYMEMORY_EMAIL=

# Processing options
TRANSLATE_ONLY_ENGLISH=true
ENABLE_SOURCE_LINK=true
LOG_LEVEL=info
```

Validasi semua variabel yang wajib saat startup. `TELEGRAM_SESSION`
boleh kosong pada login pertama. Setelah login, simpan session yang
dihasilkan secara aman dan jelaskan cara mengisinya ke `.env`. Jangan
pernah menulis nilai rahasia ke `.env.example`.

## Persyaratan implementasi

### A. Konfigurasi

-   Load `.env` melalui `dotenv`.
-   Validasi API ID numerik dan seluruh variabel wajib.
-   Parse `SOURCE_CHATS` menjadi daftar username yang bersih.
-   Jika daftar sumber kosong atau salah format, tampilkan error yang
    mudah dipahami lalu hentikan proses.
-   Pastikan `.env`, file session, `node_modules`, `dist`, dan log lokal
    tercantum di `.gitignore`.

### B. Telegram Bot API

-   Implementasikan polling `getUpdates` untuk menerima `/start` dan
    `/help`.
-   `/start` harus menyimpan `chat.id` sebagai tujuan pribadi. MVP hanya
    mengizinkan satu chat tujuan yang pertama kali mendaftarkan bot;
    dokumentasikan cara mengganti/menghapus tujuan.
-   Simpan chat ID secara lokal ke file data kecil yang diabaikan Git,
    atau gunakan mekanisme sederhana lain yang persisten. Jangan menaruh
    chat ID sebagai konstanta di source code.
-   Balas `/start` dengan konfirmasi dan petunjuk singkat.
-   `/help` menjelaskan fungsi bot.
-   Kirim terjemahan menggunakan `sendMessage`.
-   Periksa respons `ok` dari Bot API. Tangani 401 token salah, 403 bot
    diblokir/tidak pernah di-Start, 429 rate limit, timeout, dan network
    error.
-   Gunakan satu mekanisme polling saja. Jangan mengaktifkan webhook
    secara bersamaan; dokumentasikan bahwa webhook yang sudah aktif
    mungkin harus dihapus agar polling bekerja.
-   Tolak perintah `/start` dari grup; pendaftaran hanya boleh melalui
    private chat.

### C. GramJS user client

-   Gunakan `TelegramClient` dan `StringSession`.
-   Pada login pertama, minta nomor, kode Telegram, dan password 2FA
    jika dibutuhkan melalui prompt terminal.
-   Jangan mencetak session string. Simpan session secara aman setelah
    autentikasi. Bila file session dipilih, batasi akses file dan
    tambahkan ke `.gitignore`.
-   Saat session tersedia, gunakan session itu tanpa login ulang.
-   Resolve setiap username sumber ke entity Telegram saat startup.
-   Beri error jelas bila akun belum bergabung atau tidak punya akses ke
    sumber.
-   Pasang listener untuk pesan baru dari sumber yang dikonfigurasi.
-   Jangan memindai histori lama.
-   Tangani reconnect dan shutdown SIGINT/SIGTERM secara baik.
-   Jangan mengirim pesan ke grup sumber; aplikasi bersifat read-only
    terhadap sumber.

### D. Provider MyMemory

Gunakan endpoint translation-memory:
`https://api.mymemory.translated.net/get`

Parameter: - `q`: satu segmen teks, maksimum 500 byte. -
`langpair=en|id`. - `de`: email opsional dari `MYMEMORY_EMAIL`, bila
diisi.

Implementasikan: - `URLSearchParams` agar query ter-encode dengan
benar. - Timeout request. - Penanganan HTTP error dan JSON tidak
valid. - Pemeriksaan `responseStatus` dan
`responseData.translatedText`. - Pesan error yang tidak membocorkan
rahasia. - Retry terbatas dengan exponential backoff untuk kegagalan
sementara dan 429; jangan retry tanpa batas. - Pembatasan concurrency
dan jeda antarrequest sederhana agar tidak mengirim terlalu cepat. -
Pemotongan teks berdasarkan byte UTF-8, dengan prioritas memotong pada
batas kalimat/kata. Jangan memotong karakter Unicode di tengah byte. -
Penggabungan terjemahan dengan urutan asli. - Antarmuka `Translator`
agar provider dapat diganti di masa depan.

Jangan menyatakan layanan selalu gratis atau tanpa batas. Tambahkan
catatan bahwa kuota dan terms dapat berubah.

### E. Pemrosesan pesan

-   Terima pesan baru dari source listener.
-   Ambil teks pesan atau caption.
-   Abaikan teks kosong, pesan dari akun sendiri, dan pesan duplikat.
-   Implementasikan filter sederhana untuk
    `TRANSLATE_ONLY_ENGLISH=true`. Gunakan heuristik ringan dan
    dokumentasikan keterbatasannya; jangan menambah layanan AI berbayar.
-   Terjemahkan dengan provider.
-   Buat format pesan tujuan yang mudah dibaca, contohnya:

``` text
🌐 TERJEMAHAN OTOMATIS

📢 Sumber: Nama Channel
🇬🇧 Original:
Gold prices rise as the dollar weakens.

🇮🇩 Terjemahan:
Harga emas naik ketika dolar melemah.

🔗 Sumber: https://t.me/example_channel/123
```

-   Buat tautan sumber hanya jika username publik dan message ID
    tersedia. Jangan membuat tautan palsu untuk grup privat.
-   Batasi panjang teks dan pecah menjadi beberapa pesan bila perlu.
-   Jika penerjemahan gagal, catat error yang aman dan lanjutkan ke
    pesan berikutnya.
-   Tambahkan antrean sederhana atau serialisasi pemrosesan agar pesan
    tidak saling tumpang tindih dan urutan tidak mudah terbalik.
-   Tambahkan deduplikasi berdasarkan `chatId:messageId` dengan cache
    berukuran terbatas.

### F. Logging dan keamanan

-   Jangan log bot token, API hash, session string, kode login,
    password, atau teks pesan penuh.
-   Jangan commit file `.env`, session, atau file penyimpanan chat ID.
-   Sediakan `.env.example`.
-   Berikan pesan error yang dapat ditindaklanjuti.
-   Jangan mengumpulkan histori massal; hanya proses pesan baru.
-   Jelaskan bahwa session GramJS memberi akses ke akun Telegram,
    sehingga harus dijaga seperti password.
-   Jangan menambahkan dashboard web atau database pada MVP.

## Kualitas dan pengujian

-   TypeScript strict mode aktif.
-   `npm run build` harus berhasil.
-   `npm run lint` bila ESLint dikonfigurasi.
-   `npm test` untuk unit test.
-   Unit test wajib untuk pemotongan teks berdasarkan byte, teks kosong,
    hasil terjemahan gagal, dan format pesan.
-   Gunakan mock/fake untuk API eksternal dalam unit test. Jangan
    meminta kredensial Telegram sungguhan saat menjalankan unit test.
-   Jangan membuat klaim bahwa end-to-end Telegram sudah diuji tanpa
    benar-benar menjalankannya dengan kredensial nyata.

## Scripts yang diharapkan

Di `package.json`, sediakan: - `npm run dev` --- jalankan TypeScript
untuk pengembangan. - `npm run build` --- compile ke `dist`. -
`npm start` --- jalankan hasil build. - `npm test` --- jalankan unit
test. - `npm run check-bot` --- periksa Bot Token dan tampilkan username
bot tanpa menampilkan token.

Gunakan versi dependensi yang kompatibel dan terkini saat proyek dibuat.
Jangan mengarang API GramJS yang tidak ada; rujuk dokumentasi resmi
GramJS.

## Dokumentasi README yang wajib dibuat Codex

README harus menjelaskan secara runtut:

1.  Prasyarat: Node.js LTS, npm, akun Telegram, akses grup sumber.
2.  Membuat bot melalui `@BotFather` dan memperoleh token.
3.  Mendapatkan `api_id` dan `api_hash` melalui
    `https://my.telegram.org`.
4.  Meng-clone/membuka folder proyek di VS Code.
5.  Menjalankan `npm install`.
6.  Menyalin `.env.example` menjadi `.env` dan mengisi nilai sendiri.
7.  Menekan Start pada bot penerima.
8.  Login akun Telegram pertama kali melalui terminal.
9.  Cara memastikan username sumber benar dan akun sudah bergabung ke
    sumber.
10. Menjalankan `npm run dev`.
11. Contoh format pesan yang diterima.
12. Troubleshooting: token salah, bot belum di-Start, username sumber
    salah, akun tidak punya akses, kode login/2FA, MyMemory limit,
    jaringan putus, polling konflik dengan webhook, dan session
    kadaluarsa.
13. Cara menjalankan terus di VPS menggunakan PM2 setelah aplikasi lolos
    pengujian lokal.
14. Cara menghentikan proses dan menghapus session secara aman.
15. Peringatan bahwa API ID/hash, Bot Token, dan session tidak boleh
    dibagikan atau di-commit.

## Petunjuk khusus untuk Codex

Baca seluruh spesifikasi ini lalu implementasikan proyek secara nyata,
bukan hanya memberi tutorial atau potongan kode.

Urutan kerja: 1. Periksa isi workspace sebelum mengubah file. 2. Jika
workspace tidak kosong, jangan menimpa file yang sudah ada tanpa alasan;
jelaskan rencana integrasi terlebih dahulu. 3. Buat semua file yang
diperlukan. 4. Install dependensi hanya jika lingkungan mengizinkan;
jangan menyatakan instalasi berhasil bila belum dijalankan. 5. Jalankan
build dan unit test yang tersedia. 6. Perbaiki error yang ditemukan. 7.
Laporkan file yang dibuat, perintah yang sudah benar-benar dijalankan,
hasil build/test, dan langkah manual yang masih harus dilakukan
pengguna. 8. Jangan meminta pengguna menempelkan token, API hash, kode
login, atau session ke percakapan Codex/chat. Rahasia harus diisi
langsung ke `.env` lokal. 9. Jika ada keputusan teknis yang belum pasti,
utamakan implementasi MVP sederhana, aman, terdokumentasi, dan tanpa
OpenAI API.

## Dokumentasi resmi

-   GramJS quick start: https://gram.js.org/
-   GramJS authorization:
    https://gram.js.org/getting-started/authorization
-   Telegram Bot API: https://core.telegram.org/bots/api
-   MyMemory Translation API:
    https://mymemory.translated.net/doc/spec.php
-   MyMemory usage limits:
    https://mymemory.translated.net/doc/usagelimits.php
