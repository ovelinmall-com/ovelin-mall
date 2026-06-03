// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "./api";

type Lang = "ar" | "en" | "fr" | "es" | "tr" | "ru";
const LANG_KEY = "ovelin_lang";

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (text: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const cache: Record<string, Record<string, string>> = {};
const inflight: Record<string, Promise<void>> = {};

function loadCache(l: Lang) {
  try {
    const raw = localStorage.getItem(`ovelin_tr_${l}`);
    if (raw) cache[l] = JSON.parse(raw);
  } catch { /* ignore */ }
}

function saveCache(l: Lang) {
  try { localStorage.setItem(`ovelin_tr_${l}`, JSON.stringify(cache[l] || {})); } catch { /* ignore */ }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem(LANG_KEY) as Lang) || "ar"; } catch { return "ar"; }
  });

  useEffect(() => { loadCache(lang); }, [lang]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    loadCache(l);
  }, []);

  const requestBatch: string[] = [];
  let batchTimer: any = null;

  const queueTranslate = (text: string) => {
    if (lang === "ar") return;
    if (cache[lang]?.[text] !== undefined) return;
    if (`${lang}|${text}` in inflight) return;
    if (!requestBatch.includes(text)) requestBatch.push(text);
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(async () => {
      const items = requestBatch.splice(0, requestBatch.length);
      const key = items.map((i) => `${lang}|${i}`).join("§");
      const p = (async () => {
        try {
          const res = await api<{ translations: Record<string, string> }>("/api/ai/translate-batch", {
            method: "POST", body: JSON.stringify({ items, targetLang: lang }),
          });
          cache[lang] = cache[lang] || {};
          for (const [k, v] of Object.entries(res.translations || {})) cache[lang][k] = v;
          saveCache(lang);
          // trigger re-render
          window.dispatchEvent(new CustomEvent("ovelin-i18n-update"));
        } catch { /* ignore */ }
      })();
      inflight[key] = p;
      await p;
      delete inflight[key];
    }, 250);
  };

  const t = useCallback((text: string) => {
    if (lang === "ar" || !text) return text;
    const v = cache[lang]?.[text];
    if (v) return v;
    queueTranslate(text);
    return text;
  }, [lang]);

  // Force re-render on i18n update
  const [, force] = useState(0);
  useEffect(() => {
    const handler = () => force((x) => x + 1);
    window.addEventListener("ovelin-i18n-update", handler);
    return () => window.removeEventListener("ovelin-i18n-update", handler);
  }, []);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
