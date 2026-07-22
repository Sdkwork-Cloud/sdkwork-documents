import type { Document } from './document';

export interface DocumentResponse {
  code: 0;
  data: unknown & { item: Document; };
  /** Server-owned request correlation id. */
  traceId: string;
}
