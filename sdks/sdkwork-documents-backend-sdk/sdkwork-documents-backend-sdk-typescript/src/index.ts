import {
  createClient as createGeneratedBackendClient,
  SdkworkDocumentsBackendClient,
} from '../generated/server-openapi/src/index';
import type { SdkworkBackendConfig } from '../generated/server-openapi/src/types/common';

export { SdkworkDocumentsBackendClient, createGeneratedBackendClient };
export type { SdkworkBackendConfig };
export type SdkworkBackendClient = SdkworkDocumentsBackendClient;
export * from '../generated/server-openapi/src/types';
export * from '../generated/server-openapi/src/api';
export * from '../generated/server-openapi/src/http';
export * from '../generated/server-openapi/src/auth';

export function createClient(config: SdkworkBackendConfig): SdkworkDocumentsBackendClient {
  return createGeneratedBackendClient(config);
}
