import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SdkworkIamAuthRoutes } from '@sdkwork/auth-pc-react';

import {
  resolveSdkworkDocumentsPcAuthAppearance,
  resolveSdkworkDocumentsPcAuthLocale,
  resolveSdkworkDocumentsPcAuthRuntimeConfig,
} from './bootstrap/authConfig.ts';
import type { SdkworkDocumentsPcRuntime } from './bootstrap/runtime.ts';
import {
  hasSdkworkDocumentsPcAuthenticatedSession,
  resolveSdkworkDocumentsPcAuthGateDecision,
} from './authGateLogic.ts';

export interface AuthGateProps {
  children: ReactNode;
  runtime: SdkworkDocumentsPcRuntime;
}

export function AuthGate({ children, runtime }: AuthGateProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => runtime.session.getSnapshot());

  useEffect(() => runtime.session.subscribe(setSnapshot), [runtime.session]);

  const decision = useMemo(
    () =>
      resolveSdkworkDocumentsPcAuthGateDecision({
        devAuthBypass: runtime.config.devAuthBypass,
        hasSession: hasSdkworkDocumentsPcAuthenticatedSession(snapshot),
        homePath: runtime.routes.home,
        location,
      }),
    [location, runtime.config.devAuthBypass, runtime.routes.home, snapshot],
  );

  useEffect(() => {
    if (decision.kind !== 'redirect') {
      return;
    }
    navigate(decision.to, { replace: true });
  }, [decision, navigate]);

  if (decision.kind === 'redirect') {
    return null;
  }

  if (decision.kind === 'auth-route') {
    const authProps = {
      appearance: resolveSdkworkDocumentsPcAuthAppearance(),
      basePath: '/auth',
      getRuntime: () => runtime.iamRuntime,
      homePath: runtime.routes.home,
      locale: resolveSdkworkDocumentsPcAuthLocale(runtime.config.i18n.defaultLocale),
      runtimeConfig: resolveSdkworkDocumentsPcAuthRuntimeConfig(),
      viewportMode: 'flow' as const,
    };

    return (
      <SdkworkIamAuthRoutes
        {...(authProps as unknown as Parameters<typeof SdkworkIamAuthRoutes>[0])}
      />
    );
  }

  return <>{children}</>;
}
