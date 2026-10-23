import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import readline from 'readline';
import { config } from './config.js';
import { handleMessage } from './handler.js';

// Setup logger minimalis
const logger = pino({ level: 'silent' });

/**
 * Tanya input di terminal
 */
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

/**
 * Jalankan Bot WhatsApp
 */
export async function startBot() {
  console.log('\n=============================================');
  console.log(`🤖 Memulai ${config.botName}...`);
  console.log('=============================================\n');

  // Load state auth dari folder session
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`Menggunakan WA Web v${version.join('.')}, isLatest: ${isLatest}`);

  // Inisialisasi socket Baileys
  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // Ditangani manual agar rapi
    auth: state,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
  });

  // Opsi Pairing Code (Bisa via argumen CLI: node src/index.js --pairing)
  const isPairingArg = process.argv.includes('--pairing');
  const usePairingCode = isPairingArg || Boolean(config.pairingNumber);

  if (usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = config.pairingNumber;
    if (!phoneNumber) {
      console.log('\n📱 Metode Login: Pairing Code (Tanpa scan QR)');
      phoneNumber = await question('Masukkan nomor WhatsApp Anda (format internasional, contoh 6281234567890): ');
    }

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (phoneNumber) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log('\n======================================================');
          console.log(`🔑 KODE PAIRING ANDA: \x1b[1m\x1b[32m${code}\x1b[0m`);
          console.log('Langkah login:');
          console.log('1. Buka WhatsApp di HP Anda');
          console.log('2. Buka Menu Titik Tiga / Pengaturan -> Perangkat Tertaut');
          console.log('3. Pilih "Tautkan Perangkat" -> pilih "Tautkan dengan nomor telepon saja"');
          console.log(`4. Masukkan kode 8-digit di atas: ${code}`);
          console.log('======================================================\n');
        } catch (err) {
          console.error('Gagal meminta Pairing Code:', err.message);
        }
      }, 3000);
    }
  }

  // Update status koneksi
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Tampilkan QR Code di terminal jika tidak menggunakan pairing code
    if (qr && !usePairingCode) {
      console.log('\n📸 Silakan SCAN QR CODE berikut di WhatsApp:');
      qrcode.generate(qr, { small: true });
      console.log('(Atau jalankan `npm start -- --pairing` jika ingin login via Kode Pairing nomor telepon)\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Koneksi terputus. Alasan: ${lastDisconnect?.error?.message || statusCode}`);

      if (shouldReconnect) {
        console.log('🔄 Menghubungkan ulang dalam 5 detik...');
        setTimeout(startBot, 5000);
      } else {
        console.error('❌ Sesi telah dikeluarkan (logged out). Hapus folder "session" untuk scan ulang.');
      }
    } else if (connection === 'open') {
      console.log('\n🎉 ==================================================');
      console.log('✅ BOT WHATSAPP BERHASIL TERHUBUNG & AKTIF!');
      console.log('📩 Bot siap mendeteksi link TikTok / Instagram / YouTube di chat.');
      console.log('====================================================\n');
    }
  });

  // Simpan kredensial sesi saat ada pembaruan
  sock.ev.on('creds.update', saveCreds);

  // Penangan Pesan Masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });

  return sock;
}

// Jalankan bot jika file dieksekusi langsung
startBot().catch((err) => {
  console.error('Fatal Error saat memulai bot:', err);
});
