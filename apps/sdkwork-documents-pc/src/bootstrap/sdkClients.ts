import { createClient, type SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import type { DocumentsAppSdkClient } from '@sdkwork/documents-pc-commons';
import { listSdkworkDocumentsPcAppSdkFamilies } from '@sdkwork/documents-pc-core';
import type { SdkworkDocumentsPcRuntimeConfig } from './environment.ts';
import { getDocumentsPcTokenManager } from './iamRuntime.ts';

export interface SdkworkDocumentsPcSdkClientInventory {
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  openApiBaseUrl: string;
  documentsAppClient: SdkworkDocumentsAppClient;
  sdkFamilies: {
    app: string[];
    backend: string[];
    open: string[];
  };
}

let documentsAppSdkClient: SdkworkDocumentsAppClient | null = null;

export function createSdkworkDocumentsPcSdkClients(
  config: SdkworkDocumentsPcRuntimeConfig,
): SdkworkDocumentsPcSdkClientInventory {
  if (!documentsAppSdkClient) {
    documentsAppSdkClient = createClient({
      baseUrl: config.appApiBaseUrl,
      tokenManager: getDocumentsPcTokenManager(),
    });
  }

  return {
    appApiBaseUrl: config.appApiBaseUrl,
    backendApiBaseUrl: config.backendApiBaseUrl,
    openApiBaseUrl: config.openApiBaseUrl,
    documentsAppClient: documentsAppSdkClient,
    sdkFamilies: {
      app: listSdkworkDocumentsPcAppSdkFamilies(),
      backend: ['sdkwork-documents-backend-sdk'],
      open: ['sdkwork-documents-sdk'],
    },
  };
}

export function getDocumentsAppSdkClientForReference(): DocumentsAppSdkClient {
  if (!documentsAppSdkClient) {
    throw new Error('Documents app SDK client is not initialized.');
  }
  return documentsAppSdkClient as unknown as DocumentsAppSdkClient;
}

export function resetSdkworkDocumentsPcSdkClients(): void {
  documentsAppSdkClient = null;
}
