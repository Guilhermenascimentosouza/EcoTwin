const SUPABASE_STORAGE_MARKER = '/storage/v1/object/public/';

export function optimizeImageUrl(url, { width = 600, quality = 80 } = {}) {
  if (!url) return url;

  // Supabase Storage public URLs can be transformed via /render/image
  const idx = url.indexOf(SUPABASE_STORAGE_MARKER);
  if (idx !== -1) {
    const base = url.slice(0, idx);
    const path = url.slice(idx + SUPABASE_STORAGE_MARKER.length);
    const encoded = encodeURIComponent(path);
    return `${base}/storage/v1/render/image/public/${encoded}?width=${width}&quality=${quality}&format=webp`;
  }

  return url;
}
