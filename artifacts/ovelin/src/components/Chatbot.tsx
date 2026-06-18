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

import { useState, useEffect, useRef } from "react";
import { api, BASE_URL } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "ovelin_chat_session";

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (crypto as any)?.randomUUID?.() ??
        Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem(SESSION_KEY, id as string);
    }
    return id!;
  } catch {
    return "default";
  }
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  useEffect(() => {
    if (!open) return;
    api<Msg[]>("/api/chatbot/history", {
      headers: { "x-session-id": sessionIdRef.current },
    } as RequestInit)
      .then((rows) => {
        setMessages(
          rows.map((r) => ({ role: r.role as any, content: r.content })),
        );
      })
      .catch(() => {
        /* ignore */
      });
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, loading, streaming, suggestions]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setSuggestions([]);
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setLoading(true);
    setStreaming("");

    let acc = "";
    try {
      const url = `${BASE_URL}/api/chatbot/stream`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionIdRef.current,
        },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطأ في الاتصال");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotSuggestions: string[] = [];
      // Manual SSE parser: events look like
      //   event: delta\n
      //   data: {"text":"..."}\n\n
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sepIdx;
        while ((sepIdx = buf.indexOf("\n\n")) >= 0) {
          const raw = buf.slice(0, sepIdx);
          buf = buf.slice(sepIdx + 2);
          let event = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (event === "delta" && typeof payload.text === "string") {
              acc += payload.text;
              setStreaming(acc);
            } else if (event === "suggestions") {
              gotSuggestions = Array.isArray(payload.suggestions)
                ? payload.suggestions
                : [];
            } else if (event === "error") {
              throw new Error(payload.error || "خطأ من المساعد");
            }
          } catch (e) {
            /* ignore parse errors */
          }
        }
      }
      const final = acc.trim() || "عذراً، لم أفهم سؤالك. حاول مجدداً.";
      setMessages((m) => [...m, { role: "assistant", content: final }]);
      setStreaming("");
      setSuggestions(gotSuggestions);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            e?.message ||
            "حدث خطأ في الاتصال بالمساعد. تأكّد من اتصالك بالإنترنت وحاول مجدداً.",
        },
      ]);
      setStreaming("");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    await sendText(input);
  }

  return (
    <>
      {/* === Floating launcher: pink ring + transparent center + OVELIN MALL label === */}
      <div className="fixed bottom-20 left-4 z-50 flex flex-col items-center select-none">
        <button
          onClick={() => setOpen(!open)}
          aria-label="OVELIN MALL Assistant"
          className="relative w-16 h-16 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 group"
        >
          {/* Solid pink ring with transparent center — no pulse */}
          <span className="absolute inset-0 rounded-full ring-[3px] ring-pink-500 shadow-[0_0_20px_4px_rgba(236,72,153,0.55)] group-hover:ring-pink-400 group-hover:shadow-[0_0_28px_8px_rgba(236,72,153,0.8)] transition" />
          {/* Inner content */}
          <span className="absolute inset-[5px] rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-pink-600 font-extrabold">
            {open ? (
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <span className="text-[15px] tracking-wider drop-shadow-sm">
                AI
              </span>
            )}
          </span>
        </button>
      </div>

      {/* === Chat panel === */}
      {open && (
        <div
          className="fixed bottom-44 left-4 right-4 max-w-sm mx-auto z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-pink-500/30 border border-pink-200 dark:border-pink-900 flex flex-col"
          style={{ height: 480 }}
        >
          <div className="px-4 py-3 bg-gradient-to-r from-pink-500 via-pink-500 to-rose-600 text-white rounded-t-2xl flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-extrabold tracking-wider">
              AI
            </div>
            <div className="flex-1">
              <div
                className="font-extrabold text-base tracking-wider"
                dir="ltr"
              >
                OVELIN MALL
              </div>
              <div className="text-[11px] opacity-90">
                المساعد الذكي للمتجر — يفهم كل اللهجات ويرد بالفصحى
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 text-sm bg-gradient-to-b from-pink-50/30 to-white dark:from-zinc-900 dark:to-zinc-900"
          >
            {messages.length === 0 && !streaming && (
              <div className="text-center text-zinc-500 py-8 px-4">
                <div className="text-3xl mb-2">👋</div>
                <div className="font-bold text-zinc-700 dark:text-zinc-200">
                  مرحباً! أنا OVELIN MALL
                </div>
                <div className="text-xs mt-1 leading-relaxed">
                  اسألني بأي لهجة عربية عن أي خدمة، رصيدك، طلباتك، أو الإحالات.
                  سأرد عليك بالعربية الفصحى ✨
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-pink-500 text-white"
                      : "bg-pink-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-pink-100 dark:border-zinc-700"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed bg-pink-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-pink-100 dark:border-zinc-700">
                  {streaming}
                  <span className="inline-block w-1.5 h-4 align-middle mr-0.5 bg-pink-500 animate-pulse rounded-sm" />
                </div>
              </div>
            )}
            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="bg-pink-50 dark:bg-zinc-800 px-3 py-2 rounded-2xl text-zinc-500 flex items-center gap-1 border border-pink-100 dark:border-zinc-700">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            {suggestions.length > 0 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendText(s)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-pink-600 dark:text-pink-300 text-[11px] font-bold border border-pink-200 dark:border-pink-800 hover:bg-pink-500 hover:text-white hover:border-pink-500 active:scale-95 transition shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-pink-100 dark:border-zinc-800 flex gap-2 bg-white dark:bg-zinc-900 rounded-b-2xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب رسالتك..."
              className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-pink-300 caret-white shadow-inner"
            />
            <button
              onClick={send}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30 disabled:opacity-50 hover:scale-105 transition-transform flex items-center justify-center"
              aria-label="إرسال"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="currentColor"
                aria-hidden="true"
              >
                {/* Paper plane pointing LEFT */}
                <path d="M21.5 3.2c.4-.2.8.2.6.6l-7.4 16.4c-.2.5-.9.5-1.1 0l-2.7-6.4-6.4-2.7c-.5-.2-.5-.9 0-1.1L21.5 3.2zm-2.9 2.3L7.2 10.6l4.7 2 2 4.7L18.6 5.5z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
