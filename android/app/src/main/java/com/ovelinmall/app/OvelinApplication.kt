package com.ovelinmall.app

import android.app.Application
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class OvelinApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        OneSignal.Debug.logLevel = LogLevel.WARN
        OneSignal.initWithContext(this, "f2c9dd19-71f0-4af3-8a5b-12f34d99e76a")
    }
}
