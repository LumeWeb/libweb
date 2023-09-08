import { Portal } from "#types.js";
import { Client } from "@lumeweb/libportal";
import { deriveChildKey } from "#keys.js";
import { bytesToHex } from "@noble/hashes/utils";
import COMMUNITY_PORTAL_LIST from "@lumeweb/community-portals";
import { createKeyPair } from "@lumeweb/libs5";
import type { KeyPairEd25519 } from "@lumeweb/libs5";

let activePortalMasterKey;

export const DEFAULT_PORTAL_LIST = COMMUNITY_PORTAL_LIST;

let ACTIVE_PORTALS = new Set<Client>();

type PortalSessionsStore = { [id: string]: string };

const PORTAL_ID = Symbol.for("PORTAL_ID");
const PORTAL_NAME = Symbol.for("PORTAL_NAME");

export function maybeInitDefaultPortals() {
  if (!activePortalMasterKey) {
    throw new Error("activePortalMasterKey not set");
  }

  let portalsToLoad = DEFAULT_PORTAL_LIST;

  const savedPortals = loadSavedPortals();

  if (savedPortals) {
    portalsToLoad = savedPortals;
  }

  for (const portal of portalsToLoad) {
    addActivePortal(initPortal(portal));
  }
}

export function setActivePortalMasterKey(key: Uint8Array) {
  activePortalMasterKey = key;
}

export function generatePortalEmail(portal: Portal) {
  const keyPair = generatePortalKeyPair(portal);

  const userId = bytesToHex(keyPair.publicKey.slice(0, 12));

  return `${userId}@example.com`;
}

export function generatePortalKeyPair(portal: Portal): KeyPairEd25519 {
  const privateKey = deriveChildKey(
    activePortalMasterKey,
    `portal-account:${portal.id}`,
  );

  return createKeyPair(privateKey);
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

  const client = new Client({
    email: generatePortalEmail(portal),
    portalUrl: portal.url,
    privateKey: generatePortalKeyPair(portal).extractBytes(),
    jwt: jwt as string,
  });

  client[PORTAL_ID] = portal.id;
  client[PORTAL_NAME] = portal.name;

  return client;
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

export function savePortals() {
  const portals = [...ACTIVE_PORTALS.values()].map((item) => {
    return {
      id: item[PORTAL_ID],
      name: item[PORTAL_NAME],
      url: item.portalUrl,
    } as Portal;
  });
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.setItem("portals", JSON.stringify(portals));
  }
}

export function loadSavedPortals(): Portal[] | null {
  let portals: string | null = null;

  if (typeof globalThis.localStorage !== "undefined") {
    portals = globalThis.localStorage.getItem("portals");
  }

  if (!portals) {
    return null;
  }

  return JSON.parse(portals);
}

export async function loginActivePortals() {
  const activePortals = getActivePortals();

  if (!activePortals.length) {
    return;
  }

  for (const portal of activePortals) {
    if (!(await portal.isLoggedIn())) {
      try {
        await portal.register();
      } catch {}

      await portal.login();
    }
  }
}
