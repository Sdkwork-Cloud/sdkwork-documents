import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { DocumentsAppSdkClient } from './documents-sdk-client.ts';
import { registerDocumentsReferenceRuntime } from './documents-sdk-client.ts';

export const APP_API_PREFIX = '/app/v3/api';
export const BACKEND_API_PREFIX = '/backend/v3/api';
export const OPEN_API_PREFIX = '/v1';
export const CLOUD_API_PREFIX = '/cloud/v3/api';

export type DocumentsGeneratedSdkType =
  | 'app'
  | 'backend'
  | 'ai'
  | 'drive'
  | 'memory'
  | 'agent'
  | 'payment'
  | 'iaas'
  | 'paas';

export interface DocumentsGeneratedSdkMetadata {
  name: string;
  packageName: string;
  version: string;
  sdkType: DocumentsGeneratedSdkType;
  apiPrefix: string;
  runtimeEnvName: string;
  sourceDir: string;
  archiveLanguage: 'typescript';
  archiveName: string;
  description: string;
}

export interface DocumentsReferenceRuntime {
  readRuntimeEnv: (name: string) => string | undefined;
  resolveRuntimeBoolean: (name: string, defaultValue?: boolean) => boolean;
  sdkSystemConfig: Record<string, DocumentsGeneratedSdkMetadata>;
  getDocumentsAppSdkClient: () => DocumentsAppSdkClient;
  playgroundUserAgent?: string;
}

const DocumentsReferenceRuntimeContext = createContext<DocumentsReferenceRuntime | null>(null);

export function DocumentsReferenceRuntimeProvider({
  value,
  children,
}: {
  value: DocumentsReferenceRuntime;
  children: ReactNode;
}) {
  useEffect(() => {
    registerDocumentsReferenceRuntime(value);
  }, [value]);

  return (
    <DocumentsReferenceRuntimeContext.Provider value={value}>
      {children}
    </DocumentsReferenceRuntimeContext.Provider>
  );
}

export function useDocumentsReferenceRuntime(): DocumentsReferenceRuntime {
  const runtime = useContext(DocumentsReferenceRuntimeContext);
  if (!runtime) {
    throw new Error('DocumentsReferenceRuntimeProvider is required for documents reference modules.');
  }
  return runtime;
}

export function readDocumentsRuntimeEnv(name: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const value = (window as Window & { __SDKWORK_DOCUMENTS_ENV__?: Record<string, unknown> })
    .__SDKWORK_DOCUMENTS_ENV__?.[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolveDocumentsRuntimeBoolean(name: string, defaultValue = false): boolean {
  const value = readDocumentsRuntimeEnv(name);
  if (!value) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

const DEFAULT_PLAYGROUND_USER_AGENT = 'SDKWork-Documents-Playground/1.0.0';

export function resolvePlaygroundUserAgent(runtime: DocumentsReferenceRuntime): string {
  const configured = runtime.playgroundUserAgent?.trim()
    ?? runtime.readRuntimeEnv('VITE_SDKWORK_DOCUMENTS_PLAYGROUND_USER_AGENT')?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_PLAYGROUND_USER_AGENT;
}
