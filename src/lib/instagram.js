import axios from 'axios';
import * as btch from 'btch-downloader';

/**
 * Download Instagram Media (Single Photo, Carousel Multi-photo, Reels/Video)
 */
export async function downloadInstagram(url) {
  // Method 1: btch-downloader igdl
  try {
    const rawData = await btch.igdl(url);
    const mediaList = Array.isArray(rawData) ? rawData : (rawData?.result || rawData?.data || (rawData?.url ? [rawData] : []));

    if (Array.isArray(mediaList) && mediaList.length > 0) {
      // Deduplikasi item berdasarkan URL unik
      const seenUrls = new Set();
      const items = [];

      for (const item of mediaList) {
        const link = typeof item === 'string' ? item : (item.url || item.downloadUrl || item.link);
        if (link && !seenUrls.has(link)) {
          seenUrls.add(link);
          const isVideo = item.type === 'video' || link.includes('.mp4') || link.includes('video');
          items.push({
            type: isVideo ? 'video' : 'image',
            url: link
          });
        }
      }

      if (items.length > 0) {
        // Batasi maksimal 20 item untuk keamanan kuota/memory
        const finalItems = items.slice(0, 20);
        const hasVideo = finalItems.some(i => i.type === 'video');
        const hasImage = finalItems.some(i => i.type === 'image');
        let overallType = 'image';
        if (hasVideo && hasImage) overallType = 'mixed';
        else if (hasVideo) overallType = 'video';
        else overallType = 'images';

        return {
          type: overallType,
          caption: rawData?.caption || rawData?.title || 'Instagram Media',
          items: finalItems
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
      const seenUrls = new Set();
      const items = [];

      for (const item of res.data.data) {
        const link = item.url || item.dl;
        if (link && !seenUrls.has(link)) {
          seenUrls.add(link);
          const isVideo = link.includes('.mp4') || item.type === 'video';
          items.push({
            type: isVideo ? 'video' : 'image',
            url: link
          });
        }
      }

      if (items.length > 0) {
        return {
          type: items.some(i => i.type === 'video') ? 'video' : 'images',
          caption: 'Instagram Media',
          items: items.slice(0, 20)
        };
      }
    }
  } catch (err) {
    console.warn('[Instagram] Siputzx API fallback gagal:', err.message);
  }

  throw new Error('Gagal mengekstrak media dari link Instagram. Pastikan akun tidak diprivate.');
}
