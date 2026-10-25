package com.ovelinmall.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class OvelinApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        createPushNotificationChannel()
        OneSignal.Debug.logLevel = LogLevel.WARN
        OneSignal.initWithContext(this, "f2c9dd19-71f0-4af3-8a5b-12f34d99e76a")
    }

    private fun createPushNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            PUSH_NOTIFICATION_CHANNEL_ID,
            getString(R.string.app_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.push_notification_channel_description)
            setSound(
                Uri.parse("android.resource://$packageName/${R.raw.ovelin_notification}"),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            enableVibration(true)
        }

        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }

    companion object {
        const val PUSH_NOTIFICATION_CHANNEL_ID = "ovelin_alerts_custom_v1"
    }
}
