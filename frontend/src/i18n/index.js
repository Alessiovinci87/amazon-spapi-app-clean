// frontend/src/i18n/index.js
// Configurazione react-i18next.
//
// Ogni lingua ha un namespace per pagina/area in `locales/<lang>/<ns>.json`.
// Le chiavi sono organizzate in modo gerarchico (es. "settings.theme.title").
//
// Per usare le traduzioni in un componente:
//   import { useTranslation } from "react-i18next";
//   const { t } = useTranslation();
//   ...
//   <h1>{t("settings.theme.title")}</h1>
//
// Per cambiare lingua a runtime:
//   import i18n from "../i18n";
//   i18n.changeLanguage("en");

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import itCommon from "./locales/it/common.json";
import enCommon from "./locales/en/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English",  flag: "🇬🇧" },
];

export const DEFAULT_LANGUAGE = "it";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    defaultNS: "common",
    ns: ["common"],
    resources: {
      it: { common: itCommon },
      en: { common: enCommon },
    },
    interpolation: {
      escapeValue: false, // React già protegge da XSS
    },
    detection: {
      // Ordine di rilevamento: localStorage > navigator
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "nexus-lang",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false, // niente Suspense, evita flash su lazy load
    },
  });

export default i18n;
