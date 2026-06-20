import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ArchivesCreateResult, DocumentationCreateResult, SdkReferenceArchiveGenerateRequest, SdkReferenceDocumentationGenerateRequest } from '../types';


export class SdkReferenceDocumentationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Generate SDK reference documentation */
  async create(body: SdkReferenceDocumentationGenerateRequest): Promise<DocumentationCreateResult> {
    return this.client.post<DocumentationCreateResult>(appApiPath(`/sdk_reference/documentation`), body, undefined, undefined, 'application/json');
  }
}

export class SdkReferenceArchivesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Generate SDK archive */
  async create(body: SdkReferenceArchiveGenerateRequest): Promise<ArchivesCreateResult> {
    return this.client.post<ArchivesCreateResult>(appApiPath(`/sdk_reference/archives`), body, undefined, undefined, 'application/json');
  }
}

export class SdkReferenceApi {
  private client: HttpClient;
  public readonly archives: SdkReferenceArchivesApi;
  public readonly documentation: SdkReferenceDocumentationApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.archives = new SdkReferenceArchivesApi(client);
    this.documentation = new SdkReferenceDocumentationApi(client);
  }

}

export function createSdkReferenceApi(client: HttpClient): SdkReferenceApi {
  return new SdkReferenceApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
