import { getActivePortals } from "#portal.js";
import { getVerifiableStream } from "@lumeweb/libportal";
import {
  readableStreamToUint8Array,
  uint8ArrayToReadableStream,
} from "binconv";
import { equalBytes } from "@noble/curves/abstract/utils";
import { blake3 } from "@noble/hashes/blake3";
import { NO_PORTALS_ERROR } from "#types.js";
import { CID } from "@lumeweb/libs5";

export async function downloadObject(cid: string): Promise<ReadableStream> {
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

    let stream, proof;

    try {
      stream = await portal.downloadFile(cid);
      proof = await portal.downloadProof(cid);
    } catch {
      continue;
    }

    return await getVerifiableStream(
      CID.decode(cid).hash.hashBytes,
      proof,
      stream,
    );
  }

  throw NO_PORTALS_ERROR;
}

export async function downloadSmallObject(
  cid: string,
): Promise<ReadableStream<Uint8Array>> {
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

    let stream;

    try {
      stream = await portal.downloadFile(cid);
    } catch {
      continue;
    }

    const data = await readableStreamToUint8Array(stream);

    if (!equalBytes(blake3(data), CID.decode(cid).hash.hashBytes)) {
      throw new Error("cid verification failed");
    }

    return uint8ArrayToReadableStream(data);
  }

  throw NO_PORTALS_ERROR;
}
