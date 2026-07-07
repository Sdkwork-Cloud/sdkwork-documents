import { MethodBadge } from '../components/MethodBadge';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Terminal, Code, Coffee, Box, BookOpen, ChevronRight, Download, Gem, FileCode2, Hash, Cog, Smartphone, Search, X, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SdkLanguage } from '../data/sdkData';
import { getSdkDataForSystem } from '../data/sdkData';
import {
  CopyButton,
  createReferenceSidebarGroupElementId,
  isReferenceSidebarGroupCollapsed,
  toggleReferenceSidebarGroup,
  filterReferenceSidebarTree,
  type ReferenceSidebarCollapsedGroups,
} from '@sdkwork/documents-pc-commons';
import { resolveDocumentsRuntimeBoolean } from '@sdkwork/documents-pc-commons/runtime';
import { SdkEndpointView } from '../components/SdkEndpointView';
import type { ApiReferenceEndpoint } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import { getApiSystemDisplayName, type ApiCategorySidebarNode } from '@sdkwork/documents-pc-api-reference/apiReferenceSchemaTabs';
import type { OpenApiDocument } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import type { SdkReferenceSystem, SdkReferenceSystemData, GeneratedSdkToolConfig } from '../sdkReferenceRuntime';
import {
  generateSdkReferenceArchive,
  generateSdkReferenceDocumentation,
} from '../sdkReferenceGenerationService';
import {
  buildSdkReferenceSidebarTree,
  createGeneratedSdkToolConfig,
  getGeneratedSdkMetadataForSystem,
  isGeneratedSdkArchiveLanguage,
  loadSdkReferenceSystems,
  normalizeSdkReferenceLanguage,
} from '../sdkReferenceRuntime';

const IconMap: Record<string, React.ElementType> = {
  Terminal,
  Code,
  TerminalSquare: Terminal,
  Coffee,
  Gem,
  FileCode2,
  Hash,
  Cog,
  Smartphone
};

const localToolApiEnabled = resolveDocumentsRuntimeBoolean('VITE_TOOL_API_ENABLED', false);

export function SdkReference() {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SdkReferenceSystem>('llm-open-api');
  const [activeSdkId, setActiveSdkId] = useState<string>('typescript');
  const [activeEndpointId, setActiveEndpointId] = useState<string>('overview');
  const [apiData, setApiData] = useState<SdkReferenceSystemData[]>([]);
  const [activeSpec, setActiveSpec] = useState<OpenApiDocument | null>(null);
  const [activeSchemaUrl, setActiveSchemaUrl] = useState('/openapi.json');
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [activeSdkConfig, setActiveSdkConfig] = useState<GeneratedSdkToolConfig | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<ReferenceSidebarCollapsedGroups>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sdkData = getSdkDataForSystem(activeSystem);
  const activeSdk = sdkData.find(s => s.id === activeSdkId) || sdkData[0];
  const activeLanguage = normalizeSdkReferenceLanguage(activeSdk.id);

  const loadSdkData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const systems = await loadSdkReferenceSystems();
      setApiData(systems);
      const nextActiveSystem = systems.some((system) => system.id === activeSystem)
        ? activeSystem
        : systems[0]?.id ?? 'llm-open-api';
      if (nextActiveSystem !== activeSystem) {
        setActiveSystem(nextActiveSystem);
      }
      setLoading(false);
    } catch {
      setActiveSpec(null);
      setReadmeContent(null);
      setLoadError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSdkData();
  }, []);

  const activeSystemData = apiData.find(s => s.id === activeSystem);

  useEffect(() => {
    const schemaUrl = activeSystemData?.schemaUrl ?? '/openapi.json';
    setActiveSchemaUrl(schemaUrl);
    setActiveSpec(activeSystemData?.openApiSpec ?? activeSystemData?.categories[0]?.endpoints[0]?.openApiSpec ?? null);

    if (activeEndpointId !== 'overview') {
      const endpointExists = activeSystemData?.categories.some((category) => (
        category.endpoints.some((endpoint) => endpoint.id === activeEndpointId)
      ));
      if (!endpointExists) {
        setActiveEndpointId('overview');
      }
    }
  }, [activeSystemData, activeEndpointId]);

  useEffect(() => {
    const config = createGeneratedSdkToolConfig(activeSystem, activeLanguage, activeSchemaUrl);
    setActiveSdkConfig(config);
  }, [activeSystem, activeLanguage, activeSchemaUrl]);

  useEffect(() => {
    if (!activeSpec || !activeSdkConfig) {
      setReadmeContent(null);
      setLoadingReadme(false);
      return;
    }

    let cancelled = false;
    const loadReadme = async () => {
      setReadmeContent(null);
      setLoadingReadme(true);
      try {
        const documentation = await generateSdkReferenceDocumentation({
          spec: activeSpec,
          language: activeLanguage,
          config: activeSdkConfig,
        });
        if (cancelled) {
          return;
        }
        setReadmeContent(documentation.readme);
      } catch {
        if (!cancelled) {
          setReadmeContent(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingReadme(false);
        }
      }
    };

    loadReadme();
    return () => {
      cancelled = true;
    };
  }, [activeSpec, activeLanguage, activeSdkConfig]);

  const extractSectionCode = (readme: string | null, sectionName: string): string | null => {
    if (!readme) return null;
    const regex = new RegExp(`## ${sectionName}\\n+[\\s\\S]*?\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
    const match = readme.match(regex);
    return match ? match[1].trim() : null;
  };

  const extractUsageExamples = (readme: string | null): string | null => {
    if (!readme) return null;
    const regex = /## Usage Examples\n+([\s\S]*?)(?=\n## |\n$)/i;
    const match = readme.match(regex);
    if (!match) return null;

    const codeBlocks = [];
    const codeRegex = /```[a-z]*\n([\s\S]*?)\n```/gi;
    let codeMatch;
    while ((codeMatch = codeRegex.exec(match[1])) !== null) {
      codeBlocks.push(codeMatch[1].trim());
    }
    return codeBlocks.length > 0 ? codeBlocks.join('\n\n') : null;
  };

  const generatedInstallCode = extractSectionCode(readmeContent, 'Installation');
  const generatedInitCode = extractSectionCode(readmeContent, 'Quick Start');
  const generatedExampleCode = extractUsageExamples(readmeContent);

  const displayInstallCode = generatedInstallCode || activeSdk.installCommand;
  const displayInitCode = generatedInitCode || (activeSdk.importCode + '\n\n' + activeSdk.initCode);
  const displayExampleCode = generatedExampleCode || activeSdk.exampleCode;

  const handleDownloadSdk = async (sdk: SdkLanguage) => {
    if (!activeSpec || !localToolApiEnabled) {
      return;
    }

    setDownloadError(null);
    try {
      const language = normalizeSdkReferenceLanguage(sdk.id);
      const config = createGeneratedSdkToolConfig(activeSystem, language, activeSchemaUrl);
      const generatedSdkMetadata = getGeneratedSdkMetadataForSystem(activeSystem);
      const archive = await generateSdkReferenceArchive({
        spec: activeSpec,
        language,
        config,
      });
      const blob = base64ToBlob(archive.contentBase64, archive.contentType || 'application/zip');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archive.fileName
        || `${generatedSdkMetadata.packageName.replace(/^@/, '').replace(/\//g, '-')}-${language}-${generatedSdkMetadata.version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setDownloadError(error instanceof Error && error.message ? error.message : 'Failed to generate SDK.');
    }
  };

  const sidebarTree = activeSystemData ? filterReferenceSidebarTree(buildSdkReferenceSidebarTree(activeSystemData.categories), searchQuery) : [];
  const activeEndpoint = activeSystemData?.categories.flatMap(c => c.endpoints).find(e => e.id === activeEndpointId);

  const handleEndpointClick = (id: string) => {
    setActiveEndpointId(id);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setCollapsedGroups((current) => toggleReferenceSidebarGroup(current, activeSystem, categoryId));
  };

  const renderEndpointItem = (endpoint: ApiReferenceEndpoint, compact = false) => {
    const isActive = activeEndpointId === endpoint.id;
    return (
      <li key={endpoint.id}>
        <button
          onClick={() => handleEndpointClick(endpoint.id)}
          className={`w-full flex items-center gap-3 text-left px-2 py-2 text-[13px] rounded-lg transition-all ${
            compact ? 'pl-3' : ''
          } ${
            isActive
              ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 font-medium shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MethodBadge method={endpoint.method} />
          <span className="truncate">{endpoint.name}</span>
        </button>
      </li>
    );
  };

  const renderSidebarNode = (node: ApiCategorySidebarNode) => {
    const isCollapsed = isReferenceSidebarGroupCollapsed(collapsedGroups, activeSystem, node.id);
    const groupElementId = createReferenceSidebarGroupElementId('sdk-reference-sidebar-group', activeSystem, node.id);
    return (
      <div key={node.id} className="space-y-2">
        <button
          type="button"
          onClick={() => handleCategoryToggle(node.id)}
          aria-expanded={!isCollapsed}
          aria-controls={groupElementId}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-slate-900 transition-colors hover:bg-white dark:text-white dark:hover:bg-white/5"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
              isCollapsed ? '' : 'rotate-90'
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {node.totalEndpoints}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              id={groupElementId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="space-y-2 overflow-hidden"
            >
              {node.endpoints.length > 0 && (
                <ul className="space-y-0.5">
                  {node.endpoints.map((endpoint) => renderEndpointItem(endpoint))}
                </ul>
              )}
              {node.children.map((child) => renderSidebarChildNode(child, 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSidebarChildNode = (node: ApiCategorySidebarNode, depth: number) => {
    const isCollapsed = isReferenceSidebarGroupCollapsed(collapsedGroups, activeSystem, node.id);
    const groupElementId = createReferenceSidebarGroupElementId('sdk-reference-sidebar-subgroup', activeSystem, node.id);
    return (
      <div key={node.id} className="space-y-1">
        <button
          type="button"
          onClick={() => handleCategoryToggle(node.id)}
          aria-expanded={!isCollapsed}
          aria-controls={groupElementId}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${
              isCollapsed ? '' : 'rotate-90'
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {node.totalEndpoints}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              id={groupElementId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="space-y-2 overflow-hidden"
            >
              {node.endpoints.length > 0 && (
                <ul className="space-y-0.5">
                  {node.endpoints.map((endpoint) => renderEndpointItem(endpoint))}
                </ul>
              )}
              {node.children.map((child) => renderSidebarChildNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20 bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20 bg-white dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('sdk.loadError.title', 'Failed to load SDK schema')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('sdk.loadError.description', 'The backend service may be starting up or temporarily unavailable. Please try again.')}
          </p>
          <button
            onClick={loadSdkData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {t('sdk.loadError.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pt-20 bg-white dark:bg-[#0a0a0a]">

      {/* Sub-header Tabs for API Systems */}
      <div className="sticky top-[56px] z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="w-full mx-auto px-4 md:px-6 lg:px-8 flex items-center gap-8 overflow-x-auto custom-scrollbar">
          {apiData.map((system) => {
            const Icon = system.icon;
            const isActive = activeSystem === system.id;
            return (
              <button
                key={system.id}
                onClick={() => {
                  setActiveSystem(system.id);
                  setActiveEndpointId('overview');
                }}
                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {getApiSystemDisplayName(system)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar */}
        <aside
          className="relative w-full shrink-0 border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-[#0a0a0a] md:sticky md:top-[111px] md:h-[calc(100vh-111px)] md:w-[360px] md:max-w-[360px] md:basis-[360px] md:border-b-0 md:border-r"
        >
          <div className="md:h-full overflow-y-auto custom-scrollbar py-6 px-6 md:py-8">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('sdk.searchPlaceholder', 'Search endpoints...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4">
                <button
                  onClick={() => handleEndpointClick('overview')}
                  className={`w-full flex items-center gap-3 px-2 py-2 text-[13px] rounded-lg transition-all ${
                    activeEndpointId === 'overview'
                      ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 font-medium shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="truncate">{t('common.actions.sdkOverview')}</span>
                </button>
              </div>
            </div>

            {/* Categories and Endpoints */}
            <div className="flex-1 mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSystem}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 pb-8"
                >
                  {sidebarTree.length === 0 && searchQuery ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      {t('sdk.notFound', 'No endpoints found.')}
                    </div>
                  ) : (
                    sidebarTree.map((node) => renderSidebarNode(node))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* SDK Languages Tabs */}
          <div className="sticky top-[111px] z-30 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-3 shrink-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {sdkData.map(sdk => {
                  const isActive = activeSdkId === sdk.id;
                  const Icon = IconMap[sdk.icon] || Box;
                  return (
                    <button
                      key={sdk.id}
                      onClick={() => setActiveSdkId(sdk.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {sdk.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={activeSdk.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  GitHub
                </a>
                {activeSpec && localToolApiEnabled && isGeneratedSdkArchiveLanguage(activeSdk.id) && (
                  <button
                    onClick={() => handleDownloadSdk(activeSdk)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('common.actions.download')}
                  </button>
                )}
              </div>
            </div>
            {downloadError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
          {activeEndpointId === 'overview' ? (
          <div className="px-4 md:px-6 lg:px-8 py-8 md:py-12 pb-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSystem}-${activeSdk.id}-overview`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-12"
              >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      {React.createElement(IconMap[activeSdk.icon] || Box, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" })}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {activeSdk.name} SDK
                    </h1>
                  </div>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeSdk.description}
                </p>
              </div>

              {/* Installation */}
              <section>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-slate-400" />
                  Installation
                </h2>
                <div className="relative group">
                  <div className="absolute right-3 top-3">
                    <CopyButton
                      text={displayInstallCode}
                      label={t('common.actions.copyInstallation')}
                      copiedLabel={t('common.actions.copied')}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      disabled={loadingReadme}
                      title={t('common.actions.copyInstallation')}
                    />
                  </div>
                  <pre className={`bg-slate-50 text-slate-700 dark:bg-[#0d1117] dark:text-slate-300 p-6 rounded-2xl overflow-x-auto text-sm font-mono border border-slate-200 dark:border-slate-800 transition-opacity duration-300 ${loadingReadme ? 'opacity-50' : 'opacity-100'}`}>
                    <code>{loadingReadme ? 'Loading...' : displayInstallCode}</code>
                  </pre>
                </div>
              </section>

              {/* Initialization */}
              <section>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  Initialization
                </h2>
                <div className="relative group">
                  <div className="absolute right-3 top-3">
                    <CopyButton
                      text={displayInitCode}
                      label={t('common.actions.copyInitialization')}
                      copiedLabel={t('common.actions.copied')}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      disabled={loadingReadme}
                      title={t('common.actions.copyInitialization')}
                    />
                  </div>
                  <pre className={`bg-slate-50 text-slate-700 dark:bg-[#0d1117] dark:text-slate-300 p-6 rounded-2xl overflow-x-auto text-sm font-mono border border-slate-200 dark:border-slate-800 transition-opacity duration-300 ${loadingReadme ? 'opacity-50' : 'opacity-100'}`}>
                    <code>
                      {loadingReadme ? 'Loading...' : displayInitCode}
                    </code>
                  </pre>
                </div>
              </section>

              {/* Example Usage */}
              <section>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-slate-400" />
                  Example Usage
                </h2>
                <div className="relative group">
                  <div className="absolute right-3 top-3">
                    <CopyButton
                      text={displayExampleCode}
                      label={t('common.actions.copyExample')}
                      copiedLabel={t('common.actions.copied')}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      disabled={loadingReadme}
                      title={t('common.actions.copyExample')}
                    />
                  </div>
                  <pre className={`bg-slate-50 text-slate-700 dark:bg-[#0d1117] dark:text-slate-300 p-6 rounded-2xl overflow-x-auto text-sm font-mono border border-slate-200 dark:border-slate-800 transition-opacity duration-300 ${loadingReadme ? 'opacity-50' : 'opacity-100'}`}>
                    <code>{loadingReadme ? 'Loading...' : displayExampleCode}</code>
                  </pre>
                </div>
              </section>

              </motion.div>
            </AnimatePresence>
          </div>
          ) : (
            activeEndpoint && activeSdkConfig && activeSystemData && (
              <SdkEndpointView
                key={activeEndpoint.id}
                endpoint={activeEndpoint}
                requestBaseUrl={activeSystemData.requestBaseUrl}
                sdkData={activeSdkConfig}
                language={activeSdk.id}
                sdkConfig={activeSdkConfig}
                spec={activeSpec}
              />
            )
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

function base64ToBlob(contentBase64: string, contentType: string): Blob {
  const binary = atob(contentBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: contentType });
}
