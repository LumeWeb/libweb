import {
  CID,
  createKeyPair,
  S5Node,
  encryptionKeyDerivationTweak,
  pathKeyDerivationTweak,
  writeKeyDerivationTweak,
} from "@lumeweb/libs5";
import { deriveBlakeChildKey, deriveBlakeChildKeyInt } from "#keys.js";
import { uploadObject } from "#upload.js";
import { signRegistryEntry } from "@lumeweb/libs5/lib/service/registry.js";
import { downloadSmallObject } from "#download.js";
import { readableStreamToUint8Array } from "binconv";
import { utf8ToBytes } from "@noble/hashes/utils";
import { decryptMutableBytes, encryptMutableBytes } from "#encryption.js";

export default class AppDb {
  private readonly _rootKey: Uint8Array;
  private readonly _node: S5Node;
  private readonly _cidMap: Map<string, CID> = new Map<string, CID>();

  constructor(rootKey: Uint8Array, api: S5Node) {
    this._rootKey = rootKey;
    this._node = api;
  }

  public async getRawData(path: string): Promise<AppDbRawDataResponse> {
    const pathKey = this._derivePathKeyForPath(path);
    const encryptionKey = deriveBlakeChildKeyInt(
      pathKey,
      encryptionKeyDerivationTweak,
    );

    const writeKey = deriveBlakeChildKeyInt(pathKey, writeKeyDerivationTweak);
    const keyPair = await createKeyPair(writeKey);

    const sre = await this._node.services.registry.get(keyPair.publicKey);
    if (!sre) {
      return new AppDbRawDataResponse();
    }

    const cid = CID.fromBytes(sre.data.slice(1));

    const bytes = await downloadSmallObject(cid.toString());

    const plaintext = await decryptMutableBytes(
      await readableStreamToUint8Array(bytes),
      encryptionKey,
    );

    this._cidMap.set(path, cid);

    return new AppDbRawDataResponse({
      data: plaintext,
      cid,
      revision: sre.revision,
    });
  }

  public async setRawData(
    path: string,
    data: Uint8Array,
    revision: number,
  ): Promise<void> {
    const pathKey = this._derivePathKeyForPath(path);
    const encryptionKey = deriveBlakeChildKeyInt(
      pathKey,
      encryptionKeyDerivationTweak,
    );

    const cipherText = await encryptMutableBytes(data, encryptionKey);

    const cid = await uploadObject(cipherText);
    const writeKey = deriveBlakeChildKeyInt(pathKey, writeKeyDerivationTweak);
    const keyPair = createKeyPair(writeKey);

    const sre = await signRegistryEntry({
      kp: keyPair,
      data: cid.toRegistryEntry(),
      revision,
    });

    await this._node.services.registry.set(sre);

    this._cidMap.set(path, cid);
  }

  public async getJSON(path: string): Promise<AppDbJSONResponse> {
    const res = await this.getRawData(path);

    if (res.data === null) {
      return new AppDbJSONResponse({ cid: res.cid });
    }

    const decodedData = JSON.parse(new TextDecoder().decode(res.data));
    return new AppDbJSONResponse({
      data: decodedData,
      revision: res.revision,
      cid: res.cid,
    });
  }

  public async setJSON(
    path: string,
    data: any,
    revision: number,
  ): Promise<void> {
    const encodedData = utf8ToBytes(JSON.stringify(data));
    await this.setRawData(path, new Uint8Array(encodedData), revision);
  }

  private _derivePathKeyForPath(path: string): Uint8Array {
    const pathSegments = path
      .split("/")
      .map((e) => e.trim())
      .filter((element) => element.length > 0);

    const key = this._deriveKeyForPathSegments(pathSegments);
    return deriveBlakeChildKeyInt(key, pathKeyDerivationTweak);
  }

  private _deriveKeyForPathSegments(pathSegments: string[]): Uint8Array {
    if (pathSegments.length === 0) {
      return this._rootKey;
    }

    return deriveBlakeChildKey(
      this._deriveKeyForPathSegments(
        pathSegments.slice(0, pathSegments.length - 1),
      ),
      pathSegments[pathSegments.length - 1],
    );
  }
}

class AppDbRawDataResponse {
  data: Uint8Array | undefined;
  revision: number;
  cid: CID | undefined;

  constructor({
    data,
    revision = -1,
    cid,
  }: {
    data?: Uint8Array;
    revision?: number;
    cid?: CID;
  } = {}) {
    this.data = data;
    this.revision = revision || -1;
    this.cid = cid;
  }
}

class AppDbJSONResponse {
  data: any;
  revision: number;
  cid: CID | undefined;

  constructor({
    data,
    revision = -1,
    cid,
  }: {
    data?: any;
    revision?: number;
    cid?: CID;
  } = {}) {
    this.data = data;
    this.revision = revision || -1;
    this.cid = cid;
  }
}

export { AppDbRawDataResponse, AppDbJSONResponse };
