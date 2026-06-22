import { createClient as createAppbaseAppClient, type SdkworkAppClient } from '@sdkwork/appbase-app-sdk';
import {
  createSdkworkAppbasePcAuthRuntime,
  type SdkworkAppbasePcAuthRuntimeComposition,
  type SdkworkAppbasePcAuthRuntimeSdkClient,
} from '@sdkwork/auth-runtime-pc-react';
import type { IamAppContext, IamDeploymentMode, IamEnvironment } from '@sdkwork/iam-contracts';
import type { IamRuntime } from '@sdkwork/iam-runtime';

import type { SdkworkDocumentsPcRuntimeConfig } from './environment.ts';
import type { SdkworkDocumentsPcSdkClientInventory } from './sdkClients.ts';
import {
  createSdkworkDocumentsPcSessionStore,
  type SdkworkDocumentsPcSessionSnapshot,
  type SdkworkDocumentsPcSessionStore,
} from './sessionStore.ts';
import { createSdkworkDocumentsPcSessionTokenManager } from './sessionTokenManager.ts';

const APPBASE_APP_SDK_FAMILY_ID = 'sdkwork-appbase-app-sdk';
const APP_API_PREFIX = '/app/v3/api';

export type SdkworkDocumentsPcIamRuntime = IamRuntime & {
  composition: SdkworkAppbasePcAuthRuntimeComposition;
  session: SdkworkDocumentsPcSessionStore;
};

export interface CreateSdkworkDocumentsPcIamRuntimeOptions {
  config: SdkworkDocumentsPcRuntimeConfig;
  sdkClients: SdkworkDocumentsPcSdkClientInventory;
  session?: SdkworkDocumentsPcSessionStore;
}

interface DocumentsIamSessionLike {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: IamAppContext;
}

export function createSdkworkDocumentsPcIamRuntime(
  options: CreateSdkworkDocumentsPcIamRuntimeOptions,
): SdkworkDocumentsPcIamRuntime {
  const session = options.session ?? createSdkworkDocumentsPcSessionStore(resolveSessionStorage());
  const tokenManager = createSdkworkDocumentsPcSessionTokenManager(session);
  const appbaseAppClient = createAppbaseGeneratedAppClient(options.config, tokenManager);
  const composition = createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: options.config.appKey,
      deploymentMode: toIamDeploymentMode(options.config.deploymentProfile),
      environment: toIamEnvironment(options.config.environment),
      platform: 'pc',
    },
    baseUrls: {
      appbaseAppApiBaseUrl: resolveAppbaseAppApiBaseUrl(options.config),
    },
    createAppbaseAppClient: () => appbaseAppClient,
    localeProvider: () => options.config.i18n.defaultLocale,
    sdkClients: [options.sdkClients.documentsAppClient] as SdkworkAppbasePcAuthRuntimeSdkClient[],
    sessionBridge: {
      clearSession: () => {
        session.clearSession();
      },
      commitSession: (nextSession) =>
        commitDocumentsIamRuntimeSession(session, nextSession as DocumentsIamSessionLike),
      readSession: () => toDocumentsIamBridgeSession(session.getSnapshot()),
    },
    tokenManager,
  });

  return {
    ...composition.runtime,
    composition,
    session,
  };
}

function createAppbaseGeneratedAppClient(
  config: SdkworkDocumentsPcRuntimeConfig,
  tokenManager: ReturnType<typeof createSdkworkDocumentsPcSessionTokenManager>,
): SdkworkAppClient {
  return createAppbaseAppClient({
    authMode: 'dual-token',
    baseUrl: normalizeGeneratedSdkBaseUrl(resolveAppbaseAppApiBaseUrl(config), APP_API_PREFIX),
    platform: 'pc',
    tokenManager,
  });
}

function resolveAppbaseAppApiBaseUrl(config: SdkworkDocumentsPcRuntimeConfig): string {
  return (
    config.sdkBaseUrls?.dependencySdkBaseUrls?.[APPBASE_APP_SDK_FAMILY_ID]?.appApiBaseUrl
    ?? config.appApiBaseUrl
  );
}

function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, '');
  const normalizedApiPrefix = apiPrefix.replace(/\/+$/u, '');
  if (normalizedBaseUrl.endsWith(normalizedApiPrefix)) {
    return normalizedBaseUrl.slice(0, -normalizedApiPrefix.length) || normalizedBaseUrl;
  }
  return normalizedBaseUrl;
}

function commitDocumentsIamRuntimeSession(
  session: SdkworkDocumentsPcSessionStore,
  iamSession: DocumentsIamSessionLike,
): DocumentsIamSessionLike | undefined {
  const nextSession: SdkworkDocumentsPcSessionSnapshot = {
    ...session.getSnapshot(),
    accessToken: iamSession.accessToken,
    authToken: iamSession.authToken,
    refreshToken: iamSession.refreshToken,
    sessionId: iamSession.sessionId ?? iamSession.context?.sessionId,
    context: iamSession.context
      ? {
          tenantId: iamSession.context.tenantId,
          userId: iamSession.context.userId,
          organizationId: iamSession.context.organizationId,
          sessionId: iamSession.context.sessionId,
          appId: iamSession.context.appId,
          environment: iamSession.context.environment,
          deploymentMode: iamSession.context.deploymentMode,
        }
      : undefined,
  };

  if (!nextSession.context) {
    delete nextSession.context;
  }

  session.setSession(nextSession);
  return toDocumentsIamBridgeSession(session.getSnapshot()) ?? undefined;
}

function toDocumentsIamBridgeSession(
  snapshot: SdkworkDocumentsPcSessionSnapshot,
): DocumentsIamSessionLike | null {
  if (!snapshot.authToken && !snapshot.accessToken && !snapshot.refreshToken) {
    return null;
  }

  return {
    ...(snapshot.accessToken ? { accessToken: snapshot.accessToken } : {}),
    ...(snapshot.authToken ? { authToken: snapshot.authToken } : {}),
    ...(snapshot.refreshToken ? { refreshToken: snapshot.refreshToken } : {}),
    ...(snapshot.sessionId ? { sessionId: snapshot.sessionId } : {}),
    ...(snapshot.context?.tenantId && snapshot.context.userId
      ? {
          context: {
            tenantId: snapshot.context.tenantId,
            userId: snapshot.context.userId,
            organizationId: snapshot.context.organizationId,
            sessionId: snapshot.context.sessionId,
            appId: snapshot.context.appId,
            environment: snapshot.context.environment,
            deploymentMode: snapshot.context.deploymentMode,
          } as IamAppContext,
        }
      : {}),
  };
}

function resolveSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.sessionStorage;
}

function toIamDeploymentMode(deploymentProfile: string): IamDeploymentMode {
  if (deploymentProfile === 'cloud') {
    return 'saas';
  }
  return 'local';
}

function toIamEnvironment(value: SdkworkDocumentsPcRuntimeConfig['environment']): IamEnvironment {
  if (value === 'development') {
    return 'dev';
  }
  if (value === 'production') {
    return 'prod';
  }
  if (value === 'staging') {
    return 'test';
  }
  return 'test';
}
