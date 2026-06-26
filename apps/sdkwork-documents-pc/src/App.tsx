import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';
import { AuthGate } from './AuthGate.tsx';
import type { SdkworkDocumentsPcRuntime } from './bootstrap/runtime.ts';
import { DocumentsPcShell } from '@sdkwork/documents-pc-shell';

export interface AppProps {
  runtime: SdkworkDocumentsPcRuntime;
}

export function App({ runtime }: AppProps) {
  return (
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot>
      <Routes>
        <Route
          element={
            <AuthGate runtime={runtime}>
              <DocumentsPcShell />
            </AuthGate>
          }
          path="/*"
        />
      </Routes>
          </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}

export default App;
