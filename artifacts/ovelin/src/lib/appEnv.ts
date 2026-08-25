/**
 * اكتشاف بيئة التشغيل — هل المستخدم داخل APK/TWA/WebView أم في المتصفح؟
 *
 * طرق الكشف (أي واحدة كافية):
 *   1. document.referrer يبدأ بـ android-app:// — علامة TWA الرسمية
 *   2. display-mode: standalone — PWA أو TWA
 *   3. navigator.standalone — iOS Safari PWA
 *   4. User-Agent يحتوي "wv" — Android WebView (APK wrapper)
 *   5. User-Agent يحتوي "WebView" — بعض أدوات صنع APK
 *
 * نحفظ القيمة في localStorage (أدوم من sessionStorage) لأن:
 *   - الـ referrer يُفقد عند التنقل بين الصفحات
 *   - بعض APK wrappers تفتح تبويبات جديدة تمسح sessionStorage
 */

const STORAGE_KEY = "ovelin_in_app";

function detectInsideApp(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;

  // 1. TWA (Android APK عبر Trusted Web Activity) — أوثق علامة
  if (typeof document !== "undefined" && document.referrer.startsWith("android-app://")) {
    return true;
  }

  // 2. PWA / TWA standalone mode
  if (window.matchMedia("(display-mode: standalone)").matches) return true;

  // 3. iOS Safari PWA
  if ((window.navigator as any).standalone === true) return true;

  // 4. Android WebView — العلامة الأكيدة لـ APK من نوع wrapper
  //    User-Agent يحتوي "wv" بين أقواس مثل: Chrome/131.0.0.0 Mobile Safari/537.36 wv
  //    أو داخل الأقواس: (Linux; Android 14; wv)
  if (/Android/i.test(ua) && /\bwv\b/i.test(ua)) return true;

  // 5. بعض أدوات APK تضع "WebView" صريحةً في الـ User-Agent
  if (/WebView/i.test(ua)) return true;

  return false;
}

export function isInsideApp(): boolean {
  if (typeof window === "undefined") return false;

  // إذا سبق أن رصدنا APK في هذا الجهاز، نثق بالقيمة المخزّنة
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // إذا كان localStorage محجوباً نكمل بالكشف الحي
  }

  const result = detectInsideApp();

  if (result) {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // تجاهل إذا كان localStorage محجوباً
    }
  }

  return result;
}
