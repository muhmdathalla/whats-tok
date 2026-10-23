import { downloadTikTok } from './lib/tiktok.js';
import { downloadInstagram } from './lib/instagram.js';
import { downloadYouTube } from './lib/youtube.js';
import { delay, extractUrls } from './utils/helpers.js';
import { config } from './config.js';

// Regex link detectors
const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s]+/i;
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|stories|tv|share)\/[^\s]+/i;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s]+/i;

/**
 * Handle incoming WhatsApp message
 */
export async function handleMessage(sock, m) {
  try {
    if (!m.message) return;

    const jid = m.key.remoteJid;

    // Filter: Abaikan status broadcast dan pesan dari bot sendiri
    if (jid === 'status@broadcast' || m.key.fromMe) return;

    // Filter: Hanya terima di personal chat (bukan grup) sesuai permintaan user
    const isGroup = jid.endsWith('@g.us');
    if (config.privateOnly && isGroup) {
      return;
    }

    // Ekstrak teks pesan
    const messageType = Object.keys(m.message)[0];
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      m.message.videoMessage?.caption ||
      '';

    if (!text || typeof text !== 'string') return;

    // Auto read tanda centang biru (opsional)
    if (config.autoRead) {
      await sock.readMessages([m.key]).catch(() => {});
    }

    // Temukan semua URL dalam teks
    const urls = extractUrls(text);
    if (urls.length === 0) return;

    for (const url of urls) {
      // 1. TIKTOK (Video & Photo Slides)
      if (TIKTOK_REGEX.test(url)) {
        await handleTikTok(sock, jid, m, url);
        break;
      }

      // 2. INSTAGRAM (Reels, Single Photo, Carousel Multi-photo)
      if (INSTAGRAM_REGEX.test(url)) {
        await handleInstagram(sock, jid, m, url);
        break;
      }

      // 3. YOUTUBE (Video & Shorts)
      if (YOUTUBE_REGEX.test(url)) {
        await handleYouTube(sock, jid, m, url);
        break;
      }
    }
  } catch (err) {
    console.error('[Handler Error]:', err);
  }
}

/**
 * React emoji ke pesan
 */
async function react(sock, m, emoji) {
  try {
    await sock.sendMessage(m.key.remoteJid, {
      react: {
        text: emoji,
        key: m.key
      }
    });
  } catch (e) {
    // Abaikan jika react gagal
  }
}

/**
 * Handler TikTok
 */
async function handleTikTok(sock, jid, m, url) {
  console.log(`[TikTok] Mendeteksi link: ${url}`);
  await react(sock, m, '⏳');

  try {
    const data = await downloadTikTok(url);

    // KASUS 1: Postingan Foto Slide (Bisa 1 atau banyak foto)
    if (data.type === 'images' && Array.isArray(data.images) && data.images.length > 0) {
      const total = data.images.length;

      // Jika hanya 1 foto
      if (total === 1) {
        await sock.sendMessage(jid, {
          image: { url: data.images[0] },
          caption: `📸 *TikTok Photo*\n👤 *Creator:* ${data.author}\n📝 *Caption:* ${data.title || '-'}`
        }, { quoted: m });
      } else {
        // Jika multiple foto (Slide) -> Langsung kirim semua foto ke chat
        await sock.sendMessage(jid, {
          text: `📸 *TikTok Slide Terdeteksi!* (${total} Foto)\n👤 *Creator:* ${data.author}\n📝 *Caption:* ${data.title || '-'}\n\n_Sedang mengirim semua foto satu per satu langsung ke chat..._`
        }, { quoted: m });

        for (let i = 0; i < total; i++) {
          await delay(1200); // jeda agar tidak spamming/banned oleh WA
          await sock.sendMessage(jid, {
            image: { url: data.images[i] },
            caption: `📸 Foto [${i + 1}/${total}]`
          });
        }
      }

      // Opsional: Kirim audio/soundtrack TikTok jika ada
      if (data.musicUrl) {
        await delay(1000);
        await sock.sendMessage(jid, {
          audio: { url: data.musicUrl },
          mimetype: 'audio/mp4',
          fileName: 'tiktok_audio.mp3'
        });
      }

      await react(sock, m, '✅');
      return;
    }

    // KASUS 2: Postingan Video No-Watermark
    if (data.type === 'video' && data.videoUrl) {
      await sock.sendMessage(jid, {
        video: { url: data.videoUrl },
        caption: `🎬 *TikTok Video (No Watermark)*\n👤 *Creator:* ${data.author}\n📝 *Title:* ${data.title || '-'}`
      }, { quoted: m });

      await react(sock, m, '✅');
      return;
    }

    throw new Error('Format media TikTok tidak dikenali.');
  } catch (err) {
    console.error('[TikTok Error]:', err.message);
    await react(sock, m, '❌');
    await sock.sendMessage(jid, {
      text: `❌ *Gagal mendownload TikTok:*\n${err.message}\n\nPastikan video bersifat publik.`
    }, { quoted: m });
  }
}

/**
 * Handler Instagram
 */
async function handleInstagram(sock, jid, m, url) {
  console.log(`[Instagram] Mendeteksi link: ${url}`);
  await react(sock, m, '⏳');

  try {
    const data = await downloadInstagram(url);

    if (!data.items || data.items.length === 0) {
      throw new Error('Tidak ada media yang ditemukan pada link Instagram ini.');
    }

    const total = data.items.length;

    // KASUS 1: Hanya 1 Media (Single Photo atau 1 Video/Reels)
    if (total === 1) {
      const item = data.items[0];
      if (item.type === 'video') {
        await sock.sendMessage(jid, {
          video: { url: item.url },
          caption: `🎬 *Instagram Video / Reels*\n📝 *Caption:* ${data.caption ? data.caption.slice(0, 200) : '-'}`
        }, { quoted: m });
      } else {
        await sock.sendMessage(jid, {
          image: { url: item.url },
          caption: `📸 *Instagram Photo*\n📝 *Caption:* ${data.caption ? data.caption.slice(0, 200) : '-'}`
        }, { quoted: m });
      }

      await react(sock, m, '✅');
      return;
    }

    // KASUS 2: Multiple Media / Carousel Album (Banyak foto / video)
    await sock.sendMessage(jid, {
      text: `📸 *Instagram Carousel Terdeteksi!* (${total} Media)\n\n_Sedang mengirim seluruh media langsung ke chat..._`
    }, { quoted: m });

    for (let i = 0; i < total; i++) {
      const item = data.items[i];
      await delay(1200);

      if (item.type === 'video') {
        await sock.sendMessage(jid, {
          video: { url: item.url },
          caption: `🎬 Media [${i + 1}/${total}] (Video)`
        });
      } else {
        await sock.sendMessage(jid, {
          image: { url: item.url },
          caption: `📸 Foto [${i + 1}/${total}]`
        });
      }
    }

    await react(sock, m, '✅');
  } catch (err) {
    console.error('[Instagram Error]:', err.message);
    await react(sock, m, '❌');
    await sock.sendMessage(jid, {
      text: `❌ *Gagal mendownload Instagram:*\n${err.message}\n\nPastikan postingan/akun publik (tidak private).`
    }, { quoted: m });
  }
}

/**
 * Handler YouTube
 */
async function handleYouTube(sock, jid, m, url) {
  console.log(`[YouTube] Mendeteksi link: ${url}`);
  await react(sock, m, '⏳');

  try {
    const data = await downloadYouTube(url);

    if (!data.videoUrl) {
      throw new Error('Link download video YouTube tidak ditemukan.');
    }

    await sock.sendMessage(jid, {
      video: { url: data.videoUrl },
      caption: `▶️ *YouTube Video*\n📌 *Judul:* ${data.title}\n⏱️ *Durasi:* ${data.duration || '-'}\n👤 *Channel:* ${data.author || '-'}`
    }, { quoted: m });

    await react(sock, m, '✅');
  } catch (err) {
    console.error('[YouTube Error]:', err.message);
    await react(sock, m, '❌');
    await sock.sendMessage(jid, {
      text: `❌ *Gagal mendownload YouTube:*\n${err.message}\n\nPastikan link valid dan durasi video tidak terlalu besar untuk WhatsApp.`
    }, { quoted: m });
  }
}
