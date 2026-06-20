import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiPlayground } from './ApiPlayground';
import { CopyButton, JsonSyntaxHighlight } from '@sdkwork/documents-pc-commons';
import { resolveDocumentsRuntimeBoolean } from '@sdkwork/documents-pc-commons/runtime';
import {
  buildStaticCodeSnippet,
  CODEGEN_LANGUAGES,
  CodegenLanguage,
  generateCodeSnippet,
  getDefaultLibrary,
  getLibraries,
  joinRequestUrl,
} from '../codeSnippetClient';
import type { ApiParameter } from '../openapiTypes';
import type { ApiReferenceEndpoint } from '../openapiTypes';

const localToolApiEnabled = resolveDocumentsRuntimeBoolean('VITE_TOOL_API_ENABLED', false);

interface ApiEndpointProps {
  endpoint: ApiReferenceEndpoint;
  requestBaseUrl: string;
}

const ParameterRow: React.FC<{ param: ApiParameter, depth?: number, isResponse?: boolean, isLast?: boolean }> = ({ param, depth = 0, isResponse = false, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = param.children && param.children.length > 0;
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* Tree lines for nested items */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10"
          style={{ left: `${(depth - 1) * 1.5 + 0.75}rem` }}
        />
      )}
      {depth > 0 && (
        <div
          className="absolute top-5 h-px bg-slate-200 dark:bg-white/10"
          style={{ left: `${(depth - 1) * 1.5 + 0.75}rem`, width: '0.75rem' }}
        />
      )}

      <div
        className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-4 border-b border-slate-100 dark:border-white/5 ${isLast && !isExpanded ? 'border-b-0' : ''} ${hasChildren ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors rounded-lg -mx-2 px-2' : ''}`}
        style={{ paddingLeft: depth === 0 ? '0' : `${depth * 1.5 + 1.5}rem` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="w-full sm:w-1/3 shrink-0 flex items-center gap-2 mt-0.5">
          {hasChildren && (
            <button className="p-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 transition-colors">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          {!hasChildren && <div className="w-4.5" />} {/* Spacer for alignment */}

          <code className={`text-[13px] font-mono font-semibold ${isResponse ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
            {param.name}
          </code>

          <code className="text-[12px] font-mono text-slate-500 dark:text-slate-400 ml-1">
            {param.type}
          </code>
        </div>

        <div className="w-full sm:w-2/3 flex flex-col gap-1.5 pl-6 sm:pl-0">
          {param.required && !isResponse && (
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Required
            </span>
          )}
          <div className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {param.desc}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col">
              {param.children!.map((child, i) => (
                <ParameterRow
                  key={`${child.name}-${depth + 1}-${i}`}
                  param={child}
                  depth={depth + 1}
                  isResponse={isResponse}
                  isLast={i === param.children!.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FlattenedParameterRow {
  param: ApiParameter;
  depth: number;
  path: string;
}

function flattenApiParameters(parameters: ApiParameter[] = [], depth = 0, parentPath = ''): FlattenedParameterRow[] {
  return parameters.flatMap((param) => {
    const path = parentPath ? `${parentPath}.${param.name}` : param.name;
    return [
      { param, depth, path },
      ...flattenApiParameters(param.children ?? [], depth + 1, path),
    ];
  });
}

function ParameterTable({ parameters, isResponse = false }: { parameters: ApiParameter[]; isResponse?: boolean }) {
  const rows = flattenApiParameters(parameters);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="border-b border-slate-200 dark:border-white/10">
            <th className="w-[30%] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
            <th className="w-[24%] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
            <th className="w-[14%] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Required</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.length > 0 ? (
            rows.map(({ param, depth, path }) => (
              <tr key={path} className="align-top">
                <td className="px-4 py-3">
                  <code
                    className={`font-mono text-[13px] font-semibold ${isResponse ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}
                    style={{ paddingLeft: depth > 0 ? `${depth * 1.25}rem` : 0 }}
                  >
                    {param.name}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <code className="font-mono text-[12px] text-emerald-600 dark:text-emerald-400">{param.type}</code>
                </td>
                <td className="px-4 py-3">
                  {param.required ? (
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">YES</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">NO</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{param.desc}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                {isResponse
                  ? 'No response parameters are defined for this response object.'
                  : 'No request parameters are defined for this request object.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ApiEndpointView({ endpoint, requestBaseUrl }: ApiEndpointProps) {
  const { t } = useTranslation();
  const responseProperties = endpoint.responseProperties ?? [];
  const hasResponseDocumentation = Boolean(
    endpoint.responseStatus
    || endpoint.responseContentType
    || endpoint.responseObject
    || endpoint.responseType
    || endpoint.response
    || responseProperties.length > 0,
  );

  const [selectedLang, setSelectedLang] = useState<CodegenLanguage>('typescript');
  const [selectedLib, setSelectedLib] = useState<string>('axios');
  const [generatedCode, setGeneratedCode] = useState(endpoint.curl);
  const requestUrl = useMemo(
    () => joinRequestUrl(requestBaseUrl, endpoint.path),
    [endpoint.path, requestBaseUrl],
  );

  const [showPlayground, setShowPlayground] = useState(false);

  const langScrollRef = useRef<HTMLDivElement>(null);
  const langRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const scrollToActiveTab = (lang: string) => {
    const container = langScrollRef.current;
    const activeTab = langRefs.current[lang];

    if (container && activeTab) {
      const scrollLeft = activeTab.offsetLeft - container.clientWidth / 2 + activeTab.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToActiveTab(selectedLang);
  }, [selectedLang]);

  // Update lib when lang changes
  useEffect(() => {
    const libs = getLibraries(selectedLang);
    if (libs.length > 0 && !libs.includes(selectedLib)) {
      setSelectedLib(libs[0]);
    }
  }, [selectedLang, selectedLib]);

  useEffect(() => {
    let cancelled = false;
    const request = {
      path: endpoint.path,
      method: endpoint.method.toLowerCase(),
      operation: endpoint.openApiOperation || {},
      pathItem: endpoint.openApiPathItem || {},
      baseUrl: requestBaseUrl,
      language: selectedLang,
      library: selectedLib,
      openAPISpec: endpoint.openApiSpec || {},
    };
    const fallbackCode = buildStaticCodeSnippet(request);

    if (!endpoint.openApiOperation || !endpoint.openApiSpec) {
      setGeneratedCode(endpoint.curl || fallbackCode);
      return () => {
        cancelled = true;
      };
    }

    setGeneratedCode(fallbackCode);
    if (!localToolApiEnabled) {
      return () => {
        cancelled = true;
      };
    }

    generateCodeSnippet(request).then((code) => {
      if (!cancelled) {
        setGeneratedCode(code);
      }
    })
      .catch(() => {
        if (!cancelled) {
          setGeneratedCode(fallbackCode);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    endpoint.curl,
    endpoint.method,
    endpoint.openApiOperation,
    endpoint.openApiPathItem,
    endpoint.openApiSpec,
    endpoint.path,
    selectedLang,
    selectedLib,
  ]);

  const getFileExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'node':
        return 'js';
      case 'typescript':
        return 'ts';
      case 'python':
        return 'py';
      case 'java':
        return 'java';
      case 'csharp':
      case 'c#':
        return 'cs';
      case 'go':
        return 'go';
      case 'ruby':
        return 'rb';
      case 'php':
        return 'php';
      case 'swift':
        return 'swift';
      case 'kotlin':
        return 'kt';
      case 'rust':
        return 'rs';
      case 'dart':
        return 'dart';
      case 'shell':
      case 'bash':
      case 'curl':
        return 'sh';
      default:
        return 'txt';
    }
  };


  return (
    <motion.div
      key={endpoint.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-full"
    >
      <div className="mb-10">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            {endpoint.name}
          </h2>
          {!showPlayground && (
            <button
              onClick={() => setShowPlayground(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Play className="w-4 h-4" />
              {t('api.tryItOut', 'Try it out')}
            </button>
          )}
        </div>
        <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed max-w-3xl">
          {endpoint.description}
        </p>

        <AnimatePresence mode="wait">
          {showPlayground ? (
            <motion.div
              key="playground"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ApiPlayground
                endpoint={endpoint}
                requestBaseUrl={requestBaseUrl}
                onClose={() => setShowPlayground(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 group"
            >
              <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded ${
                endpoint.method === 'POST' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                endpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                endpoint.method === 'DELETE' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                'bg-slate-500/10 text-slate-600 dark:text-slate-400'
              }`}>
                {endpoint.method}
              </span>
              <code className="text-[13px] font-mono text-slate-900 dark:text-white font-medium select-all">
                {requestUrl}
              </code>
              <CopyButton
                text={requestUrl}
                label={t('common.actions.copyUrl')}
                copiedLabel={t('common.actions.urlCopied')}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-slate-200 dark:hover:bg-white/10"
                iconClassName="w-3.5 h-3.5"
                title={t('common.actions.copyUrl')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16">
        {/* Left Column: Parameters */}
        <div className="space-y-12">
          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
                {t('api.requestParameters', 'Request Parameters')}
              </h3>
              <div className="flex flex-col">
                {endpoint.body.map((param, i) => (
                  <ParameterRow key={i} param={param} depth={0} isResponse={false} isLast={i === endpoint.body.length - 1} />
                ))}
              </div>
            </div>
          )}

          {hasResponseDocumentation && (
            <div>
              <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {t('api.responseProperties', 'Response Properties')}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Response Object</span>
                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-800 dark:bg-white/10 dark:text-slate-200">
                    {endpoint.responseObject || endpoint.responseType || 'Record<string, unknown>'}
                  </code>
                  {endpoint.responseStatus && (
                    <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {endpoint.responseStatus}
                    </span>
                  )}
                  {endpoint.responseContentType && (
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {endpoint.responseContentType}
                    </code>
                  )}
                </div>
              </div>
              <ParameterTable parameters={responseProperties} isResponse={true} />
            </div>
          )}
        </div>

        {/* Right Column: Code Examples */}
        <div className="space-y-8 xl:sticky xl:top-[110px] xl:self-start">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('api.request', 'Request')}</h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-lg dark:border-white/10 dark:bg-[#0d1117]">
              <div className="flex flex-col bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5 relative">
                <div className="flex items-center bg-white dark:bg-[#010409]">
                  <div
                    ref={langScrollRef}
                    className="flex items-center overflow-x-auto hide-scrollbar scroll-smooth w-full relative"
                  >
                    {CODEGEN_LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        ref={(el) => { langRefs.current[lang] = el; }}
                        onClick={() => {
                          setSelectedLang(lang);
                          setSelectedLib(getDefaultLibrary(lang));
                        }}
                        className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors relative ${
                          selectedLang === lang
                            ? 'text-slate-900 bg-slate-100 rounded-t-lg dark:text-white dark:bg-[#161b22]'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
                        }`}
                      >
                        {lang}
                        {selectedLang === lang && (
                          <motion.div
                            layoutId="activeLangTab"
                            className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 rounded-t-lg"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                    {getLibraries(selectedLang).map((lib) => (
                      <button
                        key={lib}
                        onClick={() => setSelectedLib(lib)}
                        className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                          selectedLib === lib
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:bg-white/5 dark:text-slate-400 dark:border-transparent dark:hover:bg-white/10 dark:hover:text-slate-300'
                        }`}
                      >
                        {lib}
                      </button>
                    ))}
                  </div>
                  <CopyButton
                    text={generatedCode}
                    label={t('common.actions.copyCode')}
                    copiedLabel={t('common.actions.codeCopied')}
                    className="p-1.5 shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-md transition-colors ml-2"
                    title={t('common.actions.copyCode')}
                  />
                </div>
              </div>
              <div className="p-5 overflow-x-auto custom-scrollbar">
                <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('api.response', 'Response')}</h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-lg dark:border-white/10 dark:bg-[#0d1117]">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5">
                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">JSON</span>
                <CopyButton
                  text={endpoint.response}
                  label={t('common.actions.copyResponse')}
                  copiedLabel={t('common.actions.responseCopied')}
                  className="p-1.5 -mr-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-md transition-colors"
                  title={t('common.actions.copyResponse')}
                />
              </div>
              <div className="p-5 overflow-x-auto custom-scrollbar max-h-[400px] text-slate-700 dark:text-slate-300">
                <pre className="text-[13px] font-mono leading-[21px] whitespace-pre-wrap break-all">
                  {endpoint.response ? <JsonSyntaxHighlight value={endpoint.response} /> : null}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
