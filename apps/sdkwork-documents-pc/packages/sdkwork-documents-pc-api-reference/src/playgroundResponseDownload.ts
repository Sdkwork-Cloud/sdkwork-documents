import type { PlaygroundResponse } from './playgroundRequest';

export interface ApiPlaygroundResponseDownload {
  filename: string;
  mimeType: string;
  text: string;
}

function normalizeFilenamePart(value: unknown): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'response';
}

function headerValue(headers: [string, string][], name: string): string {
  const normalizedName = name.toLowerCase();
  return headers.find(([key]) => key.toLowerCase() === normalizedName)?.[1] ?? '';
}

function resolveMimeType(response: PlaygroundResponse, text: string): string {
  const contentType = headerValue(response.headers, 'content-type').split(';')[0].trim().toLowerCase();
  if (contentType) {
    return contentType;
  }
  if (typeof response.data !== 'string') {
    return 'application/json';
  }
  return text.trim().startsWith('{') || text.trim().startsWith('[') ? 'application/json' : 'text/plain';
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('json')) {
    return 'json';
  }
  if (mimeType.includes('html')) {
    return 'html';
  }
  if (mimeType.includes('xml')) {
    return 'xml';
  }
  return 'txt';
}

export function serializeApiPlaygroundResponseData(data: unknown): string {
  if (typeof data === 'undefined') {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  const json = JSON.stringify(data, null, 2);
  return typeof json === 'string' ? json : String(data);
}

export function createApiPlaygroundResponseDownload(response: PlaygroundResponse | null | undefined): ApiPlaygroundResponseDownload | null {
  if (!response) {
    return null;
  }

  if (typeof response.data === 'undefined') {
    return null;
  }

  const text = serializeApiPlaygroundResponseData(response.data);
  const mimeType = resolveMimeType(response, text);
  const extension = extensionForMimeType(mimeType);
  return {
    filename: `playground-response-${response.status}-${normalizeFilenamePart(response.statusText)}.${extension}`,
    mimeType,
    text,
  };
}

export function downloadApiPlaygroundResponse(response: PlaygroundResponse | null | undefined): boolean {
  const download = createApiPlaygroundResponseDownload(response);
  if (!download) {
    return false;
  }

  const blob = new Blob([download.text], { type: download.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = download.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}
