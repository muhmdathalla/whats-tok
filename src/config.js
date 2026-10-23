import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botName: process.env.BOT_NAME || 'Whats-Tok Bot',
  sessionDir: process.env.SESSION_DIR || './session',
  // Nomor HP bot untuk pairing code (format internasional tanpa +, contoh: 628123456789)
  // Kosongkan jika ingin scan via QR Code di terminal
  pairingNumber: process.env.PAIRING_NUMBER || '',
  // True jika hanya ingin merespons di personal chat (private chat)
  privateOnly: true,
  // Auto read incoming messages
  autoRead: true,
};
