/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SDKWORK_DOCUMENTS_DEPLOYMENT_PROFILE?: string;
  readonly VITE_SDKWORK_DOCUMENTS_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_DOCUMENTS_CONFIG_PROFILE?: string;
  readonly VITE_SDKWORK_DOCUMENTS_BUILD_MODE?: string;
  readonly VITE_SDKWORK_DOCUMENTS_RUNTIME_TARGET?: string;
  readonly VITE_SDKWORK_DOCUMENTS_DEV_SAME_ORIGIN_API?: string;
  readonly VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_APPLICATION_BACKEND_HTTP_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_BACKEND_API_BASE_URL?: string;
  readonly VITE_SDKWORK_DOCUMENTS_OPEN_API_BASE_URL?: string;
  readonly VITE_TOOL_API_ENABLED?: string;
  readonly VITE_SDKWORK_DOCUMENTS_PC_DEV_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __SDKWORK_DOCUMENTS_ENV__?: Record<string, string>;
  }
}

export {};
