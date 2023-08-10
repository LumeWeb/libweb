import { getActivePortals } from "#portal.js";
import { ErrTuple } from "#types.js";
import { decodeCid, getVerifiableStream } from "@lumeweb/libportal";
import {
  readableStreamToUint8Array,
  uint8ArrayToReadableStream,
} from "binconv";
import { equalBytes } from "@noble/curves/abstract/utils";
import { blake3 } from "@noble/hashes/blake3";

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

    return [
      await getVerifiableStream(decodeCid(cid).hash, proof, stream),
      null,
    ];
  }

  return NO_PORTALS_ERROR;
}

export async function downloadSmallObject(cid: string): Promise<ErrTuple> {
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

    let stream;

    try {
      stream = await portal.downloadFile(cid);
    } catch {
      continue;
    }

    const CID = decodeCid(cid);
    const data = await readableStreamToUint8Array(stream);

    if (!equalBytes(blake3(data), CID.hash)) {
      return [null, "cid verification failed"];
    }

    return [uint8ArrayToReadableStream(data), null];
  }

  return NO_PORTALS_ERROR;
}
