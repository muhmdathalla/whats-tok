import axios from 'axios';
import * as btch from 'btch-downloader';

/**
 * Download Instagram Media (Single Photo, Carousel Multi-photo, Reels/Video)
 * @param {string} url - Instagram URL
 * @returns {Promise<{
 *   type: 'images' | 'video' | 'mixed',
 *   caption: string,
 *   items: Array<{ type: 'image' | 'video', url: string }>
 * }>}
 */
export async function downloadInstagram(url) {
  // Method 1: btch-downloader igdl
  try {
    const rawData = await btch.igdl(url);
    const mediaList = Array.isArray(rawData) ? rawData : (rawData?.result || rawData?.data || (rawData?.url ? [rawData] : []));

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      const items = mediaList.map((item) => {
        const link = typeof item === 'string' ? item : (item.url || item.downloadUrl || item.link);
        const isVideo = item.type === 'video' || (link && (link.includes('.mp4') || link.includes('video')));
        return {
          type: isVideo ? 'video' : 'image',
          url: link
        };
      }).filter(item => Boolean(item.url));

      if (items.length > 0) {
        const hasVideo = items.some(i => i.type === 'video');
        const hasImage = items.some(i => i.type === 'image');
        let overallType = 'image';
        if (hasVideo && hasImage) overallType = 'mixed';
        else if (hasVideo) overallType = 'video';
        else overallType = 'images';

        return {
          type: overallType,
          caption: rawData?.caption || rawData?.title || 'Instagram Media',
          items
        };
      }
    }
  } catch (err) {
    console.warn('[Instagram] btch-downloader igdl gagal, mencoba fallback:', err.message);
  }

  // Method 2: Public SnapInsta / Siputzx API fallback
  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (res.data && res.data.status && Array.isArray(res.data.data)) {
      const items = res.data.data.map((item) => {
        const link = item.url || item.dl;
        const isVideo = link.includes('.mp4') || item.type === 'video';
        return {
          type: isVideo ? 'video' : 'image',
          url: link
        };
      }).filter(item => Boolean(item.url));

      if (items.length > 0) {
        return {
          type: items.some(i => i.type === 'video') ? 'video' : 'images',
          caption: 'Instagram Media',
          items
        };
      }
    }
  } catch (err) {
    console.warn('[Instagram] Siputzx API fallback gagal:', err.message);
  }

  // Method 3: FastDL public API scraper fallback
  try {
    const res = await axios.post('https://saveig.app/api/ajaxSearch', new URLSearchParams({
      q: url,
      t: 'media',
      lang: 'en'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 20000
    });

    if (res.data && res.data.data) {
      const html = res.data.data;
      // Ekstrak link download dari atribut href
      const matches = [...html.matchAll(/href="([^"]+)"[^>]*class="[^"]*btn-download[^"]*"/g)];
      if (matches.length > 0) {
        const items = matches.map(m => {
          const dlUrl = m[1];
          const isVideo = dlUrl.includes('.mp4') || dlUrl.includes('video');
          return {
            type: isVideo ? 'video' : 'image',
            url: dlUrl
          };
        });

        return {
          type: items.some(i => i.type === 'video') ? 'video' : 'images',
          caption: 'Instagram Media',
          items
        };
      }
    }
  } catch (err) {
    console.warn('[Instagram] SaveIG fallback gagal:', err.message);
  }

  throw new Error('Gagal mengekstrak media dari link Instagram. Pastikan akun tidak diprivate.');
}
