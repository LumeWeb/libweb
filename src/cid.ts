import { ErrTuple } from "#types.js";
import type { CID } from "@lumeweb/libportal";
import {
  decodeCid as decodeCidPortal,
  encodeCid as encodeCidPortal,
} from "@lumeweb/libportal";
import { addContextToErr } from "#err.js";
import { CID_HASH_TYPES, CID_TYPES, REGISTRY_TYPES } from "@lumeweb/libs5";
import { concatBytes } from "@noble/hashes/utils";

export function encodeCid(
  hash: Uint8Array,
  size: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string | Uint8Array>;
export function encodeCid(
  hash: string,
  size: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string | Uint8Array>;
export function encodeCid(
  hash: any,
  size: bigint,
  type?: number,
  hashType?: number,
  raw: boolean = false,
): ErrTuple<string | Uint8Array> {
  try {
    return [encodeCidPortal(hash, size, type, hashType, raw), null];
  } catch (e) {
    return ["", addContextToErr(e as Error, "failed to encode cid")];
  }
}

export function decodeCid(cid: string | Uint8Array): ErrTuple<CID> {
  try {
    return [decodeCidPortal(cid), null];
  } catch (e) {
    return [null, addContextToErr(e as Error, "failed to decode cid")];
  }
}

export function verifyCid(cid: string): boolean {
  try {
    decodeCidPortal(cid);
    return true;
  } catch (e) {
    return false;
  }
}

export function encodeRegistryCid(
  hash: Uint8Array,
  size?: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string | Uint8Array>;
export function encodeRegistryCid(
  hash: string,
  size?: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string | Uint8Array>;
export function encodeRegistryCid(
  hash: any,
  size = BigInt(0),
  type = CID_TYPES.RESOLVER,
  hashType = CID_HASH_TYPES.ED25519,
  raw: boolean = false,
): ErrTuple<string | Uint8Array> {
  if (hash instanceof Uint8Array) {
    if (!Object.values(CID_HASH_TYPES).includes(hash[0])) {
      return ["", "invalid hash type"];
    }
  }

  return encodeCid(hash, size, type, hashType, raw);
}

export function encodeRegistryValue(
  cid: CID | string,
  type: number = REGISTRY_TYPES.CID,
  hashType = CID_HASH_TYPES.BLAKE3,
): ErrTuple<Uint8Array> {
  if (typeof cid === "string") {
    let err;
    [cid, err] = decodeCid(cid);

    if (err) {
      return [new Uint8Array(), err];
    }
  }

  const [ret, err] = encodeCid(
    cid.hash,
    cid.size,
    CID_TYPES.RESOLVER,
    CID_HASH_TYPES.BLAKE3,
    true,
  );

  if (err) {
    return [new Uint8Array(), err];
  }

  return [
    concatBytes(Uint8Array.from([REGISTRY_TYPES.CID]), ret as Uint8Array),
    null,
  ];
}

export function decodeRegistryValue(hash: Uint8Array): ErrTuple<CID> {
  if (!Object.values(REGISTRY_TYPES).includes(hash[0])) {
    return [null, "invalid registry type"];
  }

  hash = hash.slice(1);

  return decodeCid(hash);
}

export function decodeRegistryCid(cid: string | Uint8Array): ErrTuple<CID> {
  const [ret, err] = decodeCid(cid);
  if (err) {
    return [null, err];
  }

  if (ret.type !== CID_TYPES.RESOLVER) {
    return [null, "not a valid registry cid"];
  }

  return [cid, null];
}

export type { CID } from "@lumeweb/libportal";
