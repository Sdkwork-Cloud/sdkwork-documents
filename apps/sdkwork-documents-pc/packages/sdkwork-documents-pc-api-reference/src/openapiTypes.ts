export interface ApiParameter {
  name: string;
  type: string;
  desc: string;
  required?: boolean;
  children?: ApiParameter[];
}

export interface OpenApiJsonSchema {
  $ref?: string;
  type?: string | string[];
  title?: string;
  format?: string;
  description?: string;
  example?: unknown;
  examples?: unknown[] | Record<string, unknown>;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  nullable?: boolean;
  additionalProperties?: boolean | OpenApiJsonSchema;
  allOf?: OpenApiJsonSchema[];
  oneOf?: OpenApiJsonSchema[];
  anyOf?: OpenApiJsonSchema[];
  properties?: Record<string, OpenApiJsonSchema>;
  required?: string[];
  items?: OpenApiJsonSchema;
}

export interface OpenApiParameter {
  $ref?: string;
  in?: string;
  name?: string;
  description?: string;
  required?: boolean;
  schema?: OpenApiJsonSchema;
}

export interface OpenApiMediaType {
  schema?: OpenApiJsonSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
}

export interface OpenApiRequestBody {
  required?: boolean;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

export type OpenApiOperationMethod =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch'
  | 'trace';

export const OPEN_API_OPERATION_METHODS: readonly OpenApiOperationMethod[] = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

export interface OpenApiPathItem {
  parameters?: OpenApiParameter[];
  servers?: unknown;
  [method: string]: unknown;
}

export interface OpenApiDocument {
  tags?: OpenApiTag[];
  paths: Record<string, OpenApiPathItem>;
  components?: {
    schemas?: Record<string, OpenApiJsonSchema>;
    parameters?: Record<string, OpenApiParameter>;
    [key: string]: unknown;
  };
  "x-api-prefix"?: string;
  [key: string]: unknown;
}

export interface OpenApiTag {
  name?: string;
  'x-display-order'?: number;
  [key: string]: unknown;
}

export interface ApiReferenceEndpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  body: ApiParameter[];
  requestObject?: string;
  responseProperties?: ApiParameter[];
  responseObject?: string;
  responseType?: string;
  responseStatus?: string;
  responseContentType?: string;
  curl: string;
  response: string;
  openApiOperation?: OpenApiOperation;
  openApiPathItem?: OpenApiPathItem;
  openApiSpec?: OpenApiDocument;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function asOpenApiJsonSchema(value: unknown): OpenApiJsonSchema | undefined {
  if (!isJsonRecord(value)) {
    return undefined;
  }
  return value as OpenApiJsonSchema;
}

export function isOpenApiParameter(value: unknown): value is OpenApiParameter {
  if (!isJsonRecord(value)) {
    return false;
  }

  return (
    (typeof value.$ref === 'undefined' || typeof value.$ref === 'string') &&
    (typeof value.in === 'undefined' || typeof value.in === 'string') &&
    (typeof value.name === 'undefined' || typeof value.name === 'string') &&
    (typeof value.description === 'undefined' || typeof value.description === 'string') &&
    (typeof value.required === 'undefined' || typeof value.required === 'boolean') &&
    (typeof value.schema === 'undefined' || Boolean(asOpenApiJsonSchema(value.schema)))
  );
}

function isOpenApiRequestBody(value: unknown): value is OpenApiRequestBody {
  return isJsonRecord(value) && (
    typeof value.content === 'undefined' || isJsonRecord(value.content)
  );
}

function isOpenApiResponses(value: unknown): value is Record<string, OpenApiResponse> {
  return isJsonRecord(value);
}

export function isOpenApiOperation(value: unknown): value is OpenApiOperation {
  if (!isJsonRecord(value)) {
    return false;
  }

  return (
    (typeof value.operationId === 'undefined' || typeof value.operationId === 'string') &&
    (typeof value.summary === 'undefined' || typeof value.summary === 'string') &&
    (typeof value.description === 'undefined' || typeof value.description === 'string') &&
    (typeof value.tags === 'undefined' || isStringArray(value.tags)) &&
    (typeof value.parameters === 'undefined' || (Array.isArray(value.parameters) && value.parameters.every(isOpenApiParameter))) &&
    (typeof value.requestBody === 'undefined' || isOpenApiRequestBody(value.requestBody)) &&
    (typeof value.responses === 'undefined' || isOpenApiResponses(value.responses))
  );
}

function isOpenApiPathItem(value: unknown): value is OpenApiPathItem {
  return isJsonRecord(value);
}

export function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  if (!isJsonRecord(value) || !isJsonRecord(value.paths)) {
    return false;
  }

  return Object.values(value.paths).every(isOpenApiPathItem);
}
