/** En web las imágenes se leen con `fetch` (blob local o data URL). */
export async function readImage(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('No pudimos leer la imagen seleccionada.');
  return res.arrayBuffer();
}
