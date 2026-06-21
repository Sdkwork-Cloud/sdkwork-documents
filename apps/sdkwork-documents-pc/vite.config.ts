import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const RUNTIME_ENV_SCRIPT_PATH = '/runtime-env.js';
const HTML_MODULE_SCRIPT_PATTERN =
  /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']+["'])[^>]*><\/script>/i;

function documentsRuntimeEnvPlugin(): Plugin {
  return {
    name: 'documents-runtime-env',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?', 1)[0] !== RUNTIME_ENV_SCRIPT_PATH) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(buildDocumentsRuntimeEnvScript());
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const scriptTag = `<script type="module" src="${RUNTIME_ENV_SCRIPT_PATH}"></script>`;
        if (html.includes(scriptTag)) {
          return html;
        }
        if (!HTML_MODULE_SCRIPT_PATTERN.test(html)) {
          throw new Error('Documents index.html must contain a module script');
        }
        return html.replace(HTML_MODULE_SCRIPT_PATTERN, `${scriptTag}\n    $&`);
      },
    },
  };
}

function buildDocumentsRuntimeEnvScript(): string {
  const runtimeEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('VITE_')) {
      continue;
    }
    const trimmed = value?.trim();
    if (trimmed) {
      runtimeEnv[key] = trimmed;
    }
  }

  const serializedEnv = JSON.stringify(runtimeEnv)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026');

  return `window.__SDKWORK_DOCUMENTS_ENV__ = Object.freeze(${serializedEnv});\n`;
}

export default defineConfig(({ mode }) => {
  const configDir = import.meta.dirname;
  const repoRoot = path.resolve(configDir, '../..');
  const env = loadEnv(mode, configDir, '');

  const applicationPublicHttpUrl =
    env.VITE_SDKWORK_DOCUMENTS_APPLICATION_PUBLIC_HTTP_URL?.trim() || 'http://127.0.0.1:18084';
  const applicationBackendHttpUrl =
    env.VITE_SDKWORK_DOCUMENTS_APPLICATION_BACKEND_HTTP_URL?.trim() || applicationPublicHttpUrl;
  const applicationOpenHttpUrl =
    env.VITE_SDKWORK_DOCUMENTS_APPLICATION_OPEN_HTTP_URL?.trim() || applicationPublicHttpUrl;
  const platformGatewayUrl =
    env.VITE_SDKWORK_DOCUMENTS_PLATFORM_API_GATEWAY_HTTP_URL?.trim() || 'http://127.0.0.1:3900';

  return {
    define: {
      'process.env.SDKWORK_ACCESS_TOKEN': JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ''),
    },
    plugins: [documentsRuntimeEnvPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(configDir, '.'),
        '@sdkwork/documents-app-sdk': path.resolve(
          repoRoot,
          'sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/generated/server-openapi/src/index.ts',
        ),
        '@sdkwork/documents-pc-api-reference/openapiTypes': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-api-reference/src/openapiTypes.ts',
        ),
        '@sdkwork/documents-pc-api-reference/apiReferenceSchemaTabs': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts',
        ),
        '@sdkwork/documents-pc-api-reference/openapiSchemaRuntime': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-api-reference/src/openapiSchemaRuntime.ts',
        ),
        '@sdkwork/documents-pc-api-reference': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-api-reference/src/index.ts',
        ),
        '@sdkwork/documents-pc-commons/runtime': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-commons/src/runtime.ts',
        ),
        '@sdkwork/documents-pc-commons/documentsShellLayout.css': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-commons/src/documentsShellLayout.css',
        ),
        '@sdkwork/documents-pc-commons': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-commons/src/index.ts',
        ),
        '@sdkwork/documents-pc-core': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-core/src/index.ts',
        ),
        '@sdkwork/documents-pc-i18n': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-i18n/src/index.ts',
        ),
        '@sdkwork/documents-pc-sdk-reference': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-sdk-reference/src/index.ts',
        ),
        '@sdkwork/documents-pc-shell': path.resolve(
          configDir,
          'packages/sdkwork-documents-pc-shell/src/index.tsx',
        ),
        '@sdkwork/sdk-common': path.resolve(
          repoRoot,
          '../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/index.js',
        ),
      },
    },
    server: {
      host: '127.0.0.1',
      port: Number.parseInt(env.VITE_SDKWORK_DOCUMENTS_PC_DEV_PORT ?? '3902', 10),
      strictPort: true,
      fs: {
        allow: [configDir, repoRoot, path.resolve(repoRoot, '../sdkwork-sdk-commons')],
      },
      proxy: {
        '/app/v3/api': {
          target: applicationPublicHttpUrl,
          changeOrigin: true,
        },
        '/backend/v3/api': {
          target: applicationBackendHttpUrl,
          changeOrigin: true,
        },
        '/doc/v3/api': {
          target: applicationOpenHttpUrl,
          changeOrigin: true,
        },
        '/v1': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
        '/openapi.json': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
        '/openapi/schema-tabs.json': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
        '/cloud/v3': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
        '/payments/v3': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
        '/paas/v3': {
          target: platformGatewayUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
