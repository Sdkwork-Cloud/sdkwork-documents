import type { ElementType } from 'react';
import {
  BookOpen,
  Bot,
  Brain,
  Cloud,
  CreditCard,
  FileScan,
  HardDrive,
  ImageIcon,
  Layout,
  Server,
  Settings,
  Sparkles,
  Video,
  Volume2,
} from 'lucide-react';
import type {
  ApiCategory,
  ApiCategorySidebarNode,
  ApiSchemaTab,
  ApiSchemaTabsDocument,
  ApiReferenceFetchJson,
  ApiSystemData as ApiReferenceSystemData,
} from '@sdkwork/documents-pc-api-reference/apiReferenceSchemaTabs';
import {
  buildApiCategorySidebarTree,
  buildApiReferenceSystemsFromTabs,
  createApiReferenceSystemSummaries,
  loadApiReferenceSchemaTabs,
  loadApiReferenceSystem,
  loadApiReferenceSystems,
} from '@sdkwork/documents-pc-api-reference/apiReferenceSchemaTabs';
import { readDocumentsRuntimeEnv, getSdkSystemConfig } from '@sdkwork/documents-pc-commons/runtime';
import { APP_API_PREFIX, BACKEND_API_PREFIX, CLOUD_API_PREFIX } from '@sdkwork/documents-pc-commons/runtime';
import type { DocumentsGeneratedSdkMetadata, DocumentsGeneratedSdkType } from '@sdkwork/documents-pc-commons/runtime';

export type SdkReferenceSystem =
  | 'llm-open-api'
  | 'image-open-api'
  | 'video-open-api'
  | 'audio-open-api'
  | 'drive-open-api'
  | 'knowledgebase-open-api'
  | 'memory-open-api'
  | 'agent-open-api'
  | 'payment-open-api'
  | 'iaas-open-api'
  | 'paas-open-api'
  | 'app-api'
  | 'backend-api';
export type GeneratedSdkType = DocumentsGeneratedSdkType;
export type GeneratedSdkMetadata = DocumentsGeneratedSdkMetadata;

type LegacySdkReferenceSystem =
  | 'gateway'
  | 'cloud-services'
  | 'paas-api'
  | 'payment-aggregate'
  | 'app'
  | 'backend'
  | 'voice-open-api'
  | 'sdkwork-drive-open-api'
  | 'sdkwork-drive.open'
  | 'sdkwork-knowledgebase-open-api'
  | 'sdkwork-memory-open-api'
  | 'sdkwork-agent-open-api';

const OPEN_API_GENERATED_SDK_DEFAULT_BASE_URL = 'https://api.sdkwork.com';
const SDK_REFERENCE_SYSTEM_IDS = new Set<SdkReferenceSystem>([
  'llm-open-api',
  'image-open-api',
  'video-open-api',
  'audio-open-api',
  'drive-open-api',
  'knowledgebase-open-api',
  'memory-open-api',
  'agent-open-api',
  'payment-open-api',
  'iaas-open-api',
  'paas-open-api',
  'app-api',
  'backend-api',
]);
const LEGACY_SDK_REFERENCE_SYSTEM_ALIASES: Record<LegacySdkReferenceSystem, SdkReferenceSystem> = {
  gateway: 'llm-open-api',
  'cloud-services': 'iaas-open-api',
  'paas-api': 'paas-open-api',
  'payment-aggregate': 'payment-open-api',
  app: 'app-api',
  backend: 'backend-api',
  'voice-open-api': 'audio-open-api',
  'sdkwork-drive-open-api': 'drive-open-api',
  'sdkwork-drive.open': 'drive-open-api',
  'sdkwork-knowledgebase-open-api': 'knowledgebase-open-api',
  'sdkwork-memory-open-api': 'memory-open-api',
  'sdkwork-agent-open-api': 'agent-open-api',
};

export interface SdkReferenceSystemData extends Omit<ApiReferenceSystemData, 'id' | 'icon'> {
  id: SdkReferenceSystem;
  icon: ElementType;
}

export interface GeneratedSdkToolConfig {
  name: string;
  version: string;
  language: string;
  sdkType: GeneratedSdkType;
  outputPath: string;
  apiSpecPath: string;
  baseUrl: string;
  apiPrefix: string;
  endpointPath?: string;
  endpointMethod?: string;
  operationId?: string;
  packageName: string;
  author: string;
  license: string;
  description: string;
}

export async function loadSdkReferenceSystems(): Promise<SdkReferenceSystemData[]> {
  const systems = await loadApiReferenceSystems();
  return systems
    .map(toSdkReferenceSystemData)
    .filter((system): system is SdkReferenceSystemData => system !== null);
}

export async function loadSdkReferenceSystemSummaries(
  fetchJson?: ApiReferenceFetchJson,
): Promise<SdkReferenceSystemData[]> {
  const manifest = await loadApiReferenceSchemaTabs(fetchJson);
  const normalizedManifest: ApiSchemaTabsDocument = {
    ...manifest,
    tabs: normalizeSdkReferenceTabs(manifest.tabs),
  };
  return createApiReferenceSystemSummaries(normalizedManifest)
    .map(toSdkReferenceSystemData)
    .filter((system): system is SdkReferenceSystemData => system !== null);
}

export async function loadSdkReferenceSystem(
  system: SdkReferenceSystemData,
  fetchJson?: ApiReferenceFetchJson,
): Promise<SdkReferenceSystemData> {
  const loadedSystem = toSdkReferenceSystemData(await loadApiReferenceSystem(system.schemaTab, fetchJson));
  if (!loadedSystem) {
    throw new Error(`Unsupported SDK reference system: ${system.id}`);
  }
  return loadedSystem;
}

export async function buildSdkReferenceSystems(
  manifest: ApiSchemaTabsDocument,
  fetchJson: (url: string) => Promise<unknown>,
): Promise<SdkReferenceSystemData[]> {
  const sdkTabs = normalizeSdkReferenceTabs(manifest.tabs);
  const sdkManifest: ApiSchemaTabsDocument = {
    ...manifest,
    tabs: sdkTabs,
  };
  const schemaUrlById = new Map(
    sdkManifest.tabs.map((tab) => [
      tab.id as SdkReferenceSystem,
      tab.defaultSchemaUrl || tab.schemaUrls[0] || defaultSchemaUrlForSystem(tab.id),
    ]),
  );
  const systems = await buildApiReferenceSystemsFromTabs(sdkManifest, fetchJson);
  return systems
    .map(toSdkReferenceSystemData)
    .filter((system): system is SdkReferenceSystemData => system !== null)
    .map((system) => ({
      ...system,
      schemaUrl: schemaUrlById.get(system.id) || defaultSchemaUrlForSystem(system.id),
    }));
}

export function getGeneratedSdkMetadataForSystem(system: SdkReferenceSystem): GeneratedSdkMetadata {
  return getSdkSystemConfig()[system];
}

export function createGeneratedSdkToolConfig(
  system: SdkReferenceSystem,
  languageId: string,
  schemaUrl = defaultSchemaUrlForSystem(system),
): GeneratedSdkToolConfig {
  const sdkMetadata = getGeneratedSdkMetadataForSystem(system);
  const language = normalizeSdkReferenceLanguage(languageId);
  return {
    name: sdkMetadata.name,
    version: sdkMetadata.version,
    language,
    sdkType: sdkMetadata.sdkType,
    outputPath: './sdk',
    apiSpecPath: schemaUrl,
    baseUrl: resolveGeneratedSdkBaseUrl(system),
    apiPrefix: resolveGeneratedSdkApiPrefix(system),
    packageName: sdkMetadata.packageName,
    author: 'SDKWork',
    license: 'MIT',
    description: sdkMetadata.description,
  };
}

export function normalizeSdkReferenceLanguage(languageId: string): string {
  const normalizedLanguageId = languageId.toLowerCase();
  let language = normalizedLanguageId;
  if (language === 'node' || language === 'javascript') language = 'typescript';
  if (language === 'c#') language = 'csharp';
  return language;
}

export function isGeneratedSdkArchiveLanguage(languageId: string): boolean {
  const language = normalizeSdkReferenceLanguage(languageId);
  if (language === 'shell' || language === 'cpp') {
    return false;
  }
  return true;
}

export function buildSdkReferenceSidebarTree(categories: ApiCategory[]): ApiCategorySidebarNode[] {
  return buildApiCategorySidebarTree(categories);
}

function resolveGeneratedSdkBaseUrl(system: SdkReferenceSystem): string {
  const sdkMetadata = getGeneratedSdkMetadataForSystem(system);
  const configuredBaseUrl = readDocumentsRuntimeEnv(sdkMetadata.runtimeEnvName)
    ?? (isOpenAiCompatibleSdkReferenceSystem(system) ? readDocumentsRuntimeEnv('VITE_API_BASE_URL') : undefined);
  if (isOpenAiCompatibleSdkReferenceSystem(system)) {
    return stripGatewayOpenAiVersionBaseUrl(configuredBaseUrl ?? OPEN_API_GENERATED_SDK_DEFAULT_BASE_URL);
  }
  if (isSdkworkDomainOpenApiReferenceSystem(system)) {
    return stripGeneratedSdkApiPrefixBaseUrl(
      configuredBaseUrl ?? OPEN_API_GENERATED_SDK_DEFAULT_BASE_URL,
      sdkMetadata.apiPrefix,
    );
  }
  return configuredBaseUrl ?? sdkMetadata.apiPrefix;
}

function resolveGeneratedSdkApiPrefix(system: SdkReferenceSystem): string {
  if (isOpenAiCompatibleSdkReferenceSystem(system)) {
    return '';
  }
  return getGeneratedSdkMetadataForSystem(system).apiPrefix;
}

function stripGatewayOpenAiVersionBaseUrl(baseUrl: string): string {
  return stripGeneratedSdkApiPrefixBaseUrl(baseUrl, '/v1');
}

function stripGeneratedSdkApiPrefixBaseUrl(baseUrl: string, apiPrefix: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/g, '');
  const normalizedPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  if (!normalized.endsWith(normalizedPrefix)) {
    return normalized;
  }
  const withoutApiPrefix = normalized.slice(0, -normalizedPrefix.length);
  if (withoutApiPrefix) {
    return withoutApiPrefix;
  }
  return readBrowserOrigin() ?? OPEN_API_GENERATED_SDK_DEFAULT_BASE_URL;
}

function readBrowserOrigin(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const origin = window.location?.origin?.trim();
  if (!origin || origin === 'null') {
    return undefined;
  }
  return origin.replace(/\/+$/g, '');
}

function toSdkReferenceSystemData(system: ApiReferenceSystemData): SdkReferenceSystemData | null {
  const normalizedId = normalizeSdkReferenceSystemId(system.id);
  if (!normalizedId) {
    return null;
  }
  return {
    ...system,
    id: normalizedId,
    icon: iconForSdkSystem(normalizedId),
  };
}

function normalizeSdkReferenceTabs(tabs: ApiSchemaTab[]): ApiSchemaTab[] {
  const tabBySystem = new Map<SdkReferenceSystem, ApiSchemaTab>();
  tabs.forEach((tab) => {
    const normalizedId = normalizeSdkReferenceSystemId(tab.id);
    if (!normalizedId || tabBySystem.has(normalizedId)) {
      return;
    }
    tabBySystem.set(normalizedId, {
      ...tab,
      id: normalizedId,
      aliases: Array.from(new Set([...(tab.aliases ?? []), tab.id].filter((alias) => alias !== normalizedId))),
    });
  });
  return Array.from(tabBySystem.values());
}

function iconForSdkSystem(system: SdkReferenceSystem): ElementType {
  if (system === 'llm-open-api') return Sparkles;
  if (system === 'image-open-api') return ImageIcon;
  if (system === 'video-open-api') return Video;
  if (system === 'audio-open-api') return Volume2;
  if (system === 'drive-open-api') return HardDrive;
  if (system === 'knowledgebase-open-api') return BookOpen;
  if (system === 'memory-open-api') return Brain;
  if (system === 'agent-open-api') return Bot;
  if (system === 'payment-open-api') return CreditCard;
  if (system === 'iaas-open-api') return Cloud;
  if (system === 'paas-open-api') return FileScan;
  if (system === 'backend-api') return Settings;
  if (system === 'app-api') return Layout;
  return Server;
}

function defaultSchemaUrlForSystem(system: string): string {
  const normalizedId = normalizeSdkReferenceSystemId(system);
  if (normalizedId === 'backend-api') return `${BACKEND_API_PREFIX}/openapi.json`;
  if (normalizedId === 'app-api') return `${APP_API_PREFIX}/openapi.json`;
  if (normalizedId === 'iaas-open-api') return `${CLOUD_API_PREFIX}/openapi.json`;
  if (normalizedId === 'payment-open-api') return '/payments/v3/openapi.json';
  if (normalizedId === 'paas-open-api') return '/paas/v3/openapi.json';
  return '/openapi.json';
}

function normalizeSdkReferenceSystemId(system: string): SdkReferenceSystem | undefined {
  if (SDK_REFERENCE_SYSTEM_IDS.has(system as SdkReferenceSystem)) {
    return system as SdkReferenceSystem;
  }
  return LEGACY_SDK_REFERENCE_SYSTEM_ALIASES[system as LegacySdkReferenceSystem];
}

function isOpenAiCompatibleSdkReferenceSystem(system: SdkReferenceSystem): boolean {
  return system === 'llm-open-api'
    || system === 'image-open-api'
    || system === 'video-open-api'
    || system === 'audio-open-api'
    || system === 'knowledgebase-open-api';
}

function isSdkworkDomainOpenApiReferenceSystem(system: SdkReferenceSystem): boolean {
  return system === 'drive-open-api'
    || system === 'memory-open-api'
    || system === 'agent-open-api';
}
