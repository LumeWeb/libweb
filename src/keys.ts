import { blake3 } from "@noble/hashes/blake3";
import { concatBytes } from "@noble/hashes/utils";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

export function deriveChildKey(
  parentKey: Uint8Array,
  tweak: string,
): Uint8Array {
  return hkdf(sha256, parentKey, undefined, tweak, 32);
}

export function deriveBlakeChildKey(
  parentKey: Uint8Array,
  tweak: string,
): Uint8Array {
  const tweakHash = blake3(tweak);

  return blake3(concatBytes(parentKey, tweakHash));
}
