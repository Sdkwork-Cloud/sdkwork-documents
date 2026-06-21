export const SdkworkDocumentsPcRoutePaths = {
  home: '/',
  productDocs: '/product-docs',
  docs: '/docs',
  apiReference: '/api-reference',
  sdkReference: '/sdk-reference',
} as const;

export function listSdkworkDocumentsPcAppSdkFamilies(): string[] {
  return ['sdkwork-documents-app-sdk'];
}

export function listSdkworkDocumentsPcNavigationItems(): Array<{
  path: string;
  labelKey: string;
}> {
  return [
    { path: SdkworkDocumentsPcRoutePaths.productDocs, labelKey: 'nav.productDocs' },
    { path: SdkworkDocumentsPcRoutePaths.docs, labelKey: 'nav.docs' },
    { path: SdkworkDocumentsPcRoutePaths.apiReference, labelKey: 'nav.apiReference' },
    { path: SdkworkDocumentsPcRoutePaths.sdkReference, labelKey: 'nav.sdkReference' },
  ];
}
