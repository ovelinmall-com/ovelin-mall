// ============================================================
// صفحة Google OAuth Callback — مخفية بالكامل عن المستخدم
// تستقبل code من Google وترسله للسيرفر، ثم تحوّل للرئيسية فوراً
// Invisible callback page — no UI shown to user ever
// ============================================================

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export default function GoogleCallback() {
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      window.location.replace("/");
      return;
    }

    fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (res.ok) {
          await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }
        // سواء نجح أو فشل، حوّل للرئيسية فوراً
        window.location.replace("/");
      })
      .catch(() => {
        window.location.replace("/");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ❌ لا يوجد UI — الصفحة مخفية بالكامل
  return null;
}
