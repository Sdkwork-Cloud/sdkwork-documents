import type { DocumentCapabilities } from './document-capabilities';

export interface CapabilitiesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
