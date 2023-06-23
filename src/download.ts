import { getActivePortals } from "#portal.js";
import { ErrTuple } from "#types.js";
import { decodeCid, getVerifiableStream } from "@lumeweb/libportal";

const NO_PORTALS_ERROR = [null, "no active portals"] as ErrTuple;

export async function downloadObject(cid: string): Promise<ErrTuple> {
  const activePortals = getActivePortals();

  if (!activePortals.length) {
    return NO_PORTALS_ERROR;
  }

  for (const portal of activePortals) {
    if (!(await portal.isLoggedIn())) {
      try {
        await portal.register();
      } catch {
        continue;
      }

      await portal.login();
    }

    let stream, proof;

    try {
      stream = await portal.downloadFile(cid);
      proof = await portal.downloadProof(cid);
    } catch {
      continue;
    }

    return [
      await getVerifiableStream(decodeCid(cid).hash, proof, stream),
      null,
    ];
  }

  return NO_PORTALS_ERROR;
}
