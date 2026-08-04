import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Terminal, BookOpen, Key, Zap, Cpu, Wrench } from 'lucide-react';
import { CopyButton } from '@sdkwork/documents-pc-commons';
import { useDocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons/runtime';
import { documentsShellLayout, getDocumentsShellScrollOffsetPx } from '@sdkwork/documents-pc-commons';
import { ModelKitConfigureAction } from '../components/ModelKitConfigureAction';
import { ModelKitOverviewSection } from '../components/ModelKitOverviewSection';
import { ToolConfigurationGrid } from '../components/ToolConfigurationGrid';
import { ToolConfigurationGuide } from '../components/ToolConfigurationGuide';
import { ToolProtocolBadge } from '../components/ToolProtocolBadge';
import {
  IDE_TOOL_CATEGORY_META,
  IDE_TOOL_CATEGORY_ORDER,
  IDE_TOOL_PROFILES,
  buildIdeToolSnippets,
  groupIdeToolProfilesByCategory,
  resolveGatewayEndpoints,
} from '../ideToolProfiles';

const NODE_ENV_REFERENCE = 'process' + '.env';
const API_KEY_ENV_NAME = 'SDKWORK_API_KEY';
const API_KEY_PLACEHOLDER = '<YOUR_API_KEY>';

const DOC_SECTION_IDS = [
  'introduction',
  'quickstart',
  'authentication',
  'models',
  'tool-configuration',
  'tool-modelkit',
  ...IDE_TOOL_PROFILES.map((profile) => `tool-${profile.id}`),
] as const;

type DocSectionId = (typeof DOC_SECTION_IDS)[number];

function resolveOpenApiBaseUrl(
  readRuntimeEnv: (name: string) => string | undefined,
): string {
  return readRuntimeEnv('VITE_CLOUDROUTER_OPEN_API_BASE_URL')
    ?? readRuntimeEnv('VITE_API_BASE_URL')
    ?? '/v1';
}

export function Docs() {
  const { t } = useTranslation();
  const { sdkSystemConfig, readRuntimeEnv } = useDocumentsReferenceRuntime();
  const [activeSection, setActiveSection] = useState<DocSectionId>('introduction');
  const appSdk = sdkSystemConfig['app-api'];

  const gatewayEndpoints = useMemo(
    () => resolveGatewayEndpoints(resolveOpenApiBaseUrl(readRuntimeEnv)),
    [readRuntimeEnv],
  );

  const toolSnippets = useMemo(
    () => buildIdeToolSnippets({
      apiKeyPlaceholder: API_KEY_PLACEHOLDER,
      ...gatewayEndpoints,
    }),
    [gatewayEndpoints],
  );

  const groupedToolProfiles = useMemo(() => groupIdeToolProfilesByCategory(), []);

  const installSnippet = useMemo(
    () => `npm install ${appSdk.packageName}`,
    [appSdk.packageName],
  );

  const quickstartSnippet = useMemo(() => {
    const apiKeyProperty = 'api' + 'Key';
    return `import { ${appSdk.name} } from '${appSdk.packageName}';

const client = new ${appSdk.name}({
  ${apiKeyProperty}: ${NODE_ENV_REFERENCE}.${API_KEY_ENV_NAME},
});

async function main() {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Say this is a test' }],
  });
  console.log(response.choices[0].message.content);
}

main();`;
  }, [appSdk.name, appSdk.packageName]);

  const authHeaderSnippet = `Authorization: Bearer ${API_KEY_ENV_NAME}`;

  useEffect(() => {
    const handleScroll = () => {
      let current: DocSectionId = DOC_SECTION_IDS[0];

      for (const section of DOC_SECTION_IDS) {
        const element = document.getElementById(section);
        if (element && window.scrollY >= element.offsetTop - 100) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - getDocumentsShellScrollOffsetPx(),
        behavior: 'smooth',
      });
    }
  };

  const sidebarButtonClass = (sectionId: string) => (
    `text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${
      activeSection === sectionId
        ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
    }`
  );

  const tocButtonClass = (sectionId: string) => (
    `text-left transition-colors ${
      activeSection === sectionId
        ? 'text-blue-600 dark:text-blue-400 font-medium'
        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
    }`
  );

  return (
    <div className={documentsShellLayout.pageRoot}>
      <aside className={`w-64 shrink-0 border-r border-slate-200 dark:border-white/10 hidden md:block py-8 px-6 custom-scrollbar ${documentsShellLayout.stickySidebar}`}>
        <nav className="space-y-8">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">{t('docs.gettingStarted')}</h3>
            <ul className="space-y-1.5">
              <li><button onClick={() => scrollTo('introduction')} className={sidebarButtonClass('introduction')}>{t('docs.introduction')}</button></li>
              <li><button onClick={() => scrollTo('quickstart')} className={sidebarButtonClass('quickstart')}>{t('docs.quickstart')}</button></li>
              <li><button onClick={() => scrollTo('authentication')} className={sidebarButtonClass('authentication')}>{t('docs.authentication')}</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">{t('docs.coreConcepts')}</h3>
            <ul className="space-y-1.5">
              <li><button onClick={() => scrollTo('models')} className={sidebarButtonClass('models')}>{t('docs.models')}</button></li>
              <li><button className="text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5">{t('docs.routing')}</button></li>
              <li><button className="text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5">{t('docs.billing')}</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">{t('docs.toolConfiguration')}</h3>
            <ul className="space-y-4">
              <li><button onClick={() => scrollTo('tool-configuration')} className={sidebarButtonClass('tool-configuration')}>{t('docs.page.toolConfigOverview', 'Overview')}</button></li>
              <li><button onClick={() => scrollTo('tool-modelkit')} className={sidebarButtonClass('tool-modelkit')}>{t('docs.modelkit.title', 'ModelKit')}</button></li>
              {IDE_TOOL_CATEGORY_ORDER.map((category) => {
                const meta = IDE_TOOL_CATEGORY_META[category];
                const profiles = groupedToolProfiles[category];
                return (
                  <li key={category}>
                    <div className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t(meta.labelKey, meta.fallbackLabel)}
                    </div>
                    <ul className="space-y-1">
                      {profiles.map((profile) => (
                        <li key={profile.id}>
                          <button
                            onClick={() => scrollTo(`tool-${profile.id}`)}
                            className={sidebarButtonClass(`tool-${profile.id}`)}
                          >
                            {t(profile.labelKey, profile.fallbackLabel)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex justify-center">
        <div className="w-full px-6 md:px-8 lg:px-12 py-12 pb-32">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <span>{t('docs.page.breadcrumbDocumentation')}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">{t('docs.page.breadcrumbGettingStarted')}</span>
          </div>

          <div id="introduction" className="mb-16 scroll-mt-24">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
              {t('docs.title')}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
              {t('docs.page.introDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              <a href="#quickstart" onClick={(e) => { e.preventDefault(); scrollTo('quickstart'); }} className="group p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-white dark:bg-[#0a0a0a] shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('docs.page.quickstartCardTitle')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('docs.page.quickstartCardDesc')}</p>
              </a>
              <a href="/api-reference" className="group p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-teal-500 dark:hover:border-teal-500 transition-colors bg-white dark:bg-[#0a0a0a] shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('docs.page.apiReferenceCardTitle')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('docs.page.apiReferenceCardDesc')}</p>
              </a>
            </div>
          </div>

          <div id="quickstart" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Zap className="w-6 h-6 text-yellow-500" />
              {t('docs.quickstart.title')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.quickstartInstallDesc')}
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#0d1117] mb-8">
              <div className="flex items-center px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5">
                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Bash</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300">
                  <code>{installSnippet}</code>
                </pre>
              </div>
            </div>

            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.quickstartRequestDesc')}
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#0d1117] mb-8">
              <div className="flex items-center px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5">
                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">TypeScript</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                  <code>{quickstartSnippet}</code>
                </pre>
              </div>
            </div>
          </div>

          <div id="authentication" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Key className="w-6 h-6 text-indigo-500" />
              {t('docs.auth.title')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.authIntro')}
            </p>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-6">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">{t('docs.page.authSecurityTitle')}</h4>
              <p className="text-sm text-blue-800 dark:text-blue-400/80 leading-relaxed">
                {t('docs.page.authSecurityDesc')}
              </p>
            </div>

            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.authHeaderDesc')}
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#0d1117]">
              <div className="p-4 overflow-x-auto">
                <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300">
                  <code>{authHeaderSnippet}</code>
                </pre>
              </div>
            </div>
          </div>

          <div id="models" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Cpu className="w-6 h-6 text-purple-500" />
              {t('docs.models.title')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.modelsIntro')}
            </p>

            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{t('docs.page.modelFamilyColumn')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{t('docs.page.modelDescriptionColumn')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900 dark:text-white mb-1">GPT-4o</div>
                      <code className="text-xs text-slate-500">gpt-4o</code>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Our high-intelligence flagship model for complex, multi-step tasks. Text and image input, text output.
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900 dark:text-white mb-1">Claude 3.5 Sonnet</div>
                      <code className="text-xs text-slate-500">claude-3-5-sonnet</code>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Anthropic&apos;s most intelligent model, offering top-tier performance on complex tasks with high speed.
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900 dark:text-white mb-1">Gemini 1.5 Pro</div>
                      <code className="text-xs text-slate-500">gemini-1.5-pro</code>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Google&apos;s highly capable model featuring a massive 2M token context window for deep analysis.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div id="tool-configuration" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Wrench className="w-6 h-6 text-emerald-500" />
              {t('docs.toolConfiguration')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('docs.page.toolConfigIntro')}
            </p>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-4">
              <p className="text-sm text-amber-900 dark:text-amber-300/90 leading-relaxed">
                {t('docs.page.toolConfigApiKeyHint')}{' '}
                <a
                  href="/console/api-keys"
                  className="font-medium underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-200"
                >
                  {t('docs.page.toolConfigApiKeyLink', 'Open API Keys')}
                </a>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-8">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                {t('docs.page.toolConfigModelHint', 'Use model IDs that are enabled for your API key group in the gateway catalog, such as gpt-4o-mini or claude-3-5-sonnet.')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('docs.page.toolConfigConsoleHint', 'Create and copy a real API key from the console API Keys page before applying manual snippets or launching ModelKit.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t('docs.page.openAiEndpoint')}
                </div>
                <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                  {gatewayEndpoints.openAiBaseUrl}
                </code>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t('docs.page.anthropicEndpoint')}
                </div>
                <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                  {gatewayEndpoints.anthropicBaseUrl}
                </code>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t('docs.page.geminiEndpoint')}
                </div>
                <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                  {gatewayEndpoints.geminiBaseUrl}
                </code>
              </div>
            </div>

            <ToolConfigurationGrid onSelectTool={scrollTo} />
          </div>

          <ModelKitOverviewSection endpoints={gatewayEndpoints} apiKeyPlaceholder={API_KEY_PLACEHOLDER} />

          {IDE_TOOL_CATEGORY_ORDER.map((category) => {
            const meta = IDE_TOOL_CATEGORY_META[category];
            const profiles = groupedToolProfiles[category];

            return (
              <div key={category} className="mb-10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200 dark:border-white/10 pb-3">
                  {t(meta.labelKey, meta.fallbackLabel)}
                </h3>

                {profiles.map((profile) => {
                  const sectionId = `tool-${profile.id}`;
                  const activeEndpoint = profile.endpointKind === 'anthropic'
                    ? gatewayEndpoints.anthropicBaseUrl
                    : profile.endpointKind === 'gemini'
                      ? gatewayEndpoints.geminiBaseUrl
                      : gatewayEndpoints.openAiBaseUrl;
                  const snippet = toolSnippets[profile.id];

                  return (
                    <div key={profile.id} id={sectionId} className="mb-16 scroll-mt-24">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {t(profile.labelKey, profile.fallbackLabel)}
                        </h3>
                        <ToolProtocolBadge
                          profile={profile}
                          label={t(profile.protocolKey, profile.fallbackProtocol)}
                        />
                      </div>
                      <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {t(profile.summaryKey, profile.fallbackSummary)}
                      </p>

                      <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                        <div className="rounded-lg border border-slate-200 dark:border-white/10 p-4">
                          <dt className="font-semibold text-slate-900 dark:text-white mb-1">
                            {t('docs.page.toolConfigLocation')}
                          </dt>
                          <dd className="text-slate-600 dark:text-slate-400">
                            {t(profile.configPathKey, profile.fallbackConfigPath)}
                          </dd>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-white/10 p-4">
                          <dt className="font-semibold text-slate-900 dark:text-white mb-1">
                            {t('docs.page.toolConfigEndpoint')}
                          </dt>
                          <dd className="font-mono text-slate-600 dark:text-slate-400 break-all">
                            {activeEndpoint}
                          </dd>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-white/10 p-4">
                          <dt className="font-semibold text-slate-900 dark:text-white mb-1">
                            {t('docs.page.toolConfigReference')}
                          </dt>
                          <dd className="text-slate-600 dark:text-slate-400">
                            {t(profile.referenceKey, profile.fallbackReference)}
                          </dd>
                        </div>
                      </dl>

                      <ToolConfigurationGuide profile={profile} />

                      <div className="mb-6">
                        <ModelKitConfigureAction
                          profile={profile}
                          endpoints={gatewayEndpoints}
                          apiKeyPlaceholder={API_KEY_PLACEHOLDER}
                        />
                      </div>

                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#0d1117]">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5">
                          <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                            {profile.snippetLanguage}
                          </span>
                          <CopyButton
                            text={snippet}
                            label={t('common.actions.copyCode', 'Copy code')}
                            copiedLabel={t('common.actions.codeCopied', 'Code copied')}
                            variant="inline"
                          />
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            <code>{snippet}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </main>

      <aside className={`w-64 shrink-0 hidden xl:block py-12 px-6 ${documentsShellLayout.stickySidebar}`}>
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">{t('docs.page.onThisPage')}</h4>
        <ul className="space-y-2.5 text-[13px]">
          <li>
            <button onClick={() => scrollTo('introduction')} className={tocButtonClass('introduction')}>
              {t('common.actions.introduction')}
            </button>
          </li>
          <li>
            <button onClick={() => scrollTo('quickstart')} className={tocButtonClass('quickstart')}>
              {t('common.actions.quickstart')}
            </button>
          </li>
          <li>
            <button onClick={() => scrollTo('authentication')} className={tocButtonClass('authentication')}>
              {t('common.actions.authorization')}
            </button>
          </li>
          <li>
            <button onClick={() => scrollTo('models')} className={tocButtonClass('models')}>
              {t('common.actions.models')}
            </button>
          </li>
          <li>
            <button onClick={() => scrollTo('tool-configuration')} className={tocButtonClass('tool-configuration')}>
              {t('docs.toolConfiguration')}
            </button>
          </li>
          <li>
            <button onClick={() => scrollTo('tool-modelkit')} className={`${tocButtonClass('tool-modelkit')} pl-3`}>
              {t('docs.modelkit.title', 'ModelKit')}
            </button>
          </li>
          {IDE_TOOL_CATEGORY_ORDER.map((category) => {
            const meta = IDE_TOOL_CATEGORY_META[category];
            const profiles = groupedToolProfiles[category];
            return (
              <li key={category}>
                <div className="pt-2 pb-1 pl-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(meta.labelKey, meta.fallbackLabel)}
                </div>
                <ul className="space-y-2.5">
                  {profiles.map((profile) => (
                    <li key={profile.id}>
                      <button
                        onClick={() => scrollTo(`tool-${profile.id}`)}
                        className={`${tocButtonClass(`tool-${profile.id}`)} pl-5`}
                      >
                        {t(profile.labelKey, profile.fallbackLabel)}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
