import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Layers, Zap, BarChart3, ShieldCheck, Network, Briefcase } from 'lucide-react';
import { documentsShellLayout, getDocumentsShellScrollOffsetPx } from '@sdkwork/documents-pc-commons';

export function ProductDocs() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('overview');

  // Simple scroll spy for the right sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['overview', 'core-features', 'architecture', 'use-cases', 'security'];
      let current = sections[0];

      for (const section of sections) {
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
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={documentsShellLayout.pageRoot}>
      {/* Left Sidebar */}
      <aside className={`w-64 shrink-0 border-r border-slate-200 dark:border-white/10 hidden md:block py-8 px-6 custom-scrollbar ${documentsShellLayout.stickySidebar}`}>
        <nav className="space-y-8">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">{t('productDocs.title')}</h3>
            <ul className="space-y-1.5">
              <li><button onClick={() => scrollTo('overview')} className={`text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${activeSection === 'overview' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}>{t('productDocs.overview')}</button></li>
              <li><button onClick={() => scrollTo('core-features')} className={`text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${activeSection === 'core-features' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}>{t('productDocs.coreFeatures')}</button></li>
              <li><button onClick={() => scrollTo('architecture')} className={`text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${activeSection === 'architecture' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}>{t('productDocs.architecture')}</button></li>
              <li><button onClick={() => scrollTo('use-cases')} className={`text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${activeSection === 'use-cases' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}>{t('productDocs.useCases')}</button></li>
              <li><button onClick={() => scrollTo('security')} className={`text-[14px] w-full text-left px-2 py-1.5 rounded-md transition-colors ${activeSection === 'security' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}>{t('productDocs.security')}</button></li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex justify-center">
        <div className="w-full px-6 md:px-8 lg:px-12 py-12 pb-32">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <span>{t('productDocs.title')}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">{t('productDocs.overview')}</span>
          </div>

          <div id="overview" className={`mb-16 ${documentsShellLayout.scrollMarginSection}`}>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
              {t('productDocs.title')}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
              {t('productDocs.subtitle')}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                {t('productDocs.overviewDesc')}
              </p>
            </div>
          </div>

          <div id="core-features" className={`mb-16 ${documentsShellLayout.scrollMarginSection}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Zap className="w-6 h-6 text-yellow-500" />
              {t('productDocs.coreFeatures')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {t('productDocs.coreFeaturesDesc')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('productDocs.f1Title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('productDocs.f1Desc')}</p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                  <Network className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('productDocs.f2Title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('productDocs.f2Desc')}</p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 md:col-span-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('productDocs.f3Title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('productDocs.f3Desc')}</p>
              </div>
            </div>
          </div>

          <div id="architecture" className={`mb-16 ${documentsShellLayout.scrollMarginSection}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Network className="w-6 h-6 text-indigo-500" />
              {t('productDocs.architecture')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('productDocs.architectureDesc')}
            </p>

            <div className="p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111] flex items-center justify-center min-h-[300px]">
              {/* Abstract Architecture Diagram */}
              <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
                <div className="px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm font-medium text-slate-900 dark:text-white">
                  Your Application
                </div>
                <div className="h-8 w-px bg-slate-300 dark:bg-white/20 relative">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rotate-45 border-b border-r border-slate-300 dark:border-white/20"></div>
                </div>
                <div className="w-full p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('productDocs.architecture')}</span>
                  <div className="flex gap-4 w-full justify-center">
                    <div className="px-4 py-2 bg-white dark:bg-[#1a1a1a] rounded-lg text-sm shadow-sm border border-slate-200 dark:border-white/10">Auth & Rate Limiting</div>
                    <div className="px-4 py-2 bg-white dark:bg-[#1a1a1a] rounded-lg text-sm shadow-sm border border-slate-200 dark:border-white/10">Smart Routing</div>
                    <div className="px-4 py-2 bg-white dark:bg-[#1a1a1a] rounded-lg text-sm shadow-sm border border-slate-200 dark:border-white/10">Caching</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-300 dark:bg-white/20 relative">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rotate-45 border-b border-r border-slate-300 dark:border-white/20"></div>
                </div>
                <div className="flex gap-6 w-full justify-center flex-wrap">
                  <div className="px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm font-medium text-slate-900 dark:text-white">OpenAI</div>
                  <div className="px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm font-medium text-slate-900 dark:text-white">Anthropic</div>
                  <div className="px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm font-medium text-slate-900 dark:text-white">Google</div>
                  <div className="px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm font-medium text-slate-900 dark:text-white">Open Source</div>
                </div>
              </div>
            </div>
          </div>

          <div id="use-cases" className={`mb-16 ${documentsShellLayout.scrollMarginSection}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <Briefcase className="w-6 h-6 text-teal-500" />
              {t('productDocs.useCases')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {t('productDocs.useCasesDesc')}
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('productDocs.uc1Title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('productDocs.uc1Desc')}</p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('productDocs.uc2Title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('productDocs.uc2Desc')}</p>
              </div>
            </div>
          </div>

          <div id="security" className={`mb-16 ${documentsShellLayout.scrollMarginSection}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
              <ShieldCheck className="w-6 h-6 text-green-500" />
              {t('productDocs.security')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {t('productDocs.securityDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">SOC 2</div>
                <div className="text-sm text-slate-500">Type II Certified</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Zero</div>
                <div className="text-sm text-slate-500">Data Retention</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">E2E</div>
                <div className="text-sm text-slate-500">Encryption</div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Right Sidebar (Table of Contents) */}
      <aside className={`w-64 shrink-0 hidden xl:block py-12 px-6 ${documentsShellLayout.stickySidebar}`}>
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">On this page</h4>
        <ul className="space-y-2.5 text-[13px]">
          <li>
            <button
              onClick={() => scrollTo('overview')}
              className={`text-left transition-colors ${activeSection === 'overview' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('productDocs.overview')}
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo('core-features')}
              className={`text-left transition-colors ${activeSection === 'core-features' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('productDocs.coreFeatures')}
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo('architecture')}
              className={`text-left transition-colors ${activeSection === 'architecture' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('productDocs.architecture')}
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo('use-cases')}
              className={`text-left transition-colors ${activeSection === 'use-cases' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('productDocs.useCases')}
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo('security')}
              className={`text-left transition-colors ${activeSection === 'security' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('productDocs.security')}
            </button>
          </li>
        </ul>
      </aside>
    </div>
  );
}
