import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';
function resolveViteEnvironment(mode: string | undefined, processEnv = process.env) {
  const profileMatch = /^(standalone|cloud)\.(development|test|staging|production)$/u.exec(mode ?? '');
  return profileMatch?.[2]
    ?? (['development', 'test', 'staging', 'production'].includes(processEnv.SDKWORK_ENVIRONMENT ?? '')
      ? (processEnv.SDKWORK_ENVIRONMENT ?? 'production')
      : 'production');
}


import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
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
  const sdkCommonDist = path.resolve(
    repoRoot,
    '../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/index.js',
  );
  const sdkCommonSource = path.resolve(
    repoRoot,
    '../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/src/index.ts',
  );
  const workspaceRoot = path.resolve(repoRoot, '..');
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
      },
    },
    server: {
      host: '127.0.0.1',
      port: Number.parseInt(env.VITE_SDKWORK_DOCUMENTS_PC_DEV_PORT ?? '3902', 10),
      strictPort: true,
      fs: {
        allow: [
          configDir,
          repoRoot,
          path.resolve(repoRoot, '../sdkwork-sdk-commons'),
          path.resolve(repoRoot, '../sdkwork-appbase'),
          path.resolve(repoRoot, '../sdkwork-ui'),
          path.resolve(repoRoot, '../sdkwork-core'),
          path.resolve(repoRoot, '../sdkwork-utils'),
        ],
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
      outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode, env)),
      sourcemap: true,
    },
  };
});
