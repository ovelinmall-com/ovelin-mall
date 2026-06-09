/**
 * اكتشاف بيئة التشغيل — هل المستخدم داخل APK/TWA أم في المتصفح؟
 *
 * طرق الكشف (أي واحدة تكفي):
 *   1. document.referrer يبدأ بـ android-app:// — علامة TWA الرسمية
 *   2. display-mode: standalone — PWA أو TWA
 *   3. navigator.standalone — iOS Safari PWA
 *
 * نحفظ القيمة في sessionStorage لأن الـ referrer يُفقد عند التنقل بين الصفحات.
 */

const SESSION_KEY = "ovelin_in_app";

function detectInsideApp(): boolean {
  // TWA (Android APK) — أوثق علامة
  if (typeof document !== "undefined" && document.referrer.startsWith("android-app://")) {
    return true;
  }
  // PWA standalone (desktop/mobile)
  if (typeof window !== "undefined") {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if ((window.navigator as any).standalone === true) return true;
  }
  return false;
}

export function isInsideApp(): boolean {
  if (typeof window === "undefined") return false;

  // إذا سبق أن رصدنا APK في هذه الجلسة، نثق بالقيمة المحفوظة
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached === "1") return true;

  const result = detectInsideApp();
  if (result) sessionStorage.setItem(SESSION_KEY, "1");
  return result;
}
