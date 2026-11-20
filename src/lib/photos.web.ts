// shortcut: the web build keeps the picker's URI (no app file system); photos may not survive a reload there.
export async function keepPhoto(uri: string, _name: string): Promise<string> {
  return uri;
}

export function deletePhotos(_uris: (string | undefined)[]) {}

/** Raw base64 (no data: prefix); works for the picker's blob: and data: URIs. */
export async function photoBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(',') + 1));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
