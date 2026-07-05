import {
  resolveGatewayEndpointForKind,
  type GatewayEndpointKind,
} from '@sdkwork/utils/gatewayEndpoint';

export type { GatewayEndpointKind };

export const MODELKIT_APP_KEY = 'sdkwork-local-router-sdkwork-modelkit-pc';
export const MODELKIT_STORE_URL = 'https://sdkwork.com/apps/sdkwork-local-router-sdkwork-modelkit-pc';
export const MODELKIT_SCHEME = 'modelkit://config';

export const MODELKIT_DOWNLOAD_URLS = {
  windows: 'https://cdn.sdkwork.com/apps/sdkwork-local-router-sdkwork-modelkit-pc/STABLE/0.0.0/windows/x64/app.zip',
  macos: 'https://cdn.sdkwork.com/apps/sdkwork-local-router-sdkwork-modelkit-pc/STABLE/0.0.0/macos/universal/app.dmg',
  linux: 'https://cdn.sdkwork.com/apps/sdkwork-local-router-sdkwork-modelkit-pc/STABLE/0.0.0/linux/generic/x64/app.AppImage',
} as const;

const MODELKIT_HEALTH_ENDPOINTS = [
  'http://127.0.0.1:3000/api/health',
  'http://localhost:3000/api/health',
] as const;

const PROTOCOL_PROBE_TIMEOUT_MS = 1200;
const HEALTH_PROBE_TIMEOUT_MS = 900;

export type ModelKitInstallStatus = 'unknown' | 'checking' | 'installed' | 'missing';

export interface ModelKitDeepLinkPayload {
  apiKey: string;
  baseUrl: string;
  name: string;
  description?: string;
  supportedTools: string[];
}

export interface ModelKitGatewayEndpoints {
  openAiBaseUrl: string;
  anthropicBaseUrl: string;
  geminiBaseUrl: string;
}

export function resolveModelKitBaseUrl(
  endpointKind: GatewayEndpointKind,
  endpoints: ModelKitGatewayEndpoints,
): string {
  return resolveGatewayEndpointForKind(endpointKind, endpoints);
}

export function buildModelKitDesktopUri(payload: ModelKitDeepLinkPayload): string {
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  return `${MODELKIT_SCHEME}?config=${encoded}`;
}

export function buildModelKitWebUri(
  payload: ModelKitDeepLinkPayload,
  webBaseUrl: string,
): string {
  const base64Payload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const normalizedBase = webBaseUrl.replace(/\/+$/, '');
  return `${normalizedBase}/?deeplink=${encodeURIComponent(base64Payload)}`;
}

export function resolveModelKitWebBaseUrl(
  readRuntimeEnv: (name: string) => string | undefined,
): string {
  return readRuntimeEnv('VITE_MODELKIT_WEB_URL')
    ?? readRuntimeEnv('VITE_SDKWORK_MODELKIT_WEB_URL')
    ?? MODELKIT_STORE_URL;
}

export function resolveModelKitDownloadUrl(): string {
  if (typeof navigator === 'undefined') {
    return MODELKIT_STORE_URL;
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('win') || userAgent.includes('windows')) {
    return MODELKIT_DOWNLOAD_URLS.windows;
  }
  if (platform.includes('mac') || userAgent.includes('macintosh')) {
    return MODELKIT_DOWNLOAD_URLS.macos;
  }
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return MODELKIT_DOWNLOAD_URLS.linux;
  }

  return MODELKIT_STORE_URL;
}

async function probeModelKitHealthEndpoint(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    });
    if (!response.ok) {
      return false;
    }
    const payload = await response.json() as { status?: string };
    return payload.status === 'ok';
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function detectModelKitInstalled(): Promise<boolean> {
  for (const endpoint of MODELKIT_HEALTH_ENDPOINTS) {
    if (await probeModelKitHealthEndpoint(endpoint)) {
      return true;
    }
  }
  return false;
}

export function probeModelKitProtocol(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (installed: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resolve(installed);
    };

    const onBlur = () => finish(true);
    const onVisibilityChange = () => {
      if (document.hidden) {
        finish(true);
      }
    };

    const timer = window.setTimeout(() => finish(false), PROTOCOL_PROBE_TIMEOUT_MS);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    window.location.href = uri;
  });
}

export async function openModelKitConfigure(payload: ModelKitDeepLinkPayload): Promise<{
  installed: boolean;
  opened: boolean;
  downloadUrl: string;
}> {
  const desktopUri = buildModelKitDesktopUri(payload);
  const healthInstalled = await detectModelKitInstalled();

  if (healthInstalled) {
    window.location.href = desktopUri;
    return {
      installed: true,
      opened: true,
      downloadUrl: resolveModelKitDownloadUrl(),
    };
  }

  const protocolOpened = await probeModelKitProtocol(desktopUri);
  if (protocolOpened) {
    return {
      installed: true,
      opened: true,
      downloadUrl: resolveModelKitDownloadUrl(),
    };
  }

  const downloadUrl = resolveModelKitDownloadUrl();
  window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  return {
    installed: false,
    opened: false,
    downloadUrl,
  };
}
