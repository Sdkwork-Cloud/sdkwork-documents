import {
  type GatewayEndpointKind,
  resolveGatewayEndpoints,
} from '@sdkwork/utils/gatewayEndpoint';
import { buildSharedGatewayToolSnippets } from '@sdkwork/utils/gatewayToolSnippets';

export type { GatewayEndpointKind };

export type IdeToolId =
  | 'cursor'
  | 'windsurf'
  | 'continue'
  | 'cline'
  | 'birdcoder'
  | 'claude-code'
  | 'codex'
  | 'gemini'
  | 'opencode'
  | 'openclaw'
  | 'hermes-agent'
  | 'aider';

export type IdeToolCategory = 'ide' | 'cli';

export type IdeToolSnippetLanguage = 'Shell' | 'JSON' | 'YAML' | 'TOML';

export interface IdeToolProfile {
  id: IdeToolId;
  category: IdeToolCategory;
  modelKitToolId: string;
  labelKey: string;
  fallbackLabel: string;
  summaryKey: string;
  fallbackSummary: string;
  endpointKind: GatewayEndpointKind;
  protocolKey: string;
  fallbackProtocol: string;
  configPathKey: string;
  fallbackConfigPath: string;
  referenceKey: string;
  fallbackReference: string;
  hintKey: string;
  fallbackHint: string;
  stepsKey: string;
  fallbackSteps: string;
  verifyKey?: string;
  fallbackVerify?: string;
  snippetLanguage: IdeToolSnippetLanguage;
}

export type IdeToolSnippetMap = Record<IdeToolId, string>;

export interface IdeToolSnippetInput {
  apiKeyPlaceholder: string;
  openAiBaseUrl: string;
  anthropicBaseUrl: string;
  geminiBaseUrl: string;
}

export const IDE_TOOL_CATEGORY_ORDER: IdeToolCategory[] = ['ide', 'cli'];

export const IDE_TOOL_CATEGORY_META: Record<IdeToolCategory, { labelKey: string; fallbackLabel: string }> = {
  ide: {
    labelKey: 'docs.tools.category.ide',
    fallbackLabel: 'IDE & Workbenches',
  },
  cli: {
    labelKey: 'docs.tools.category.cli',
    fallbackLabel: 'CLI & Agents',
  },
};

export const IDE_TOOL_PROFILES: IdeToolProfile[] = [
  {
    id: 'cursor',
    category: 'ide',
    modelKitToolId: 'cursor',
    labelKey: 'docs.tools.cursor',
    fallbackLabel: 'Cursor',
    summaryKey: 'docs.tools.cursorSummary',
    fallbackSummary: 'Configure OpenAI API key and custom base URL in Cursor settings.json.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.cursorPath',
    fallbackConfigPath: 'Cursor User/settings.json',
    referenceKey: 'docs.tools.cursorReference',
    fallbackReference: 'settings.json keys cursor.general.openaiApiKey and cursor.general.customOpenAIBaseUrl.',
    hintKey: 'docs.tools.cursorHint',
    fallbackHint: 'Cursor routes custom models through the OpenAI-compatible override. Use the gateway /v1 endpoint exactly as shown below — do not append /chat/completions.',
    stepsKey: 'docs.tools.cursorSteps',
    fallbackSteps: '1. Open Cursor Settings → Models\n2. Enable Override OpenAI Base URL\n3. Paste the OpenAI endpoint and API key from this page\n4. Add a gateway model ID such as gpt-4o-mini to your custom model list',
    verifyKey: 'docs.tools.cursorVerify',
    fallbackVerify: 'After saving, send a test prompt in Cursor chat and confirm requests hit your gateway access logs.',
    snippetLanguage: 'JSON',
  },
  {
    id: 'windsurf',
    category: 'ide',
    modelKitToolId: 'windsurf',
    labelKey: 'docs.tools.windsurf',
    fallbackLabel: 'Windsurf',
    summaryKey: 'docs.tools.windsurfSummary',
    fallbackSummary: 'Route Windsurf Cascade through an OpenAI-compatible gateway base URL and API key.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.windsurfPath',
    fallbackConfigPath: 'Windsurf Settings > Cascade',
    referenceKey: 'docs.tools.windsurfReference',
    fallbackReference: 'Cascade OpenAI-compatible provider with gateway base URL and API key.',
    hintKey: 'docs.tools.windsurfHint',
    fallbackHint: 'Windsurf Cascade accepts OpenAI-compatible providers. Point the provider base URL to the gateway /v1 endpoint from this page.',
    stepsKey: 'docs.tools.windsurfSteps',
    fallbackSteps: '1. Open Windsurf → Settings → Cascade\n2. Choose an OpenAI-compatible provider\n3. Set Base URL to the OpenAI endpoint below\n4. Paste your gateway API key and pick a supported model ID',
    verifyKey: 'docs.tools.windsurfVerify',
    fallbackVerify: 'Run a Cascade task and verify the model ID exists in your gateway catalog.',
    snippetLanguage: 'Shell',
  },
  {
    id: 'continue',
    category: 'ide',
    modelKitToolId: 'continue',
    labelKey: 'docs.tools.continue',
    fallbackLabel: 'Continue',
    summaryKey: 'docs.tools.continueSummary',
    fallbackSummary: 'Add an OpenAI-compatible model entry in ~/.continue/config.json for chat and autocomplete.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.continuePath',
    fallbackConfigPath: '~/.continue/config.json',
    referenceKey: 'docs.tools.continueReference',
    fallbackReference: 'Continue config.json models array with provider openai, apiBase, and apiKey.',
    hintKey: 'docs.tools.continueHint',
    fallbackHint: 'Continue reads ~/.continue/config.json. Set both the chat model and tabAutocompleteModel when you want inline completion to use the same gateway.',
    stepsKey: 'docs.tools.continueSteps',
    fallbackSteps: '1. Open ~/.continue/config.json\n2. Add or update the models entry with provider openai\n3. Set apiBase to the OpenAI endpoint below and apiKey to your gateway key\n4. Reload VS Code or restart Continue',
    verifyKey: 'docs.tools.continueVerify',
    fallbackVerify: 'Use Continue chat once and confirm the selected model ID is enabled for your API key group.',
    snippetLanguage: 'JSON',
  },
  {
    id: 'cline',
    category: 'ide',
    modelKitToolId: 'cline',
    labelKey: 'docs.tools.cline',
    fallbackLabel: 'Cline',
    summaryKey: 'docs.tools.clineSummary',
    fallbackSummary: 'Point the Cline VS Code extension to an OpenAI-compatible gateway endpoint.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.clinePath',
    fallbackConfigPath: 'VS Code > Cline extension settings',
    referenceKey: 'docs.tools.clineReference',
    fallbackReference: 'Cline OpenAI Compatible provider with base URL, API key, and model ID.',
    hintKey: 'docs.tools.clineHint',
    fallbackHint: 'Cline setting key names vary slightly between extension versions. If a key below is ignored, open the Cline settings UI and mirror the same Base URL, API key, and model ID.',
    stepsKey: 'docs.tools.clineSteps',
    fallbackSteps: '1. Open the Cline panel → Settings (gear icon)\n2. Set API Provider to OpenAI Compatible\n3. Paste the OpenAI endpoint and API key from this page\n4. Set Model ID to a gateway-supported model such as gpt-4o-mini',
    verifyKey: 'docs.tools.clineVerify',
    fallbackVerify: 'Click Verify in Cline if available, or send a short test task and check gateway request logs.',
    snippetLanguage: 'JSON',
  },
  {
    id: 'birdcoder',
    category: 'ide',
    modelKitToolId: 'birdcoder',
    labelKey: 'docs.tools.birdcoder',
    fallbackLabel: 'BirdCoder',
    summaryKey: 'docs.tools.birdcoderSummary',
    fallbackSummary: 'Route BirdCoder code engines through gateway-backed Codex, Claude Code, Gemini, and OpenCode CLI configuration.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.birdcoderPath',
    fallbackConfigPath: '~/.sdkwork/birdcoder/code-engine-models.json',
    referenceKey: 'docs.tools.birdcoderReference',
    fallbackReference: 'BirdCoder model catalog plus Settings → Environment variables for embedded engine CLIs.',
    hintKey: 'docs.tools.birdcoderHint',
    fallbackHint: 'BirdCoder does not call the gateway directly. It reuses Codex, Claude Code, Gemini, and OpenCode CLIs — configure each engine with the matching gateway endpoint first, then map gateway model IDs in BirdCoder Settings → Code Engines.',
    stepsKey: 'docs.tools.birdcoderSteps',
    fallbackSteps: '1. Configure Codex, Claude Code, Gemini, and OpenCode using the gateway snippets on this page\n2. Open BirdCoder → Settings → Environment and paste the engine env exports\n3. Edit ~/.sdkwork/birdcoder/code-engine-models.json to select gateway model IDs\n4. In Settings → Code Engines, confirm each engine shows the custom model\n5. Start a coding session and verify gateway traffic for the active engine',
    verifyKey: 'docs.tools.birdcoderVerify',
    fallbackVerify: 'Run a BirdCoder coding session with each engine once. Auth errors usually mean the underlying CLI config is wrong; model errors mean the ID is missing from your API key group.',
    snippetLanguage: 'JSON',
  },
  {
    id: 'claude-code',
    category: 'cli',
    modelKitToolId: 'claude_code',
    labelKey: 'docs.tools.claudeCode',
    fallbackLabel: 'Claude Code',
    summaryKey: 'docs.tools.claudeCodeSummary',
    fallbackSummary: 'Anthropic-compatible endpoint through ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.',
    endpointKind: 'anthropic',
    protocolKey: 'docs.tools.protocol.anthropic',
    fallbackProtocol: 'Anthropic-compatible',
    configPathKey: 'docs.tools.claudeCodePath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'docs.tools.claudeCodeReference',
    fallbackReference: 'Claude Code environment variables: ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.',
    hintKey: 'docs.tools.claudeCodeHint',
    fallbackHint: 'Claude Code reads ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN from the shell session. Export them in the same terminal before running claude, or add them to your shell profile.',
    stepsKey: 'docs.tools.claudeCodeSteps',
    fallbackSteps: '1. Export ANTHROPIC_BASE_URL to the Anthropic-compatible endpoint below\n2. Export ANTHROPIC_AUTH_TOKEN to your gateway API key\n3. Run claude from that same terminal session\n4. Pick a model supported by your API key group when prompted',
    verifyKey: 'docs.tools.claudeCodeVerify',
    fallbackVerify: 'Run claude once and confirm the gateway receives /anthropic traffic for your key.',
    snippetLanguage: 'Shell',
  },
  {
    id: 'codex',
    category: 'cli',
    modelKitToolId: 'codex',
    labelKey: 'docs.tools.codex',
    fallbackLabel: 'Codex',
    summaryKey: 'docs.tools.codexSummary',
    fallbackSummary: 'OpenAI-compatible provider in ~/.codex/config.toml.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.codexPath',
    fallbackConfigPath: '~/.codex/config.toml',
    referenceKey: 'docs.tools.codexReference',
    fallbackReference: 'Codex CLI config: model_provider and model_providers entries.',
    hintKey: 'docs.tools.codexHint',
    fallbackHint: 'Codex loads provider credentials from an environment variable referenced by env_key. Export CLOUDROUTER_API_KEY before launching Codex, then point model_providers.cloudrouter.base_url at the OpenAI endpoint.',
    stepsKey: 'docs.tools.codexSteps',
    fallbackSteps: '1. Export CLOUDROUTER_API_KEY with your gateway API key\n2. Update ~/.codex/config.toml with the provider block below\n3. Set model_provider to cloudrouter\n4. Restart Codex and choose a supported model ID',
    verifyKey: 'docs.tools.codexVerify',
    fallbackVerify: 'Run a Codex request and confirm the gateway receives /v1 traffic using your API key.',
    snippetLanguage: 'TOML',
  },
  {
    id: 'gemini',
    category: 'cli',
    modelKitToolId: 'gemini',
    labelKey: 'docs.tools.gemini',
    fallbackLabel: 'Gemini CLI',
    summaryKey: 'docs.tools.geminiSummary',
    fallbackSummary: 'Google Gemini-compatible endpoint through GOOGLE_GEMINI_BASE_URL and GEMINI_API_KEY.',
    endpointKind: 'gemini',
    protocolKey: 'docs.tools.protocol.gemini',
    fallbackProtocol: 'Gemini-compatible',
    configPathKey: 'docs.tools.geminiPath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'docs.tools.geminiReference',
    fallbackReference: 'Gemini CLI configuration: GEMINI_API_KEY and GOOGLE_GEMINI_BASE_URL.',
    hintKey: 'docs.tools.geminiHint',
    fallbackHint: 'Gemini CLI uses the Google-compatible gateway path /google/v1beta. Do not point it at the OpenAI /v1 endpoint.',
    stepsKey: 'docs.tools.geminiSteps',
    fallbackSteps: '1. Export GEMINI_API_KEY with your gateway API key\n2. Export GOOGLE_GEMINI_BASE_URL to the Gemini endpoint below\n3. Run gemini from the same terminal\n4. Select a Gemini-compatible model exposed by your gateway',
    verifyKey: 'docs.tools.geminiVerify',
    fallbackVerify: 'Send a short prompt through Gemini CLI and confirm /google/v1beta requests appear in gateway logs.',
    snippetLanguage: 'Shell',
  },
  {
    id: 'opencode',
    category: 'cli',
    modelKitToolId: 'opencode',
    labelKey: 'docs.tools.opencode',
    fallbackLabel: 'OpenCode',
    summaryKey: 'docs.tools.opencodeSummary',
    fallbackSummary: 'Custom OpenAI-compatible provider using @ai-sdk/openai-compatible.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.opencodePath',
    fallbackConfigPath: '~/.config/opencode/opencode.json',
    referenceKey: 'docs.tools.opencodeReference',
    fallbackReference: 'OpenCode provider config with npm package @ai-sdk/openai-compatible.',
    hintKey: 'docs.tools.opencodeHint',
    fallbackHint: 'OpenCode resolves apiKey from the CLOUDROUTER_API_KEY environment variable when you use {env:CLOUDROUTER_API_KEY} in the config file.',
    stepsKey: 'docs.tools.opencodeSteps',
    fallbackSteps: '1. Export CLOUDROUTER_API_KEY in your shell\n2. Save the provider block to ~/.config/opencode/opencode.json\n3. Ensure @ai-sdk/openai-compatible is available to OpenCode\n4. Launch opencode and select the cloudrouter provider',
    verifyKey: 'docs.tools.opencodeVerify',
    fallbackVerify: 'Run an OpenCode session and confirm requests use the configured baseURL and API key.',
    snippetLanguage: 'JSON',
  },
  {
    id: 'openclaw',
    category: 'cli',
    modelKitToolId: 'openclaw',
    labelKey: 'docs.tools.openclaw',
    fallbackLabel: 'OpenClaw',
    summaryKey: 'docs.tools.openclawSummary',
    fallbackSummary: 'Declare an OpenAI-compatible provider in ~/.openclaw/config.yaml.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.openclawPath',
    fallbackConfigPath: '~/.openclaw/config.yaml',
    referenceKey: 'docs.tools.openclawReference',
    fallbackReference: 'OpenClaw config: openai-compatible provider block under providers.',
    hintKey: 'docs.tools.openclawHint',
    fallbackHint: 'OpenClaw reads provider credentials from CLOUDROUTER_API_KEY when the config uses ${CLOUDROUTER_API_KEY}. Export the variable before starting OpenClaw.',
    stepsKey: 'docs.tools.openclawSteps',
    fallbackSteps: '1. Export CLOUDROUTER_API_KEY with your gateway API key\n2. Save the provider block to ~/.openclaw/config.yaml\n3. Set type to openai-compatible and base_url to the OpenAI endpoint\n4. Restart OpenClaw and select the cloudrouter provider',
    verifyKey: 'docs.tools.openclawVerify',
    fallbackVerify: 'Trigger an OpenClaw request and verify the gateway receives authenticated /v1 calls.',
    snippetLanguage: 'YAML',
  },
  {
    id: 'hermes-agent',
    category: 'cli',
    modelKitToolId: 'hermes',
    labelKey: 'docs.tools.hermesAgent',
    fallbackLabel: 'Hermes Agent',
    summaryKey: 'docs.tools.hermesAgentSummary',
    fallbackSummary: 'Declare an OpenAI-compatible provider in ~/.hermes/agent.yaml.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.hermesAgentPath',
    fallbackConfigPath: '~/.hermes/agent.yaml',
    referenceKey: 'docs.tools.hermesAgentReference',
    fallbackReference: 'Hermes Agent provider block with protocol openai, baseUrl, and apiKey credentials.',
    hintKey: 'docs.tools.hermesAgentHint',
    fallbackHint: 'Hermes Agent loads providers from ~/.hermes/agent.yaml. Keep protocol as openai when routing through the gateway /v1 endpoint.',
    stepsKey: 'docs.tools.hermesAgentSteps',
    fallbackSteps: '1. Create or edit ~/.hermes/agent.yaml\n2. Add the cloudrouter provider block below\n3. Set baseUrl to the OpenAI endpoint and apiKey to your gateway key\n4. Run hermes-agent and select the configured model',
    verifyKey: 'docs.tools.hermesAgentVerify',
    fallbackVerify: 'Launch Hermes Agent and confirm the provider can stream a response through the gateway.',
    snippetLanguage: 'YAML',
  },
  {
    id: 'aider',
    category: 'cli',
    modelKitToolId: 'aider',
    labelKey: 'docs.tools.aider',
    fallbackLabel: 'Aider',
    summaryKey: 'docs.tools.aiderSummary',
    fallbackSummary: 'Run Aider with OPENAI_API_KEY and --openai-api-base pointed at the gateway /v1 endpoint.',
    endpointKind: 'openai',
    protocolKey: 'docs.tools.protocol.openai',
    fallbackProtocol: 'OpenAI-compatible',
    configPathKey: 'docs.tools.aiderPath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'docs.tools.aiderReference',
    fallbackReference: 'Aider OpenAI-compatible mode via environment variables or --openai-api-base.',
    hintKey: 'docs.tools.aiderHint',
    fallbackHint: 'Aider uses OPENAI_API_KEY plus --openai-api-base for custom gateways. Run aider in the same shell where OPENAI_API_KEY is exported.',
    stepsKey: 'docs.tools.aiderSteps',
    fallbackSteps: '1. Export OPENAI_API_KEY with your gateway API key\n2. Run aider with --openai-api-base set to the OpenAI endpoint below\n3. Choose a gateway-supported model when aider starts\n4. Optionally persist openai-api-base in .aider.conf.yml',
    verifyKey: 'docs.tools.aiderVerify',
    fallbackVerify: 'Start aider in a git repo and confirm chat completions reach the gateway /v1 endpoint.',
    snippetLanguage: 'Shell',
  },
];

export function groupIdeToolProfilesByCategory(): Record<IdeToolCategory, IdeToolProfile[]> {
  return IDE_TOOL_CATEGORY_ORDER.reduce<Record<IdeToolCategory, IdeToolProfile[]>>((groups, category) => {
    groups[category] = IDE_TOOL_PROFILES.filter((profile) => profile.category === category);
    return groups;
  }, { ide: [], cli: [] });
}

export function buildIdeToolSnippets(input: IdeToolSnippetInput): IdeToolSnippetMap {
  const apiKey = input.apiKeyPlaceholder;
  const shared = buildSharedGatewayToolSnippets(input);

  return {
    cursor: [
      '# ~/Library/Application Support/Cursor/User/settings.json',
      '# Windows: %APPDATA%\\Cursor\\User\\settings.json',
      '# Linux: ~/.config/Cursor/User/settings.json',
      '{',
      `  "cursor.general.openaiApiKey": "${apiKey}",`,
      `  "cursor.general.customOpenAIBaseUrl": "${input.openAiBaseUrl}",`,
      '  "cursor.models.custom": [',
      '    "gpt-4o-mini",',
      '    "claude-3-5-sonnet"',
      '  ]',
      '}',
    ].join('\n'),
    windsurf: [
      '# Windsurf → Settings → Cascade',
      '# Provider: OpenAI Compatible',
      `export OPENAI_API_KEY="${apiKey}"`,
      `export OPENAI_BASE_URL="${input.openAiBaseUrl}"`,
      '',
      '# Set the same Base URL and API key in the Cascade provider UI.',
    ].join('\n'),
    continue: [
      '{',
      '  "models": [',
      '    {',
      '      "title": "Cloud Router",',
      '      "provider": "openai",',
      '      "model": "gpt-4o-mini",',
      `      "apiKey": "${apiKey}",`,
      `      "apiBase": "${input.openAiBaseUrl}"`,
      '    }',
      '  ],',
      '  "tabAutocompleteModel": {',
      '    "title": "Cloud Router Fast",',
      '    "provider": "openai",',
      '    "model": "gpt-4o-mini",',
      `    "apiKey": "${apiKey}",`,
      `    "apiBase": "${input.openAiBaseUrl}"`,
      '  }',
      '}',
    ].join('\n'),
    cline: [
      '# VS Code / Cursor settings.json',
      '{',
      '  "cline.apiProvider": "openai-compatible",',
      `  "cline.openAiBaseUrl": "${input.openAiBaseUrl}",`,
      `  "cline.openAiApiKey": "${apiKey}",`,
      '  "cline.openAiModelId": "gpt-4o-mini"',
      '}',
    ].join('\n'),
    birdcoder: [
      '# 1) Configure underlying CLIs first (see Codex / Claude Code / Gemini / OpenCode on this page).',
      '# 2) BirdCoder Settings → Environment — paste engine exports such as:',
      `export CLOUDROUTER_API_KEY="${apiKey}"`,
      `export ANTHROPIC_BASE_URL="${input.anthropicBaseUrl}"`,
      `export ANTHROPIC_AUTH_TOKEN="${apiKey}"`,
      `export GEMINI_API_KEY="${apiKey}"`,
      `export GOOGLE_GEMINI_BASE_URL="${input.geminiBaseUrl}"`,
      '',
      '# 3) ~/.sdkwork/birdcoder/code-engine-models.json',
      '{',
      '  "schemaVersion": 1,',
      '  "version": "v1",',
      '  "engines": {',
      '    "codex": {',
      '      "selectedModelId": "gpt-4o-mini",',
      '      "customModels": [',
      '        { "id": "gpt-4o-mini", "label": "Cloud Router Codex" }',
      '      ]',
      '    },',
      '    "claude-code": {',
      '      "selectedModelId": "claude-3-5-sonnet",',
      '      "customModels": [',
      '        { "id": "claude-3-5-sonnet", "label": "Cloud Router Claude" }',
      '      ]',
      '    },',
      '    "gemini": {',
      '      "selectedModelId": "gemini-2.0-flash",',
      '      "customModels": [',
      '        { "id": "gemini-2.0-flash", "label": "Cloud Router Gemini" }',
      '      ]',
      '    },',
      '    "opencode": {',
      '      "selectedModelId": "gpt-4o-mini",',
      '      "customModels": [',
      '        { "id": "gpt-4o-mini", "label": "Cloud Router OpenCode" }',
      '      ]',
      '    }',
      '  }',
      '}',
    ].join('\n'),
    codex: shared.codex,
    'claude-code': shared['claude-code'],
    gemini: shared.gemini,
    opencode: shared.opencode,
    openclaw: shared.openclaw,
    'hermes-agent': shared['hermes-agent'],
    aider: [
      `export OPENAI_API_KEY="${apiKey}"`,
      '',
      '# Recommended launch command:',
      `aider --openai-api-base "${input.openAiBaseUrl}"`,
      '',
      '# Optional ~/.aider.conf.yml',
      '# openai-api-base: ' + input.openAiBaseUrl,
    ].join('\n'),
  };
}

export { resolveGatewayEndpoints };
