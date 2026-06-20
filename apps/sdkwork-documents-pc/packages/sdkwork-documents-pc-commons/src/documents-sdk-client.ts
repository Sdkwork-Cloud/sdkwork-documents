import type { DocumentsReferenceRuntime } from './documents-reference-runtime.tsx';

export interface SdkReferenceDocumentationResponse {
  readme: string;
  methodDefinition?: string | null;
  usageExample?: string | null;
  language: string;
  generated: boolean;
}

export interface SdkReferenceArchiveResponse {
  fileName: string;
  contentType: string;
  contentBase64: string;
  language: string;
}

export interface DocumentsAppSdkClient {
  sdkReference: {
    documentation: {
      create: (body: Record<string, unknown>) => Promise<unknown>;
    };
    archives: {
      create: (body: Record<string, unknown>) => Promise<unknown>;
    };
  };
}

let documentsReferenceRuntime: DocumentsReferenceRuntime | null = null;

export function registerDocumentsReferenceRuntime(runtime: DocumentsReferenceRuntime): void {
  documentsReferenceRuntime = runtime;
}

export function getDocumentsReferenceRuntime(): DocumentsReferenceRuntime {
  if (!documentsReferenceRuntime) {
    throw new Error('Documents reference runtime is not registered.');
  }
  return documentsReferenceRuntime;
}

export function getDocumentsAppSdkClient(): DocumentsAppSdkClient {
  return getDocumentsReferenceRuntime().getDocumentsAppSdkClient();
}
