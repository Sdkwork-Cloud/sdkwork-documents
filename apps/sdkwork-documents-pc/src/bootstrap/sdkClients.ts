import { createClient, type SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import type { DocumentsAppSdkClient } from '@sdkwork/documents-pc-commons';
import { listSdkworkDocumentsPcAppSdkFamilies } from '@sdkwork/documents-pc-core';
import type { AuthTokenManager } from '@sdkwork/sdk-common';
import { normalizeSdkworkApiBaseUrl } from '@sdkwork/runtime-bootstrap';

import type { SdkworkDocumentsPcRuntimeConfig } from './environment.ts';

const APP_API_PREFIX = '/app/v3/api';

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

export function createSdkworkDocumentsPcSdkClientsWithTokenManager(
  config: SdkworkDocumentsPcRuntimeConfig,
  tokenManager: AuthTokenManager,
): SdkworkDocumentsPcSdkClientInventory {
  if (!documentsAppSdkClient) {
    documentsAppSdkClient = createClient({
      authMode: 'dual-token',
      baseUrl: normalizeGeneratedSdkBaseUrl(config.appApiBaseUrl, APP_API_PREFIX),
      platform: 'pc',
      tokenManager,
    });
  } else {
    documentsAppSdkClient.setTokenManager(tokenManager);
  }

  return {
    appApiBaseUrl: normalizeSdkworkApiBaseUrl(config.appApiBaseUrl, 'app'),
    backendApiBaseUrl: normalizeSdkworkApiBaseUrl(config.backendApiBaseUrl, 'backend'),
    openApiBaseUrl: config.openApiBaseUrl,
    documentsAppClient: documentsAppSdkClient,
    sdkFamilies: {
      app: [...listSdkworkDocumentsPcAppSdkFamilies(), 'sdkwork-appbase-app-sdk'],
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

function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, '');
  const normalizedApiPrefix = apiPrefix.replace(/\/+$/u, '');
  if (normalizedBaseUrl.endsWith(normalizedApiPrefix)) {
    return normalizedBaseUrl.slice(0, -normalizedApiPrefix.length) || normalizedBaseUrl;
  }
  return normalizedBaseUrl;
}
