export const SdkworkDocumentsPcRoutes = {
  home: '/',
  productDocs: '/product-docs',
  docs: '/docs',
  apiReference: '/api-reference',
  sdkReference: '/sdk-reference',
} as const;

export type SdkworkDocumentsPcRoutePath =
  (typeof SdkworkDocumentsPcRoutes)[keyof typeof SdkworkDocumentsPcRoutes];
