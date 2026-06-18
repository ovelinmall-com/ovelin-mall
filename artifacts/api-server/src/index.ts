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

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { runStartupTasks } from "./lib/startup";
import { verifySessionToken } from "./lib/auth";
import { registerWs, onlineCount, updateWsPlatform } from "./lib/wsManager";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/** استخرج userId من cookie الجلسة في رأس الطلب */
function userIdFromRequest(req: http.IncomingMessage): number | null {
  const cookieHeader = req.headers.cookie ?? "";
  // ابحث عن ovelin_admin=...
  const match = cookieHeader.match(/(?:^|;\s*)ovelin_admin=([^;]+)/);
  if (!match?.[1]) return null;
  const token = decodeURIComponent(match[1]);
  return verifySessionToken(token);
}

/** تخمين أوّلي من User-Agent — يُستبدَل بقيمة الـ client عند أول hello */
function platformFromRequest(req: http.IncomingMessage): string {
  const ua = req.headers["user-agent"] ?? "";
  return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)
    ? "apk"
    : "browser";
}

/** تحديث lastSeenAt في قاعدة البيانات لجميع جلسات المستخدم */
async function touchLastSeen(userId: number): Promise<void> {
  try {
    await db
      .update(sessionsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessionsTable.userId, userId));
  } catch { /* ignore */ }
}

(async () => {
  try {
    await runStartupTasks();
  } catch (err) {
    logger.error({ err }, "Startup tasks failed");
  }

  const server = http.createServer(app);

  // ─── WebSocket Server على المسار /api/ws ──────────────────
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    try {
      const pathname = new URL(req.url ?? "", "http://localhost").pathname;
      if (!pathname.endsWith("/api/ws")) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket as any, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
    const userId = userIdFromRequest(req);
    const online = onlineCount() + 1;

    try { ws.send(JSON.stringify({ type: "hello", online })); } catch { /* ignore */ }

    if (userId) {
      const platform = platformFromRequest(req);
      registerWs(ws, userId, platform);
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "ping") {
          try { ws.send(JSON.stringify({ type: "pong" })); } catch { /* ignore */ }
          // تحديث آخر ظهور في DB عند كل heartbeat
          if (userId) touchLastSeen(userId);
        }

        // الـ client يُرسل نوع جهازه الحقيقي بعد الاتصال
        if (msg.type === "hello" && userId) {
          const clientPlatform = msg.platform === "apk" ? "apk" : "browser";
          updateWsPlatform(ws, clientPlatform);
        }
      } catch { /* ignore */ }
    });
  });

  server.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening (HTTP + WebSocket)");
  });
})();
