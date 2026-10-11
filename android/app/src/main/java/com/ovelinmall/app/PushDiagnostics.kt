package com.ovelinmall.app

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Process
import android.view.Gravity
import android.widget.Button
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.common.GoogleApiAvailability
import com.onesignal.OneSignal
import kotlinx.coroutines.launch

/**
 * Only included in an isolated diagnostic APK. Never reads or copies a push
 * token. The SDK and initialization order deliberately match the supplied APK.
 */
object PushDiagnostics {
    fun attach(activity: MainActivity) {
        val density = activity.resources.displayMetrics.density
        val button = Button(activity).apply {
            text = "فحص الإشعارات"
            textSize = 12f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(229, 0, 102))
            setOnClickListener { show(activity) }
        }
        val params = FrameLayout.LayoutParams(
            (148 * density).toInt(), (46 * density).toInt(),
            Gravity.TOP or Gravity.START
        ).apply {
            topMargin = (10 * density).toInt()
            marginStart = (12 * density).toInt()
        }
        activity.addContentView(button, params)
    }

    private fun show(activity: MainActivity) {
        Thread {
            val report = report(activity)
            activity.runOnUiThread {
                if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
                AlertDialog.Builder(activity)
                    .setTitle("فحص الهاتف الحقيقي")
                    .setMessage(report)
                    .setNegativeButton("إغلاق", null)
                    .setNeutralButton("نسخ التقرير") { _, _ ->
                        val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("Ovelin push diagnostics", report))
                        Toast.makeText(activity, "تم نسخ التقرير — لا يحتوي على توكن أو مفتاح", Toast.LENGTH_LONG).show()
                    }
                    .setPositiveButton("تفعيل الإشعارات") { _, _ ->
                        // Explicit user action, never silently overrides an opt-out.
                        activity.lifecycleScope.launch {
                            OneSignal.Notifications.requestPermission(true)
                            OneSignal.User.pushSubscription.optIn()
                            Toast.makeText(activity, "انتظر 30 ثانية ثم افتح الفحص مجددًا", Toast.LENGTH_LONG).show()
                        }
                    }
                    .show()
            }
        }.start()
    }

    private fun report(activity: Activity): String {
        val subscription = OneSignal.User.pushSubscription
        val permission = OneSignal.Notifications.permission
        val googleStatus = try {
            GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(activity)
        } catch (_: Exception) { -1 }
        // Reading the actual SDK model reveals errors hidden by the provider's
        // generic "unsubscribed" status. This is debug-only and fails explicitly
        // when that SDK does not expose the model.
        val status = try {
            val model = subscription.javaClass.getMethod("getModel").invoke(subscription)
            val state = model.javaClass.getMethod("getStatus").invoke(model)
            val number = state.javaClass.getMethod("getValue").invoke(state)
            "$state ($number)"
        } catch (_: Exception) { "غير متاح من هذا SDK — راجع سجل الخطأ أدناه" }
        val externalId = try {
            OneSignal.User.javaClass.getMethod("getExternalId").invoke(OneSignal.User)?.toString()
        } catch (_: Exception) { null }
        return buildString {
            appendLine("نسخة فحص منفصلة — لا تحذف التطبيق الأصلي")
            appendLine("Android: ${Build.VERSION.RELEASE}")
            appendLine("SDK: OneSignal 5.1.6 (نفس النسخة الأصلية)")
            appendLine("إذن الإشعارات: ${if (permission) "مسموح" else "غير مسموح"}")
            appendLine("Google Play Services: ${googleExplanation(googleStatus)} ($googleStatus)")
            appendLine("Opted in: ${subscription.optedIn}")
            appendLine("Push token موجود: ${!subscription.token.isNullOrBlank()}")
            appendLine("حالة التسجيل المحلية: $status")
            appendLine("Subscription ID: ${subscription.id ?: "لم يتولد"}")
            appendLine("OneSignal User ID: ${OneSignal.User.onesignalId ?: "لم يتولد"}")
            appendLine("External ID: ${externalId ?: "غير متاح / لم يتم الربط"}")
            appendLine()
            appendLine("سجل أخطاء SDK الخاص بهذه العملية:")
            appendLine(ownErrorLog())
            appendLine()
            append("وجود توكن لا يثبت وصول الإشعار. نسخ التقرير يساعد على التحقق من السبب الحقيقي.")
        }
    }

    private fun googleExplanation(status: Int): String = when (status) {
        0 -> "متاحة"
        1 -> "غير مثبتة"
        2 -> "تحتاج تحديث"
        3 -> "معطلة"
        9 -> "النسخة غير صالحة"
        18 -> "جارٍ التحديث"
        else -> "تعذر تحديد الحالة"
    }

    private fun ownErrorLog(): String {
        return try {
            val process = ProcessBuilder(
                "/system/bin/logcat", "-d", "-t", "180", "--pid=${Process.myPid()}",
                "OneSignal:W", "FirebaseMessaging:W", "Firebase-Installations:W", "*:S"
            ).redirectErrorStream(true).start()
            // Running outside the UI thread. logcat -d exits after the snapshot.
            val text = process.inputStream.bufferedReader().use { it.readText() }
            process.waitFor()
            val relevant = text.lineSequence()
                .filter { Regex("(?i)exception|error|failed|unavailable|authentication|FIS_|sender|denied|permission|firebase|forbidden").containsMatchIn(it) }
                .takeLastLines(24)
                .joinToString("\n")
            if (relevant.isBlank()) "لم يظهر خطأ في السجل المتاح؛ انتظر 30 ثانية ثم أعد الفحص."
            else redact(relevant).take(6500)
        } catch (_: Exception) {
            "Android لم يسمح بقراءة سجل العملية. حالة SDK المحلية أعلاه تظل نتيجة مباشرة من الهاتف."
        }
    }

    private fun Sequence<String>.takeLastLines(count: Int): List<String> =
        toList().takeLast(count)

    private fun redact(text: String): String = text
        .replace(Regex("AIza[A-Za-z0-9_-]+"), "[API KEY REDACTED]")
        .replace(Regex("(?i)(authorization\\s*[:=]\\s*)([^\\r\\n]+)"), "$1[REDACTED]")
        .replace(Regex("(?i)([\"']?(?:push_?token|token|identifier|api_?key)[\"']?\\s*[:=]\\s*[\"']?)([^\"'\\s,}]+)"), "$1[REDACTED]")
        .replace(Regex("[A-Za-z0-9_:.\\-]{100,}"), "[LONG VALUE REDACTED]")
}
