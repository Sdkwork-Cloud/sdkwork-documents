import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, X, CheckCircle2, XCircle, Trash2, Wand2, Eraser, AlertCircle, Database, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CopyButton, JsonSyntaxHighlight, resolvePlaygroundUserAgent, useDocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons';
import {
  buildPortalAuthLoginRedirect,
  getStoredAppSessionAccessToken,
  getStoredAppSessionAuthToken,
  hasStoredPortalSession,
} from '@sdkwork/documents-pc-commons/runtime';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiPlaygroundParamsTable } from './ApiPlaygroundParamsTable';
import type { ParamRow } from '../apiPlaygroundRows';
import {
  createApiPlaygroundInitialState,
  createApiPlaygroundInitialStateKey,
  makeApiPlaygroundEmptyRow,
  parseApiPlaygroundBulkRows,
} from '../apiPlaygroundRows';
import { buildPlaygroundRequest, buildPlaygroundUrl } from '../playgroundRequest';
import type { PlaygroundResponse } from '../playgroundRequest';
import { downloadApiPlaygroundResponse, serializeApiPlaygroundResponseData } from '../playgroundResponseDownload';
import type { ApiReferenceEndpoint } from '../openapiTypes';
import type { OpenApiParameter, OpenApiRequestBody } from '../openapiTypes';

interface ApiPlaygroundProps {
  endpoint: ApiReferenceEndpoint;
  requestBaseUrl: string;
  onClose: () => void;
}

export function ApiPlayground({ endpoint, requestBaseUrl, onClose }: ApiPlaygroundProps) {
  const { t } = useTranslation();
  const documentsRuntime = useDocumentsReferenceRuntime();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params');
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers'>('body');
  const [responseViewMode, setResponseViewMode] = useState<'pretty' | 'raw'>('pretty');

  // Extract parameters
  const parameters = React.useMemo<OpenApiParameter[]>(() => endpoint.openApiOperation?.parameters || [], [endpoint.openApiOperation]);
  const requestBody = React.useMemo<OpenApiRequestBody | undefined>(() => endpoint.openApiOperation?.requestBody, [endpoint.openApiOperation]);

  const initialStateKey = createApiPlaygroundInitialStateKey(endpoint);
  const initialState = React.useMemo(() => createApiPlaygroundInitialState(endpoint), [initialStateKey]);
  const [queryParams, setQueryParams] = useState<ParamRow[]>(() => initialState.queryParams);
  const [pathParams, setPathParams] = useState<ParamRow[]>(() => initialState.pathParams);
  const [headerParams, setHeaderParams] = useState<ParamRow[]>(() => initialState.headerParams);
  const [bodyValue, setBodyValue] = useState<string>(() => initialState.bodyValue);
  const [authType, setAuthType] = useState<'current_user' | 'api_key'>('current_user');
  const [apiKey, setApiKey] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showHiddenHeaders, setShowHiddenHeaders] = useState(false);

  const hiddenHeaders = [
    { key: 'Accept', value: '*/*' },
    { key: 'Accept-Encoding', value: 'gzip, deflate, br' },
    { key: 'Connection', value: 'keep-alive' },
    { key: 'Content-Type', value: 'application/json' },
    { key: 'User-Agent', value: resolvePlaygroundUserAgent(documentsRuntime) },
  ];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const customRowSequenceRef = useRef(0);

  const nextCustomRow = (location: 'query' | 'header', enabled = false): ParamRow => {
    customRowSequenceRef.current += 1;
    return makeApiPlaygroundEmptyRow(location, customRowSequenceRef.current, enabled);
  };

  useEffect(() => {
    customRowSequenceRef.current = 0;
    setQueryParams(initialState.queryParams);
    setPathParams(initialState.pathParams);
    setHeaderParams(initialState.headerParams);
    setBodyValue(initialState.bodyValue);
    setActiveTab(initialState.activeTab);
  }, [initialState, initialStateKey]);

  const handleQueryParamChange = (id: string, field: keyof ParamRow, value: ParamRow[keyof ParamRow]) => {
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setQueryParams(prev => {
      const newParams = [...prev];
      const index = newParams.findIndex(p => p.id === id);
      if (index === -1) return prev;

      newParams[index] = { ...newParams[index], [field]: value };

      // If we edited the last (empty) row, enable it and add a new empty row
      if (index === newParams.length - 1 && (field === 'key' || field === 'value') && value !== '') {
        newParams[index].enabled = true;
        newParams.push(nextCustomRow('query'));
      }

      return newParams;
    });
  };

  const handleRemoveQueryParam = (id: string) => {
    setQueryParams(prev => prev.filter(p => p.id !== id));
  };

  const handleHeaderParamChange = (id: string, field: keyof ParamRow, value: ParamRow[keyof ParamRow]) => {
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setHeaderParams(prev => {
      const newParams = [...prev];
      const index = newParams.findIndex(p => p.id === id);
      if (index === -1) return prev;

      newParams[index] = { ...newParams[index], [field]: value };

      if (index === newParams.length - 1 && (field === 'key' || field === 'value') && value !== '') {
        newParams[index].enabled = true;
        newParams.push(nextCustomRow('header'));
      }

      return newParams;
    });
  };

  const handleRemoveHeaderParam = (id: string) => {
    setHeaderParams(prev => prev.filter(p => p.id !== id));
  };

  const handlePathParamChange = (id: string, value: string) => {
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setPathParams(prev => prev.map(p => p.id === id ? { ...p, value } : p));
  };

  const handleBeautify = () => {
    try {
      if (!bodyValue.trim()) return;
      const parsed = JSON.parse(bodyValue);
      setBodyValue(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Ignore if invalid JSON
    }
  };

  const handleSendAndDownload = async () => {
    downloadApiPlaygroundResponse(await handleSend());
  };

  const handleClear = () => {
    setBodyValue('');
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const buildUrl = () => {
    return buildPlaygroundUrl({
      baseUrl: requestBaseUrl,
      endpoint,
      pathParams,
      queryParams,
    });
  };

  const handleSend = async (): Promise<PlaygroundResponse | null> => {
    if (authType === 'current_user' && !hasStoredPortalSession()) {
      navigate(buildPortalAuthLoginRedirect(location));
      return null;
    }
    const authToken = getStoredAppSessionAuthToken();
    const accessToken = getStoredAppSessionAccessToken();
    const request = buildPlaygroundRequest({
      baseUrl: requestBaseUrl,
      endpoint,
      pathParams,
      queryParams,
      headerParams,
      bodyValue,
      authType,
      accessToken,
      apiKey,
      authToken,
    });

    if (request.ok === false) {
      setErrors(request.errors);
      setActiveTab(request.activeTab);
      setActiveResponseTab('body');
      setResponse(request.response);
      return request.response;
    }

    setLoading(true);
    setErrors({});
    setActiveResponseTab('body');
    const startTime = Date.now();
    try {
      const res = await fetch(request.url, request.requestInit);
      const endTime = Date.now();

      let data: unknown;
      const contentType = res.headers.get('content-type');
      const text = await res.text();
      const size = new Blob([text]).size;

      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      } else {
        data = text;
      }

      const responseHeaders: [string, string][] = [];
      res.headers.forEach((value, key) => {
        responseHeaders.push([key, value]);
      });

      const nextResponse = {
        status: res.status,
        statusText: res.statusText,
        time: endTime - startTime,
        size: size,
        headers: responseHeaders,
        data: data
      };
      setResponse(nextResponse);
      return nextResponse;

    } catch (error: unknown) {
      const endTime = Date.now();
      const nextResponse = {
        status: 0,
        statusText: 'Network Error',
        time: endTime - startTime,
        size: 0,
        headers: [],
        data: {
          error: unknownToErrorMessage(error),
          hint: 'This might be a CORS issue, or the server is unreachable. Check your network console for details.'
        }
      };
      setResponse(nextResponse);
      return nextResponse;
    } finally {
      setLoading(false);
    }
  };

  const methodColors: Record<string, string> = {
    GET: 'text-blue-600 dark:text-blue-400',
    POST: 'text-green-600 dark:text-green-400',
    PUT: 'text-amber-600 dark:text-amber-400',
    DELETE: 'text-red-600 dark:text-red-400',
    PATCH: 'text-purple-600 dark:text-purple-400',
  };
  const methodColor = methodColors[endpoint.method] || 'text-slate-600 dark:text-slate-400';

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-[#00c853] dark:text-[#00e676]';
    if (status >= 300 && status < 400) return 'text-[#2962ff] dark:text-[#448aff]';
    if (status >= 400 && status < 500) return 'text-[#ff6d00] dark:text-[#ff9100]';
    return 'text-[#d50000] dark:text-[#ff1744]';
  };

  const lineCount = bodyValue.split('\n').length;
  const responseBodyText = response ? serializeApiPlaygroundResponseData(response.data) : '';
  const responseBodyLineCount = Math.max(1, responseBodyText.split('\n').length);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-[101] w-full md:w-[1000px] xl:w-[1200px] max-w-[100vw] bg-white dark:bg-[#0d1117] shadow-2xl flex flex-col border-r border-slate-200 dark:border-white/10 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117]">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-sm">API Playground</span>
              </div>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">{endpoint.name}</span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded transition-colors ml-2"
            >
              <Database className="w-3.5 h-3.5" />
              {t('common.actions.saveResponse')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title={t('common.actions.closeDrawer')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117]">
          <div className="flex items-stretch bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-white/20 rounded-md overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-[#006ce5] focus-within:border-[#006ce5] transition-all">
            <div className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider border-r border-slate-300 dark:border-white/20 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${methodColor}`}>
              {endpoint.method}
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </div>
            <div className="flex-1 flex items-center px-4 py-2.5 text-[14px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto hide-scrollbar bg-transparent select-all">
              {buildUrl()}
            </div>
            <CopyButton
              text={buildUrl()}
              label={t('common.actions.copyUrl')}
              copiedLabel={t('common.actions.urlCopied')}
              className="px-3 py-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center border-r border-slate-300 dark:border-white/20 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
              title={t('common.actions.copyUrl')}
            />
            <div className="flex shrink-0 relative group/send">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="px-6 py-2.5 bg-[#006ce5] hover:bg-[#005bb5] text-white text-[13px] font-semibold transition-colors flex items-center gap-2 disabled:opacity-70 rounded-l"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {t('common.actions.send')}
              </button>
              <button
                type="button"
                disabled={loading}
                aria-label={t('common.actions.openSendOptions')}
                className="px-2 py-2.5 bg-[#006ce5] hover:bg-[#005bb5] text-white border-l border-white/20 transition-colors disabled:opacity-70 flex items-center justify-center rounded-r"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/10 rounded-md shadow-lg opacity-0 invisible group-hover/send:opacity-100 group-hover/send:visible group-focus-within/send:opacity-100 group-focus-within/send:visible transition-all z-50 py-1">
                <button
                  type="button"
                  onClick={handleSendAndDownload}
                  className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  {t('common.actions.sendAndDownload')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Request Tabs */}
        <div className="flex items-center px-6 pt-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117] gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('params')}
            className={`py-2.5 text-[13px] font-semibold border-b-2 transition-colors relative ${activeTab === 'params' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('common.actions.params')}
            {parameters.filter((p) => p.in === 'query' || p.in === 'path').length > 0 && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'params' ? 'bg-[#ff6c37]/10 text-[#ff6c37]' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{parameters.filter((p) => p.in === 'query' || p.in === 'path').length}</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`py-2.5 text-[13px] font-semibold border-b-2 transition-colors relative ${activeTab === 'headers' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('common.actions.headers')}
            {headerParams.filter(p => p.enabled && p.key).length > 0 && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'headers' ? 'bg-[#ff6c37]/10 text-[#ff6c37]' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{headerParams.filter(p => p.enabled && p.key).length}</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'auth' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('common.actions.authorization')}
          </button>
          {requestBody && (
            <button
              type="button"
              onClick={() => setActiveTab('body')}
              className={`py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'body' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
            {t('common.actions.body')}
            </button>
          )}
        </div>

        {/* Request Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#0d1117] custom-scrollbar">
          {activeTab === 'params' && (
            <div className="space-y-8">
              <ApiPlaygroundParamsTable
                title="Query Params"
                params={queryParams}
                errors={errors}
                onChange={handleQueryParamChange}
                onRemove={handleRemoveQueryParam}
                onBulkEdit={(text) => {
                  setQueryParams(parseApiPlaygroundBulkRows(text, 'query'));
                }}
              />
              <ApiPlaygroundParamsTable
                title="Path Variables"
                params={pathParams}
                errors={errors}
                onChange={(id, field, value) => {
                  if (field === 'value' && typeof value === 'string') {
                    handlePathParamChange(id, value);
                  }
                }}
                onRemove={() => {}}
                hideEnabled={true}
              />
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="space-y-8">
              <ApiPlaygroundParamsTable
                title="Headers"
                params={headerParams}
                errors={errors}
                onChange={handleHeaderParamChange}
                onRemove={handleRemoveHeaderParam}
                onBulkEdit={(text) => {
                  setHeaderParams(parseApiPlaygroundBulkRows(text, 'header'));
                }}
              />

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowHiddenHeaders(!showHiddenHeaders)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-md"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHiddenHeaders ? 'rotate-180' : ''}`} />
                  <span>{hiddenHeaders.length} {t('common.actions.hidden')}</span>
                </button>

                {showHiddenHeaders && (
                  <div className="mt-3 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden opacity-70">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161b22]">
                          <th className="w-10 px-2 py-2 border-r border-slate-200 dark:border-white/10 text-center"></th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 w-[30%]">Key</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 w-[30%]">Value</th>
                          <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 w-[40%]">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hiddenHeaders.map((h, i) => (
                          <tr key={i} className="border-b border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-[#161b22]/30">
                            <td className="px-2 py-1.5 border-r border-slate-200 dark:border-white/10 text-center align-middle">
                              <input type="checkbox" checked disabled className="rounded border-slate-300 text-blue-600 opacity-50 cursor-not-allowed" />
                            </td>
                            <td className="border-r border-slate-200 dark:border-white/10 p-0">
                              <input type="text" value={h.key} readOnly className="w-full h-full px-3 py-2 text-[13px] bg-transparent font-mono text-slate-700 dark:text-slate-300 cursor-default" />
                            </td>
                            <td className="border-r border-slate-200 dark:border-white/10 p-0">
                              <input type="text" value={h.value} readOnly className="w-full h-full px-3 py-2 text-[13px] bg-transparent font-mono text-slate-700 dark:text-slate-300 cursor-default" />
                            </td>
                            <td className="p-0">
                              <input type="text" value="Auto-generated" readOnly className="w-full h-full px-3 py-2 text-[13px] bg-transparent text-slate-500 cursor-default italic" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="max-w-xl">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Auth Type</label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as 'current_user' | 'api_key')}
                  className="w-full max-w-[280px] bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006ce5] transition-shadow cursor-pointer"
                >
                  <option value="current_user">Current Logged-in User</option>
                  <option value="api_key">Bearer Token</option>
                </select>
              </div>

              {authType === 'api_key' ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg mb-4">
                    <p className="text-[13px] text-amber-800 dark:text-amber-400/90 leading-relaxed">
                      The token will be sent in the <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded">Authorization</code> header as a Bearer token.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Token</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API Key (sk-...)"
                      className="w-full bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006ce5] font-mono transition-shadow"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-[#006ce5] dark:text-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Using Current Session</h5>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Requests will be automatically authenticated using your current login session. The system will include your session cookies and any stored access tokens automatically. No manual key entry is required.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'body' && requestBody && (
            <div className="h-full flex flex-col border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
                      <input type="radio" name="bodyType" disabled className="w-3 h-3" /> none
                    </label>
                    <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
                      <input type="radio" name="bodyType" disabled className="w-3 h-3" /> form-data
                    </label>
                    <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
                      <input type="radio" name="bodyType" disabled className="w-3 h-3" /> x-www-form-urlencoded
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-900 dark:text-white font-medium">
                      <input type="radio" name="bodyType" checked readOnly className="w-3 h-3 accent-[#ff6c37]" /> raw
                    </label>
                    <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
                      <input type="radio" name="bodyType" disabled className="w-3 h-3" /> binary
                    </label>
                    <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
                      <input type="radio" name="bodyType" disabled className="w-3 h-3" /> GraphQL
                    </label>
                  </div>
                  <div className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-1"></div>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                  >
                    JSON <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleBeautify}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                      title={t('common.actions.formatJson')}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                      {t('common.actions.beautify')}
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-1"></div>
                  <CopyButton
                    text={bodyValue}
                    label={t('common.actions.copy')}
                    copiedLabel={t('common.actions.copied')}
                    variant="inline"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                    iconClassName="w-3.5 h-3.5"
                    title={t('common.actions.copyToClipboard')}
                  />
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                    title={t('common.actions.clearBody')}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    {t('common.actions.clear')}
                  </button>
                </div>
              </div>
              <div className={`flex-1 relative bg-white dark:bg-[#0d1117] flex min-h-[200px] ${errors['body'] ? 'ring-2 ring-inset ring-red-500 bg-red-50/10 dark:bg-red-900/10' : ''}`}>
                {/* Visual line numbers gutter */}
                <div
                  ref={lineNumbersRef}
                  className="w-10 bg-slate-50/50 dark:bg-[#161b22]/50 border-r border-slate-200 dark:border-white/10 flex flex-col items-end py-3 pr-2 text-[12px] font-mono text-slate-400 select-none overflow-hidden"
                >
                  {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                    <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={bodyValue}
                  onChange={(e) => {
                    setBodyValue(e.target.value);
                    if (errors['body']) {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next['body'];
                        return next;
                      });
                    }
                  }}
                  onScroll={handleScroll}
                  className="flex-1 w-full h-full bg-transparent p-3 text-[13px] font-mono text-slate-800 dark:text-slate-300 focus:outline-none resize-none custom-scrollbar leading-[21px]"
                  spellCheck={false}
                  wrap="off"
                />
                {errors['body'] && (
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 text-red-500 text-xs font-medium bg-white dark:bg-[#0d1117] px-2 py-1 rounded shadow-sm border border-red-200 dark:border-red-900/50">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Body is required
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Response Section */}
        <div className="h-[50%] min-h-[350px] border-t-2 border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117] flex flex-col relative">
          {/* Drag Handle Indicator (Visual Only) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-ns-resize z-10"></div>

          <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117]">
            <div className="flex items-center gap-6">
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Response</span>
              {response && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveResponseTab('body')}
                    className={`text-[13px] font-semibold pb-2 border-b-2 transition-colors ${activeResponseTab === 'body' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    style={{ marginBottom: '-9px' }}
                  >
                    {t('common.actions.body')}
                  </button>
                  <button
                    type="button"
                    className="text-[13px] font-semibold pb-2 border-b-2 border-transparent text-slate-400 cursor-not-allowed"
                    style={{ marginBottom: '-9px' }}
                    title={t('common.actions.cookiesUnavailable')}
                  >
                    {t('common.actions.cookies')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResponseTab('headers')}
                    className={`text-[13px] font-semibold pb-2 border-b-2 transition-colors ${activeResponseTab === 'headers' ? 'border-[#ff6c37] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    style={{ marginBottom: '-9px' }}
                  >
                    {t('common.actions.headers')} <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeResponseTab === 'headers' ? 'bg-[#ff6c37]/10 text-[#ff6c37]' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{response.headers?.length || 0}</span>
                  </button>
                  <button
                    type="button"
                    className="text-[13px] font-semibold pb-2 border-b-2 border-transparent text-slate-400 cursor-not-allowed"
                    style={{ marginBottom: '-9px' }}
                    title={t('common.actions.testResultsUnavailable')}
                  >
                    {t('common.actions.testResults')}
                  </button>
                </div>
              )}
            </div>
            {response && (
              <div className="flex items-center gap-4">
                {activeResponseTab === 'body' && (
                  <div className="flex items-center gap-1 mr-2 bg-slate-100 dark:bg-[#161b22] p-0.5 rounded-md border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setResponseViewMode('pretty')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${responseViewMode === 'pretty' ? 'bg-white dark:bg-[#0d1117] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      {t('common.actions.pretty')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseViewMode('raw')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${responseViewMode === 'raw' ? 'bg-white dark:bg-[#0d1117] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      {t('common.actions.raw')}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4 text-[13px] font-medium mr-4">
                  <span className={`flex items-center gap-1.5 ${getStatusColor(response.status)}`}>
                    {response.status >= 200 && response.status < 300 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>
                    <span className="font-bold">{response.status} {response.statusText}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Time:</span>
                    <span className="text-[#00c853] dark:text-[#00e676] font-bold">{response.time} ms</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Size:</span>
                    <span className="text-[#00c853] dark:text-[#00e676] font-bold">{formatBytes(response.size)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-4">
                  <button
                    type="button"
                    onClick={() => {
                      downloadApiPlaygroundResponse(response);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                    title={t('common.actions.saveResponse')}
                  >
                    <Database className="w-3.5 h-3.5" />
                    {t('common.actions.saveResponse')}
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-white/20 mx-1"></div>
                  <CopyButton
                    text={responseBodyText}
                    label={t('common.actions.copy')}
                    copiedLabel={t('common.actions.copied')}
                    variant="inline"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                    iconClassName="w-3.5 h-3.5"
                    title={t('common.actions.copyResponse')}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative bg-white dark:bg-[#0d1117]">
            {response ? (
              activeResponseTab === 'body' ? (
                <div className="flex">
                  {/* Response Line Numbers */}
                  <div className="w-10 flex flex-col items-end py-0 pr-3 text-[12px] font-mono text-slate-300 dark:text-slate-600 select-none border-r border-slate-100 dark:border-white/5 mr-4">
                    {Array.from({ length: responseBodyLineCount }).map((_, i) => (
                      <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
                    ))}
                  </div>
                  <pre className={`text-[13px] font-mono leading-[21px] whitespace-pre-wrap break-all flex-1 ${responseViewMode === 'raw' ? 'text-slate-800 dark:text-slate-300' : ''}`}>
                    {responseViewMode === 'pretty' && typeof response.data === 'object' ? (
                      <JsonSyntaxHighlight value={response.data} />
                    ) : (
                      responseBodyText
                    )}
                  </pre>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#0d1117]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161b22]">
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 w-1/3">Key</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 w-2/3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {response.headers.map(([key, value]: [string, string], idx: number) => (
                        <tr key={idx} className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-2 text-[13px] font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-[#161b22]/30">
                            {key}
                          </td>
                          <td className="px-4 py-2 text-[13px] font-mono text-slate-800 dark:text-slate-200 break-all">
                            {value}
                          </td>
                        </tr>
                      ))}
                      {response.headers.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-4 text-center text-sm text-slate-500">No headers returned</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#0d1117]">
                <div className="w-32 h-32 mb-6 rounded-full bg-slate-50 dark:bg-[#161b22] flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="relative">
                    <Database className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#0d1117] rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/5">
                      <Play className="w-5 h-5 text-[#006ce5] fill-current" />
                    </div>
                  </div>
                </div>
                <span className="text-base font-medium text-slate-600 dark:text-slate-300 mb-2">Enter the URL and click Send to get a response</span>
                <span className="text-[13px] text-slate-400 dark:text-slate-500 max-w-sm text-center leading-relaxed">
                  Configure your request parameters, headers, and authorization, then hit Send to see the API response here.
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function unknownToErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Request failed';
}
