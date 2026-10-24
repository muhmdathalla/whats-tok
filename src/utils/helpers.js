import axios from 'axios';
import AdmZip from 'adm-zip';

/**
 * Download URL into a Buffer
 */
export async function getBuffer(url, options = {}) {
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        ...options.headers,
      },
      responseType: 'arraybuffer',
      timeout: 60000,
      ...options,
    });
    return Buffer.from(res.data);
  } catch (err) {
    throw new Error(`Gagal mengunduh buffer media dari ${url}: ${err.message}`);
  }
}

/**
 * Unduh banyak foto sekaligus dan bungkus menjadi file ZIP untuk 1-click download
 */
export async function createZipFromUrls(urls, prefix = 'foto') {
  const zip = new AdmZip();

  const downloads = urls.map(async (url, idx) => {
    try {
      const buffer = await getBuffer(url);
      const ext = url.includes('.png') ? 'png' : (url.includes('.webp') ? 'webp' : 'jpg');
      zip.addFile(`${prefix}_${idx + 1}.${ext}`, buffer);
      return buffer;
    } catch (err) {
      console.warn(`Gagal mengunduh foto index ${idx}:`, err.message);
      return null;
    }
  });

  const buffers = await Promise.all(downloads);
  const validBuffers = buffers.filter(Boolean);

  if (validBuffers.length === 0) {
    throw new Error('Gagal mengunduh foto untuk dikemas ke ZIP.');
  }

  const zipBuffer = zip.toBuffer();
  return { zipBuffer, buffers: validBuffers };
}

/**
 * Format bytes to readable string (MB/KB)
 */
export function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Promise delay
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract URLs from a text string
 */
export function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? matches.map(u => u.trim()) : [];
}
