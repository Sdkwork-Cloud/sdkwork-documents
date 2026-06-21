import type { DocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons';
import {
  readDocumentsRuntimeEnv,
  resolveDocumentsRuntimeBoolean,
} from '@sdkwork/documents-pc-commons/runtime';
import {
  resolveSdkworkDocumentsPcRuntimeConfig,
  type SdkworkDocumentsPcRuntimeConfig,
} from './environment.ts';
import { syncDocumentsPcTokenManagerFromStoredSession } from './iamRuntime.ts';
import { SdkworkDocumentsPcRoutes } from './routes.ts';
import {
  createSdkworkDocumentsPcSdkClients,
  getDocumentsAppSdkClientForReference,
  type SdkworkDocumentsPcSdkClientInventory,
} from './sdkClients.ts';
import { DOCUMENTS_SDK_SYSTEM_CONFIG } from './sdkSystemConfig.ts';

export interface SdkworkDocumentsPcRuntime {
  config: SdkworkDocumentsPcRuntimeConfig;
  routes: typeof SdkworkDocumentsPcRoutes;
  sdkClients: SdkworkDocumentsPcSdkClientInventory;
  documentsReferenceRuntime: DocumentsReferenceRuntime;
}

export function createSdkworkDocumentsPcRuntime(): SdkworkDocumentsPcRuntime {
  const config = resolveSdkworkDocumentsPcRuntimeConfig();
  const sdkClients = createSdkworkDocumentsPcSdkClients(config);

  const documentsReferenceRuntime: DocumentsReferenceRuntime = {
    readRuntimeEnv: readDocumentsRuntimeEnv,
    resolveRuntimeBoolean: resolveDocumentsRuntimeBoolean,
    sdkSystemConfig: DOCUMENTS_SDK_SYSTEM_CONFIG,
    getDocumentsAppSdkClient: () => {
      syncDocumentsPcTokenManagerFromStoredSession();
      return getDocumentsAppSdkClientForReference();
    },
    playgroundUserAgent: 'SDKWork-Documents-PC/1.0.0',
  };

  return {
    config,
    routes: SdkworkDocumentsPcRoutes,
    sdkClients,
    documentsReferenceRuntime,
  };
}
