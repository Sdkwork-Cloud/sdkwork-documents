import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkCustomConfig } from './types/common';

import { DocumentsApi, createDocumentsApi } from './api/documents';

export class SdkworkDocumentsOpenClient {
  private httpClient: HttpClient;

  public readonly documents: DocumentsApi;

  constructor(config: SdkworkCustomConfig) {
    this.httpClient = createHttpClient(config);
    this.documents = createDocumentsApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }
  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkCustomConfig): SdkworkDocumentsOpenClient {
  return new SdkworkDocumentsOpenClient(config);
}

export default SdkworkDocumentsOpenClient;
