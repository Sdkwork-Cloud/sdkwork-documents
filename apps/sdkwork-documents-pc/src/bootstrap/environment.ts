import {
  readDocumentsRuntimeEnv,
  resolveDocumentsRuntimeBoolean,
} from '@sdkwork/documents-pc-commons/runtime';
import manifest from '../../../../sdkwork.app.config.json';

export type SdkworkDocumentsPcEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface SdkworkDocumentsPcDependencySdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
}

export interface SdkworkDocumentsPcSdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
  dependencySdkBaseUrls?: Record<string, SdkworkDocumentsPcDependencySdkBaseUrls>;
  sdkBaseUrl?: string;
}

export interface SdkworkDocumentsPcI18nRuntimeConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
}

export interface SdkworkDocumentsPcRuntimeConfig {
  appKey: string;
  appDisplayName: string;
  deploymentProfile: string;
  environment: SdkworkDocumentsPcEnvironment;
  configProfile: string;
  buildMode: string;
  runtimeTarget: string;
  devSameOriginApi: boolean;
  devAuthBypass: boolean;
  applicationPublicHttpUrl: string;
  applicationBackendHttpUrl: string;
  applicationOpenHttpUrl: string;
  platformApiGatewayHttpUrl: string;
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  openApiBaseUrl: string;
  toolApiEnabled: boolean;
  i18n: SdkworkDocumentsPcI18nRuntimeConfig;
  sdkBaseUrls?: SdkworkDocumentsPcSdkBaseUrls;
  version: string;
}

function readViteEnv(name: string, fallback = ''): string {
  return readDocumentsRuntimeEnv(name) ?? import.meta.env[name] ?? fallback;
}

function resolveEnvironment(value: string): SdkworkDocumentsPcEnvironment {
  if (value === 'production' || value === 'prod') {
    return 'production';
  }
  if (value === 'staging') {
    return 'staging';
  }
  if (value === 'test') {
    return 'test';
  }
  return 'development';
}

function parseSdkBaseUrls(applicationPublicHttpUrl: string): SdkworkDocumentsPcSdkBaseUrls | undefined {
  const raw = readViteEnv('VITE_SDKWORK_DOCUMENTS_SDK_BASE_URLS_JSON');
  if (raw) {
    try {
      return JSON.parse(raw) as SdkworkDocumentsPcSdkBaseUrls;
    } catch {
      return undefined;
    }
  }

  const normalizedBaseUrl = applicationPublicHttpUrl.replace(/\/+$/u, '');
  if (!normalizedBaseUrl) {
    return undefined;
  }

  return {
    appApiBaseUrl: `${normalizedBaseUrl}/app/v3/api`,
    backendApiBaseUrl: `${normalizedBaseUrl}/backend/v3/api`,
    dependencySdkBaseUrls: {
      [ 'sdkwork-iam-app-sdk' ]: {
        appApiBaseUrl: `${normalizedBaseUrl}/app/v3/api`,
      },
    },
    sdkBaseUrl: normalizedBaseUrl,
  };
}

export function resolveSdkworkDocumentsPcRuntimeConfig(): SdkworkDocumentsPcRuntimeConfig {
  const applicationPublicHttpUrl = readViteEnv(
    'VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL',
    'http://127.0.0.1:18084',
  );
  const applicationBackendHttpUrl = readViteEnv(
    'VITE_SDKWORK_DOCUMENTS_APPLICATION_BACKEND_HTTP_URL',
    applicationPublicHttpUrl,
  );
  const applicationOpenHttpUrl = readViteEnv(
    'VITE_SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_URL',
    applicationPublicHttpUrl,
  );
  const devSameOriginApi = resolveDocumentsRuntimeBoolean(
    'VITE_SDKWORK_DOCUMENTS_DEV_SAME_ORIGIN_API',
    true,
  );
  const environment = resolveEnvironment(readViteEnv('VITE_SDKWORK_DOCUMENTS_ENVIRONMENT', 'development'));
  const sdkBaseUrls = parseSdkBaseUrls(applicationPublicHttpUrl);

  const appApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL')
    ?? sdkBaseUrls?.appApiBaseUrl
    ?? (devSameOriginApi ? '/app/v3/api' : `${applicationPublicHttpUrl.replace(/\/+$/, '')}/app/v3/api`);
  const backendApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_BACKEND_API_BASE_URL')
    ?? sdkBaseUrls?.backendApiBaseUrl
    ?? (devSameOriginApi
      ? '/backend/v3/api'
      : `${applicationBackendHttpUrl.replace(/\/+$/, '')}/backend/v3/api`);
  const openApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_OPEN_API_BASE_URL')
    ?? (devSameOriginApi
      ? '/doc/v3/api'
      : `${applicationOpenHttpUrl.replace(/\/+$/, '')}/doc/v3/api`);

  return {
    appKey: manifest.app.key,
    appDisplayName: manifest.app.displayName,
    deploymentProfile: readViteEnv('VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE', 'standalone'),
    environment,
    configProfile: readViteEnv('VITE_SDKWORK_DOCUMENTS_CONFIG_PROFILE', 'dev'),
    buildMode: readViteEnv('VITE_SDKWORK_DOCUMENTS_BUILD_MODE', 'development'),
    runtimeTarget: readViteEnv('VITE_SDKWORK_DOCUMENTS_RUNTIME_TARGET', 'browser'),
    devSameOriginApi,
    devAuthBypass: resolveDocumentsRuntimeBoolean('VITE_SDKWORK_DOCUMENTS_DEV_AUTH_BYPASS', false),
    applicationPublicHttpUrl,
    applicationBackendHttpUrl,
    applicationOpenHttpUrl,
    platformApiGatewayHttpUrl: readViteEnv(
      'VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL',
      'http://127.0.0.1:3900',
    ),
    appApiBaseUrl,
    backendApiBaseUrl,
    openApiBaseUrl,
    toolApiEnabled: resolveDocumentsRuntimeBoolean('VITE_TOOL_API_ENABLED', false),
    i18n: {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      supportedLocales: ['en', 'zh'],
    },
    sdkBaseUrls,
    version: '0.1.0',
  };
}

export function readSdkworkDocumentsPcRuntimeEnv(name: string): string | undefined {
  return readDocumentsRuntimeEnv(name) ?? (import.meta.env[name] as string | undefined);
}

export function resolveSdkworkDocumentsPcRuntimeBoolean(
  name: string,
  defaultValue = false,
): boolean {
  return resolveDocumentsRuntimeBoolean(name, defaultValue);
}
