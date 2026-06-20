import type {
  SdkReferenceArchiveResponse,
  SdkReferenceDocumentationResponse,
} from '@sdkwork/documents-pc-commons';

export type { SdkReferenceDocumentationResponse };
import type { OpenApiDocument } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import {
  ensureSdkworkApiSuccess,
  getDocumentsAppSdkClient,
  isRecord,
  normalizeJsonObject,
  readApiData,
  readBoolean,
  readNullableString,
  readString,
} from '@sdkwork/documents-pc-commons/runtime';
import type { GeneratedSdkToolConfig } from './sdkReferenceRuntime';
import { normalizeSdkReferenceLanguage } from './sdkReferenceRuntime';

export interface GenerateSdkReferenceInput {
  spec: OpenApiDocument;
  language: string;
  config: GeneratedSdkToolConfig;
}

export async function generateSdkReferenceDocumentation(
  input: GenerateSdkReferenceInput,
): Promise<SdkReferenceDocumentationResponse> {
  const language = normalizeSdkReferenceLanguage(input.language);
  const result = await getDocumentsAppSdkClient().sdkReference.documentation.create({
    spec: normalizeJsonObject(input.spec, 'spec'),
    language,
    config: normalizeJsonObject({
      ...input.config,
      language,
    }, 'config'),
  });
  ensureSdkworkApiSuccess(result, 'SDK reference documentation could not be generated');
  const data = readApiData(result);
  if (!isRecord(data)) {
    throw new Error('SDK reference documentation response is invalid');
  }
  return {
    readme: readString(data, 'readme'),
    methodDefinition: readNullableString(data, 'methodDefinition'),
    usageExample: readNullableString(data, 'usageExample'),
    language: readString(data, 'language', language),
    generated: readBoolean(data, 'generated', false),
  };
}

export async function generateSdkReferenceArchive(
  input: GenerateSdkReferenceInput,
): Promise<SdkReferenceArchiveResponse> {
  const language = normalizeSdkReferenceLanguage(input.language);
  const result = await getDocumentsAppSdkClient().sdkReference.archives.create({
    spec: normalizeJsonObject(input.spec, 'spec'),
    language,
    config: normalizeJsonObject({
      ...input.config,
      language,
    }, 'config'),
  });
  ensureSdkworkApiSuccess(result, 'SDK archive could not be generated');
  const data = readApiData(result);
  if (!isRecord(data)) {
    throw new Error('SDK archive response is invalid');
  }
  return {
    fileName: readString(data, 'fileName'),
    contentType: readString(data, 'contentType', 'application/zip'),
    contentBase64: readString(data, 'contentBase64'),
    language: readString(data, 'language', language),
  };
}
