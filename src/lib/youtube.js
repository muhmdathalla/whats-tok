import axios from 'axios';
import * as btch from 'btch-downloader';

/**
 * Download YouTube video / shorts
 * @param {string} url - YouTube URL
 * @returns {Promise<{
 *   type: 'video',
 *   title: string,
 *   videoUrl: string,
 *   duration?: string,
 *   author?: string
 * }>}
 */
export async function downloadYouTube(url) {
  // Method 1: btch-downloader youtube
  try {
    const data = await btch.youtube(url);
    if (data && (data.mp4 || data.video || data.url)) {
      return {
        type: 'video',
        title: data.title || 'YouTube Video',
        videoUrl: data.mp4 || data.video || data.url,
        duration: data.duration,
        author: data.author || data.channel
      };
    }
  } catch (err) {
    console.warn('[YouTube] btch-downloader gagal, mencoba fallback:', err.message);
  }

  // Method 2: Public YouTube downloader API fallback
  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`, {
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (res.data && res.data.status && res.data.data) {
      const data = res.data.data;
      const dlUrl = data.dl || data.url || data.download;
      if (dlUrl) {
        return {
          type: 'video',
          title: data.title || 'YouTube Video',
          videoUrl: dlUrl,
          author: data.author
        };
      }
    }
  } catch (err) {
    console.warn('[YouTube] Siputzx API fallback gagal:', err.message);
  }

  // Method 3: Y2Mate public API fallback
  try {
    const res = await axios.post('https://tools.betabotz.eu.org/api/download/ytmp4', {
      url: url
    }, {
      timeout: 25000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (res.data && res.data.result) {
      const result = res.data.result;
      const dlUrl = result.mp4 || result.video || result.url;
      if (dlUrl) {
        return {
          type: 'video',
          title: result.title || 'YouTube Video',
          videoUrl: dlUrl,
          duration: result.duration
        };
      }
    }
  } catch (err) {
    console.warn('[YouTube] Betabotz API fallback gagal:', err.message);
  }

  throw new Error('Gagal mengekstrak video dari YouTube. Pastikan link video valid dan publik.');
}
