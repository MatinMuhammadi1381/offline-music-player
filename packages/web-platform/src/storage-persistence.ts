export type BrowserStoragePersistenceStatus =
  | { readonly status: "supported"; readonly granted: true; readonly requestAvailable: true }
  | { readonly status: "not-granted"; readonly granted: false; readonly requestAvailable: true }
  | { readonly status: "unknown"; readonly requestAvailable: boolean; readonly message: string }
  | { readonly status: "unsupported"; readonly requestAvailable: false };

export interface BrowserStoragePersistenceApi {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export async function getBrowserStoragePersistenceStatus(
  storage: BrowserStoragePersistenceApi | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.storage,
): Promise<BrowserStoragePersistenceStatus> {
  if (!storage) return { status: "unsupported", requestAvailable: false };
  if (typeof storage.persisted !== "function") {
    return typeof storage.persist === "function"
      ? {
        status: "unknown",
        requestAvailable: true,
        message: "This browser can request persistent storage but cannot report whether it is already granted.",
      }
      : { status: "unsupported", requestAvailable: false };
  }
  try {
    const granted = await storage.persisted();
    return granted
      ? { status: "supported", granted: true, requestAvailable: true }
      : { status: "not-granted", granted: false, requestAvailable: true };
  } catch (error) {
    return {
      status: "unknown",
      requestAvailable: typeof storage.persist === "function",
      message: error instanceof Error ? error.message : "The browser could not report persistent storage status.",
    };
  }
}

export async function requestBrowserStoragePersistence(
  storage: BrowserStoragePersistenceApi | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.storage,
): Promise<BrowserStoragePersistenceStatus> {
  if (!storage || typeof storage.persist !== "function") {
    return { status: "unsupported", requestAvailable: false };
  }
  try {
    const granted = await storage.persist();
    return granted
      ? { status: "supported", granted: true, requestAvailable: true }
      : { status: "not-granted", granted: false, requestAvailable: true };
  } catch (error) {
    return {
      status: "unknown",
      requestAvailable: true,
      message: error instanceof Error ? error.message : "The browser's persistent storage request failed.",
    };
  }
}
