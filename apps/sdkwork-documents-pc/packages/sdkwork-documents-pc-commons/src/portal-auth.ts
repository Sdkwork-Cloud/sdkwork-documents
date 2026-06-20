import {
  getStoredAppSessionAccessToken,
  getStoredAppSessionAuthToken,
} from './app-session-token.ts';
import { PORTAL_SESSION_CHANGE_EVENT } from './portal-session-events.ts';

export interface PortalAuthLocationLike {
  hash?: string;
  pathname: string;
  search?: string;
}

export type PortalLoginRequiredActionDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

export function buildPortalAuthLoginRedirect(location: PortalAuthLocationLike): string {
  const returnPath = `${normalizePortalPathname(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
  return `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
}

export function resolvePortalLoginRequiredAction({
  hasSession,
  location,
}: {
  hasSession: boolean;
  location: PortalAuthLocationLike;
}): PortalLoginRequiredActionDecision {
  if (hasSession) {
    return { allowed: true };
  }

  return {
    allowed: false,
    redirectTo: buildPortalAuthLoginRedirect(location),
  };
}

export function hasStoredPortalSession(): boolean {
  return Boolean(getStoredAppSessionAuthToken() || getStoredAppSessionAccessToken());
}

export function subscribePortalSessionChange(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(PORTAL_SESSION_CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(PORTAL_SESSION_CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function normalizePortalPathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return '/';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
