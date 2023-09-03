import { ErrTuple } from "#types.js";
import {
  decodeCid as decodeCidPortal,
  encodeCid as encodeCidPortal,
} from "@lumeweb/libportal";
import { addContextToErr } from "#err.js";
import type { CID } from "@lumeweb/libportal";

export function encodeCid(
  hash: Uint8Array,
  size: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string>;
export function encodeCid(
  hash: string,
  size: bigint,
  type?: number,
  hashType?: number,
  raw?: boolean,
): ErrTuple<string>;
export function encodeCid(
  hash: any,
  size: bigint,
  type?: number,
  hashType?: number,
  raw: boolean = false,
): ErrTuple<string> {
  try {
    return [encodeCidPortal(hash, size, type, hashType, raw), null];
  } catch (e) {
    return ["", addContextToErr(e as Error, "failed to encode cid")];
  }
}

export function decodeCid(cid: string): ErrTuple<CID> {
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
