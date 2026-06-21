import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Code2, FileText, Layers } from 'lucide-react';
import { ApiReference, Docs, ProductDocs } from '@sdkwork/documents-pc-api-reference';
import { SdkReference } from '@sdkwork/documents-pc-sdk-reference';
import {
  listSdkworkDocumentsPcNavigationItems,
  SdkworkDocumentsPcRoutePaths,
} from '@sdkwork/documents-pc-core';
import '@sdkwork/documents-pc-commons/documentsShellLayout.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function DocumentsNavbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = listSdkworkDocumentsPcNavigationItems();

  return (
    <header className="sdkwork-documents-pc-navbar fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/90">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 md:px-6">
        <Link
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"
          to={SdkworkDocumentsPcRoutePaths.home}
        >
          <BookOpen className="h-5 w-5" />
          <span>{t('nav.brand', { defaultValue: 'SDKWork Documents' })}</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                className={`rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
                to={item.path}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  const { t } = useTranslation();

  const cards = [
    {
      path: SdkworkDocumentsPcRoutePaths.productDocs,
      icon: Layers,
      titleKey: 'nav.productDocs',
      descriptionKey: 'home.productDocsDescription',
    },
    {
      path: SdkworkDocumentsPcRoutePaths.docs,
      icon: FileText,
      titleKey: 'nav.docs',
      descriptionKey: 'home.docsDescription',
    },
    {
      path: SdkworkDocumentsPcRoutePaths.apiReference,
      icon: Code2,
      titleKey: 'nav.apiReference',
      descriptionKey: 'home.apiReferenceDescription',
    },
    {
      path: SdkworkDocumentsPcRoutePaths.sdkReference,
      icon: BookOpen,
      titleKey: 'nav.sdkReference',
      descriptionKey: 'home.sdkReferenceDescription',
    },
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('home.title', { defaultValue: 'SDKWork Documents Reference' })}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
          {t('home.subtitle', {
            defaultValue:
              'Browse product documentation, API references, SDK references, and generated SDK tooling for SDKWork Documents.',
          })}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ path, icon: Icon, titleKey, descriptionKey }) => (
          <Link
            key={path}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
            to={path}
          >
            <div className="mb-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t(titleKey)}</h2>
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t(descriptionKey, { defaultValue: '' })}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export function DocumentsPcShell() {
  return (
    <div
      className="sdkwork-documents-pc-root min-h-screen bg-white text-slate-900 dark:bg-[#0a0a0a] dark:text-white"
      style={{ ['--sdkwork-portal-navbar-height' as string]: '4rem' }}
    >
      <ScrollToTop />
      <DocumentsNavbar />
      <div className="pt-16">
        <Routes>
          <Route path={SdkworkDocumentsPcRoutePaths.home} element={<HomePage />} />
          <Route path={SdkworkDocumentsPcRoutePaths.productDocs} element={<ProductDocs />} />
          <Route path={SdkworkDocumentsPcRoutePaths.docs} element={<Docs />} />
          <Route path={SdkworkDocumentsPcRoutePaths.apiReference} element={<ApiReference />} />
          <Route path={SdkworkDocumentsPcRoutePaths.sdkReference} element={<SdkReference />} />
          <Route path="*" element={<Navigate replace to={SdkworkDocumentsPcRoutePaths.home} />} />
        </Routes>
      </div>
    </div>
  );
}

export { DocumentsPcShell as SdkworkDocumentsPcShell };
