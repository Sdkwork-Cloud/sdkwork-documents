import { type ReactNode } from 'react';
import type { SdkworkDocumentsPcRuntime } from './bootstrap/runtime.ts';

export interface AuthGateProps {
  children: ReactNode;
  runtime: SdkworkDocumentsPcRuntime;
}

export function AuthGate({ children, runtime }: AuthGateProps) {
  void runtime;
  return <>{children}</>;
}
