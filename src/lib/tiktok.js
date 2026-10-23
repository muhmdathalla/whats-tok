import axios from 'axios';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import * as btch from 'btch-downloader';

/**
 * Download TikTok media (Video or Photo Slides)
 * @param {string} url - TikTok URL
 * @returns {Promise<{
 *   type: 'images' | 'video',
 *   title: string,
 *   author: string,
 *   images?: string[],
 *   videoUrl?: string,
 *   musicUrl?: string
 * }>}
 */
export async function downloadTikTok(url) {
  // Method 1: TikWM API (sangat stabil untuk slide foto dan video no-watermark)
  try {
    const res = await axios.post('https://tikwm.com/api/', new URLSearchParams({
      url: url,
      hd: '1'
    }), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 20000
    });

    if (res.data && res.data.code === 0 && res.data.data) {
      const data = res.data.data;
      const title = data.title || 'TikTok Media';
      const author = data.author?.nickname || data.author?.unique_id || 'Creator';

      // Cek apakah postingan berupa Photo Slide / Multi-foto
      if (Array.isArray(data.images) && data.images.length > 0) {
        return {
          type: 'images',
          title,
          author,
          images: data.images,
          count: data.images.length,
          musicUrl: data.music || data.music_info?.play
        };
      }

      // Jika postingan berupa Video
      if (data.play || data.wmplay) {
        return {
          type: 'video',
          title,
          author,
          videoUrl: data.play || data.wmplay,
          musicUrl: data.music || data.music_info?.play
        };
      }
    }
  } catch (err) {
    console.warn('[TikTok] TikWM gagal, mencoba metode alternatif:', err.message);
  }

  // Method 2: @tobyg74/tiktok-api-dl
  try {
    const dlResult = await Downloader(url, { version: 'v2' }).catch(() => Downloader(url, { version: 'v1' }));
    if (dlResult && dlResult.status === 'success' && dlResult.result) {
      const result = dlResult.result;
      const title = result.description || 'TikTok Media';
      const author = result.author?.nickname || result.author?.username || 'Creator';

      if (result.type === 'image' && Array.isArray(result.images) && result.images.length > 0) {
        return {
          type: 'images',
          title,
          author,
          images: result.images,
          count: result.images.length,
          musicUrl: result.music?.playUrl
        };
      }

      if (result.video) {
        const videoUrl = typeof result.video === 'string' ? result.video : (result.video.playAddr?.[0] || result.video.downloadAddr?.[0]);
        if (videoUrl) {
          return {
            type: 'video',
            title,
            author,
            videoUrl,
            musicUrl: result.music?.playUrl
          };
        }
      }
    }
  } catch (err) {
    console.warn('[TikTok] tiktok-api-dl gagal, mencoba btch:', err.message);
  }

  // Method 3: btch-downloader ttdl
  try {
    const data = await btch.ttdl(url);
    if (data && (data.video || data.video_nowm || data.play)) {
      return {
        type: 'video',
        title: data.title || 'TikTok Video',
        author: data.author || 'Creator',
        videoUrl: data.video_nowm || data.video || data.play,
        musicUrl: data.audio
      };
    }
  } catch (err) {
    console.warn('[TikTok] btch-downloader gagal:', err.message);
  }

  throw new Error('Gagal mengekstrak media dari link TikTok yang diberikan.');
}
