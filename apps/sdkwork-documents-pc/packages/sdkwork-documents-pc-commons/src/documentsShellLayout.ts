export const documentsShellLayout = {
  pageRoot:
    'sdkwork-documents-shell-page-root flex w-full min-h-screen mx-auto bg-white dark:bg-[#0a0a0a]',
  pageRootColumn:
    'sdkwork-documents-shell-page-root w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col',
  pageRootCentered:
    'sdkwork-documents-shell-page-root w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center',
  stickySidebar: 'sdkwork-documents-shell-sticky-sidebar',
  stickySubHeader:
    'sdkwork-documents-shell-sticky-subheader z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10',
  stickySidebarBelowSubHeader: 'sdkwork-documents-shell-sticky-sidebar-below-subheader',
  stickySidebarBelowSubHeaderMd: 'sdkwork-documents-shell-sticky-sidebar-below-subheader-md',
  stickyBelowSubHeader: 'sdkwork-documents-shell-sticky-below-subheader',
  scrollMarginSection: 'sdkwork-documents-shell-scroll-section',
  endpointAside: 'sdkwork-documents-shell-endpoint-aside',
} as const;

export function getDocumentsShellScrollOffsetPx(fallback = 96): number {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sdkwork-portal-navbar-height')
    .trim();
  if (!raw) {
    return fallback;
  }

  if (raw.endsWith('rem')) {
    const rem = Number.parseFloat(raw);
    if (Number.isFinite(rem)) {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return Math.round(rem * rootFontSize + 32);
    }
  }

  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw);
    if (Number.isFinite(px)) {
      return Math.round(px + 32);
    }
  }

  return fallback;
}
