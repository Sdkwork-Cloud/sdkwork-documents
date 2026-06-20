export const PORTAL_SESSION_CHANGE_EVENT = 'sdkwork-documents:portal-session-change';

export function dispatchPortalSessionChange(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(new Event(PORTAL_SESSION_CHANGE_EVENT));
}
