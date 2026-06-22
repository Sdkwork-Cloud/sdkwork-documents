import type { DocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons';
import {
  readDocumentsRuntimeEnv,
  resolveDocumentsRuntimeBoolean,
} from '@sdkwork/documents-pc-commons/runtime';
import {
  resolveSdkworkDocumentsPcRuntimeConfig,
  type SdkworkDocumentsPcRuntimeConfig,
} from './environment.ts';
import {
  createSdkworkDocumentsPcIamRuntime,
  type SdkworkDocumentsPcIamRuntime,
} from './iamRuntime.ts';
import { SdkworkDocumentsPcRoutes } from './routes.ts';
import {
  createSdkworkDocumentsPcSessionStore,
  type SdkworkDocumentsPcSessionStore,
} from './sessionStore.ts';
import { createSdkworkDocumentsPcSessionTokenManager } from './sessionTokenManager.ts';
import {
  createSdkworkDocumentsPcSdkClientsWithTokenManager,
  getDocumentsAppSdkClientForReference,
  type SdkworkDocumentsPcSdkClientInventory,
} from './sdkClients.ts';
import { DOCUMENTS_SDK_SYSTEM_CONFIG } from './sdkSystemConfig.ts';

export interface SdkworkDocumentsPcRuntime {
  config: SdkworkDocumentsPcRuntimeConfig;
  iamRuntime: SdkworkDocumentsPcIamRuntime;
  routes: typeof SdkworkDocumentsPcRoutes;
  sdkClients: SdkworkDocumentsPcSdkClientInventory;
  session: SdkworkDocumentsPcSessionStore;
  documentsReferenceRuntime: DocumentsReferenceRuntime;
}

export function createSdkworkDocumentsPcRuntime(): SdkworkDocumentsPcRuntime {
  const config = resolveSdkworkDocumentsPcRuntimeConfig();
  const session = createSdkworkDocumentsPcSessionStore(
    typeof window === 'undefined' ? undefined : window.sessionStorage,
  );
  const tokenManager = createSdkworkDocumentsPcSessionTokenManager(session);
  const sdkClients = createSdkworkDocumentsPcSdkClientsWithTokenManager(config, tokenManager);
  const iamRuntime = createSdkworkDocumentsPcIamRuntime({
    config,
    sdkClients,
    session,
  });

  const documentsReferenceRuntime: DocumentsReferenceRuntime = {
    readRuntimeEnv: readDocumentsRuntimeEnv,
    resolveRuntimeBoolean: resolveDocumentsRuntimeBoolean,
    sdkSystemConfig: DOCUMENTS_SDK_SYSTEM_CONFIG,
    getDocumentsAppSdkClient: () => getDocumentsAppSdkClientForReference(),
    playgroundUserAgent: 'SDKWork-Documents-PC/1.0.0',
  };

  return {
    config,
    iamRuntime,
    routes: SdkworkDocumentsPcRoutes,
    sdkClients,
    session,
    documentsReferenceRuntime,
  };
}
