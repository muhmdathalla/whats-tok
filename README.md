# Whats-Tok: WhatsApp Media Downloader Bot 🚀

Bot WhatsApp pintar yang otomatis mendeteksi tautan di obrolan pribadi (Direct Message / Chat) dan langsung mengirimkan media untuk diunduh tanpa perlu repot mengetik perintah atau membuka browser.

---

## ✨ Fitur Utama

- **Otomatis Tanpa Perintah**: Cukup salin tautan (link) ke obrolan WhatsApp bot, bot akan mendeteksi dan memprosesnya langsung.
- **Khusus Obrolan Pribadi (Private Chat Only)**: Menjaga privasi Anda agar unduhan media langsung masuk ke obrolan Anda tanpa gangguan grup.
- **TikTok Downloader**:
  - 🎬 **Video**: Unduh video kualitas HD tanpa watermark.
  - 📸 **Photo Slide (Mode Foto TikTok)**:
    - Jika tautan berupa 1 foto: bot mengirimkan 1 foto.
    - Jika tautan berupa **Multiple Foto (Slide/Carousel)**: bot secara beruntun mengirimkan **semua foto** langsung ke chat sehingga bisa langsung disimpan ke galeri ponsel sekaligus.
    - 🎵 Mengirimkan audio/musik latar belakang postingan secara otomatis.
- **Instagram Downloader**:
  - 🎬 **Reels & Video**: Unduh video Reels kualitas tinggi.
  - 📸 **Single Photo**: Unduh 1 foto dengan resolusi penuh.
  - 📸 **Carousel / Album (Multi-Foto/Video)**: Otomatis mengekstrak dan mengirimkan semua slide foto & video ke chat.
- **YouTube Downloader**:
  - 🎬 Unduh Video dan YouTube Shorts dalam format MP4.
- **Dua Pilihan Login**:
  - 📸 **Scan QR Code**: Tampil langsung di terminal.
  - 📱 **Pairing Code (8-Digit)**: Cukup masukkan nomor HP dan masukkan 8 karakter kode di WhatsApp (Menu Perangkat Tertaut -> Tautkan dengan nomor telepon).

---

## 📁 Struktur Folder

```text
whats-tok/
├── src/
│   ├── index.js          # Entry point & koneksi Baileys WA
│   ├── config.js         # Konfigurasi bot & env
│   ├── handler.js        # Penangan pesan & router link medsos
│   ├── lib/
│   │   ├── tiktok.js     # Engine downloader TikTok (Video No-WM & Photo Slides)
│   │   ├── instagram.js  # Engine downloader Instagram (Reels & Carousels)
│   │   └── youtube.js    # Engine downloader YouTube (Video & Shorts)
│   └── utils/
│       └── helpers.js    # Helper buffer, sleep/delay, URL extractor
├── session/              # Kredensial sesi login WhatsApp (dibuat otomatis)
├── .env.example          # Contoh variabel lingkungan
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- **Node.js**: Versi 18 atau 20 ke atas.

### 2. Jalankan Bot

#### Opsi A: Login dengan Scan QR Code (Default)
Jalankan di terminal:
```bash
npm start
```
Akan muncul QR Code di terminal. Buka WhatsApp di ponsel Anda -> Titik tiga / Pengaturan -> **Perangkat Tertaut** -> **Tautkan Perangkat** -> Scan QR code tersebut.

#### Opsi B: Login dengan Pairing Code (Tanpa Scan Kamera)
Jika Anda tidak bisa scan QR atau menjalankan bot di server remote:
```bash
npm start -- --pairing
```
Terminal akan menanyakan nomor telepon WhatsApp Anda (contoh format: `6281234567890`), lalu memberikan 8 karakter Pairing Code. Buka WhatsApp -> **Perangkat Tertaut** -> **Tautkan dengan nomor telepon** -> Masukkan kode tersebut.

---

## 💡 Cara Penggunaan di WhatsApp

Setelah bot terhubung dengan tulisan `BOT WHATSAPP BERHASIL TERHUBUNG & AKTIF!`:

1. Buka nomor WhatsApp bot dari akun Anda (atau chat ke nomor bot).
2. Kirimkan link apa saja:
   - Link TikTok (misal: `https://vt.tiktok.com/...` atau postingan photo slide `https://www.tiktok.com/@.../photo/...`)
   - Link Instagram (misal: `https://www.instagram.com/p/...` atau `https://www.instagram.com/reel/...`)
   - Link YouTube (misal: `https://youtube.com/shorts/...` atau `https://youtu.be/...`)
3. Bot akan bereaksi `⏳` lalu mengirimkan video atau seluruh foto langsung ke chat Anda! 
