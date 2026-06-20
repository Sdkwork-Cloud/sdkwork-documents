/** Sdk reference documentation response schema exposed by SDKWork Documents. */
export interface SdkReferenceDocumentationResponse {
  /** Generated field on sdk reference documentation response. */
  generated: boolean;
  /** Language field on sdk reference documentation response. */
  language: string;
  /** Method definition field on sdk reference documentation response. */
  methodDefinition?: string | null;
  /** Readme field on sdk reference documentation response. */
  readme: string;
  /** Usage example field on sdk reference documentation response. */
  usageExample?: string | null;
}
