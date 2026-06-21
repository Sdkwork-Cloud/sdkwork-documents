import {
  readDocumentsRuntimeEnv,
  resolveDocumentsRuntimeBoolean,
} from '@sdkwork/documents-pc-commons/runtime';

export interface SdkworkDocumentsPcRuntimeConfig {
  deploymentProfile: string;
  environment: string;
  configProfile: string;
  buildMode: string;
  runtimeTarget: string;
  devSameOriginApi: boolean;
  applicationPublicHttpUrl: string;
  applicationBackendHttpUrl: string;
  applicationOpenHttpUrl: string;
  platformApiGatewayHttpUrl: string;
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  openApiBaseUrl: string;
  toolApiEnabled: boolean;
}

function readViteEnv(name: string, fallback = ''): string {
  return readDocumentsRuntimeEnv(name) ?? import.meta.env[name] ?? fallback;
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

  const appApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL')
    ?? (devSameOriginApi ? '/app/v3/api' : `${applicationPublicHttpUrl.replace(/\/+$/, '')}/app/v3/api`);
  const backendApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_BACKEND_API_BASE_URL')
    ?? (devSameOriginApi
      ? '/backend/v3/api'
      : `${applicationBackendHttpUrl.replace(/\/+$/, '')}/backend/v3/api`);
  const openApiBaseUrl =
    readViteEnv('VITE_SDKWORK_DOCUMENTS_OPEN_API_BASE_URL')
    ?? (devSameOriginApi
      ? '/doc/v3/api'
      : `${applicationOpenHttpUrl.replace(/\/+$/, '')}/doc/v3/api`);

  return {
    deploymentProfile: readViteEnv('VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE', 'standalone'),
    environment: readViteEnv('VITE_SDKWORK_DOCUMENTS_ENVIRONMENT', 'development'),
    configProfile: readViteEnv('VITE_SDKWORK_DOCUMENTS_CONFIG_PROFILE', 'dev'),
    buildMode: readViteEnv('VITE_SDKWORK_DOCUMENTS_BUILD_MODE', 'development'),
    runtimeTarget: readViteEnv('VITE_SDKWORK_DOCUMENTS_RUNTIME_TARGET', 'browser'),
    devSameOriginApi,
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
