import { File } from 'expo-file-system';

/** Lee una imagen local como ArrayBuffer (formato que espera Supabase en RN). */
export async function readImage(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  return file.arrayBuffer();
}
