import { createTokenManager, type AuthTokenManager } from '@sdkwork/sdk-common';
import {
  loadStoredAppSessionToken,
} from '@sdkwork/documents-pc-commons';

let documentsPcTokenManager: AuthTokenManager | null = null;

export function getDocumentsPcTokenManager(): AuthTokenManager {
  if (!documentsPcTokenManager) {
    documentsPcTokenManager = createTokenManager();
  }
  syncDocumentsPcTokenManagerFromStoredSession();
  return documentsPcTokenManager;
}

export function syncDocumentsPcTokenManagerFromStoredSession(): void {
  if (!documentsPcTokenManager) {
    return;
  }

  const stored = loadStoredAppSessionToken();
  if (stored?.authToken || stored?.accessToken || stored?.refreshToken) {
    documentsPcTokenManager.setTokens({
      ...(stored.accessToken ? { accessToken: stored.accessToken } : {}),
      ...(stored.authToken ? { authToken: stored.authToken } : {}),
      ...(stored.refreshToken ? { refreshToken: stored.refreshToken } : {}),
    });
    return;
  }

  documentsPcTokenManager.clearTokens();
}

export function resetDocumentsPcTokenManager(): void {
  documentsPcTokenManager = null;
}
