export interface SdkReferenceGenerationRequest {
  /** OpenAPI/documentation spec to generate SDK reference from */
  spec: Record<string, unknown>;
  language: string;
  config?: { name?: string; version?: string; language?: string; sdkType?: string; outputPath?: string; apiSpecPath?: string; baseUrl?: string; } & Record<string, unknown>;
}
