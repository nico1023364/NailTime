import { supabase } from './supabase';
import { readImage } from './readImage';

export type Bucket = 'portfolio' | 'references';

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
};

function imageType(uri: string) {
  const data = /^data:(image\/[a-z0-9.+-]+)[;,]/.exec(uri);
  if (data) {
    const mime = data[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : data[1].toLowerCase();
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    return { ext, mime };
  }
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (ext && IMAGE_TYPES[ext]) return { ext, mime: IMAGE_TYPES[ext] };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

const random = () => Math.random().toString(36).slice(2, 10);

/**
 * Sube una imagen local a Storage y devuelve su ruta dentro del bucket.
 * En las referencias la primera carpeta debe ser el id de la clienta (RLS).
 */
export async function uploadImage(bucket: Bucket, uri: string, folder: string): Promise<string> {
  const { ext, mime } = imageType(uri);
  const path = `${folder}/${Date.now()}-${random()}.${ext}`;
  const body = await readImage(uri);
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: mime,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeImages(bucket: Bucket, paths: string[]) {
  const clean = paths.filter(Boolean);
  if (!clean.length) return;
  try {
    await supabase.storage.from(bucket).remove(clean);
  } catch {
    // Si el archivo ya no existe, no bloqueamos la operación principal.
  }
}

export function publicImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
}

/** Devuelve un mapa `ruta → URL firmada` para las fotos privadas. */
export async function signedImageUrls(paths: string[], seconds = 3600): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from('references').createSignedUrls(unique, seconds);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
