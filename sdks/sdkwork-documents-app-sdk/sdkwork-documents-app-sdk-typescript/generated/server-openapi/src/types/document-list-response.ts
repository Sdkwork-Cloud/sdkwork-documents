import type { Document } from './document';
import type { PageInfo } from './page-info';

export interface DocumentListResponse {
  code: 0;
  data: unknown & { items: Document[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}
