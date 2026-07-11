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

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, Send, Search, Filter, Sparkles, Tag as TagIcon, UserCheck, FileText,
  MessageSquare, BarChart2, Bot, Users as UsersIcon, X, Plus, Trash2, Loader2,
  Crown, Lock, CheckCircle2, Star, Paperclip, AlertCircle, Brain, ChevronDown, ChevronUp,
  HelpCircle, ThumbsUp, ThumbsDown, TrendingDown,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const ADMIN_API = (import.meta.env.BASE_URL || "/") + "api/admin";
const PUBLIC_API = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/api";

async function af<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${ADMIN_API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as any).error || `Request failed (${r.status})`);
  }
  return r.json();
}

const STATUSES = ["open", "waiting_user", "resolved", "closed"];
const STATUS_LABEL: Record<string, string> = { open: "مفتوحة", waiting_user: "بانتظار العميل", resolved: "محلولة", closed: "مغلقة" };
const STATUS_COLOR: Record<string, string> = { open: "bg-blue-100 text-blue-700", waiting_user: "bg-amber-100 text-amber-700", resolved: "bg-emerald-100 text-emerald-700", closed: "bg-zinc-100 text-zinc-600" };
const PRIORITIES = ["low", "normal", "high", "urgent"];
const PRIORITY_LABEL: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };
const PRIORITY_COLOR: Record<string, string> = { low: "bg-zinc-100", normal: "bg-blue-50 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-pink-200 text-pink-800" };
const SENTIMENT_ICON: Record<string, string> = { positive: "😊", neutral: "😐", negative: "😞", urgent: "🚨" };
const PIE_COLORS = ["#ec4899", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

type Ticket = {
  id: number; userId: number; username: string; subject: string; category: string;
  status: string; priority: string; unreadForAdmin: number;
  lastUserAt: string; lastAdminAt?: string | null; createdAt: string; updatedAt: string;
  assignedTo?: string | null; tags?: string[] | null; aiSentiment?: string | null;
  csat?: number | null; firstReplyAt?: string | null; resolvedAt?: string | null;
};
type Agent = { id: number; username: string; displayName: string; avatarUrl?: string | null; active: boolean };
type Template = { id: number; title: string; body: string; category: string; shortcut?: string | null; sortOrder: number };

export default function AdminSupportTab() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const [filters, setFilters] = useState({ status: "", priority: "", assignedTo: "", tag: "", search: "" });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  async function loadTickets() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.search) params.set("search", filters.search);
    try {
      const list = await af<Ticket[]>(`/support/tickets?${params}`);
      setTickets(list);
    } catch {}
  }
  async function loadAgents() {
    try { setAgents(await af<Agent[]>("/support/agents")); } catch {}
  }

  useEffect(() => { loadTickets(); loadAgents(); }, []);
  useEffect(() => { loadTickets(); }, [filters.status, filters.priority, filters.assignedTo, filters.tag]);
  useEffect(() => {
    const i = setInterval(loadTickets, 6000);
    return () => clearInterval(i);
  }, [filters]);

  if (openId !== null) {
    return <TicketView id={openId} agents={agents} onBack={() => { setOpenId(null); loadTickets(); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <ToolCard icon={<BarChart2 className="w-4 h-4" />} label="إحصائيات" active={showAnalytics} onClick={() => setShowAnalytics(!showAnalytics)} accent="from-pink-500 to-pink-600" />
        <ToolCard icon={<MessageSquare className="w-4 h-4" />} label="القوالب" active={showTemplates} onClick={() => setShowTemplates(!showTemplates)} accent="from-emerald-500 to-teal-600" />
        <ToolCard icon={<UsersIcon className="w-4 h-4" />} label="الموظفين" active={showAgents} onClick={() => setShowAgents(!showAgents)} accent="from-amber-500 to-orange-600" />
        <ToolCard icon={<HelpCircle className="w-4 h-4" />} label="الأسئلة" active={showFaq} onClick={() => setShowFaq(!showFaq)} accent="from-cyan-500 to-blue-600" />
      </div>

      {showAnalytics && <AnalyticsPanel />}
      {showTemplates && <TemplatesPanel />}
      {showAgents && <AgentsPanel onChange={loadAgents} />}
      {showFaq && <FaqAnalyticsPanel />}

      <FiltersBar filters={filters} setFilters={setFilters} agents={agents} onSearch={loadTickets} />

      {(!tickets || tickets.length === 0) && (
        <div className="fancy-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
          <LifeBuoy className="w-8 h-8 mx-auto text-pink-300 mb-2" />
          لا توجد تذاكر تطابق الفلاتر
        </div>
      )}

      {tickets.map((t) => <TicketRow key={t.id} t={t} agents={agents} onOpen={() => setOpenId(t.id)} />)}
    </div>
  );
}

function ToolCard({ icon, label, active, onClick, accent }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl p-3 text-white font-extrabold text-[12px] shadow active:scale-[0.98] flex items-center justify-center gap-1",
        `bg-gradient-to-br ${accent}`,
        active ? "ring-2 ring-pink-300" : "opacity-90",
      )}
    >
      {icon} {label}
    </button>
  );
}

function FiltersBar({ filters, setFilters, agents, onSearch }: any) {
  return (
    <div className="fancy-card rounded-3xl p-3 space-y-2">
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="text-[10px] font-bold text-pink-700 ml-1 flex items-center gap-1"><Filter className="w-3 h-3" />الحالة:</div>
        <button onClick={() => setFilters((f: any) => ({ ...f, status: "" }))} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", !filters.status ? "bg-pink-600 text-white" : "bg-white text-pink-700")}>الكل</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilters((f: any) => ({ ...f, status: s }))} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", filters.status === s ? "bg-pink-600 text-white" : "bg-white text-pink-700")}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="text-[10px] font-bold text-pink-700 ml-1">الأولوية:</div>
        <button onClick={() => setFilters((f: any) => ({ ...f, priority: "" }))} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", !filters.priority ? "bg-pink-600 text-white" : "bg-white text-rose-700")}>الكل</button>
        {PRIORITIES.map((p) => (
          <button key={p} onClick={() => setFilters((f: any) => ({ ...f, priority: p }))} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", filters.priority === p ? "bg-rose-600 text-white" : PRIORITY_COLOR[p] ?? "bg-white text-rose-700")}>
            {PRIORITY_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="text-[10px] font-bold text-pink-700 ml-1">المعيّن:</div>
        <select
          value={filters.assignedTo}
          onChange={(e) => setFilters((f: any) => ({ ...f, assignedTo: e.target.value }))}
          className="bg-white rounded-lg px-2 py-1 text-[10px] font-bold text-pink-700 focus:outline-none"
        >
          <option value="">الكل</option>
          <option value="unassigned">غير معيّن</option>
          {agents.map((a: Agent) => <option key={a.id} value={a.username}>{a.displayName}</option>)}
        </select>
        <input
          value={filters.tag}
          onChange={(e) => setFilters((f: any) => ({ ...f, tag: e.target.value }))}
          placeholder="فلتر بوسم"
          className="bg-white rounded-lg px-2 py-1 text-[10px] font-bold text-pink-700 focus:outline-none w-24"
        />
      </div>
      <div className="flex gap-1.5">
        <input
          value={filters.search}
          onChange={(e) => setFilters((f: any) => ({ ...f, search: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
          placeholder="ابحث بالموضوع أو اسم المستخدم..."
          className="flex-1 bg-white rounded-xl px-3 py-2 text-[11px] focus:outline-none"
        />
        <button onClick={onSearch} className="px-3 rounded-xl bg-pink-600 text-white"><Search className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function TicketRow({ t, agents, onOpen }: any) {
  const agent = agents.find((a: Agent) => a.username === t.assignedTo);
  const respMins = t.firstReplyAt ? Math.round((new Date(t.firstReplyAt).getTime() - new Date(t.createdAt).getTime()) / 60000) : null;
  return (
    <div onClick={onOpen} className="fancy-card rounded-3xl p-3 cursor-pointer active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {t.aiSentiment && <span title={t.aiSentiment}>{SENTIMENT_ICON[t.aiSentiment]}</span>}
            <div className="font-bold text-pink-900 truncate text-sm">{t.subject}</div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            #{t.id} • @{t.username} • {new Date(t.updatedAt).toLocaleString("ar-EG")}
          </div>
        </div>
        {t.unreadForAdmin > 0 && (
          <span className="shrink-0 rounded-full bg-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5">{t.unreadForAdmin}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={cn("text-[10px] font-extrabold rounded-full px-2 py-0.5", STATUS_COLOR[t.status])}>{STATUS_LABEL[t.status]}</span>
        <span className={cn("text-[10px] font-extrabold rounded-full px-2 py-0.5", PRIORITY_COLOR[t.priority])}>{PRIORITY_LABEL[t.priority]}</span>
        {agent && <span className="text-[10px] font-extrabold rounded-full bg-rose-100 text-rose-700 px-2 py-0.5"><UserCheck className="w-2.5 h-2.5 inline" /> {agent.displayName}</span>}
        {!agent && t.status === "open" && <span className="text-[10px] font-extrabold rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">غير معيّن</span>}
        {(t.tags ?? []).slice(0, 3).map((tag: string) => (
          <span key={tag} className="text-[10px] font-bold rounded-full bg-white text-pink-700 px-2 py-0.5">#{tag}</span>
        ))}
        {t.csat ? <span className="text-[10px] font-bold text-amber-600">{"★".repeat(t.csat)}</span> : null}
        {respMins !== null && <span className="text-[9px] text-emerald-600 font-bold">⚡ {respMins}د</span>}
      </div>
    </div>
  );
}

// ─── Ticket detailed view ─────────────────────────────────
function TicketView({ id, agents, onBack }: { id: number; agents: Agent[]; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [body, setBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiSugLoading, setAiSugLoading] = useState(false);
  const [aiSumLoading, setAiSumLoading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [d, n, t] = await Promise.all([
        af(`/support/tickets/${id}`),
        af(`/support/tickets/${id}/notes`),
        af<Template[]>(`/support/templates`),
      ]);
      setData(d); setNotes(n); setTemplates(t);
    } catch {}
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [id]);

  if (!data) return (
    <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-pink-500" /></div>
  );
  const ticket = data.ticket;
  const messages = data.messages ?? [];

  async function send(extra: { close?: boolean } = {}) {
    const text = body.trim();
    if (!text) return;
    setBusy("send");
    try {
      const agent = agents.find((a) => a.username === ticket.assignedTo);
      await af(`/support/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ body: text, authorName: agent?.displayName || "الدعم" }) });
      setBody("");
      if (extra.close) await af(`/support/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setBusy(null);
  }

  async function setStatus(s: string) {
    setBusy(`status-${s}`);
    try { await af(`/support/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }); await load(); } catch {}
    setBusy(null);
  }
  async function setPriority(p: string) {
    setBusy(`prio-${p}`);
    try { await af(`/support/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ priority: p }) }); await load(); } catch {}
    setBusy(null);
  }
  async function assign(username: string) {
    setBusy("assign");
    try { await af(`/support/tickets/${id}/assign`, { method: "POST", body: JSON.stringify({ assignedTo: username || null }) }); await load(); } catch {}
    setBusy(null);
  }
  async function saveTags(arr: string[]) {
    try { await af(`/support/tickets/${id}/tags`, { method: "POST", body: JSON.stringify({ tags: arr }) }); await load(); } catch {}
  }
  async function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    const existing = ticket.tags || [];
    if (existing.includes(t)) return;
    setTagInput("");
    await saveTags([...existing, t].slice(0, 12));
  }
  async function removeTag(t: string) {
    await saveTags((ticket.tags || []).filter((x: string) => x !== t));
  }
  async function addNote() {
    const t = noteBody.trim();
    if (!t) return;
    setBusy("note");
    try {
      await af(`/support/tickets/${id}/notes`, { method: "POST", body: JSON.stringify({ body: t, authorName: "admin" }) });
      setNoteBody("");
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setBusy(null);
  }
  async function delNote(noteId: number) {
    if (!confirm("حذف الملاحظة؟")) return;
    await af(`/support/notes/${noteId}`, { method: "DELETE" });
    await load();
  }
  async function aiSummary() {
    setAiSumLoading(true);
    try {
      await af(`/support/tickets/${id}/ai-summary`, { method: "POST" });
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setAiSumLoading(false);
  }
  async function aiSuggest() {
    setAiSugLoading(true);
    try {
      const r = await af<{ suggestion: string }>(`/support/tickets/${id}/ai-suggest`, { method: "POST" });
      setBody(r.suggestion);
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setAiSugLoading(false);
  }
  async function aiFirstReply() {
    setBusy("ai-first");
    try {
      await af(`/support/tickets/${id}/ai-first-reply`, { method: "POST" });
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setBusy(null);
  }
  async function attach(file: File) {
    if (file.size > 1_200_000) { alert("الحد 1MB"); return; }
    setBusy("attach");
    const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
    try {
      const agent = agents.find((a) => a.username === ticket.assignedTo);
      await af(`/support/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ body: body.trim() || "📎 مرفق", authorName: agent?.displayName || "الدعم", attachmentUrl: dataUrl }) });
      setBody("");
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[12px] font-bold text-pink-600 flex items-center gap-1">← العودة</button>

      {/* Customer + meta header */}
      <div className="rounded-3xl bg-gradient-to-br from-white to-white p-3 border border-pink-200 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {ticket.aiSentiment && <span className="text-lg">{SENTIMENT_ICON[ticket.aiSentiment]}</span>}
              <div className="font-extrabold text-pink-900 text-base truncate">{ticket.subject}</div>
            </div>
            <div className="text-[11px] text-pink-700 mt-0.5">#{ticket.id} • @{ticket.username} • {ticket.userEmail ?? ""} • VIP {ticket.userVip ?? 0}</div>
            <div className="text-[10px] text-pink-600 mt-0.5">رصيد العميل: ${Number(ticket.userBalance ?? 0).toFixed(2)} • أُنشئت: {new Date(ticket.createdAt).toLocaleString("ar-EG")}</div>
          </div>
          {ticket.csat ? (
            <div className="text-amber-500 text-sm">{"★".repeat(ticket.csat)}{"☆".repeat(5 - ticket.csat)}</div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-bold text-pink-700 mb-1">الحالة</div>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button key={s} disabled={busy === `status-${s}`} onClick={() => setStatus(s)} className={cn("text-[10px] font-bold px-2 py-1 rounded-lg disabled:opacity-50", ticket.status === s ? "bg-pink-600 text-white" : "bg-white text-pink-700")}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-pink-700 mb-1">الأولوية</div>
            <div className="flex flex-wrap gap-1">
              {PRIORITIES.map((p) => (
                <button key={p} disabled={busy === `prio-${p}`} onClick={() => setPriority(p)} className={cn("text-[10px] font-bold px-2 py-1 rounded-lg disabled:opacity-50", ticket.priority === p ? "bg-rose-600 text-white" : "bg-white text-rose-700")}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-bold text-pink-700 mb-1 flex items-center gap-1"><UserCheck className="w-3 h-3" />تعيين موظف</div>
            <select
              value={ticket.assignedTo ?? ""}
              onChange={(e) => assign(e.target.value)}
              className="w-full bg-white border border-pink-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-pink-700 focus:outline-none"
            >
              <option value="">— غير معيّن —</option>
              {agents.map((a) => <option key={a.id} value={a.username}>{a.displayName}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-bold text-pink-700 mb-1 flex items-center gap-1"><TagIcon className="w-3 h-3" />الوسوم</div>
            <div className="flex flex-wrap items-center gap-1 bg-white border border-pink-200 rounded-lg p-1 min-h-[28px]">
              {(ticket.tags ?? []).map((t: string) => (
                <span key={t} className="text-[10px] font-bold rounded bg-pink-100 text-pink-700 px-1.5 py-0.5 flex items-center gap-1">
                  {t} <button onClick={() => removeTag(t)} className="text-pink-500"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="+ وسم"
                className="text-[10px] flex-1 min-w-[40px] bg-transparent focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="rounded-3xl bg-gradient-to-br from-white to-white p-3 border border-rose-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-rose-600" />
            <div className="font-extrabold text-rose-900 text-[12px]">ملخّص الذكاء الاصطناعي</div>
          </div>
          <div className="flex gap-1">
            <button onClick={aiFirstReply} disabled={busy === "ai-first"} className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-lg disabled:opacity-50">
              {busy === "ai-first" ? "..." : "🤖 ردّ آلي للعميل"}
            </button>
            <button onClick={aiSummary} disabled={aiSumLoading} className="text-[10px] font-bold bg-rose-600 text-white px-2 py-1 rounded-lg disabled:opacity-50">
              {aiSumLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "🧠 لخّص"}
            </button>
          </div>
        </div>
        {ticket.aiSummary ? (
          <div className="text-[12px] text-rose-900 whitespace-pre-wrap leading-relaxed">{ticket.aiSummary}</div>
        ) : (
          <div className="text-[11px] text-rose-500">لا يوجد ملخّص — اضغط "لخّص" لتوليد ملخّص ذكي للمحادثة.</div>
        )}
      </div>

      {/* Messages */}
      <div className="rounded-3xl bg-gradient-to-b from-white/50 to-white p-3 border border-pink-100 space-y-2 max-h-[55vh] overflow-y-auto">
        {messages.map((m: any) => {
          const admin = m.sender === "admin";
          const ai = m.isAiGenerated;
          return (
            <div key={m.id} className={cn("flex", admin ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] shadow-sm",
                admin
                  ? ai ? "bg-gradient-to-br from-rose-100 to-rose-100 border border-rose-300 text-rose-900 rounded-tl-md"
                       : "bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-tl-md"
                  : "bg-white border border-pink-100 text-pink-900 rounded-tr-md",
              )}>
                <div className={cn("text-[10px] font-extrabold mb-0.5 flex items-center gap-1",
                  admin ? (ai ? "text-rose-600" : "text-pink-100") : "text-pink-500")}>
                  {admin && (ai ? <Bot className="w-3 h-3" /> : <Crown className="w-3 h-3" />)}
                  {m.authorName}
                  {ai && <span className="px-1 py-0.5 rounded bg-rose-200 text-rose-800 text-[8px]">AI</span>}
                </div>
                {m.attachmentUrl && m.attachmentUrl.startsWith("data:image/") && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener" className="block mb-1.5">
                    <img src={m.attachmentUrl} alt="مرفق" className="rounded-lg max-h-40 object-contain" />
                  </a>
                )}
                {m.attachmentUrl && !m.attachmentUrl.startsWith("data:image/") && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener" className="block mb-1.5 text-[11px] underline">📎 تنزيل المرفق</a>
                )}
                <div className="whitespace-pre-wrap leading-snug">{m.body}</div>
                <div className={cn("text-[9px] mt-0.5", admin ? (ai ? "text-rose-400" : "text-pink-100/80") : "text-pink-400")}>
                  {new Date(m.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">لا توجد رسائل</div>}
      </div>

      {/* Internal notes */}
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-3 space-y-2">
        <div className="flex items-center gap-1 font-extrabold text-amber-900 text-[12px]">
          <FileText className="w-3.5 h-3.5" /> ملاحظات داخلية ({notes.length})
        </div>
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl bg-white border border-amber-200 p-2 flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold text-amber-700">{n.authorName} · {new Date(n.createdAt).toLocaleString("ar-EG")}</div>
              <div className="text-[12px] text-amber-900 whitespace-pre-wrap">{n.body}</div>
            </div>
            <button onClick={() => delNote(n.id)} className="text-pink-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="ملاحظة داخلية (لا يراها العميل)..."
            className="flex-1 bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-[11px] focus:outline-none"
          />
          <button onClick={addNote} disabled={busy === "note" || !noteBody.trim()} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold disabled:opacity-50">إضافة</button>
        </div>
      </div>

      {/* Reply box */}
      {ticket.status === "closed" ? (
        <div className="rounded-2xl bg-zinc-100 text-zinc-700 text-[12px] font-bold p-3 flex items-center justify-center gap-1">
          <Lock className="w-4 h-4" /> هذه التذكرة مغلقة — افتحها لإرسال رد
        </div>
      ) : (
        <div className="fancy-card rounded-3xl p-2 space-y-2">
          {/* Quick actions row */}
          <div className="flex flex-wrap gap-1.5 px-1">
            <button onClick={aiSuggest} disabled={aiSugLoading} className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50">
              {aiSugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} اقتراح ذكي
            </button>
            <button onClick={() => setShowTemplatePicker(!showTemplatePicker)} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> قوالب ({templates.length})
            </button>
          </div>
          {showTemplatePicker && templates.length > 0 && (
            <div className="border border-pink-100 rounded-2xl p-2 max-h-40 overflow-y-auto bg-white/40 space-y-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setBody(t.body); setShowTemplatePicker(false); }}
                  className="fancy-card w-full text-right rounded-xl p-2 hover:bg-white"
                >
                  <div className="text-[11px] font-extrabold text-pink-800">{t.title}</div>
                  <div className="text-[10px] text-pink-600 line-clamp-1">{t.body}</div>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={busy === "attach"} className="p-2.5 rounded-2xl bg-white text-pink-600 disabled:opacity-50">
              {busy === "attach" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="اكتب رد الدعم الفني..."
              className="flex-1 resize-none bg-white/40 rounded-2xl px-3 py-2 text-[12.5px] focus:outline-none"
            />
            <div className="flex flex-col gap-1">
              <button onClick={() => send()} disabled={busy === "send" || !body.trim()} className="px-3 py-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow active:scale-95 disabled:opacity-50">
                {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
              <button onClick={() => send({ close: true })} disabled={busy === "send" || !body.trim()} title="رد + حلّها" className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[9px] font-bold shadow disabled:opacity-50">
                + حلّها
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics panel ─────────────────────────────────────────────
function AnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const load = async () => { try { setData(await af(`/support/analytics?days=${days}`)); } catch {} };
  useEffect(() => { load(); }, [days]);

  if (!data) return <div className="fancy-card rounded-3xl p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-pink-400" /></div>;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white to-white border border-rose-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-extrabold text-rose-900 text-[13px] flex items-center gap-1"><BarChart2 className="w-4 h-4" /> إحصائيات الدعم — آخر {days} يوم</div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", days === d ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700")}>{d}ي</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat label="إجمالي" value={data.total} color="text-pink-700" />
        <Stat label="أول رد" value={`${Math.round(data.avgFirstReplyMinutes)}د`} color="text-emerald-700" />
        <Stat label="حلّ" value={`${data.avgResolveHours.toFixed(1)}س`} color="text-blue-700" />
        <Stat label="رضا" value={data.avgCsat ? `${data.avgCsat.toFixed(1)}/5` : "—"} color="text-amber-700" />
      </div>
      {data.daily?.length > 1 && (
        <div className="rounded-2xl bg-white p-2 border border-rose-200">
          <div className="text-[10px] font-bold text-rose-700 mb-1 px-1">تذاكر يومية</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.daily.map((d: any) => ({ day: d.day.slice(5), count: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={24} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
              <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {data.byStatus?.length > 0 && (
          <div className="rounded-2xl bg-white p-2 border border-rose-200">
            <div className="text-[10px] font-bold text-rose-700 mb-1">حسب الحالة</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" outerRadius={50} label={(e: any) => `${(e.percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.byStatus.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {data.byCategory?.length > 0 && (
          <div className="rounded-2xl bg-white p-2 border border-rose-200">
            <div className="text-[10px] font-bold text-rose-700 mb-1">حسب الفئة</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="count" nameKey="category" outerRadius={50} label={(e: any) => `${(e.percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.byCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
function Stat({ label, value, color }: any) {
  return (
    <div className="rounded-xl bg-white border border-rose-200 p-2 text-center">
      <div className="text-[9px] font-bold text-rose-700">{label}</div>
      <div className={cn("font-extrabold text-sm", color)}>{value}</div>
    </div>
  );
}

// ─── Templates panel ─────────────────────────────────────────────
function TemplatesPanel() {
  const [list, setList] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const load = async () => { try { setList(await af<Template[]>("/support/templates")); } catch {} };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.title || !editing?.body) return;
    try {
      if (editing.id) await af(`/support/templates/${editing.id}`, { method: "PATCH", body: JSON.stringify(editing) });
      else await af(`/support/templates`, { method: "POST", body: JSON.stringify(editing) });
      setEditing(null);
      await load();
    } catch (e: any) { alert(e?.message ?? "فشل"); }
  }
  async function del(id: number) {
    if (!confirm("حذف القالب؟")) return;
    await af(`/support/templates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-extrabold text-emerald-900 text-[13px] flex items-center gap-1"><MessageSquare className="w-4 h-4" /> قوالب الردود السريعة</div>
        <button onClick={() => setEditing({ title: "", body: "", category: "general", sortOrder: 0 })} className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
          <Plus className="w-3 h-3" /> جديد
        </button>
      </div>
      {list.length === 0 && <div className="text-center text-[11px] text-emerald-600 py-3">لا توجد قوالب — أضف قوالب لتسريع الرد على الأسئلة المتكررة</div>}
      {list.map((t) => (
        <div key={t.id} className="rounded-xl bg-white border border-emerald-200 p-2">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="font-extrabold text-emerald-900 text-[12px]">{t.title}</div>
              <div className="text-[10px] text-emerald-700 line-clamp-2 whitespace-pre-wrap">{t.body}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(t)} className="text-emerald-600 text-[10px] font-bold underline">تعديل</button>
              <button onClick={() => del(t.id)} className="text-pink-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-emerald-900">{editing.id ? "تعديل قالب" : "قالب جديد"}</div>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-emerald-400" /></button>
            </div>
            <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="العنوان (مثل: تأكيد الطلب)" className="w-full bg-emerald-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none" />
            <textarea value={editing.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={5} placeholder="نص الرد..." className="w-full bg-emerald-50 rounded-xl px-3 py-2 text-[12px] focus:outline-none" />
            <input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="الفئة" className="w-full bg-emerald-50 rounded-xl px-3 py-2 text-[12px] focus:outline-none" />
            <button onClick={save} className="w-full py-2.5 rounded-2xl bg-emerald-600 text-white font-extrabold">حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agents panel ───────────────────────────────────────────────
function AgentsPanel({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<Agent[]>([]);
  const [adding, setAdding] = useState<{ username: string; displayName: string } | null>(null);
  const load = async () => { try { setList(await af<Agent[]>("/support/agents")); } catch {} };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!adding?.username || !adding?.displayName) return;
    try { await af(`/support/agents`, { method: "POST", body: JSON.stringify(adding) }); setAdding(null); await load(); onChange(); } catch (e: any) { alert(e?.message ?? "فشل"); }
  }
  async function del(id: number) {
    if (!confirm("إخفاء هذا الموظف؟")) return;
    await af(`/support/agents/${id}`, { method: "DELETE" });
    await load(); onChange();
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-extrabold text-amber-900 text-[13px] flex items-center gap-1"><UsersIcon className="w-4 h-4" /> موظفو الدعم</div>
        <button onClick={() => setAdding({ username: "", displayName: "" })} className="bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
          <Plus className="w-3 h-3" /> موظف جديد
        </button>
      </div>
      {list.length === 0 && <div className="text-center text-[11px] text-amber-600 py-3">لا يوجد موظفون — أضف موظفي الدعم لتعيين التذاكر إليهم</div>}
      {list.map((a) => (
        <div key={a.id} className="rounded-xl bg-white border border-amber-200 p-2 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-amber-900 text-[12px]">{a.displayName}</div>
            <div className="text-[10px] text-amber-700">@{a.username}</div>
          </div>
          <button onClick={() => del(a.id)} className="text-pink-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      {adding && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAdding(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-amber-900">موظف دعم جديد</div>
              <button onClick={() => setAdding(null)}><X className="w-5 h-5 text-amber-400" /></button>
            </div>
            <input value={adding.username} onChange={(e) => setAdding({ ...adding, username: e.target.value })} placeholder="معرّف فريد (مثل: ahmed)" className="w-full bg-amber-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none" />
            <input value={adding.displayName} onChange={(e) => setAdding({ ...adding, displayName: e.target.value })} placeholder="الاسم المعروض (مثل: أحمد - فريق الدعم)" className="w-full bg-amber-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none" />
            <button onClick={save} className="w-full py-2.5 rounded-2xl bg-amber-600 text-white font-extrabold">إضافة</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FaqAnalyticsPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await af<any>("/faq/analytics");
      setData(r);
    } catch (e: any) {
      setErr(e?.message ?? "فشل");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-cyan-100 text-center text-sm text-cyan-600 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> جارٍ جلب الإحصائيات...
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-3xl bg-white p-4 border border-pink-200 text-sm text-pink-700">
        تعذر التحميل: {err}
      </div>
    );
  }
  if (!data) return null;

  const items = data.items ?? [];
  const totals = data.totals ?? { up: 0, down: 0, total: 0 };
  const helpfulPct = totals.total > 0 ? Math.round((totals.up / totals.total) * 100) : 0;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 border border-cyan-100 space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-cyan-600" />
        <div className="font-extrabold text-cyan-900">إحصائيات الأسئلة الشائعة</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={<ThumbsUp className="w-4 h-4" />} label="مفيد" value={totals.up} color="bg-emerald-500" />
        <StatTile icon={<ThumbsDown className="w-4 h-4" />} label="غير مفيد" value={totals.down} color="bg-pink-500" />
        <StatTile icon={<BarChart2 className="w-4 h-4" />} label="نسبة الرضا" value={`${helpfulPct}%`} color="bg-cyan-500" />
      </div>

      <div className="rounded-2xl bg-white border border-cyan-100 p-3">
        <div className="text-[11px] font-extrabold text-cyan-900 mb-2 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5 text-pink-500" /> أكثر الأسئلة بحاجة لتحسين
        </div>
        {items.length === 0 ? (
          <div className="text-[11px] text-cyan-600 text-center py-4">
            لا توجد ملاحظات بعد — سجّل المستخدمون آراءهم تحت كل سؤال في صفحة المساعدة.
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 10).map((it: any) => {
              const total = (it.up || 0) + (it.down || 0);
              const upPct = total > 0 ? (it.up / total) * 100 : 0;
              const isWeak = total >= 3 && upPct < 60;
              return (
                <div key={it.id} className="rounded-xl bg-cyan-50/40 border border-cyan-100 p-2">
                  <div className="text-[12px] font-bold text-cyan-900 leading-snug">
                    {it.question}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="rounded-md bg-emerald-100 text-emerald-700 px-1.5 py-0.5 font-bold flex items-center gap-0.5">
                      <ThumbsUp className="w-2.5 h-2.5" /> {it.up || 0}
                    </span>
                    <span className="rounded-md bg-pink-100 text-pink-700 px-1.5 py-0.5 font-bold flex items-center gap-0.5">
                      <ThumbsDown className="w-2.5 h-2.5" /> {it.down || 0}
                    </span>
                    {total > 0 && (
                      <div className="flex-1 h-1.5 rounded-full bg-pink-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${upPct}%` }} />
                      </div>
                    )}
                    {isWeak && (
                      <span className="rounded-md bg-amber-100 text-amber-700 px-1.5 py-0.5 font-bold">
                        يحتاج تحسين
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, color }: any) {
  return (
    <div className="rounded-2xl bg-white p-2.5 border border-cyan-100 text-center">
      <div className={cn("mx-auto w-7 h-7 rounded-xl text-white flex items-center justify-center", color)}>
        {icon}
      </div>
      <div className="text-base font-extrabold text-cyan-900 mt-1 tabular-nums">{value}</div>
      <div className="text-[9px] text-cyan-600 font-bold">{label}</div>
    </div>
  );
}

