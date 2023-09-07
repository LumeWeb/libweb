import { ErrTuple, NO_PORTALS_ERROR } from "#types.js";
import { getActivePortals } from "#portal.js";

export async function uploadObject(
  file:
    | ReadableStream<Uint8Array>
    | import("stream").Readable
    | Uint8Array
    | Blob,
  size?: bigint,
): Promise<ErrTuple> {
  const activePortals = getActivePortals();

  if (!activePortals.length) {
    return NO_PORTALS_ERROR;
  }

  for (const portal of activePortals) {
    if (!(await portal.isLoggedIn())) {
      try {
        await portal.register();
      } catch {}

      await portal.login();
    }

    let upload;
    try {
      upload = await portal.uploadFile(file as any, size);
    } catch {
      continue;
    }

    return [upload, null];
  }

  return NO_PORTALS_ERROR;
}
