import { Directory, File, Paths } from 'expo-file-system';

const dir = () => new Directory(Paths.document, 'photos');

/** Copies a picker photo (a cache file the OS may purge) into the app's documents; returns the kept URI. */
export async function keepPhoto(uri: string, name: string): Promise<string> {
  try {
    const d = dir();
    d.create({ idempotent: true, intermediates: true });
    const ext = uri.split('?')[0].match(/\.(jpe?g|png|heic|webp)$/i)?.[0] ?? '.jpg';
    const dest = new File(d, `${name}${ext}`);
    await new File(uri).copy(dest, { overwrite: true });
    return dest.uri;
  } catch {
    // keep the original rather than lose the weighing; it may still be readable
    return uri;
  }
}

export function deletePhotos(uris: (string | undefined)[]) {
  for (const uri of uris) {
    if (!uri || !uri.includes('/photos/')) continue;
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // already gone
    }
  }
}

/** Raw base64 (no data: prefix) for the estimate upload. */
export async function photoBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}
