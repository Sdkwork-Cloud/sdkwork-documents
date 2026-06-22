import type { Location } from 'react-router-dom';

import {
  hasSdkworkDocumentsPcIamSession,
  type SdkworkDocumentsPcSessionSnapshot,
} from './bootstrap/sessionStore.ts';

export type SdkworkDocumentsPcAuthGateDecision =
  | { kind: 'product-route' }
  | { kind: 'auth-route' }
  | { kind: 'redirect'; replace: true; to: string };

const AUTH_BASE_PATH = '/auth';
const AUTH_LOGIN_PATH = '/auth/login';
const DEFAULT_HOME_PATH = '/';

export function hasSdkworkDocumentsPcAuthenticatedSession(
  snapshot: SdkworkDocumentsPcSessionSnapshot,
): boolean {
  return hasSdkworkDocumentsPcIamSession(snapshot);
}

export function buildSdkworkDocumentsPcAuthLoginRedirect(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): string {
  const returnPath = `${normalizePathname(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function sanitizeSdkworkDocumentsPcAuthRedirect(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_HOME_PATH;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_HOME_PATH;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return DEFAULT_HOME_PATH;
  }

  const redirectUrl = new URL(decoded, 'http://sdkwork-documents.local');
  if (isAuthRoute(redirectUrl.pathname)) {
    return DEFAULT_HOME_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function resolveSdkworkDocumentsPcAuthGateDecision({
  devAuthBypass = false,
  hasSession,
  homePath = DEFAULT_HOME_PATH,
  location,
}: {
  devAuthBypass?: boolean;
  hasSession: boolean;
  homePath?: string;
  location: Pick<Location, 'pathname' | 'search' | 'hash'>;
}): SdkworkDocumentsPcAuthGateDecision {
  const pathname = normalizePathname(location.pathname);

  if (isAuthRoute(pathname)) {
    if (!hasSession && !devAuthBypass) {
      return { kind: 'auth-route' };
    }

    const redirect = new URLSearchParams((location.search ?? '').replace(/^\?/u, '')).get('redirect');
    return {
      kind: 'redirect',
      replace: true,
      to: sanitizeSdkworkDocumentsPcAuthRedirect(redirect) || normalizePathname(homePath),
    };
  }

  if (!hasSession && !devAuthBypass) {
    return {
      kind: 'redirect',
      replace: true,
      to: buildSdkworkDocumentsPcAuthLoginRedirect(location),
    };
  }

  return { kind: 'product-route' };
}

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return DEFAULT_HOME_PATH;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
