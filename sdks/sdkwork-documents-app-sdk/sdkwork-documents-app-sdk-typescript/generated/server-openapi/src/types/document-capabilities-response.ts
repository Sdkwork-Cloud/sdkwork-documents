import type { DocumentCapabilities } from './document-capabilities';

export interface DocumentCapabilitiesResponse {
  code: 0;
  data: unknown & { item: DocumentCapabilities; };
  /** Server-owned request correlation id. */
  traceId: string;
}
