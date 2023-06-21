import { blake3 } from "@noble/hashes/blake3";
import { concatBytes } from "@noble/hashes/utils";

export function deriveChildKey(
  parentKey: Uint8Array,
  tweak: string,
): Uint8Array {
  const tweakHash = blake3(tweak);

  return blake3(concatBytes(parentKey, tweakHash));
}
