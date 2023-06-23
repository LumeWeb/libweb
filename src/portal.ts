import { ErrTuple, KeyPair, Portal } from "#types.js";
import { Client } from "@lumeweb/libportal";
import { deriveChildKey } from "#keys.js";
import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex } from "@noble/hashes/utils";

let activePortalMasterKey;

export const DEFAULT_PORTAL_LIST: Portal[] = [
  { id: "lumeweb", url: "https://web3portal.com", name: "web3portal.com" },
];

const ACTIVE_PORTALS = new Set<Client>();

type PortalSessionsStore = { [id: string]: string };

export function maybeInitDefaultPortals(): ErrTuple {
  if (!activePortalMasterKey) {
    return [null, "activePortalMasterKey not set"];
  }

  let portalSessionsData = window.localStorage.getItem("portals");
  let portalSessions: PortalSessionsStore = {};
  if (portalSessions) {
    portalSessions = JSON.parse(
      portalSessionsData as string,
    ) as PortalSessionsStore;
  }

  for (const portal of DEFAULT_PORTAL_LIST) {
    let jwt: string | null = null;

    if (portalSessions) {
      if (portal.id in portalSessions) {
        jwt = portalSessions[portal.id];
      }
    }

    const client = new Client({
      email: generatePortalEmail(portal),
      portalUrl: portal.url,
      privateKey: generatePortalKeyPair(portal).privateKey,
      jwt: jwt as string,
    });

    ACTIVE_PORTALS.add(client);
  }

  return [null, null];
}

export function setActivePortalMasterKey(key: Uint8Array) {
  activePortalMasterKey = key;
}

export function generatePortalEmail(portal: Portal) {
  const keyPair = generatePortalKeyPair(portal);

  const userId = bytesToHex(keyPair.publicKey.slice(0, 12));

  return `${userId}@example.com`;
}

export function generatePortalKeyPair(portal: Portal): KeyPair {
  const privateKey = deriveChildKey(
    activePortalMasterKey,
    `portal-account:${portal.id}`,
  );

  return {
    privateKey,
    publicKey: ed25519.getPublicKey(privateKey),
  };
}

export function getActivePortals(): Set<Client> {
  return ACTIVE_PORTALS;
}
