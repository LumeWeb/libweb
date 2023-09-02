import { ErrTuple } from "#types.js";
import {
  decodeCid as decodeCidPortal,
  encodeCid as encodeCidPortal,
} from "@lumeweb/libportal";
import { addContextToErr } from "#err.js";

export function encodeCid(hash: Uint8Array, size: bigint): any;
export function encodeCid(hash: string, size: bigint): any;
export function encodeCid(
  hash: any,
  size: bigint,
  type?: number,
  hashType?: number,
): ErrTuple {
  try {
    return [encodeCidPortal(hash, size, type, hashType), null];
  } catch (e) {
    return [null, addContextToErr(e as Error, "failed to encode cid")];
  }
}

export function decodeCid(cid: string): ErrTuple {
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

export type { CID } from "@lumeweb/libportal";
