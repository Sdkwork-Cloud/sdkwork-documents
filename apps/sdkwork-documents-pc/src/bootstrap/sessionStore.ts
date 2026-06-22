export interface SdkworkDocumentsPcSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: {
    tenantId?: string;
    userId?: string;
    organizationId?: string;
    sessionId?: string;
    appId?: string;
    environment?: string;
    deploymentMode?: string;
  };
  updatedAt?: string;
}

export interface SdkworkDocumentsPcSessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SdkworkDocumentsPcSessionStore {
  clearSession(): void;
  getSnapshot(): SdkworkDocumentsPcSessionSnapshot;
  refreshSession(): SdkworkDocumentsPcSessionSnapshot;
  setSession(nextSession: SdkworkDocumentsPcSessionSnapshot): void;
  subscribe(listener: (snapshot: SdkworkDocumentsPcSessionSnapshot) => void): () => void;
}

export const SDKWORK_DOCUMENTS_PC_SESSION_STORAGE_KEY = 'sdkwork-documents-pc-session';

function readInitialSession(
  storage: SdkworkDocumentsPcSessionStorageLike | undefined,
  storageKey: string,
): SdkworkDocumentsPcSessionSnapshot {
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as SdkworkDocumentsPcSessionSnapshot) : {};
  } catch {
    return {};
  }
}

export function createSdkworkDocumentsPcSessionStore(
  storage?: SdkworkDocumentsPcSessionStorageLike,
  storageKey = SDKWORK_DOCUMENTS_PC_SESSION_STORAGE_KEY,
): SdkworkDocumentsPcSessionStore {
  let snapshot = readInitialSession(storage, storageKey);
  const listeners = new Set<(nextSnapshot: SdkworkDocumentsPcSessionSnapshot) => void>();

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const persist = () => {
    if (!storage) {
      return;
    }

    if (!snapshot.authToken && !snapshot.accessToken && !snapshot.refreshToken) {
      storage.removeItem(storageKey);
      return;
    }

    storage.setItem(storageKey, JSON.stringify(snapshot));
  };

  return {
    clearSession() {
      snapshot = {};
      persist();
      emit();
    },
    getSnapshot() {
      return snapshot;
    },
    refreshSession() {
      snapshot = readInitialSession(storage, storageKey);
      emit();
      return snapshot;
    },
    setSession(nextSession) {
      snapshot = {
        ...nextSession,
        updatedAt: new Date().toISOString(),
      };
      persist();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function hasSdkworkDocumentsPcIamSession(
  snapshot: SdkworkDocumentsPcSessionSnapshot,
): boolean {
  return Boolean(snapshot.authToken && snapshot.accessToken && snapshot.context?.tenantId);
}
