import { publicDocsMessages } from './resources/public/docs.ts';
import { publicApiReferenceMessages } from './resources/public/api-reference.ts';
import { publicSdkReferenceMessages } from './resources/public/sdk-reference.ts';

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
