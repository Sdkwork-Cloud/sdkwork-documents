import type { ParamRow } from './apiPlaygroundRows';
import { resolveApiRequestUrl } from '@sdkwork/documents-pc-commons/runtime';

type AuthType = 'current_user' | 'api_key';
type RequestTab = 'params' | 'headers' | 'auth' | 'body';
const ACCESS_TOKEN_HEADER = 'Access-Token';

export const FORBIDDEN_HEADER_NAMES = new Set([
  'accept-encoding',
  ACCESS_TOKEN_HEADER.toLowerCase(),
  'authorization',
  'connection',
  'content-length',
  'content-type',
  'cookie',
  'forwarded',
  'host',
  'origin',
  'referer',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'user-agent',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
]);

export interface PlaygroundEndpoint {
  method: string;
  path: string;
  openApiOperation?: {
    requestBody?: {
      required?: boolean;
      content?: Record<string, unknown>;
    };
  };
}

export interface BuildPlaygroundRequestInput {
  baseUrl: string;
  endpoint: PlaygroundEndpoint;
  pathParams: ParamRow[];
  queryParams: ParamRow[];
  headerParams: ParamRow[];
  bodyValue: string;
  authType: AuthType;
  accessToken?: string;
  apiKey?: string;
  authToken?: string;
}

export interface PlaygroundResponse {
  status: number;
  statusText: string;
  time: number;
  size: number;
  headers: [string, string][];
  data: unknown;
}

export interface PlaygroundRequestValidationFailure {
  ok: false;
  activeTab: RequestTab;
  errors: Record<string, boolean>;
  response: PlaygroundResponse;
}

export interface PlaygroundRequestBuildSuccess {
  ok: true;
  url: string;
  requestInit: RequestInit & {
    headers: Record<string, string>;
  };
}

export type PlaygroundRequestBuildResult =
  | PlaygroundRequestValidationFailure
  | PlaygroundRequestBuildSuccess;

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

export function buildPlaygroundUrl(input: Pick<
  BuildPlaygroundRequestInput,
  'baseUrl' | 'endpoint' | 'pathParams' | 'queryParams'
>): string {
  let url = resolveApiRequestUrl(input.baseUrl, input.endpoint.path).url;

  for (const param of input.pathParams) {
    if (!param.key) {
      continue;
    }
    url = url.replace(
      new RegExp(`\\{${escapeRegExp(param.key)}\\}`, 'g'),
      param.value ? encodePathValue(param.value) : `{${param.key}}`,
    );
  }

  const query = new URLSearchParams();
  for (const param of input.queryParams) {
    if (param.enabled && param.key) {
      query.append(param.key, param.value);
    }
  }

  const queryString = query.toString();
  if (!queryString) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasUnresolvedPathTemplateVariable(url: string): boolean {
  return /\{[^{}]+\}/.test(url);
}

function validationResponse(statusText: string, message: string): PlaygroundResponse {
  return {
    status: 400,
    statusText,
    time: 0,
    size: 0,
    headers: [],
    data: {
      error: statusText,
      message,
    },
  };
}

function validationFailure(
  activeTab: RequestTab,
  errors: Record<string, boolean>,
  statusText: string,
  message: string,
): PlaygroundRequestValidationFailure {
  return {
    ok: false,
    activeTab,
    errors,
    response: validationResponse(statusText, message),
  };
}

function hasJsonRequestBody(endpoint: PlaygroundEndpoint): boolean {
  return Boolean(getRequestContentType(endpoint)?.toLowerCase().split(';', 1)[0]?.trim() === 'application/json');
}

function getRequestContentType(endpoint: PlaygroundEndpoint): string | undefined {
  const content = endpoint.openApiOperation?.requestBody?.content;
  if (!content) {
    return undefined;
  }
  const entries = Object.entries(content);
  const selected = entries.find(([contentType]) => isJsonLikeContentType(contentType)) ?? entries[0];
  return selected?.[0];
}

function isJsonLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  return normalized === 'application/json' || normalized.endsWith('+json');
}

function shouldSendBody(method: string, bodyValue: string): boolean {
  return !['GET', 'HEAD'].includes(method.toUpperCase()) && bodyValue.trim().length > 0;
}

function validateRequiredFields(input: BuildPlaygroundRequestInput): PlaygroundRequestValidationFailure | null {
  const errors: Record<string, boolean> = {};
  let hasParamError = false;
  let hasHeaderError = false;

  for (const param of input.pathParams) {
    if (param.required !== false && !param.value.trim()) {
      errors[param.id] = true;
      hasParamError = true;
    }
  }

  for (const param of input.queryParams) {
    if (param.required && !param.value.trim()) {
      errors[param.id] = true;
      hasParamError = true;
    }
  }

  for (const param of input.headerParams) {
    if (param.required && !param.value.trim()) {
      errors[param.id] = true;
      hasHeaderError = true;
    }
  }

  const hasBodyError = Boolean(input.endpoint.openApiOperation?.requestBody?.required && !input.bodyValue.trim());
  if (input.endpoint.openApiOperation?.requestBody?.required && !input.bodyValue.trim()) {
    errors.body = true;
  }

  if (Object.keys(errors).length === 0) {
    return null;
  }

  return validationFailure(
    resolveRequiredErrorTab({ hasParamError, hasHeaderError, hasBodyError }),
    errors,
    'Validation Error',
    'Please fill in all required parameters and body before sending the request.',
  );
}

function resolveRequiredErrorTab({
  hasParamError,
  hasHeaderError,
  hasBodyError,
}: {
  hasParamError: boolean;
  hasHeaderError: boolean;
  hasBodyError: boolean;
}): RequestTab {
  if (hasParamError) {
    return 'params';
  }
  if (hasHeaderError) {
    return 'headers';
  }
  if (hasBodyError) {
    return 'body';
  }
  return 'params';
}

function validateJsonBody(input: BuildPlaygroundRequestInput): PlaygroundRequestValidationFailure | null {
  if (!shouldSendBody(input.endpoint.method, input.bodyValue) || !hasJsonRequestBody(input.endpoint)) {
    return null;
  }

  try {
    JSON.parse(input.bodyValue);
    return null;
  } catch {
    return validationFailure(
      'body',
      { body: true },
      'Invalid JSON Body',
      'Request body must be valid JSON before sending the request.',
    );
  }
}

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

function isManagedHeaderName(name: string): boolean {
  const normalized = normalizeHeaderName(name);
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return (
    FORBIDDEN_HEADER_NAMES.has(normalized)
    || compact.endsWith('accesstoken')
    || compact.endsWith('requestid')
  );
}

function validateHeaderParams(headerParams: ParamRow[]): PlaygroundRequestValidationFailure | null {
  const errors: Record<string, boolean> = {};

  for (const param of headerParams) {
    if (!param.enabled || !param.key.trim()) {
      continue;
    }
    if (isManagedHeaderName(param.key)) {
      errors[param.id] = true;
    }
  }

  if (Object.keys(errors).length === 0) {
    return null;
  }

  return validationFailure(
    'headers',
    errors,
    'Managed Header',
    'Authorization, cookies, browser-controlled headers, and transport headers are managed by the playground runtime and cannot be overridden in custom headers.',
  );
}

function validateResolvedUrl(input: BuildPlaygroundRequestInput): PlaygroundRequestValidationFailure | null {
  if (!hasUnresolvedPathTemplateVariable(buildPlaygroundUrl(input))) {
    return null;
  }

  return validationFailure(
    'params',
    { 'path-template': true },
    'Unresolved Path Variable',
    'Endpoint path variables must be provided before sending the request.',
  );
}

function isOpenGatewayEndpoint(endpoint: PlaygroundEndpoint): boolean {
  const path = endpoint.path.trim();
  return path === '/v1' || path.startsWith('/v1/');
}

function validateAuthBoundary(input: BuildPlaygroundRequestInput): PlaygroundRequestValidationFailure | null {
  if (input.authType !== 'current_user' || !isOpenGatewayEndpoint(input.endpoint)) {
    return null;
  }

  return validationFailure(
    'auth',
    { authType: true },
    'Gateway API Key Required',
    'Open gateway endpoints under /v1 require an API key. Current logged-in user session tokens are only valid for app and backend API endpoints.',
  );
}

function buildHeaders(input: BuildPlaygroundRequestInput): Record<string, string> {
  const headers: Record<string, string> = {};
  const requestContentType = getRequestContentType(input.endpoint);
  if (requestContentType && requestContentType.toLowerCase().split(';', 1)[0]?.trim() !== 'multipart/form-data') {
    headers['Content-Type'] = requestContentType;
  }

  if (input.authType === 'api_key' && input.apiKey?.trim()) {
    headers.Authorization = `Bearer ${input.apiKey.trim()}`;
  } else if (input.authType === 'current_user') {
    if (input.authToken?.trim()) {
      headers.Authorization = `Bearer ${input.authToken.trim()}`;
    }
    if (input.accessToken?.trim()) {
      headers[ACCESS_TOKEN_HEADER] = input.accessToken.trim();
    }
  }

  for (const param of input.headerParams) {
    if (!param.enabled || !param.key.trim()) {
      continue;
    }
    headers[param.key.trim()] = param.value;
  }

  return headers;
}

export function buildPlaygroundRequest(input: BuildPlaygroundRequestInput): PlaygroundRequestBuildResult {
  const requiredFailure = validateRequiredFields(input);
  if (requiredFailure) {
    return requiredFailure;
  }

  const headerFailure = validateHeaderParams(input.headerParams);
  if (headerFailure) {
    return headerFailure;
  }

  const urlFailure = validateResolvedUrl(input);
  if (urlFailure) {
    return urlFailure;
  }

  const bodyFailure = validateJsonBody(input);
  if (bodyFailure) {
    return bodyFailure;
  }

  const authFailure = validateAuthBoundary(input);
  if (authFailure) {
    return authFailure;
  }

  const method = input.endpoint.method.toUpperCase();
  const requestInit: PlaygroundRequestBuildSuccess['requestInit'] = {
    method,
    headers: buildHeaders(input),
    credentials: input.authType === 'current_user' ? 'include' : 'omit',
  };

  if (shouldSendBody(method, input.bodyValue)) {
    requestInit.body = input.bodyValue;
  }

  return {
    ok: true,
    url: buildPlaygroundUrl(input),
    requestInit,
  };
}
