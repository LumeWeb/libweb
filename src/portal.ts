import { ErrTuple, KeyPair, Portal } from "#types.js";
import { Client } from "@lumeweb/libportal";
import { deriveChildKey } from "#keys.js";
import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex } from "@noble/hashes/utils";
import COMMUNITY_PORTAL_LIST from "@lumeweb/community-portals";

let activePortalMasterKey;

export const DEFAULT_PORTAL_LIST = COMMUNITY_PORTAL_LIST;

let ACTIVE_PORTALS = new Set<Client>();

type PortalSessionsStore = { [id: string]: string };

export function maybeInitDefaultPortals(): ErrTuple {
  if (!activePortalMasterKey) {
    return [null, "activePortalMasterKey not set"];
  }

  for (const portal of DEFAULT_PORTAL_LIST) {
    addActivePortal(initPortal(portal));
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

export function getActivePortals(): Client[] {
  return [...ACTIVE_PORTALS];
}

export function addActivePortal(portal: Client) {
  ACTIVE_PORTALS.add(portal);
}

export function initPortal(portal: Portal): Client {
  const sessions = getPortalSessions();
  let jwt: string | null = null;
  if (sessions) {
    if (portal.id in sessions) {
      jwt = sessions[portal.id];
    }
  }

  return new Client({
    email: generatePortalEmail(portal),
    portalUrl: portal.url,
    privateKey: generatePortalKeyPair(portal).privateKey,
    jwt: jwt as string,
  });
}

export function getPortalSessions() {
  if (typeof globalThis.localStorage === "undefined") {
    return undefined;
  }

  let portalSessionsData = globalThis.localStorage.getItem("portal_sessions");
  let portalSessions: PortalSessionsStore = {};
  if (portalSessions) {
    portalSessions = JSON.parse(
      portalSessionsData as string,
    ) as PortalSessionsStore;

    return portalSessions;
  }

  return undefined;
}

export function setActivePortals(portals: Client[]) {
  ACTIVE_PORTALS = new Set<Client>(portals);
}
