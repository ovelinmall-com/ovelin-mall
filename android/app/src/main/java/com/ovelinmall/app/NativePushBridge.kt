package com.ovelinmall.app

import androidx.lifecycle.lifecycleScope
import com.onesignal.OneSignal
import com.onesignal.user.state.IUserStateObserver
import com.onesignal.user.state.UserChangedState
import com.onesignal.user.subscriptions.IPushSubscriptionObserver
import com.onesignal.user.subscriptions.PushSubscriptionChangedState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/** SDK state is local readiness, not a provider delivery receipt. */
class NativePushBridge(
    private val activity: MainActivity,
    private val stateChanged: () -> Unit,
) {
    private var identityEpoch = 0
    private val subscriptionObserver = object : IPushSubscriptionObserver {
        override fun onPushSubscriptionChange(state: PushSubscriptionChangedState) = stateChanged()
    }
    private val userObserver = object : IUserStateObserver {
        override fun onUserStateChange(state: UserChangedState) = stateChanged()
    }

    fun attach() {
        OneSignal.User.pushSubscription.addObserver(subscriptionObserver)
        OneSignal.User.addObserver(userObserver)
        activity.lifecycleScope.launch {
            val alreadyAllowed = OneSignal.Notifications.permission
            val allowed = alreadyAllowed || OneSignal.Notifications.requestPermission(false)
            // A fresh permission grant is consent to activate push. Do not
            // override an existing subscriber's explicit opt-out.
            if (!alreadyAllowed && allowed) OneSignal.User.pushSubscription.optIn()
            stateChanged()
        }
    }

    fun detach() {
        identityEpoch++
        OneSignal.User.pushSubscription.removeObserver(subscriptionObserver)
        OneSignal.User.removeObserver(userObserver)
    }

    fun ready(): Boolean {
        val subscription = OneSignal.User.pushSubscription
        return OneSignal.Notifications.permission && subscription.optedIn &&
            subscription.id.isNotBlank() && subscription.token.isNotBlank()
    }

    fun login(externalId: String, requestId: String = "") {
        activity.lifecycleScope.launch {
            val epoch = ++identityEpoch
            if (externalId.isBlank() || externalId.length > 128) {
                complete(requestId, false, "invalid_identity")
                return@launch
            }
            try {
                OneSignal.login(externalId)
                repeat(60) {
                    if (epoch != identityEpoch) {
                        complete(requestId, false, "identity_superseded")
                        return@launch
                    }
                    if (OneSignal.User.externalId == externalId &&
                        OneSignal.User.onesignalId.isNotBlank() && ready()) {
                        stateChanged()
                        complete(requestId, true, "")
                        return@launch
                    }
                    delay(500)
                }
                stateChanged()
                complete(requestId, false,
                    if (!OneSignal.Notifications.permission) "notification_permission_required"
                    else "registration_pending")
            } catch (_: Exception) {
                complete(requestId, false, "native_registration_failed")
            }
        }
    }

    fun logout(requestId: String = "") {
        activity.lifecycleScope.launch {
            val epoch = ++identityEpoch
            try {
                OneSignal.logout()
                repeat(60) {
                    if (epoch != identityEpoch) {
                        complete(requestId, false, "identity_superseded")
                        return@launch
                    }
                    if (OneSignal.User.externalId.isBlank()) {
                        stateChanged()
                        complete(requestId, true, "")
                        return@launch
                    }
                    delay(500)
                }
                complete(requestId, false, "logout_pending")
            } catch (_: Exception) {
                complete(requestId, false, "native_logout_failed")
            }
        }
    }

    private fun complete(requestId: String, success: Boolean, error: String) {
        if (!Regex("os_(login|logout)_\\d+_\\d+").matches(requestId)) return
        val result = JSONObject()
            .put("success", success)
            .put("error", error)
            .put("pushReady", ready())
            .put("deliveryConfirmed", false)
        activity.deliverNativePushResult(requestId, result)
    }
}
