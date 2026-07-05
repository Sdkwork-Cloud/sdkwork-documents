import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  IDE_TOOL_PROFILES,
} from '../ideToolProfiles';
import {
  MODELKIT_DOWNLOAD_URLS,
  MODELKIT_STORE_URL,
  detectModelKitInstalled,
  openModelKitConfigure,
  resolveModelKitDownloadUrl,
  type ModelKitGatewayEndpoints,
  type ModelKitInstallStatus,
} from '../modelKitIntegration';

interface ModelKitOverviewSectionProps {
  endpoints: ModelKitGatewayEndpoints;
  apiKeyPlaceholder?: string;
  providerName?: string;
}

export function ModelKitOverviewSection({
  endpoints,
  apiKeyPlaceholder = '<YOUR_API_KEY>',
  providerName = 'Claw Router',
}: ModelKitOverviewSectionProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ModelKitInstallStatus>('unknown');
  const [isLaunching, setIsLaunching] = useState(false);

  const refreshInstallStatus = useCallback(async () => {
    setStatus('checking');
    const installed = await detectModelKitInstalled();
    setStatus(installed ? 'installed' : 'missing');
  }, []);

  useEffect(() => {
    void refreshInstallStatus();
  }, [refreshInstallStatus]);

  const handleConfigureAll = async () => {
    setIsLaunching(true);
    try {
      await openModelKitConfigure({
        apiKey: apiKeyPlaceholder,
        baseUrl: endpoints.openAiBaseUrl,
        name: providerName,
        description: t('docs.modelkit.configureDescription', 'Configured from developer documentation'),
        supportedTools: IDE_TOOL_PROFILES.map((profile) => profile.modelKitToolId),
      });
      await refreshInstallStatus();
    } finally {
      setIsLaunching(false);
    }
  };

  const statusLabel = status === 'checking'
    ? t('docs.modelkit.statusChecking', 'Checking local ModelKit...')
    : status === 'installed'
      ? t('docs.modelkit.statusInstalled', 'ModelKit detected')
      : status === 'missing'
        ? t('docs.modelkit.statusMissing', 'ModelKit not detected')
        : t('docs.modelkit.statusUnknown', 'ModelKit status unknown');

  return (
    <div id="tool-modelkit" className="mb-16 scroll-mt-24">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        ModelKit
      </h3>
      <p className="text-base text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
        {t(
          'docs.modelkit.overview',
          'ModelKit is a local configuration hub similar to cc-switch. Download it once, then apply gateway API keys and endpoints to Codex, Claude Code, Cursor, Gemini, and other supported tools with one click.',
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
          status === 'installed'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
            : status === 'checking'
              ? 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
        }`}
        >
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={() => void refreshInstallStatus()}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          {t('docs.modelkit.recheck', 'Recheck')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            {t('docs.modelkit.downloadTitle', 'Download ModelKit')}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            {t(
              'docs.modelkit.downloadDesc',
              'Install the desktop client first. The docs page will probe your local environment before launching configuration.',
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={MODELKIT_DOWNLOAD_URLS.windows}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              Windows
            </a>
            <a
              href={MODELKIT_DOWNLOAD_URLS.macos}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              macOS
            </a>
            <a
              href={MODELKIT_DOWNLOAD_URLS.linux}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              Linux
            </a>
            <a
              href={MODELKIT_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              {t('docs.modelkit.storePage', 'Store page')}
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/5 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            {t('docs.modelkit.quickConfigureTitle', 'One-click local configuration')}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            {t(
              'docs.modelkit.quickConfigureDesc',
              'After ModelKit is installed, launch it from here to configure all supported coding tools against the current gateway endpoints.',
            )}
          </p>
          <button
            type="button"
            onClick={() => void handleConfigureAll()}
            disabled={isLaunching}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
          >
            {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {t('docs.modelkit.configureAllTools', 'Configure all tools in ModelKit')}
          </button>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('docs.modelkit.supportedTools', 'Supported ({{count}}): {{tools}}', {
              count: IDE_TOOL_PROFILES.length,
              tools: IDE_TOOL_PROFILES.map((profile) => t(profile.labelKey, profile.fallbackLabel)).join(', '),
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('docs.modelkit.autoDownloadHint', 'If ModelKit is not detected, your platform download page opens automatically:')}
        {' '}
        <a
          href={resolveModelKitDownloadUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
        >
          {resolveModelKitDownloadUrl()}
        </a>
      </p>
    </div>
  );
}
