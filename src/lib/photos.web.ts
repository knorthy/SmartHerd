// shortcut: the web build keeps the picker's URI (no app file system); photos may not survive a reload there.
export async function keepPhoto(uri: string, _name: string): Promise<string> {
  return uri;
}

export function deletePhotos(_uris: (string | undefined)[]) {}
