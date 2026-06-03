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
  // Mirror to cookie so backend reads it
  if (typeof document !== "undefined") {
    document.cookie = `ovelin_sk=${sk}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return sk;
}

export type RealtimeEvent = { event: string; payload: any };

export function useRealtime(handler?: (ev: RealtimeEvent) => void): {
  online: number;
  connected: boolean;
  send: (data: any) => void;
} {
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const sk = getSessionKey();
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const url = `${proto}//${location.host}${base}/api/ws?sk=${encodeURIComponent(sk)}`;
    let stop = false;
    let reconnectTimer: any = null;
    let pingTimer: any = null;

    const connect = () => {
      if (stop) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          pingTimer = setInterval(() => {
            try { ws.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
          }, 25000);
        };
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "online") setOnline(data.count);
            if (data.type === "hello") setOnline(data.online ?? 0);
            if (data.type === "event" && handlerRef.current) handlerRef.current({ event: data.event, payload: data.payload });
          } catch { /* ignore */ }
        };
        ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
        ws.onclose = () => {
          setConnected(false);
          if (pingTimer) clearInterval(pingTimer);
          if (!stop) reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        if (!stop) reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      stop = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      try { wsRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  const send = useCallback((data: any) => {
    try { wsRef.current?.send(JSON.stringify(data)); } catch { /* ignore */ }
  }, []);

  return { online, connected, send };
}
