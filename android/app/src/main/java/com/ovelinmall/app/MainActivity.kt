package com.ovelinmall.app

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import com.ovelinmall.app.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val TARGET_URL = "https://ovelinmall.com/"
    private val ONESIGNAL_APP_ID = "f2c9dd19-71f0-4af3-8a5b-12f34d99e76a"
    private val LOAD_TIMEOUT_MS = 20_000L
    private val RELOAD_AFTER_BACKGROUND_MS = 5 * 60 * 1000L
    private var pausedAt: Long = 0
    private var pageLoaded = false
    private var mainFrameFailed = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val loadTimeout = Runnable {
        if (!pageLoaded) {
            binding.progressBar.visibility = View.GONE
            binding.swipeRefresh.isRefreshing = false
            showNoConnection()
        }
    }

    private val STABILITY_JS = """
        (function() {
            document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
                img.setAttribute('loading', 'eager');
            });
            document.querySelectorAll('img[data-src]').forEach(function(img) {
                if (img.dataset.src) img.src = img.dataset.src;
            });
            document.querySelectorAll('img[data-lazy]').forEach(function(img) {
                if (img.dataset.lazy) img.src = img.dataset.lazy;
            });
        })();
    """.trimIndent()

    private val BRIDGE_JS = """
        (function() {
            if (window.gonative && window.gonative._fullyLoaded) return;
            window.gonative = {
                _fullyLoaded: true,
                isNative: true,
                platform: 'android',
                version: '1.0.0',
                onesignal: {
                    login: function(externalId, callback) {
                        try {
                            OvelinBridge.oneSignalLogin(externalId);
                            if (typeof callback === 'function') callback({ success: true });
                        } catch(e) {
                            if (typeof callback === 'function') callback({ success: false });
                        }
                    },
                    logout: function(callback) {
                        try {
                            OvelinBridge.oneSignalLogout();
                            if (typeof callback === 'function') callback({ success: true });
                        } catch(e) {}
                    },
                    getPlayerId: function(callback) {
                        try {
                            var pid = OvelinBridge.getOneSignalPlayerId();
                            if (typeof callback === 'function') callback(pid);
                        } catch(e) {}
                    },
                    onesignalInfo: function(options) {
                        var callbackName = options && options.callback;
                        var attempts = 0;
                        var deliver = function() {
                            try {
                                var subscriptionId = OvelinBridge.getOneSignalPlayerId();
                                var userId = OvelinBridge.getOneSignalUserId();
                                var pushToken = OvelinBridge.getOneSignalPushToken();
                                var info = {
                                    playerId: subscriptionId,
                                    subscriptionId: subscriptionId,
                                    onesignalId: userId,
                                    pushToken: pushToken
                                };
                                if (callbackName && typeof window[callbackName] === 'function') {
                                    window[callbackName](info);
                                }
                                // OneSignal initializes asynchronously. Keep checking
                                // so the web app cannot miss the first subscription.
                                if (!subscriptionId && attempts++ < 24) {
                                    setTimeout(deliver, 500);
                                }
                            } catch(e) {
                                if (attempts++ < 24) setTimeout(deliver, 500);
                            }
                        };
                        deliver();
                    },
                    getTags: function(callback) {
                        if (typeof callback === 'function') callback({});
                    },
                    sendTag: function(key, value, callback) {
                        if (typeof callback === 'function') callback({ success: true });
                    }
                },
                registration: {
                    getRegistrationId: function(callback) {
                        try {
                            var subscriptionId = OvelinBridge.getOneSignalPlayerId();
                            var userId = OvelinBridge.getOneSignalUserId();
                            if (typeof callback === 'function') callback({
                                oneSignalUserId: userId,
                                subscriptionId: subscriptionId,
                                playerId: subscriptionId
                            });
                        } catch(e) {}
                    }
                },
                statusbar: { setStyle: function() {} },
                sidebar:   { open: function() {}, close: function() {} }
            };
            document.dispatchEvent(new Event('gonative.ready'));
        })();
    """.trimIndent()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        initOneSignal()
        setupWebView()
        setupSwipeRefresh()

        if (savedInstanceState == null) {
            loadFreshSite()
        } else {
            binding.webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        pausedAt = System.currentTimeMillis()
    }

    override fun onResume() {
        super.onResume()
        if (pausedAt > 0) {
            val backgroundDuration = System.currentTimeMillis() - pausedAt
            if (backgroundDuration >= RELOAD_AFTER_BACKGROUND_MS) {
                // A long absence starts a fresh session. Short returns keep the
                // current WebView route, scroll position, and in-progress form.
                loadFreshSite(resetNavigation = true)
            }
        }
        pausedAt = 0
    }

    private fun initOneSignal() {
        OneSignal.Debug.logLevel = LogLevel.NONE
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
        lifecycleScope.launch {
            OneSignal.Notifications.requestPermission(true)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webView.apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            addJavascriptInterface(OvelinBridgeInterface(), "OvelinBridge")

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                // The wrapper must always reflect the live website, never stale HTML.
                cacheMode = WebSettings.LOAD_NO_CACHE
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                javaScriptCanOpenWindowsAutomatically = true
                setSupportMultipleWindows(false)
                userAgentString = "$userAgentString gonative"
            }

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    pageLoaded = false
                    mainFrameFailed = false
                    mainHandler.removeCallbacks(loadTimeout)
                    mainHandler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS)
                    view?.evaluateJavascript(BRIDGE_JS, null)
                    binding.progressBar.visibility = View.VISIBLE
                    binding.noConnectionLayout.visibility = View.GONE
                    binding.webView.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    if (mainFrameFailed) return
                    pageLoaded = true
                    mainHandler.removeCallbacks(loadTimeout)
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    view?.evaluateJavascript(BRIDGE_JS, null)
                    view?.evaluateJavascript(STABILITY_JS, null)
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        mainFrameFailed = true
                        binding.progressBar.visibility = View.GONE
                        binding.swipeRefresh.isRefreshing = false
                        showNoConnection()
                    }
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (request?.isForMainFrame == true &&
                        (errorResponse?.statusCode ?: 200) >= 400
                    ) {
                        mainFrameFailed = true
                        pageLoaded = false
                        mainHandler.removeCallbacks(loadTimeout)
                        binding.progressBar.visibility = View.GONE
                        binding.swipeRefresh.isRefreshing = false
                        showNoConnection()
                    }
                }

                override fun onReceivedSslError(
                    view: WebView?,
                    handler: SslErrorHandler?,
                    error: android.net.http.SslError?
                ) {
                    handler?.cancel()
                    mainFrameFailed = true
                    pageLoaded = false
                    mainHandler.removeCallbacks(loadTimeout)
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    showNoConnection()
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean = false
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    super.onProgressChanged(view, newProgress)
                    binding.progressBar.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
                    if (newProgress == 100) binding.swipeRefresh.isRefreshing = false
                }

                override fun onJsAlert(
                    view: WebView?, url: String?, message: String?, result: JsResult?
                ): Boolean {
                    result?.confirm()
                    return true
                }
            }

            CookieManager.getInstance().apply {
                setAcceptCookie(true)
                setAcceptThirdPartyCookies(binding.webView, true)
            }
        }
    }

    inner class OvelinBridgeInterface {
        @JavascriptInterface
        fun getOneSignalPlayerId(): String =
            OneSignal.User.pushSubscription.id ?: ""

        @JavascriptInterface
        fun getOneSignalUserId(): String =
            OneSignal.User.onesignalId ?: ""

        @JavascriptInterface
        fun getOneSignalPushToken(): String =
            OneSignal.User.pushSubscription.token ?: ""

        @JavascriptInterface
        fun oneSignalLogin(externalId: String) {
            lifecycleScope.launch { OneSignal.login(externalId) }
        }

        @JavascriptInterface
        fun oneSignalLogout() {
            lifecycleScope.launch { OneSignal.logout() }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun getPlatform(): String = "android"
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeColors(resources.getColor(R.color.primary_pink, theme))
            setOnRefreshListener {
                loadFreshSite()
            }
        }
    }

    private fun loadFreshSite(resetNavigation: Boolean = false) {
        pageLoaded = false
        mainFrameFailed = false
        mainHandler.removeCallbacks(loadTimeout)
        if (!isConnected()) {
            binding.progressBar.visibility = View.GONE
            binding.swipeRefresh.isRefreshing = false
            showNoConnection()
            return
        }

        binding.noConnectionLayout.visibility = View.GONE
        binding.webView.visibility = View.VISIBLE
        binding.progressBar.visibility = View.VISIBLE
        if (resetNavigation) {
            // Preserve cookies/session, but intentionally start from the home
            // page after the five-minute background timeout.
            binding.webView.clearHistory()
            binding.webView.loadUrl(TARGET_URL)
        } else if (binding.webView.url.isNullOrBlank()) {
            binding.webView.loadUrl(TARGET_URL)
        } else {
            // Refresh the current page without destroying the WebView history.
            binding.webView.reload()
        }
    }

    private fun showNoConnection() {
        binding.noConnectionLayout.visibility = View.VISIBLE
        binding.webView.visibility = View.GONE
    }

    private fun isConnected(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
