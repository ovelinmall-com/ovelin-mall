// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { Router, type IRouter } from "express";
import {
  db,
  productsTable,
  ordersTable,
  transactionsTable,
  referralsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getAiClient, isAiConfigured } from "../lib/integrations";
import { getUserFromRequest } from "../lib/auth";

const router: IRouter = Router();

const SYSTEM_PROMPT = `أنت "أوفلين"، المساعد الذكي لمتجر OVELIN للخدمات الرقمية.
خدمات OVELIN: متابعين سوشيال ميديا، اشتراكات تطبيقات، شدات PUBG وبطاقات ألعاب، تبادل USDT، تصميم مواقع، بوتات تليجرام.

🌟 قواعد اللغة (مهمة جداً):
- ردّ دائماً بالعربية الفصحى الواضحة، بأسلوب ودود ومختصر ومحترم.
- إذا كتب العميل بلهجة عامية (خليجي، مصري، شامي، مغربي، سوداني، يمني...) افهم قصده ورد بالفصحى.
- إذا فيها أخطاء إملائية أو كلمات مكسورة (مثل "داير" بدل "أريد"، "شنو" بدل "ما"، "يبا" بدل "أبي")، استنتج المعنى المقصود ولا تطلب توضيحاً إلا عند الضرورة القصوى.
- لا ترد بلهجة عامية أبداً، حتى لو كتب العميل بها.

🛠️ لديك أدوات (functions) لقراءة بيانات المتجر الحقيقية. استدعها متى احتجت معلومات دقيقة:
- searchProducts(query?, category?, limit?) للبحث في المنتجات.
- getMyBalance() لمعرفة رصيد المستخدم الحالي.
- getMyOrders(status?, limit?) لقائمة طلبات المستخدم.
- getMyReferralStats() لإحصائيات الإحالة.
- getCategoryStats() لعدد المنتجات في كل فئة.

📋 قواعد الرد:
- لا تخترع أسعاراً أو منتجات — استخدم الأدوات أولاً.
- إذا سأل المستخدم عن رصيد أو طلب أو إحالة بدون تسجيل دخول، اطلب منه تسجيل الدخول بلطف.
- اقترح خطوة عملية في نهاية كل رد (مثلاً: "هل تودّ إرسال رابط الفئة؟").
- استخدم تنسيق منظّم مع أسطر قصيرة وفقرات واضحة.`;

const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "ابحث عن منتجات حسب اسم/وصف وفئة",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "كلمة البحث (اختياري)" },
          category: {
            type: "string",
            description:
              "slug الفئة: social_followers | usdt_exchange | game_cards | app_subscriptions | website_design | telegram_bots",
          },
          limit: { type: "integer", description: "عدد النتائج (الحد 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMyBalance",
      description: "رصيد المستخدم المسجل دخوله الآن",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getMyOrders",
      description: "قائمة طلبات المستخدم الأخيرة",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMyReferralStats",
      description: "إحصائيات الإحالة للمستخدم الحالي",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategoryStats",
      description: "عدد المنتجات النشطة في كل فئة",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function execTool(name: string, args: any, user: any | null): Promise<any> {
  try {
    if (name === "searchProducts") {
      const conds: any[] = [eq(productsTable.active, true)];
      if (args?.category) conds.push(eq(productsTable.category, String(args.category)));
      if (args?.query) {
        const q = String(args.query);
        conds.push(
          or(ilike(productsTable.name, `%${q}%`), ilike(productsTable.description, `%${q}%`))!,
        );
      }
      const limit = Math.min(10, Number(args?.limit) || 5);
      const rows = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          price: productsTable.price,
          oldPrice: productsTable.oldPrice,
          category: productsTable.category,
          ratingAvg: productsTable.ratingAvg,
          salesCount: productsTable.salesCount,
        })
        .from(productsTable)
        .where(and(...conds))
        .orderBy(desc(productsTable.salesCount))
        .limit(limit);
      return { products: rows };
    }
    if (name === "getCategoryStats") {
      const rows = await db
        .select({
          category: productsTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(productsTable)
        .where(eq(productsTable.active, true))
        .groupBy(productsTable.category);
      return { categories: rows };
    }
    if (!user) {
      return { error: "هذه المعلومات تحتاج تسجيل دخول" };
    }
    if (name === "getMyBalance") {
      return {
        balance: user.balance,
        cashbackBalance: user.cashbackBalance,
        vipLevel: user.vipLevel,
        totalSpent: user.totalSpent,
      };
    }
    if (name === "getMyOrders") {
      const conds: any[] = [eq(ordersTable.userId, user.id)];
      if (args?.status) conds.push(eq(ordersTable.status, String(args.status)));
      const rows = await db
        .select({
          id: ordersTable.id,
          productName: ordersTable.productName,
          finalPrice: ordersTable.finalPrice,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .where(and(...conds))
        .orderBy(desc(ordersTable.createdAt))
        .limit(Math.min(10, Number(args?.limit) || 5));
      return { orders: rows };
    }
    if (name === "getMyReferralStats") {
      const rows = await db
        .select({
          c: sql<number>`count(*)::int`,
          e: sql<string>`coalesce(sum(${referralsTable.earned}::numeric), 0)::text`,
        })
        .from(referralsTable)
        .where(eq(referralsTable.referrerId, user.id));
      return {
        referralCode: user.referralCode,
        totalReferrals: Number(rows[0]?.c ?? 0),
        totalEarned: rows[0]?.e ?? "0",
      };
    }
    return { error: "أداة غير معروفة" };
  } catch (err: any) {
    return { error: err?.message ?? "خطأ في تنفيذ الأداة" };
  }
}

const sessions: Map<
  string,
  Array<{ role: "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any }>
> = new Map();

router.get("/chatbot/status", (_req, res) => {
  res.json({ enabled: isAiConfigured() });
});

router.get("/chatbot/history", (req, res) => {
  const sessionId = (req.headers["x-session-id"] as string) || "default";
  const history = sessions.get(sessionId) || [];
  res.json(history.filter((m) => m.role === "user" || m.role === "assistant"));
});

// Streaming endpoint — يرسل الرد سطر بسطر مثل ChatGPT
router.post("/chatbot/stream", async (req, res) => {
  const { message } = req.body as { message: string };
  if (!message?.trim()) {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }
  if (!isAiConfigured()) {
    res
      .status(503)
      .json({ error: "الشات بوت غير مفعّل حالياً. اطلب من المسؤول تفعيل تكامل Replit AI." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sessionId = (req.headers["x-session-id"] as string) || "default";
  const history = sessions.get(sessionId) || [];
  const user = await getUserFromRequest(req);

  history.push({ role: "user", content: message.trim() });
  if (history.length > 30) history.splice(0, history.length - 30);

  try {
    const client = getAiClient();
    let messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    let answer = "";
    let toolRound = 0;

    while (toolRound < 4) {
      // First do a non-streaming probe to detect tool calls (cheaper than streaming with tools)
      const probe = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 1500,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });
      const choice = probe.choices[0]?.message;
      if (!choice) break;
      if (choice.tool_calls && choice.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: choice.content ?? "",
          tool_calls: choice.tool_calls,
        });
        for (const tc of choice.tool_calls) {
          let args: any = {};
          try {
            args = JSON.parse((tc as any).function?.arguments || "{}");
          } catch {}
          const result = await execTool((tc as any).function?.name, args, user);
          messages.push({
            role: "tool",
            tool_call_id: (tc as any).id,
            content: JSON.stringify(result),
          });
        }
        toolRound++;
        continue;
      }
      // No tool calls → stream the final answer for the typewriter effect
      const stream = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 2500,
        messages,
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = (chunk as any).choices?.[0]?.delta?.content as string | undefined;
        if (delta) {
          answer += delta;
          send("delta", { text: delta });
        }
      }
      break;
    }

    if (!answer) {
      answer = "عذراً، لم أستطع الردّ. حاول مجدداً.";
      send("delta", { text: answer });
    }

    history.push({ role: "assistant", content: answer });
    sessions.set(sessionId, history);

    // Generate 3 contextual follow-up suggestions
    let suggestions: string[] = [];
    try {
      const sugRes = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 250,
        messages: [
          {
            role: "system",
            content:
              'أنت تولّد اقتراحات أسئلة سريعة للعميل بعد رد المساعد، مكتوبة بصيغة المتكلم (العميل) بالعربية الفصحى. أعد فقط JSON بهذا الشكل: {"suggestions":["...","...","..."]}. كل اقتراح قصير (٣ إلى ٧ كلمات)، مفيد، ومرتبط مباشرة بالسؤال السابق ورد المساعد. لا تكرر نفس الفكرة. لا تضف أي نص خارج JSON.',
          },
          {
            role: "user",
            content: `سؤال العميل: ${message.trim()}\n\nرد المساعد: ${answer}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const raw = sugRes.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = parsed.suggestions
          .filter((s: any) => typeof s === "string")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && s.length <= 80)
          .slice(0, 3);
      }
    } catch (e) {
      req.log.warn({ err: e }, "AI suggestions generation failed");
    }

    send("suggestions", { suggestions });
    send("done", { ok: true });
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "AI chatbot streaming error");
    send("error", { error: "حدث خطأ في الذكاء الاصطناعي، حاول لاحقاً." });
    res.end();
  }
});

// Legacy non-streaming endpoint kept for compatibility
router.post("/chatbot/send", async (req, res) => {
  const { message } = req.body as { message: string };
  if (!message?.trim()) {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }
  if (!isAiConfigured()) {
    res
      .status(503)
      .json({ error: "الشات بوت غير مفعّل حالياً. اطلب من المسؤول تفعيل تكامل Replit AI." });
    return;
  }

  const sessionId = (req.headers["x-session-id"] as string) || "default";
  const history = sessions.get(sessionId) || [];
  const user = await getUserFromRequest(req);

  history.push({ role: "user", content: message.trim() });
  if (history.length > 30) history.splice(0, history.length - 30);

  try {
    const client = getAiClient();
    let messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    let answer = "عذراً، لم أستطع الرد. حاول مجدداً.";
    for (let step = 0; step < 4; step++) {
      const completion = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 2500,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });
      const choice = completion.choices[0]?.message;
      if (!choice) break;
      if (choice.tool_calls && choice.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: choice.content ?? "",
          tool_calls: choice.tool_calls,
        });
        for (const tc of choice.tool_calls) {
          let args: any = {};
          try {
            args = JSON.parse((tc as any).function?.arguments || "{}");
          } catch {}
          const result = await execTool((tc as any).function?.name, args, user);
          messages.push({
            role: "tool",
            tool_call_id: (tc as any).id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }
      answer = choice.content ?? answer;
      break;
    }

    history.push({ role: "assistant", content: answer });
    sessions.set(sessionId, history);

    let suggestions: string[] = [];
    try {
      const sugRes = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              'أعد JSON بالشكل: {"suggestions":["...","...","..."]}. كل اقتراح قصير ومرتبط بسؤال العميل ورد المساعد، بصيغة المتكلم العربية الفصحى.',
          },
          {
            role: "user",
            content: `سؤال العميل: ${message.trim()}\n\nرد المساعد: ${answer}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const raw = sugRes.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = parsed.suggestions
          .filter((s: any) => typeof s === "string")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && s.length <= 80)
          .slice(0, 3);
      }
    } catch (e) {
      req.log.warn({ err: e }, "AI suggestions generation failed");
    }

    res.json({ answer, suggestions });
  } catch (err: any) {
    req.log.error({ err }, "AI chatbot error");
    res.status(500).json({ error: "حدث خطأ في الذكاء الاصطناعي، حاول لاحقاً." });
  }
});

export default router;
