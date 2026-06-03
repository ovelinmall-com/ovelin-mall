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

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  hideFooter?: boolean;
}

export function AppLayout({
  children,
  hideNav = false,
  hideFooter = false,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-transparent">
      <main className="flex-1 pb-2">
        {children}
        {!hideFooter && <Footer />}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
