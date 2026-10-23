import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botName: process.env.BOT_NAME || 'Whats-Tok Bot',
  sessionDir: process.env.SESSION_DIR || './session',
  pairingNumber: process.env.PAIRING_NUMBER || '',
  // True jika HANYA ingin aktif di chat ke diri sendiri ("Message yourself" / kontak You)
  // Jadi jika kamu kirim link ke orang lain / grup, bot TIDAK akan ikut campur/download
  onlySelf: true,
  // Auto read tanda centang biru
  autoRead: true,
};
