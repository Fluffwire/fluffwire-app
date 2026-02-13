import { createI18n } from 'vue-i18n'
import en from './locales/en.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('fluffwire-locale') || 'en',
  fallbackLocale: 'en',
  messages: { en },
})

export async function loadLocale(locale: string) {
  if (locale === 'en') return
  if ((i18n.global.availableLocales as string[]).includes(locale)) return
  const messages = await import(`./locales/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default)
}

export function setLocale(locale: string) {
  ;(i18n.global.locale as unknown as { value: string }).value = locale
  localStorage.setItem('fluffwire-locale', locale)
  document.documentElement.setAttribute('lang', locale)
}

export default i18n
