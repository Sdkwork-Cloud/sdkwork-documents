import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DocumentsReferenceRuntimeProvider } from '@sdkwork/documents-pc-commons';
import '@sdkwork/documents-pc-i18n';
import App from './App.tsx';
import { createSdkworkDocumentsPcRuntime } from './bootstrap/runtime.ts';
import './index.css';

const runtime = createSdkworkDocumentsPcRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DocumentsReferenceRuntimeProvider value={runtime.documentsReferenceRuntime}>
      <App runtime={runtime} />
    </DocumentsReferenceRuntimeProvider>
  </StrictMode>,
);
