import {
  decodeEndian,
  encodeEndian,
  encryptionKeyLength,
  encryptionNonceLength,
  encryptionOverheadLength,
} from "@lumeweb/libs5";

import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto/utils";

function padFileSizeDefault(initialSize: number): number {
  const kib = 1 << 10;
  // Only iterate to 53 (the maximum safe power of 2).
  for (let n = 0; n < 53; n++) {
    if (initialSize <= (1 << n) * 80 * kib) {
      const paddingBlock = (1 << n) * 4 * kib;
      let finalSize = initialSize;
      if (finalSize % paddingBlock !== 0) {
        finalSize = initialSize - (initialSize % paddingBlock) + paddingBlock;
      }
      return finalSize;
    }
  }
  // Prevent overflow.
  throw new Error("Could not pad file size, overflow detected.");
}

function checkPaddedBlock(size: number): boolean {
  const kib = 1024;
  // Only iterate to 53 (the maximum safe power of 2).
  for (let n = 0; n < 53; n++) {
    if (size <= (1 << n) * 80 * kib) {
      const paddingBlock = (1 << n) * 4 * kib;
      return size % paddingBlock === 0;
    }
  }
  throw new Error("Could not check padded file size, overflow detected.");
}

async function encryptMutableBytes(
  data: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  const lengthInBytes = encodeEndian(data.length, 4);

  const totalOverhead =
    encryptionOverheadLength + 4 + encryptionNonceLength + 2;

  const finalSize =
    padFileSizeDefault(data.length + totalOverhead) - totalOverhead;

  data = new Uint8Array([
    ...lengthInBytes,
    ...data,
    ...new Uint8Array(finalSize - data.length),
  ]);

  const nonce = randomBytes(encryptionNonceLength);

  const header = new Uint8Array([0x8d, 0x01, ...nonce]);

  const stream_x = xchacha20poly1305(key, nonce);

  const encryptedBytes = stream_x.encrypt(data);

  return new Uint8Array([...header, ...encryptedBytes]);
}

async function decryptMutableBytes(
  data: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  if (key.length !== encryptionKeyLength) {
    throw `wrong encryptionKeyLength (${key.length} != ${encryptionKeyLength})`;
  }

  if (!checkPaddedBlock(data.length)) {
    throw `Expected parameter 'data' to be padded encrypted data, length was '${
      data.length
    }', nearest padded block is '${padFileSizeDefault(data.length)}'`;
  }

  const version = data[1];
  if (version !== 0x01) {
    throw "Invalid version";
  }

  const nonce = data.subarray(2, encryptionNonceLength + 2);

  const stream_x = xchacha20poly1305(key, nonce);

  const decryptedBytes = stream_x.decrypt(
    data.subarray(encryptionNonceLength + 2),
  );

  const lengthInBytes = decryptedBytes.subarray(0, 4);

  const length = decodeEndian(lengthInBytes);

  return decryptedBytes.subarray(4, length + 4);
}

export {
  padFileSizeDefault,
  checkPaddedBlock,
  decryptMutableBytes,
  encryptMutableBytes,
};
