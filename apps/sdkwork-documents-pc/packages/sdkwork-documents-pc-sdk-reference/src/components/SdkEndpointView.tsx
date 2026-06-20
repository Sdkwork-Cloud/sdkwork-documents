import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/documents-pc-commons';
import { ApiPlayground } from '@sdkwork/documents-pc-api-reference';
import type { ApiParameter } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import type { ApiReferenceEndpoint } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import type { OpenApiDocument } from '@sdkwork/documents-pc-api-reference/openapiTypes';
import {
  buildSdkEndpointDocumentation,
  type SdkEndpointData,
} from '../sdkEndpointDocumentation';
import {
  generateSdkReferenceDocumentation,
  type SdkReferenceDocumentationResponse,
} from '../sdkReferenceGenerationService';
import type { GeneratedSdkToolConfig } from '../sdkReferenceRuntime';
import { normalizeSdkReferenceLanguage } from '../sdkReferenceRuntime';

interface SdkEndpointViewProps {
  endpoint: ApiReferenceEndpoint;
  requestBaseUrl: string;
  sdkData: SdkEndpointData;
  language: string;
  sdkConfig: GeneratedSdkToolConfig;
  spec: OpenApiDocument | null;
}

interface FlattenedSdkParameter {
  parameter: ApiParameter;
  path: string;
}

function flattenSdkParameters(parameters: ApiParameter[] = [], parentPath = ''): FlattenedSdkParameter[] {
  return parameters.flatMap((parameter) => {
    const name = parentPath && parameter.name === '*'
      ? `${parentPath}.*`
      : parentPath
        ? `${parentPath}.${parameter.name}`
        : parameter.name;
    const path = parameter.type.startsWith('array<') && parameter.children?.length
      ? `${name}[]`
      : name;
    return [
      { parameter, path },
      ...flattenSdkParameters(parameter.children ?? [], path),
    ];
  });
}

export function SdkEndpointView({ endpoint, requestBaseUrl, sdkData, language, sdkConfig, spec }: SdkEndpointViewProps) {
  const { t } = useTranslation();
  const [showPlayground, setShowPlayground] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<SdkReferenceDocumentationResponse | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const normalizedLanguage = normalizeSdkReferenceLanguage(language);
  const localDocumentation = buildSdkEndpointDocumentation(endpoint, sdkData, normalizedLanguage);

  useEffect(() => {
    if (!spec) {
      setGeneratedDocs(null);
      return;
    }

    let cancelled = false;
    const fetchDocumentation = async () => {
      setLoadingDocs(true);
      try {
        const result = await generateSdkReferenceDocumentation({
          spec,
          language: normalizedLanguage,
          config: {
            ...sdkConfig,
            endpointPath: endpoint.path,
            endpointMethod: endpoint.method,
            operationId: endpoint.openApiOperation?.operationId,
          },
        });
        if (!cancelled) {
          setGeneratedDocs(result);
        }
      } catch {
        if (!cancelled) {
          setGeneratedDocs(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDocs(false);
        }
      }
    };

    fetchDocumentation();
    return () => {
      cancelled = true;
    };
  }, [
    spec,
    normalizedLanguage,
    sdkConfig,
    endpoint.path,
    endpoint.method,
    endpoint.openApiOperation?.operationId,
  ]);

  const codeDefinition = generatedDocs?.methodDefinition || localDocumentation.codeDefinition;
  const exampleUsage = generatedDocs?.usageExample || localDocumentation.exampleUsage;
  const methodName = localDocumentation.methodName;

  return (
    <div className="w-full px-4 md:px-8 py-8 md:py-12 pb-32 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
              {endpoint.method}
            </span>
            <code className="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-white/5 font-mono text-slate-700 dark:text-slate-300">
              {endpoint.path}
            </code>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {endpoint.name}
          </h1>
        </div>
        <div>
          <button
            onClick={() => setShowPlayground(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            {t('common.actions.tryItOut')}
          </button>
        </div>
      </div>

      {/* CODE DEFINITION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="text-emerald-500">{'</>'}</span> CODE DEFINITION
          </h3>
          <CopyButton
            text={codeDefinition}
            label={t('common.actions.copy')}
            copiedLabel={t('common.actions.copied')}
            variant="inline"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
            iconClassName="w-3.5 h-3.5"
          />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-[#1e1e1e]">
          <div className="px-4 py-2 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2 py-1 rounded uppercase">{localDocumentation.languageLabel}</span>
            {loadingDocs && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </div>
          <pre className={`p-6 overflow-x-auto text-sm font-mono leading-relaxed text-slate-700 dark:text-slate-300 transition-opacity duration-300 ${loadingDocs ? 'opacity-50' : 'opacity-100'}`}>
            {codeDefinition}
          </pre>
        </div>
      </div>

      {/* EXAMPLE USAGE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="text-amber-500">{'{ }'}</span> EXAMPLE USAGE
          </h3>
          <CopyButton
            text={exampleUsage}
            label={t('common.actions.copy')}
            copiedLabel={t('common.actions.copied')}
            variant="inline"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/10 rounded-md px-2 py-1 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
            iconClassName="w-3.5 h-3.5"
          />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-[#1e1e1e]">
          <pre className={`p-6 overflow-x-auto text-sm font-mono leading-relaxed text-slate-700 dark:text-slate-300 transition-opacity duration-300 ${loadingDocs ? 'opacity-50' : 'opacity-100'}`}>
            {exampleUsage}
          </pre>
        </div>
      </div>

      {/* PARAMETERS AND RETURNS */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
          <span className="text-blue-500">{'>_'}</span> PARAMETERS AND RETURNS
        </h3>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#111]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-4 bg-slate-50 dark:bg-white/5">
            <span className="font-bold text-slate-900 dark:text-white">{methodName}</span>
            <span className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">Function</span>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-3 font-medium text-slate-500 w-1/4">PARAMETER</th>
                <th className="px-6 py-3 font-medium text-slate-500 w-1/4">TYPE</th>
                <th className="px-6 py-3 font-medium text-slate-500 w-1/8">REQUIRED</th>
                <th className="px-6 py-3 font-medium text-slate-500">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {localDocumentation.parameters.length > 0 ? (
                flattenSdkParameters(localDocumentation.parameters).map((row) => (
                  <SdkParameterRow key={row.path} parameter={row.parameter} path={row.path} />
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    This method does not define a JSON request body.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 dark:border-white/10 border-double border-t-2">
              <tr>
                <td colSpan={1} className="px-6 py-4 font-medium text-slate-500">RETURNS</td>
                <td colSpan={3} className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-right">{localDocumentation.responseType}</td>
              </tr>
            </tfoot>
          </table>
          {localDocumentation.returns.length > 0 && (
            <div className="border-t border-slate-200 dark:border-white/10 px-6 py-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Return Fields</div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-white/5 dark:border-white/10">
                {flattenSdkParameters(localDocumentation.returns).map(({ parameter, path }) => (
                  <div key={path} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_2fr]">
                    <code className="font-semibold text-teal-600 dark:text-teal-400">{path}</code>
                    <code className="text-emerald-600 dark:text-emerald-400">{parameter.type}</code>
                    <span className="text-slate-600 dark:text-slate-400">{parameter.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playground Drawer */}
      <AnimatePresence>
        {showPlayground && (
          <ApiPlayground
            endpoint={endpoint}
            requestBaseUrl={requestBaseUrl}
            onClose={() => setShowPlayground(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function SdkParameterRow({ parameter, path }: { parameter: ApiParameter; path: string }) {
  return (
    <tr>
      <td className="px-6 py-4 font-mono font-bold text-amber-600 dark:text-amber-400">{path}</td>
      <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400">{parameter.type}</td>
      <td className="px-6 py-4">
        {parameter.required ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">YES</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">NO</span>
        )}
      </td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{parameter.desc}</td>
    </tr>
  );
}
