import type { OpenApiDocument, OpenApiRequestBody } from './openapiTypes';
import { generateOpenApiSchemaExample, getDocumentedRequestSchema } from './openapiSchemaRuntime.ts';

export interface ParamRow {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
  isSchema: boolean;
  required?: boolean;
}

export type ApiPlaygroundParamLocation = 'query' | 'path' | 'header';

export interface ApiPlaygroundOperationParameter {
  in?: string;
  name?: string;
  description?: string;
  required?: boolean;
}

export interface ApiPlaygroundJsonSchema {
  $ref?: string;
  type?: string;
  example?: unknown;
  properties?: Record<string, ApiPlaygroundJsonSchema>;
  required?: string[];
  items?: ApiPlaygroundJsonSchema;
}

export interface ApiPlaygroundRequestBody {
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: ApiPlaygroundJsonSchema;
    };
  } & Record<string, unknown>;
}

export interface ApiPlaygroundInitialStateInput {
  path?: string;
  openApiSpec?: OpenApiDocument;
  openApiOperation?: {
    parameters?: ApiPlaygroundOperationParameter[];
    requestBody?: ApiPlaygroundRequestBody;
  };
}

export interface ApiPlaygroundInitialState {
  queryParams: ParamRow[];
  pathParams: ParamRow[];
  headerParams: ParamRow[];
  bodyValue: string;
  activeTab: 'params' | 'body';
}

function normalizeRowKey(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function rowIdPart(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'unnamed';
}

export function makeApiPlaygroundSchemaRows(
  parameters: ApiPlaygroundOperationParameter[],
  location: ApiPlaygroundParamLocation,
): ParamRow[] {
  return parameters
    .filter((parameter) => parameter.in === location)
    .map((parameter, index) => {
      const key = normalizeRowKey(parameter.name);
      return {
        id: `schema-${location}-${index}-${rowIdPart(key)}`,
        key,
        value: '',
        description: normalizeRowKey(parameter.description),
        enabled: true,
        isSchema: true,
        required: parameter.required,
      };
    });
}

export function extractApiPlaygroundPathTemplateVariables(path: string | undefined): string[] {
  if (!path) {
    return [];
  }

  const variables: string[] = [];
  const seen = new Set<string>();
  const pattern = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    const key = normalizeRowKey(match[1]);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    variables.push(key);
  }

  return variables;
}

function appendMissingPathTemplateRows(rows: ParamRow[], path: string | undefined): ParamRow[] {
  const existing = new Set(rows.map((row) => row.key));
  const nextRows = [...rows];

  for (const key of extractApiPlaygroundPathTemplateVariables(path)) {
    if (existing.has(key)) {
      continue;
    }
    existing.add(key);
    nextRows.push({
      id: `template-path-${nextRows.length}-${rowIdPart(key)}`,
      key,
      value: '',
      description: 'Path variable from endpoint template',
      enabled: true,
      isSchema: true,
      required: true,
    });
  }

  return nextRows;
}

export function makeApiPlaygroundEmptyRow(
  location: Exclude<ApiPlaygroundParamLocation, 'path'>,
  sequence: number,
  enabled = false,
): ParamRow {
  return {
    id: `custom-${location}-${Math.max(0, Math.trunc(sequence))}`,
    key: '',
    value: '',
    description: '',
    enabled,
    isSchema: false,
  };
}

export function parseApiPlaygroundBulkRows(
  text: string,
  location: Exclude<ApiPlaygroundParamLocation, 'path'>,
): ParamRow[] {
  const rows = text
    .split('\n')
    .map((line, index) => {
      const enabled = !line.trim().startsWith('//');
      const cleanLine = line.replace(/^\/\/\s*/, '');
      const colonIndex = cleanLine.indexOf(':');
      const rawKey = colonIndex === -1 ? cleanLine : cleanLine.substring(0, colonIndex);
      const rawValue = colonIndex === -1 ? '' : cleanLine.substring(colonIndex + 1);

      return {
        id: `bulk-${location}-${index}`,
        key: rawKey.trim(),
        value: rawValue.trim(),
        description: '',
        enabled,
        isSchema: false,
      };
    })
    .filter((row) => row.key || row.value);

  if (rows.length === 0 || rows[rows.length - 1].key !== '' || rows[rows.length - 1].value !== '') {
    rows.push({
      id: `bulk-${location}-empty`,
      key: '',
      value: '',
      description: '',
      enabled: true,
      isSchema: false,
    });
  }

  return rows;
}

export function createApiPlaygroundInitialState(input: ApiPlaygroundInitialStateInput): ApiPlaygroundInitialState {
  const parameters = input.openApiOperation?.parameters ?? [];
  const requestBody = input.openApiOperation?.requestBody;
  let customRowSequence = 0;
  const nextCustomRow = (location: Exclude<ApiPlaygroundParamLocation, 'path'>): ParamRow => {
    customRowSequence += 1;
    return makeApiPlaygroundEmptyRow(location, customRowSequence);
  };

  const queryParams = makeApiPlaygroundSchemaRows(parameters, 'query');
  queryParams.push(nextCustomRow('query'));

  const pathParams = appendMissingPathTemplateRows(makeApiPlaygroundSchemaRows(parameters, 'path'), input.path);

  const headerParams = makeApiPlaygroundSchemaRows(parameters, 'header');
  headerParams.push(nextCustomRow('header'));

  return {
    queryParams,
    pathParams,
    headerParams,
    bodyValue: createApiPlaygroundBodyValue(requestBody, input.openApiSpec),
    activeTab: parameters.length === 0 && requestBody ? 'body' : 'params',
  };
}

export function createApiPlaygroundInitialStateKey(input: ApiPlaygroundInitialStateInput & { method?: string; path?: string }): string {
  return stableStringify({
    method: input.method ?? '',
    path: input.path ?? '',
    openApiOperation: input.openApiOperation ?? null,
    openApiSpec: input.openApiSpec ?? null,
  });
}

function stableStringify(value: unknown): string {
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function createApiPlaygroundBodyValue(requestBody?: ApiPlaygroundRequestBody, openApiSpec?: OpenApiDocument): string {
  if (!requestBody) {
    return '';
  }
  const schema = getDocumentedRequestSchema(requestBody as OpenApiRequestBody | undefined);
  if (!schema) {
    return '';
  }
  return JSON.stringify(generateOpenApiSchemaExample(schema, {
    spec: openApiSpec,
  }), null, 2);
}
