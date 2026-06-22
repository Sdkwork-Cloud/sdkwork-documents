import { createTokenManager, type AuthTokenManager } from '@sdkwork/sdk-common';

import type { SdkworkDocumentsPcSessionStore } from './sessionStore.ts';

export function createSdkworkDocumentsPcSessionTokenManager(
  session: SdkworkDocumentsPcSessionStore,
): AuthTokenManager {
  const tokenManager = createTokenManager();

  const hydrate = () => {
    const snapshot = session.getSnapshot();
    tokenManager.setTokens({
      accessToken: snapshot.accessToken,
      authToken: snapshot.authToken,
      refreshToken: snapshot.refreshToken,
    });
  };

  hydrate();
  session.subscribe(() => {
    hydrate();
  });

  return tokenManager;
}
