const PROVIDER_NATIVE_PREFIXES = [
  'google',
  'anthropic',
  'volcengine',
  'suno',
  'midjourney',
  'kling',
  'vidu',
  'nano-banana',
] as const;

export interface ResolvedApiRequestUrl {
  baseUrl: string;
  path: string;
  url: string;
  provider?: string;
}

export function resolveApiRequestUrl(baseUrl: string, path: string): ResolvedApiRequestUrl {
  const normalizedPath = normalizeRequestPath(path);
  const parsedBaseUrl = parseRequestBaseUrl(baseUrl.trim().replace(/\/+$/, ''));
  const endpointSegments = pathSegments(normalizedPath);
  const baseSegments = pathSegments(parsedBaseUrl.path);
  const endpointPrefix = endpointSegments[0] ?? '';
  const provider = isProviderNativePrefix(endpointPrefix) ? endpointPrefix : undefined;

  if (!parsedBaseUrl.raw && !provider) {
    return {
      baseUrl: parsedBaseUrl.origin,
      path: normalizedPath,
      url: normalizedPath,
      provider,
    };
  }

  if (provider) {
    return resolveProviderRequestUrl(parsedBaseUrl.origin, baseSegments, endpointSegments, provider);
  }

  const overlap = longestSuffixPrefixOverlap(baseSegments, endpointSegments);
  if (overlap > 0) {
    return buildResolvedUrl(
      buildBaseUrl(parsedBaseUrl.origin, baseSegments.slice(0, -overlap)),
      normalizedPath,
      undefined,
    );
  }

  return buildResolvedUrl(buildBaseUrl(parsedBaseUrl.origin, baseSegments), normalizedPath, undefined);
}

function resolveProviderRequestUrl(
  origin: string,
  baseSegments: string[],
  endpointSegments: string[],
  provider: string,
): ResolvedApiRequestUrl {
  const providerIndex = baseSegments.indexOf(provider);
  const providerPathSegments = endpointSegments.slice(1);

  if (providerIndex >= 0) {
    const baseProviderPathSegments = baseSegments.slice(providerIndex + 1);
    if (startsWithSegments(providerPathSegments, baseProviderPathSegments)) {
      return buildResolvedUrl(
        buildBaseUrl(origin, baseSegments),
        segmentsToPath(providerPathSegments.slice(baseProviderPathSegments.length)),
        provider,
      );
    }

    return buildResolvedUrl(
      buildBaseUrl(origin, baseSegments),
      segmentsToPath(providerPathSegments),
      provider,
    );
  }

  return buildResolvedUrl(
    buildBaseUrl(origin, [...stripTrailingOpenAiVersionSegment(baseSegments), provider]),
    segmentsToPath(providerPathSegments),
    provider,
  );
}

function buildResolvedUrl(baseUrl: string, path: string, provider?: string): ResolvedApiRequestUrl {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = normalizeRequestPath(path);
  return {
    baseUrl: normalizedBaseUrl,
    path: normalizedPath,
    url: `${normalizedBaseUrl}${normalizedPath}`,
    provider,
  };
}

function buildBaseUrl(origin: string, segments: string[]): string {
  const path = segmentsToPath(segments);
  return `${origin}${path === '/' ? '' : path}`;
}

function normalizeRequestPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function parseRequestBaseUrl(baseUrl: string): { raw: string; origin: string; path: string } {
  if (!baseUrl) {
    return { raw: '', origin: '', path: '' };
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl)) {
    try {
      const url = new URL(baseUrl);
      return {
        raw: baseUrl,
        origin: `${url.protocol}//${url.host}`,
        path: url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, ''),
      };
    } catch {
      return {
        raw: baseUrl,
        origin: '',
        path: normalizeRequestPath(baseUrl).replace(/\/+$/, ''),
      };
    }
  }

  const path = normalizeRequestPath(baseUrl).replace(/\/+$/, '');
  return {
    raw: path,
    origin: '',
    path,
  };
}

function pathSegments(path: string): string[] {
  return path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function segmentsToPath(segments: string[]): string {
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function startsWithSegments(value: string[], prefix: string[]): boolean {
  if (prefix.length > value.length) {
    return false;
  }
  return prefix.every((segment, index) => value[index] === segment);
}

function longestSuffixPrefixOverlap(left: string[], right: string[]): number {
  const maxOverlap = Math.min(left.length, right.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const leftSuffix = left.slice(left.length - overlap);
    const rightPrefix = right.slice(0, overlap);
    if (leftSuffix.every((segment, index) => segment === rightPrefix[index])) {
      return overlap;
    }
  }
  return 0;
}

function stripTrailingOpenAiVersionSegment(segments: string[]): string[] {
  return segments[segments.length - 1] === 'v1'
    ? segments.slice(0, -1)
    : segments;
}

function isProviderNativePrefix(value: string): value is typeof PROVIDER_NATIVE_PREFIXES[number] {
  return PROVIDER_NATIVE_PREFIXES.includes(value as typeof PROVIDER_NATIVE_PREFIXES[number]);
}
