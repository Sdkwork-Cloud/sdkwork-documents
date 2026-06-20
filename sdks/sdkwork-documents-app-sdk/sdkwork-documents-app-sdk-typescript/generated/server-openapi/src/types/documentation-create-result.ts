import type { SdkReferenceDocumentationResponse } from './sdk-reference-documentation-response';

/** Documentation create result schema exposed by SDKWork Documents. */
export interface DocumentationCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on documentation create result. */
  data?: SdkReferenceDocumentationResponse;
  /** Human-readable response message. */
  msg?: string;
}
