import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { DocumentsApi, createDocumentsApi } from './api/documents';
import { SdkReferenceApi, createSdkReferenceApi } from './api/sdk-reference';

export class SdkworkDocumentsAppClient {
  private httpClient: HttpClient;

  public readonly documents: DocumentsApi;
  public readonly sdkReference: SdkReferenceApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.documents = createDocumentsApi(this.httpClient);

    this.sdkReference = createSdkReferenceApi(this.httpClient);
  }
  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkAppConfig): SdkworkDocumentsAppClient {
  return new SdkworkDocumentsAppClient(config);
}

export default SdkworkDocumentsAppClient;
