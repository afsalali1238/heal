import en from '../i18n/en.json';

type Translations = typeof en;

const dictionaries: Record<string, any> = {
  en,
};

export function getLocale(url: string | URL) {
  const path = typeof url === 'string' ? new URL(url, 'http://localhost').pathname : url.pathname;
  if (path.startsWith('/ar/')) return 'ar';
  return 'en';
}

export function useTranslations(lang: string) {
  const dict = dictionaries[lang] || dictionaries.en;

  return function t(key: keyof Translations, ...args: string[]) {
    let str = dict[key] || en[key] || key;
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, arg);
    });
    return str;
  };
}

export function getDirection(lang: string) {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function field(item: any, fieldName: string, lang: string) {
  if (lang === 'ar' && item[`${fieldName}_ar`]) {
    return item[`${fieldName}_ar`];
  }
  return item[`${fieldName}_en`];
}
