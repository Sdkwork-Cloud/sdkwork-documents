import type { SdkworkAuthRuntimeConfig } from '@sdkwork/auth-pc-react';

export interface SdkworkDocumentsPcAuthAppearanceConfig {
  asidePanelClassName?: string;
  bodyClassName?: string;
  contentContainerClassName?: string;
  pageClassName?: string;
  qrFrameClassName?: string;
  shellClassName?: string;
  slotProps?: {
    background?: { className?: string };
    page?: { className?: string };
    shell?: { className?: string };
  };
  theme?: Record<string, string>;
}

export type SdkworkDocumentsPcAuthRuntimeConfig = SdkworkAuthRuntimeConfig;

const DOCUMENTS_VERIFICATION_POLICY = {
  emailCodeLoginEnabled: true,
  emailRegistrationVerificationRequired: false,
  phoneCodeLoginEnabled: true,
  phoneRegistrationVerificationRequired: false,
};

export function resolveSdkworkDocumentsPcAuthRuntimeConfig(): SdkworkDocumentsPcAuthRuntimeConfig {
  return {
    leftRailMode: 'qr-only',
    loginMethods: ['password', 'emailCode', 'phoneCode'],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: ['email', 'phone'],
    registerMethods: ['email', 'phone'],
    verificationPolicy: DOCUMENTS_VERIFICATION_POLICY,
  };
}

export function resolveSdkworkDocumentsPcAuthAppearance(): SdkworkDocumentsPcAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-documents-pc-auth-aside-panel',
    bodyClassName: 'sdkwork-documents-pc-auth-body',
    contentContainerClassName: 'sdkwork-documents-pc-auth-content',
    pageClassName: 'sdkwork-documents-pc-auth-page',
    qrFrameClassName: 'sdkwork-documents-pc-auth-qr-frame',
    shellClassName: 'sdkwork-documents-pc-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-documents-pc-auth-background',
      },
      page: {
        className: 'sdkwork-documents-pc-auth-page',
      },
      shell: {
        className: 'sdkwork-documents-pc-auth-card-shell',
      },
    },
  };
}

export function resolveSdkworkDocumentsPcAuthLocale(defaultLocale: string): string {
  return defaultLocale;
}
