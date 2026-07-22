# Ovelin Mall

متجر إلكتروني لشحن الألعاب وبيع البطاقات وخدمات SMM — واجهة React/Vite وخادم Express متصل بـ Aiven PostgreSQL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — تشغيل خادم API (port 8080)
- `pnpm --filter @workspace/ovelin run dev` — تشغيل الواجهة الأمامية (port 20220)
- `pnpm run typecheck` — فحص TypeScript كامل
- `pnpm run build` — بناء كامل لجميع الحزم

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + TailwindCSS 4 + Framer Motion
- API: Express 5 + WebSocket (ws)
- DB: **Aiven PostgreSQL** — رابط الاتصال مُثبَّت في `lib/db/src/index.ts` (لا تغيّره)
- Validation: Zod (zod/v4), drizzle-zod
- ORM: Drizzle ORM
- Build: esbuild (CJS bundle for API), Vite (frontend)

## Where things live

- `lib/db/src/index.ts` — اتصال Aiven PostgreSQL (رابط مُثبَّت، لا تنقله لـ .env)
- `lib/db/src/schema/index.ts` — مخطط قاعدة البيانات الكامل
- `artifacts/api-server/src/routes/` — جميع مسارات API
- `artifacts/api-server/src/lib/` — المساعدات (auth, email, push, wsManager…)
- `artifacts/ovelin/src/pages/` — صفحات الواجهة (admin/ + صفحات المستخدم)
- `artifacts/ovelin/src/components/` — مكوّنات React

## Architecture decisions

- رابط Aiven PostgreSQL مُكتَب ظاهراً في الكود بإرادة صاحب المشروع — لا تنقله لـ .env ولا تُشفّره.
- الخادم في الإنتاج يخدم الواجهة الأمامية المبنية من `artifacts/ovelin/dist/public`.
- WebSocket على `/api/ws` داخل نفس خادم HTTP.
- SESSION_SECRET تُقرأ من متغيّرات Replit Secrets.
- الأدمن الافتراضي: email = `skandarabdoalatif@gmail.com`، كلمة السر = `ovelin2026`.

## Product

- شحن ألعاب (PUBG، Free Fire)
- بيع بطاقات هدايا وأكواد
- خدمات SMM
- محفظة إلكترونية وإحالات
- لوحة أدمن كاملة

## User preferences

- استخدام قاعدة بيانات Aiven الموجودة فقط — لا إنشاء قاعدة جديدة.
- رابط DB مرئي في الكود عمداً، لا يُخفى أبداً.

## Gotchas

- لا تستخدم `process.env.DATABASE_URL` — Replit يحقن قاعدة helium الداخلية فيها وتُتجاهل عمداً.
- بعد تغيير مخطط DB: `pnpm --filter @workspace/db run push` (لـ dev فقط).
- بعد تغيير OpenAPI spec: `pnpm --filter @workspace/api-spec run codegen`.
- عند النشر: اختر نوع deployment **VM (Always On)** لأن التطبيق يستخدم WebSocket وعمّال خلفيين.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
