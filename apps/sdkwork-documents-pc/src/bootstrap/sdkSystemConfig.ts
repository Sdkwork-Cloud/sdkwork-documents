import type { DocumentsGeneratedSdkMetadata } from '@sdkwork/documents-pc-commons/runtime';
import {
  APP_API_PREFIX,
  BACKEND_API_PREFIX,
  DOCUMENTS_OPEN_API_PREFIX,
  OPEN_API_PREFIX,
} from '@sdkwork/documents-pc-commons/runtime';

function sdkMetadata(
  partial: Omit<DocumentsGeneratedSdkMetadata, 'archiveLanguage' | 'version'>,
): DocumentsGeneratedSdkMetadata {
  return {
    version: '0.1.0',
    archiveLanguage: 'typescript',
    ...partial,
  };
}

const DOCUMENTS_APP_SDK_METADATA = sdkMetadata({
  name: 'SdkworkDocumentsAppClient',
  packageName: '@sdkwork/documents-app-sdk',
  sdkType: 'app',
  apiPrefix: APP_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL',
  sourceDir:
    'sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-documents-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Documents app API SDK',
});

const DOCUMENTS_BACKEND_SDK_METADATA = sdkMetadata({
  name: 'SdkworkDocumentsBackendClient',
  packageName: '@sdkwork/documents-backend-sdk',
  sdkType: 'backend',
  apiPrefix: BACKEND_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_DOCUMENTS_BACKEND_API_BASE_URL',
  sourceDir:
    'sdks/sdkwork-documents-backend-sdk/sdkwork-documents-backend-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-documents-backend-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Documents backend API SDK',
});

const DOCUMENTS_OPEN_SDK_METADATA = sdkMetadata({
  name: 'SdkworkDocumentsOpenClient',
  packageName: '@sdkwork/documents-sdk',
  sdkType: 'ai',
  apiPrefix: DOCUMENTS_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_DOCUMENTS_OPEN_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-documents-sdk/sdkwork-documents-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-documents-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Documents open API SDK',
});

const LLM_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkAiClient',
  packageName: '@sdkwork/clawrouter-open-sdk',
  sdkType: 'ai',
  apiPrefix: OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  description: 'SDKWork LLM Open API SDK',
});

const DRIVE_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkDriveAppClient',
  packageName: '@sdkwork/drive-app-sdk',
  sdkType: 'drive',
  apiPrefix: '/open/v3/api',
  runtimeEnvName: 'VITE_SDKWORK_DRIVE_OPEN_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-drive-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Drive Open API SDK',
});

const MEMORY_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkMemoryAppClient',
  packageName: '@sdkwork/memory-app-sdk',
  sdkType: 'memory',
  apiPrefix: '/mem/v3/api',
  runtimeEnvName: 'VITE_SDKWORK_MEMORY_OPEN_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-memory-app-sdk/sdkwork-memory-app-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-memory-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Memory Open API SDK',
});

const AGENT_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkAgentAppClient',
  packageName: '@sdkwork/agents-app-sdk',
  sdkType: 'agent',
  apiPrefix: '/agent/v3/api',
  runtimeEnvName: 'VITE_SDKWORK_AGENT_OPEN_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-agents-app-sdk/sdkwork-agent-app-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-agents-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Agent Open API SDK',
});

const PAYMENT_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkPaymentClient',
  packageName: '@sdkwork/commerce-app-sdk',
  sdkType: 'payment',
  apiPrefix: '/payments/v3',
  runtimeEnvName: 'VITE_SDKWORK_COMMERCE_APP_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-commerce-app-sdk/sdkwork-commerce-app-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-commerce-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Payment Open API SDK',
});

const IAAS_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkCloudClient',
  packageName: '@sdkwork/clawrouter-open-sdk',
  sdkType: 'iaas',
  apiPrefix: '/cloud/v3',
  runtimeEnvName: 'VITE_SDKWORK_IAAS_OPEN_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  description: 'SDKWork IaaS Open API SDK',
});

const PAAS_OPEN_API_METADATA = sdkMetadata({
  name: 'SdkworkPaasClient',
  packageName: '@sdkwork/clawrouter-open-sdk',
  sdkType: 'paas',
  apiPrefix: '/paas/v3',
  runtimeEnvName: 'VITE_SDKWORK_PAAS_OPEN_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi',
  archiveName: 'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  description: 'SDKWork PaaS Open API SDK',
});

export const DOCUMENTS_SDK_SYSTEM_CONFIG: Record<string, DocumentsGeneratedSdkMetadata> = {
  'llm-open-api': LLM_OPEN_API_METADATA,
  'image-open-api': { ...LLM_OPEN_API_METADATA, description: 'SDKWork Image Open API SDK' },
  'video-open-api': { ...LLM_OPEN_API_METADATA, description: 'SDKWork Video Open API SDK' },
  'audio-open-api': { ...LLM_OPEN_API_METADATA, description: 'SDKWork Audio Open API SDK' },
  'drive-open-api': DRIVE_OPEN_API_METADATA,
  'knowledgebase-open-api': { ...LLM_OPEN_API_METADATA, description: 'SDKWork Knowledgebase Open API SDK' },
  'memory-open-api': MEMORY_OPEN_API_METADATA,
  'agent-open-api': AGENT_OPEN_API_METADATA,
  'payment-open-api': PAYMENT_OPEN_API_METADATA,
  'iaas-open-api': IAAS_OPEN_API_METADATA,
  'paas-open-api': PAAS_OPEN_API_METADATA,
  'app-api': DOCUMENTS_APP_SDK_METADATA,
  'backend-api': DOCUMENTS_BACKEND_SDK_METADATA,
  'documents-open-api': DOCUMENTS_OPEN_SDK_METADATA,
  gateway: LLM_OPEN_API_METADATA,
  'cloud-services': IAAS_OPEN_API_METADATA,
  'paas-api': PAAS_OPEN_API_METADATA,
  'payment-aggregate': PAYMENT_OPEN_API_METADATA,
  'voice-open-api': { ...LLM_OPEN_API_METADATA, description: 'SDKWork Voice Open API SDK' },
  app: DOCUMENTS_APP_SDK_METADATA,
  backend: DOCUMENTS_BACKEND_SDK_METADATA,
  'sdkwork-drive-open-api': DRIVE_OPEN_API_METADATA,
  'sdkwork-drive.open': DRIVE_OPEN_API_METADATA,
  'sdkwork-knowledgebase-open-api': {
    ...LLM_OPEN_API_METADATA,
    description: 'SDKWork Knowledgebase Open API SDK',
  },
  'sdkwork-memory-open-api': MEMORY_OPEN_API_METADATA,
  'sdkwork-agent-open-api': AGENT_OPEN_API_METADATA,
};
