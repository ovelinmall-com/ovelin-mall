// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { WebSocket } from "ws";
import { logger } from "./logger";

// userId → set of WebSocket connections
const userSockets = new Map<number, Set<WebSocket>>();

// ws → platform ('apk' | 'browser' | 'desktop')
const wsPlatform = new Map<WebSocket, string>();

// sessionKey → userId
const sessionUserMap = new Map<string, number>();

export function registerWs(ws: WebSocket, userId: number, platform = "desktop"): void {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(ws);
  wsPlatform.set(ws, platform);
  ws.on("close", () => {
    const set = userSockets.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) userSockets.delete(userId);
    }
    wsPlatform.delete(ws);
  });
}

export function setSessionUser(sessionKey: string, userId: number): void {
  sessionUserMap.set(sessionKey, userId);
}

export function getSessionUserId(sessionKey: string): number | undefined {
  return sessionUserMap.get(sessionKey);
}

export function onlineCount(): number {
  let count = 0;
  for (const set of userSockets.values()) count += set.size;
  return count;
}

/** أرجع Map من userId → platform لجميع المستخدمين المتصلين حالياً */
export function getOnlineUsersMap(): Map<number, string> {
  const result = new Map<number, string>();
  for (const [userId, sockets] of userSockets.entries()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        result.set(userId, wsPlatform.get(ws) ?? "browser");
        break;
      }
    }
  }
  return result;
}

/** حدِّث نوع الجهاز لاتصال WS قائم */
export function updateWsPlatform(ws: WebSocket, platform: string): void {
  if (wsPlatform.has(ws)) {
    wsPlatform.set(ws, platform);
  }
}

/** إحصائيات المتصلين: apk / browser */
export function getOnlineCounts(): { total: number; apk: number; browser: number } {
  const map = getOnlineUsersMap();
  let apk = 0;
  let browser = 0;
  for (const p of map.values()) {
    if (p === "apk") apk++;
    else browser++;
  }
  return { total: map.size, apk, browser };
}

/** أرسل حدث JSON لمستخدم واحد عبر كل اتصالاته المفتوحة */
export function emitToUser(userId: number, event: string, payload: unknown): void {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;
  const msg = JSON.stringify({ type: "event", event, payload });
  for (const ws of sockets) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    } catch (err) {
      logger.warn({ err, userId, event }, "wsManager: فشل إرسال حدث");
    }
  }
}

/** أرسل حدث JSON لجميع المستخدمين المتصلين */
export function emitToAll(event: string, payload: unknown): void {
  const msg = JSON.stringify({ type: "event", event, payload });
  for (const sockets of userSockets.values()) {
    for (const ws of sockets) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      } catch { /* ignore */ }
    }
  }
}
