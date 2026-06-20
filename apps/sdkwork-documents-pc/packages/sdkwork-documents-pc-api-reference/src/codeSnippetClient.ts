import { resolveApiRequestUrl } from '@sdkwork/documents-pc-commons/runtime';

export const CODEGEN_LANGUAGE_LIBRARY_MAP = {
  javascript: ['axios', 'fetch', 'got', 'superagent'],
  typescript: ['axios', 'fetch', 'got', 'superagent'],
  python: ['requests', 'aiohttp', 'httpx'],
  go: ['net/http', 'fasthttp', 'resty'],
  java: ['okhttp', 'apache-httpclient', 'retrofit', 'unirest'],
  cpp: ['cpprest', 'cpp-httplib', 'boost-beast'],
  csharp: ['httpclient', 'restsharp', 'refit'],
  php: ['guzzle', 'curl'],
  ruby: ['faraday', 'httparty'],
  swift: ['alamofire', 'urlsession'],
  kotlin: ['okhttp', 'retrofit'],
  dart: ['http', 'dio'],
  shell: ['curl'],
  rust: ['reqwest'],
} as const;

export type CodegenLanguage = keyof typeof CODEGEN_LANGUAGE_LIBRARY_MAP;

export const CODEGEN_LANGUAGES = Object.keys(CODEGEN_LANGUAGE_LIBRARY_MAP) as CodegenLanguage[];

const NODE_ENV_REFERENCE = 'process' + '.env';

export function getLibraries(language: CodegenLanguage): string[] {
  return [...CODEGEN_LANGUAGE_LIBRARY_MAP[language]];
}

export function getDefaultLibrary(language: CodegenLanguage): string {
  return CODEGEN_LANGUAGE_LIBRARY_MAP[language][0];
}

export interface GenerateCodeSnippetRequest {
  path: string;
  method: string;
  operation: unknown;
  pathItem: unknown;
  baseUrl: string;
  language: CodegenLanguage;
  library: string;
  openAPISpec: unknown;
}

type JsonRecord = Record<string, unknown>;

type RequestBodyKind = 'json' | 'multipart' | 'binary';

interface RequestBodyExample {
  kind: RequestBodyKind;
  value: unknown;
  contentType: string;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveOpenApiRef(openAPISpec: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  return ref
    .slice(2)
    .split('/')
    .map(decodeJsonPointerSegment)
    .reduce<unknown>((current, segment) => (
      isJsonRecord(current) ? current[segment] : undefined
    ), openAPISpec);
}

function resolveMaybeRef(value: unknown, openAPISpec: unknown, seenRefs = new Set<string>()): unknown {
  if (!isJsonRecord(value) || typeof value.$ref !== 'string') {
    return value;
  }
  if (seenRefs.has(value.$ref)) {
    return undefined;
  }

  seenRefs.add(value.$ref);
  return resolveMaybeRef(resolveOpenApiRef(openAPISpec, value.$ref), openAPISpec, seenRefs);
}

export function joinRequestUrl(baseUrl: string, path: string): string {
  return resolveApiRequestUrl(baseUrl, path).url;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractCodeSnippetPathTemplateVariables(path: string | undefined): string[] {
  if (!path) {
    return [];
  }

  const variables: string[] = [];
  const seen = new Set<string>();
  const pattern = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    const key = match[1].trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    variables.push(key);
  }

  return variables;
}

function inferCodeSnippetPathVariableExample(variableName: string): string {
  const normalizedName = variableName.trim();
  const lowercaseName = normalizedName.toLowerCase();

  if (lowercaseName.includes('model')) {
    return 'gpt-4.1-mini';
  }
  if (lowercaseName.includes('response')) {
    return 'response_id';
  }
  if (lowercaseName.includes('assistant')) {
    return 'assistant_id';
  }
  if (lowercaseName.includes('thread')) {
    return 'thread_id';
  }
  if (lowercaseName.includes('message')) {
    return 'message_id';
  }
  if (lowercaseName.includes('file')) {
    return 'file_id';
  }
  if (lowercaseName.includes('vector') && lowercaseName.includes('store')) {
    return 'vector_store_id';
  }
  if (lowercaseName.includes('batch')) {
    return 'batch_id';
  }
  if (lowercaseName.includes('run')) {
    return 'run_id';
  }

  return normalizedName || 'value';
}

function readRequestBodyContent(operation: unknown): JsonRecord | undefined {
  if (!isJsonRecord(operation)) {
    return undefined;
  }

  const requestBody = operation.requestBody;
  if (!isJsonRecord(requestBody)) {
    return undefined;
  }

  const content = requestBody.content;
  if (!isJsonRecord(content)) {
    return undefined;
  }
  return content;
}

function readRequestBodyMedia(operation: unknown): { kind: RequestBodyKind; contentType: string; schema: unknown } | undefined {
  const content = readRequestBodyContent(operation);
  if (!content) {
    return undefined;
  }

  const entries = Object.entries(content);
  const selected = entries.find(([contentType]) => isJsonLikeContentType(contentType))
    ?? entries.find(([contentType]) => contentType.toLowerCase().split(';', 1)[0]?.trim() === 'multipart/form-data')
    ?? entries[0];
  if (!selected) {
    return undefined;
  }

  const [contentType, mediaType] = selected;
  if (!isJsonRecord(mediaType)) {
    return undefined;
  }

  const normalizedContentType = contentType.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  const kind: RequestBodyKind = isJsonLikeContentType(contentType)
    ? 'json'
    : normalizedContentType === 'multipart/form-data'
      ? 'multipart'
      : 'binary';
  return {
    kind,
    contentType,
    schema: mediaType.schema,
  };
}

function isJsonLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  return normalized === 'application/json' || normalized.endsWith('+json');
}

function buildExampleFromSchema(
  schema: unknown,
  propertyName = 'value',
  openAPISpec: unknown = {},
  seenRefs = new Set<string>(),
): unknown {
  const resolvedSchema = resolveMaybeRef(schema, openAPISpec, seenRefs);
  if (!isJsonRecord(resolvedSchema)) {
    return undefined;
  }

  if ('example' in resolvedSchema) {
    return resolvedSchema.example;
  }
  if ('default' in resolvedSchema) {
    return resolvedSchema.default;
  }
  if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length > 0) {
    return resolvedSchema.enum[0];
  }
  if ('const' in resolvedSchema) {
    return resolvedSchema.const;
  }
  if (Array.isArray(resolvedSchema.oneOf) && resolvedSchema.oneOf.length > 0) {
    return buildExampleFromSchema(resolvedSchema.oneOf[0], propertyName, openAPISpec, seenRefs);
  }
  if (Array.isArray(resolvedSchema.anyOf) && resolvedSchema.anyOf.length > 0) {
    return buildExampleFromSchema(resolvedSchema.anyOf[0], propertyName, openAPISpec, seenRefs);
  }
  if (Array.isArray(resolvedSchema.allOf) && resolvedSchema.allOf.length > 0) {
    const objectParts = resolvedSchema.allOf
      .map((part) => buildExampleFromSchema(part, propertyName, openAPISpec, new Set(seenRefs)))
      .filter(isJsonRecord);
    if (objectParts.length > 0) {
      return Object.assign({}, ...objectParts);
    }
    return buildExampleFromSchema(resolvedSchema.allOf[0], propertyName, openAPISpec, seenRefs);
  }

  const schemaType = typeof resolvedSchema.type === 'string'
    ? resolvedSchema.type
    : isJsonRecord(resolvedSchema.properties)
      ? 'object'
      : undefined;

  switch (schemaType) {
    case 'object': {
      const properties = isJsonRecord(resolvedSchema.properties) ? resolvedSchema.properties : {};
      return Object.fromEntries(
        Object.entries(properties).map(([key, propertySchema]) => [
          key,
          buildExampleFromSchema(propertySchema, key, openAPISpec, new Set(seenRefs)),
        ]),
      );
    }
    case 'array':
      return [buildExampleFromSchema(resolvedSchema.items, propertyName, openAPISpec, new Set(seenRefs))];
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'string': {
      if (resolvedSchema.format === 'date-time') {
        return '2026-01-01T00:00:00.000Z';
      }
      if (resolvedSchema.format === 'date') {
        return '2026-01-01';
      }
      if (propertyName.toLowerCase().includes('model')) {
        return 'gpt-4.1-mini';
      }
      return 'string';
    }
    default:
      return {};
  }
}

function shouldIncludeRequestBody(method: string, operation: unknown): boolean {
  if (readRequestBodyMedia(operation)) {
    return true;
  }
  return ['post', 'put', 'patch'].includes(method.toLowerCase());
}

function buildRequestBody(method: string, operation: unknown, openAPISpec: unknown): RequestBodyExample | undefined {
  if (!shouldIncludeRequestBody(method, operation)) {
    return undefined;
  }

  const media = readRequestBodyMedia(operation);
  if (!media) {
    return {
      kind: 'json',
      contentType: 'application/json',
      value: {},
    };
  }

  return {
    kind: media.kind,
    contentType: media.contentType,
    value: buildExampleFromSchema(media.schema, 'body', openAPISpec) ?? {},
  };
}

function formatJson(value: unknown, spaces = 2): string {
  return JSON.stringify(value, null, spaces) ?? '{}';
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function multipartExampleRecord(value: unknown): Record<string, string> {
  if (!isJsonRecord(value) || Object.keys(value).length === 0) {
    return { file: '@example.bin' };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, rawValue]) => [
      key,
      key.toLowerCase().includes('file')
        ? '@example.bin'
        : String(rawValue ?? ''),
    ]),
  );
}

function buildJavascriptFormDataLines(value: unknown, variableName: string): string[] {
  const lines = [`const ${variableName} = new FormData();`];
  for (const [key, rawValue] of Object.entries(multipartExampleRecord(value))) {
    const valueExpression = rawValue.startsWith('@')
      ? 'exampleFile'
      : JSON.stringify(rawValue);
    lines.push(`${variableName}.append(${JSON.stringify(key)}, ${valueExpression});`);
  }
  return lines;
}

function readOperationParameters(request: GenerateCodeSnippetRequest): JsonRecord[] {
  const collectParameters = (container: unknown) => {
    if (!isJsonRecord(container) || !Array.isArray(container.parameters)) {
      return [];
    }
    return container.parameters
      .map((parameter) => resolveMaybeRef(parameter, request.openAPISpec))
      .filter(isJsonRecord);
  };

  return [
    ...collectParameters(request.pathItem),
    ...collectParameters(request.operation),
  ];
}

function parameterExample(parameter: JsonRecord, openAPISpec: unknown): string {
  if ('example' in parameter) {
    return String(parameter.example);
  }

  const schemaExample = buildExampleFromSchema(parameter.schema, String(parameter.name ?? 'value'), openAPISpec);
  if (schemaExample === undefined || schemaExample === null) {
    return 'value';
  }
  if (typeof schemaExample === 'object') {
    return JSON.stringify(schemaExample);
  }
  return String(schemaExample);
}

function withRequestParameters(url: string, request: GenerateCodeSnippetRequest): string {
  const parameters = readOperationParameters(request);
  let expandedUrl = url;
  const query = new URLSearchParams();

  for (const parameter of parameters) {
    if (typeof parameter.name !== 'string' || typeof parameter.in !== 'string') {
      continue;
    }

    const example = parameterExample(parameter, request.openAPISpec);
    if (parameter.in === 'path') {
      expandedUrl = expandedUrl.replace(
        new RegExp(`\\{${escapeRegExp(parameter.name)}\\}`, 'g'),
        encodeURIComponent(example),
      );
    } else if (parameter.in === 'query') {
      query.set(parameter.name, example);
    }
  }

  for (const variableName of extractCodeSnippetPathTemplateVariables(expandedUrl)) {
    expandedUrl = expandedUrl.replace(
      new RegExp(`\\{\\s*${escapeRegExp(variableName)}\\s*\\}`, 'g'),
      encodeURIComponent(inferCodeSnippetPathVariableExample(variableName)),
    );
  }

  const queryString = query.toString();
  if (!queryString) {
    return expandedUrl;
  }

  return `${expandedUrl}${expandedUrl.includes('?') ? '&' : '?'}${queryString}`;
}

function buildShellSnippet(request: GenerateCodeSnippetRequest, url: string, body: RequestBodyExample | undefined): string {
  const lines = [
    `curl -X ${request.method.toUpperCase()} "${url}" \\`,
    '  -H "Authorization: Bearer $SDKWORK_API_KEY"',
  ];

  if (body !== undefined) {
    lines[lines.length - 1] = `${lines[lines.length - 1]} \\`;
    if (body.kind === 'multipart') {
      for (const [key, value] of Object.entries(multipartExampleRecord(body.value))) {
        lines.push(`  -F ${shellSingleQuote(`${key}=${value}`)} \\`);
      }
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');
    } else if (body.kind === 'binary') {
      lines.push(`  -H "Content-Type: ${body.contentType}" \\`);
      lines.push('  --data-binary @request-body.bin');
    } else {
      lines.push('  -H "Content-Type: application/json" \\');
      lines.push(`  --data-raw ${shellSingleQuote(JSON.stringify(body.value))}`);
    }
  }

  return lines.join('\n');
}

function buildFetchSnippet(request: GenerateCodeSnippetRequest, url: string, body: RequestBodyExample | undefined): string {
  const lines: string[] = [];
  if (body !== undefined) {
    if (body.kind === 'multipart') {
      lines.push(...buildJavascriptFormDataLines(body.value, 'form'));
    } else if (body.kind === 'binary') {
      lines.push('const requestBody = await readRequestBodyBytes();');
    } else {
      lines.push(`const requestBody = ${formatJson(body.value)};`);
    }
    lines.push('');
  }

  lines.push(`const response = await fetch("${url}", {`);
  lines.push(`  method: "${request.method.toUpperCase()}",`);
  lines.push('  headers: {');
  lines.push(`    Authorization: \`Bearer \${${NODE_ENV_REFERENCE}.SDKWORK_API_KEY ?? ""}\`,`);
  if (body !== undefined && body.kind === 'json') {
    lines.push('    "Content-Type": "application/json",');
  } else if (body !== undefined && body.kind === 'binary') {
    lines.push(`    "Content-Type": "${body.contentType}",`);
  }
  lines.push('  },');
  if (body !== undefined) {
    if (body.kind === 'multipart') {
      lines.push('  body: form,');
    } else if (body.kind === 'binary') {
      lines.push('  body: requestBody,');
    } else {
      lines.push('  body: JSON.stringify(requestBody),');
    }
  }
  lines.push('});');
  lines.push('');
  lines.push('if (!response.ok) {');
  lines.push('  throw new Error(`Request failed with status ${response.status}`);');
  lines.push('}');
  lines.push('');
  lines.push('const data = await response.json();');
  lines.push('console.log(data);');
  return lines.join('\n');
}

function buildAxiosSnippet(request: GenerateCodeSnippetRequest, url: string, body: RequestBodyExample | undefined): string {
  const lines: string[] = ['import axios from "axios";', ''];
  if (body !== undefined) {
    if (body.kind === 'multipart') {
      lines.push(...buildJavascriptFormDataLines(body.value, 'form'));
    } else if (body.kind === 'binary') {
      lines.push('const requestBody = await readRequestBodyBytes();');
    } else {
      lines.push(`const requestBody = ${formatJson(body.value)};`);
    }
    lines.push('');
  }

  lines.push('const response = await axios.request({');
  lines.push(`  method: "${request.method.toUpperCase()}",`);
  lines.push(`  url: "${url}",`);
  lines.push('  headers: {');
  lines.push(`    Authorization: \`Bearer \${${NODE_ENV_REFERENCE}.SDKWORK_API_KEY ?? ""}\`,`);
  if (body !== undefined && body.kind === 'json') {
    lines.push('    "Content-Type": "application/json",');
  } else if (body !== undefined && body.kind === 'binary') {
    lines.push(`    "Content-Type": "${body.contentType}",`);
  }
  lines.push('  },');
  if (body !== undefined) {
    lines.push(`  data: ${body.kind === 'multipart' ? 'form' : 'requestBody'},`);
  }
  lines.push('});');
  lines.push('');
  lines.push('console.log(response.data);');
  return lines.join('\n');
}

function buildPythonSnippet(request: GenerateCodeSnippetRequest, url: string, body: RequestBodyExample | undefined): string {
  const lines: string[] = [
    'import os',
    'import requests',
    '',
    `url = "${url}"`,
    'headers = {',
    '    "Authorization": f"Bearer {os.environ.get(\'SDKWORK_API_KEY\', \'\')}",',
  ];

  if (body !== undefined && body.kind === 'json') {
    lines.push('    "Content-Type": "application/json",');
  } else if (body !== undefined && body.kind === 'binary') {
    lines.push(`    "Content-Type": "${body.contentType}",`);
  }
  lines.push('}');

  if (body !== undefined && body.kind === 'multipart') {
    lines.push('files = {');
    for (const [key, value] of Object.entries(multipartExampleRecord(body.value))) {
      lines.push(`    "${key}": ${JSON.stringify(value)},`);
    }
    lines.push('}');
    lines.push(`response = requests.${request.method.toLowerCase()}(url, headers=headers, files=files)`);
  } else if (body !== undefined && body.kind === 'binary') {
    lines.push('with open("request-body.bin", "rb") as file_handle:');
    lines.push(`    response = requests.${request.method.toLowerCase()}(url, headers=headers, data=file_handle)`);
  } else if (body !== undefined) {
    lines.push(`payload = ${formatJson(body.value, 4)}`);
    lines.push(`response = requests.${request.method.toLowerCase()}(url, headers=headers, json=payload)`);
  } else {
    lines.push(`response = requests.${request.method.toLowerCase()}(url, headers=headers)`);
  }

  lines.push('response.raise_for_status()');
  lines.push('print(response.json())');
  return lines.join('\n');
}

function buildGenericHttpSnippet(request: GenerateCodeSnippetRequest, url: string, body: RequestBodyExample | undefined): string {
  const lines = [
    `${request.method.toUpperCase()} ${url}`,
    'Authorization: Bearer <SDKWORK_API_KEY>',
  ];

  if (body !== undefined) {
    lines.push(`Content-Type: ${body.contentType}`);
    lines.push('');
    lines.push(body.kind === 'json' ? formatJson(body.value) : formatJson(body.value));
  }

  return lines.join('\n');
}

export function buildStaticCodeSnippet(request: GenerateCodeSnippetRequest): string {
  const method = request.method.toLowerCase();
  const normalizedRequest = {
    ...request,
    method,
  };
  const url = withRequestParameters(
    joinRequestUrl(normalizedRequest.baseUrl, normalizedRequest.path),
    normalizedRequest,
  );
  const body = buildRequestBody(method, normalizedRequest.operation, normalizedRequest.openAPISpec);

  if (normalizedRequest.language === 'shell' || normalizedRequest.library === 'curl') {
    return buildShellSnippet(normalizedRequest, url, body);
  }
  if (
    (normalizedRequest.language === 'typescript' || normalizedRequest.language === 'javascript')
    && normalizedRequest.library === 'axios'
  ) {
    return buildAxiosSnippet(normalizedRequest, url, body);
  }
  if (normalizedRequest.language === 'typescript' || normalizedRequest.language === 'javascript') {
    return buildFetchSnippet(normalizedRequest, url, body);
  }
  if (normalizedRequest.language === 'python') {
    return buildPythonSnippet(normalizedRequest, url, body);
  }

  return buildGenericHttpSnippet(normalizedRequest, url, body);
}

export async function generateCodeSnippet(request: GenerateCodeSnippetRequest): Promise<string> {
  const response = await fetch('/api/code-snippet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Code snippet generation failed with status ${response.status}`);
  }

  const payload = await response.json() as { code?: unknown };
  if (typeof payload.code !== 'string') {
    throw new Error('Code snippet generation returned an invalid response');
  }
  return payload.code;
}
