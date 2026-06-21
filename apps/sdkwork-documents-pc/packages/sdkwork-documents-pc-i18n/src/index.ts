import { publicDocsMessages } from './resources/public/docs.ts';
import { publicApiReferenceMessages } from './resources/public/api-reference.ts';
import { publicSdkReferenceMessages } from './resources/public/sdk-reference.ts';

export { publicDocsMessages, publicApiReferenceMessages, publicSdkReferenceMessages };
export type { I18nMessageBundle, I18nResources, LocaleCode, LocaleMessages } from './resources/types.ts';

export const documentsPcMessages = {
  en: {
    translation: {
      ...publicDocsMessages.en,
      ...publicApiReferenceMessages.en,
      ...publicSdkReferenceMessages.en,
    },
  },
  zh: {
    translation: {
      ...publicDocsMessages.zh,
      ...publicApiReferenceMessages.zh,
      ...publicSdkReferenceMessages.zh,
    },
  },
};
