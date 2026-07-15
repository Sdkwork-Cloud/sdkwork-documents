import {
  createClient,
  SdkworkDocumentsOpenClient,
} from '../generated/server-openapi/src/index';
import type { SdkworkCustomConfig } from '../generated/server-openapi/src/types/common';

export { SdkworkDocumentsOpenClient, createClient };
export type { SdkworkCustomConfig };
export type SdkworkConfig = SdkworkCustomConfig;
export type SdkworkClient = SdkworkDocumentsOpenClient;
export * from '../generated/server-openapi/src/types';
export * from '../generated/server-openapi/src/api';
export * from '../generated/server-openapi/src/http';
export * from '../generated/server-openapi/src/auth';
