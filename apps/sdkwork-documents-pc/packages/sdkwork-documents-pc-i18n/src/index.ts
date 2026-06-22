import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { documentsPcMessages } from './resources/index.ts';

const getBrowserLanguage = (): string => {
  const userSelected = globalThis.localStorage?.getItem('user_explicit_lang');
  if (userSelected) {
    if (userSelected.toLowerCase().includes('zh')) {
      return 'zh';
    }
    if (userSelected.toLowerCase().includes('en')) {
      return 'en';
    }
    return userSelected;
  }

  const browserLang = globalThis.navigator?.language;
  if (browserLang?.toLowerCase().includes('zh')) {
    return 'zh';
  }
  return 'en';
};

const navigationMessages = {
  en: {
    'nav.brand': 'SDKWork Documents',
    'nav.productDocs': 'Product Docs',
    'nav.docs': 'Developer Docs',
    'nav.apiReference': 'API Reference',
    'nav.sdkReference': 'SDK Reference',
    'home.title': 'SDKWork Documents Reference',
    'home.subtitle':
      'Browse product documentation, API references, SDK references, and generated SDK tooling for SDKWork Documents.',
    'home.productDocsDescription': 'Product overview, architecture, and use cases.',
    'home.docsDescription': 'Installation, authentication, and quickstart guides.',
    'home.apiReferenceDescription': 'Interactive OpenAPI reference and request playground.',
    'home.sdkReferenceDescription': 'Generated SDK documentation and archive tooling.',
  },
  zh: {
    'nav.brand': 'SDKWork Documents',
    'nav.productDocs': '产品文档',
    'nav.docs': '开发文档',
    'nav.apiReference': 'API 参考',
    'nav.sdkReference': 'SDK 参考',
    'home.title': 'SDKWork Documents 参考中心',
    'home.subtitle': '浏览 SDKWork Documents 的产品文档、API 参考、SDK 参考与生成工具。',
    'home.productDocsDescription': '产品概览、架构与使用场景。',
    'home.docsDescription': '安装、认证与快速开始指南。',
    'home.apiReferenceDescription': '交互式 OpenAPI 参考与请求 Playground。',
    'home.sdkReferenceDescription': '生成式 SDK 文档与归档工具。',
  },
};

const resources = {
  en: {
    translation: {
      ...documentsPcMessages.en.translation,
      ...navigationMessages.en,
    },
  },
  zh: {
    translation: {
      ...documentsPcMessages.zh.translation,
      ...navigationMessages.zh,
    },
  },
};

void i18n.use(initReactI18next).init({
  lng: getBrowserLanguage(),
  resources,
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh'],
  interpolation: {
    escapeValue: false,
    defaultVariables: {
      platformName: 'SDKWork Documents',
    },
  },
});

export { navigationMessages, resources };
export {
  documentsPcMessages,
  publicApiReferenceMessages,
  publicDocsMessages,
  publicSdkReferenceMessages,
} from './resources/index.ts';
export type { I18nMessageBundle, I18nResources, LocaleCode, LocaleMessages } from './resources/types.ts';
