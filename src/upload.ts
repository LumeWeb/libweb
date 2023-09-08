import { NO_PORTALS_ERROR } from "#types.js";
import { getActivePortals } from "#portal.js";
import { CID } from "@lumeweb/libs5";

export async function uploadObject(
  file:
    | ReadableStream<Uint8Array>
    | import("stream").Readable
    | Uint8Array
    | Blob,
  size?: bigint,
): Promise<CID> {
  const activePortals = getActivePortals();

  if (!activePortals.length) {
    throw NO_PORTALS_ERROR;
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

    return upload;
  }

  throw NO_PORTALS_ERROR;
}
