import { downloadTikTok } from './lib/tiktok.js';
import { downloadInstagram } from './lib/instagram.js';
import { downloadYouTube } from './lib/youtube.js';
import { delay, extractUrls, getBuffer } from './utils/helpers.js';
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
    if (!jid || jid === 'status@broadcast') return;

    // Filter grup
    const isGroup = jid.endsWith('@g.us');
    if (config.privateOnly && isGroup) return;

    // Identifikasi akun & deteksi apakah ini chat ke diri sendiri ("Message Yourself" / kontak You)
    const botPhone = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '';
    const botLid = sock.user?.lid ? sock.user.lid.split(':')[0].replace(/[^0-9]/g, '') : '';
    const currentNum = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    const isSelfChat = (botPhone && currentNum === botPhone) || (botLid && currentNum === botLid);

    // KETENTUAN UTAMA:
    // Jika onlySelf aktif (default: true), bot HANYA merespons chat di kontak You (diri sendiri).
    // Jadi kalau kirim link ke orang lain, bot TIDAK akan pernah ikut campur/download!
    if (config.onlySelf && !isSelfChat) {
      return;
    }

    // Jika pesan terkirim dari kita sendiri (fromMe), hanya proses jika kita kirim ke diri sendiri
    if (m.key.fromMe && !isSelfChat) {
      return;
    }

    // Ekstrak teks pesan
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      m.message.videoMessage?.caption ||
      '';

    if (!text || typeof text !== 'string') return;

    // Temukan semua URL dalam teks
    const urls = extractUrls(text);
    if (urls.length === 0) return;

    console.log(`📩 [Link Terdeteksi di Kontak You]: "${urls[0]}"`);

    // Tujuan pengiriman harus selalu format @s.whatsapp.net (bukan internal @lid iOS)
    const targetJid = isSelfChat ? `${botPhone}@s.whatsapp.net` : (jid.endsWith('@lid') ? `${botPhone}@s.whatsapp.net` : jid);

    // Auto read
    if (config.autoRead) {
      await sock.readMessages([m.key]).catch(() => {});
    }

    for (const url of urls) {
      // 1. TIKTOK (Video & Photo Slides)
      if (TIKTOK_REGEX.test(url)) {
        await handleTikTok(sock, targetJid, url);
        break;
      }

      // 2. INSTAGRAM (Reels, Single Photo, Carousel Multi-photo)
      if (INSTAGRAM_REGEX.test(url)) {
        await handleInstagram(sock, targetJid, url);
        break;
      }

      // 3. YOUTUBE (Video & Shorts)
      if (YOUTUBE_REGEX.test(url)) {
        await handleYouTube(sock, targetJid, url);
        break;
      }
    }
  } catch (err) {
    console.error('[Handler Error]:', err);
  }
}

/**
 * Handler TikTok
 */
async function handleTikTok(sock, targetJid, url) {
  console.log(`[TikTok] Mengunduh: ${url}`);
  try {
    const data = await downloadTikTok(url);

    // KASUS 1: Postingan Foto Slide (Bisa 1 atau banyak foto)
    if (data.type === 'images' && Array.isArray(data.images) && data.images.length > 0) {
      const total = data.images.length;

      if (total === 1) {
        await sock.sendMessage(targetJid, {
          image: { url: data.images[0] },
          caption: `📸 *TikTok Photo*\n👤 *Creator:* ${data.author}\n📝 *Caption:* ${data.title || '-'}`
        });
      } else {
        // Unduh semua buffer foto secara bersamaan
        const imageBuffers = await Promise.all(
          data.images.map(imgUrl => getBuffer(imgUrl))
        );

        // Kirim semua foto secara serentak (Promise.all)
        // Hanya foto pertama yang diberi caption, foto lainnya tanpa caption
        // sehingga WhatsApp otomatis menyatukan semuanya menjadi SATU KOTAK ALBUM FOTO (Grid)!
        await Promise.all(
          imageBuffers.map((buf, idx) =>
            sock.sendMessage(targetJid, {
              image: buf,
              caption: idx === 0 ? `📸 *TikTok Slide (${total} Foto)*\n👤 *Creator:* ${data.author}\n📝 *Caption:* ${data.title || '-'}` : undefined
            })
          )
        );
      }

      // Kirim audio/musik jika ada
      if (data.musicUrl) {
        await delay(500);
        await sock.sendMessage(targetJid, {
          audio: { url: data.musicUrl },
          mimetype: 'audio/mp4',
          fileName: 'tiktok_audio.mp3'
        });
      }

      console.log(`[TikTok] Sukses mengirim ${total} foto sekaligus sebagai Album`);
      return;
    }

    // KASUS 2: Video No-Watermark
    if (data.type === 'video' && data.videoUrl) {
      await sock.sendMessage(targetJid, {
        video: { url: data.videoUrl },
        caption: `🎬 *TikTok Video (No Watermark)*\n👤 *Creator:* ${data.author}\n📝 *Title:* ${data.title || '-'}`
      });
      console.log('[TikTok] Sukses mengirim video');
      return;
    }

    throw new Error('Format media TikTok tidak dikenali.');
  } catch (err) {
    console.error('[TikTok Error]:', err.message);
    await sock.sendMessage(targetJid, {
      text: `❌ *Gagal mendownload TikTok:*\n${err.message}`
    });
  }
}

/**
 * Handler Instagram
 */
async function handleInstagram(sock, targetJid, url) {
  console.log(`[Instagram] Mengunduh: ${url}`);
  try {
    const data = await downloadInstagram(url);

    if (!data.items || data.items.length === 0) {
      throw new Error('Tidak ada media yang ditemukan pada link Instagram ini.');
    }

    const total = data.items.length;

    // 1 Media
    if (total === 1) {
      const item = data.items[0];
      if (item.type === 'video') {
        await sock.sendMessage(targetJid, {
          video: { url: item.url },
          caption: `🎬 *Instagram Video / Reels*\n📝 *Caption:* ${data.caption ? data.caption.slice(0, 200) : '-'}`
        });
      } else {
        await sock.sendMessage(targetJid, {
          image: { url: item.url },
          caption: `📸 *Instagram Photo*\n📝 *Caption:* ${data.caption ? data.caption.slice(0, 200) : '-'}`
        });
      }
      console.log('[Instagram] Sukses mengirim 1 media');
      return;
    }

    // Multiple Media (Carousel)
    const imageUrls = data.items.filter(i => i.type === 'image').map(i => i.url);
    const videoItems = data.items.filter(i => i.type === 'video');

    // Jika ada foto, kirim semua foto secara serentak (Promise.all)
    // agar WhatsApp otomatis menggabungkannya jadi 1 kotak Album Foto di chat
    if (imageUrls.length > 0) {
      const imageBuffers = await Promise.all(
        imageUrls.map(imgUrl => getBuffer(imgUrl))
      );

      await Promise.all(
        imageBuffers.map((buf, idx) =>
          sock.sendMessage(targetJid, {
            image: buf,
            caption: idx === 0 ? `📸 *Instagram Album (${imageUrls.length} Foto)*\n📝 *Caption:* ${data.caption ? data.caption.slice(0, 150) : '-'}` : undefined
          })
        )
      );
    }

    // Jika ada video di dalam carousel
    for (const v of videoItems) {
      await sock.sendMessage(targetJid, {
        video: { url: v.url },
        caption: '🎬 Video Carousel'
      });
    }

    console.log(`[Instagram] Sukses mengirim ${total} media carousel sekaligus sebagai Album`);
  } catch (err) {
    console.error('[Instagram Error]:', err.message);
    await sock.sendMessage(targetJid, {
      text: `❌ *Gagal mendownload Instagram:*\n${err.message}`
    });
  }
}

/**
 * Handler YouTube
 */
async function handleYouTube(sock, targetJid, url) {
  console.log(`[YouTube] Mengunduh: ${url}`);
  try {
    const data = await downloadYouTube(url);

    if (!data.videoUrl) {
      throw new Error('Link download video YouTube tidak ditemukan.');
    }

    await sock.sendMessage(targetJid, {
      video: { url: data.videoUrl },
      caption: `▶️ *YouTube Video*\n📌 *Judul:* ${data.title}\n⏱️ *Durasi:* ${data.duration || '-'}\n👤 *Channel:* ${data.author || '-'}`
    });

    console.log('[YouTube] Sukses mengirim video');
  } catch (err) {
    console.error('[YouTube Error]:', err.message);
    await sock.sendMessage(targetJid, {
      text: `❌ *Gagal mendownload YouTube:*\n${err.message}`
    });
  }
}
