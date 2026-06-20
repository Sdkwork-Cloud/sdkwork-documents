import type { SdkReferenceArchiveResponse } from './sdk-reference-archive-response';

/** Archives create result schema exposed by SDKWork Documents. */
export interface ArchivesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on archives create result. */
  data?: SdkReferenceArchiveResponse;
  /** Human-readable response message. */
  msg?: string;
}
