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

import { useEffect, useRef, useState, useCallback } from "react";

const SK_KEY = "ovelin_sk";

export function getSessionKey(): string {
  let sk = "";
  try { sk = localStorage.getItem(SK_KEY) || ""; } catch { /* ignore */ }
  if (!sk) {
    sk = "s-" + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem(SK_KEY, sk); } catch { /* ignore */ }
  }
  if (typeof document !== "undefined") {
    document.cookie = `ovelin_sk=${sk}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return sk;
}

export type RealtimeEvent = { event: string; payload: any };

// ─────────────────────────────────────────────────────────────
// SINGLETON WebSocket — الاتصال الوحيد المشترك بين جميع المكوّنات
// هذا يمنع إنشاء عشرات الاتصالات عند استخدام useRealtime() في أكثر من مكوّن
// ─────────────────────────────────────────────────────────────
type Listener = (online: number, connected: boolean, ev?: RealtimeEvent) => void;

let ws: WebSocket | null = null;
let wsOnline = 0;
let wsConnected = false;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;
const listeners = new Set<Listener>();

function notifyAll(ev?: RealtimeEvent) {
  for (const fn of listeners) fn(wsOnline, wsConnected, ev);
}

/** كشف نوع الجهاز: APK/PWA مثبّت أم متصفح عادي */
function detectPlatform(): "apk" | "browser" {
  try {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    return isStandalone ? "apk" : "browser";
  } catch {
    return "browser";
  }
}

function connect() {
  if (stopped || ws) return;
  try {
    const sk = getSessionKey();
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const url = `${proto}//${location.host}${base}/api/ws?sk=${encodeURIComponent(sk)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      wsConnected = true;
      // أخبر السيرفر بنوع الجهاز الحقيقي فور الاتصال
      try { ws?.send(JSON.stringify({ type: "hello", platform: detectPlatform() })); } catch { /* ignore */ }
      notifyAll();
      pingTimer = setInterval(() => {
        try { ws?.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
      }, 25000);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "online") { wsOnline = data.count; notifyAll(); }
        else if (data.type === "hello") { wsOnline = data.online ?? 0; notifyAll(); }
        else if (data.type === "event") notifyAll({ event: data.event, payload: data.payload });
      } catch { /* ignore */ }
    };

    ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };

    ws.onclose = () => {
      ws = null;
      wsConnected = false;
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      notifyAll();
      if (!stopped && listeners.size > 0) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  } catch {
    if (!stopped && listeners.size > 0) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  }
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  if (!ws && !reconnectTimer) connect();
  fn(wsOnline, wsConnected);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      try { ws?.close(); } catch { /* ignore */ }
      ws = null;
    }
  };
}

function sendToServer(data: any) {
  try { ws?.send(JSON.stringify(data)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────
// Hook — يستخدم الاتصال المشترك بدون إنشاء اتصال جديد
// ─────────────────────────────────────────────────────────────
export function useRealtime(handler?: (ev: RealtimeEvent) => void): {
  online: number;
  connected: boolean;
  send: (data: any) => void;
} {
  const [online, setOnline] = useState(wsOnline);
  const [connected, setConnected] = useState(wsConnected);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = subscribe((o, c, ev) => {
      // React 18 bails out if value unchanged, but still avoids unnecessary work
      setOnline(o);
      setConnected(c);
      if (ev && handlerRef.current) handlerRef.current(ev);
    });
    return unsubscribe;
  }, []);

  const send = useCallback((data: any) => sendToServer(data), []);
  return { online, connected, send };
}

// ─────────────────────────────────────────────────────────────
// FIX #5: useRealtimeEvent — subscribes to events ONLY, no online/connected state
// Use this in hooks that only care about events (e.g. badge_update) not online count.
// Prevents unnecessary re-renders when online count changes every connect/disconnect.
// ─────────────────────────────────────────────────────────────
export function useRealtimeEvent(handler: (ev: RealtimeEvent) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn: Listener = (_o, _c, ev) => {
      if (ev && handlerRef.current) handlerRef.current(ev);
    };
    // Reuse shared connection — subscribe without exposing state setters
    listeners.add(fn);
    if (!ws && !reconnectTimer) connect();
    return () => {
      listeners.delete(fn);
      if (listeners.size === 0) {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        try { ws?.close(); } catch { /* ignore */ }
        ws = null;
      }
    };
  }, []);
}
