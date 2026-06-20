export type LocaleCode = 'en' | 'zh';

export type LocaleMessages = Record<string, string>;

export type I18nMessageBundle = Record<LocaleCode, LocaleMessages>;

export type I18nResources = Record<LocaleCode, { translation: LocaleMessages }>;
