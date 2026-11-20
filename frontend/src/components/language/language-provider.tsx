"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parseLanguage,
  translate,
  type LanguageCode,
} from "@/lib/i18n";

const STORAGE_KEY = "stocky_language";
const translatedAttributes = ["title", "placeholder", "aria-label", "alt"];

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function expectedText(original: string, language: LanguageCode): string {
  const source = original.trim();
  if (!source) return original;
  return original.replace(source, translate(language, source));
}

function translateTextNode(
  node: Text,
  language: LanguageCode,
  force = false,
) {
  const current = node.nodeValue ?? "";
  let original = originalText.get(node);
  if (original !== undefined && !force && current !== expectedText(original, language)) {
    original = undefined;
    originalText.delete(node);
  }
  if (original === undefined) original = current;

  const source = original.trim();
  const translated = source ? translate(language, source) : source;
  if (!source || translated === source) {
    originalText.delete(node);
    if (node.nodeValue !== original) node.nodeValue = original;
    return;
  }

  originalText.set(node, original);
  const expected = original.replace(source, translated);
  if (node.nodeValue !== expected) node.nodeValue = expected;
}

function translateElement(
  element: Element,
  language: LanguageCode,
  force = false,
) {
  let stored = originalAttributes.get(element);
  if (!stored) {
    stored = new Map();
    originalAttributes.set(element, stored);
  }
  for (const name of translatedAttributes) {
    const current = element.getAttribute(name);
    if (current === null) continue;
    let original = stored.get(name);
    if (
      original !== undefined &&
      !force &&
      current !== translate(language, original)
    ) {
      original = undefined;
      stored.delete(name);
    }
    if (original === undefined) original = current;

    const translated = translate(language, original);
    if (translated === original) {
      stored.delete(name);
      if (current !== original) element.setAttribute(name, original);
      continue;
    }

    stored.set(name, original);
    if (current !== translated) element.setAttribute(name, translated);
  }
}

function translateTree(root: Node, language: LanguageCode, force = false) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language, force);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  if (
    element.tagName === "SCRIPT" ||
    element.tagName === "STYLE" ||
    element.hasAttribute("data-no-translate")
  ) {
    return;
  }
  translateElement(element, language, force);
  element.childNodes.forEach((child) => translateTree(child, language, force));
}

function DomTranslator({ language }: { language: LanguageCode }) {
  useEffect(() => {
    translateTree(document.body, language, true);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          record.addedNodes.forEach((node) => translateTree(node, language));
        } else if (record.type === "characterData") {
          translateTextNode(record.target as Text, language);
        } else if (record.type === "attributes") {
          const element = record.target as Element;
          if (element.nodeType === Node.ELEMENT_NODE) {
            translateElement(element, language);
          }
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    setLanguageState(parseLanguage(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (text: string) => translate(language, text),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <DomTranslator language={language} />
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
