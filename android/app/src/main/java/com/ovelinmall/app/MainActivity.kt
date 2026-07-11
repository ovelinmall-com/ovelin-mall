package com.ovelinmall.app

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
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
    private val TARGET_URL = "https://ovelinmall-ovelin-mall.hf.space/"
    private val ONESIGNAL_APP_ID = "f2c9dd19-71f0-4af3-8a5b-12f34d99e76a"
    private val SESSION_TIMEOUT_MS = 5 * 60 * 1000L   // 5 minutes
    private var pausedAt: Long = 0

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
                            var pid = OvelinBridge.getOneSignalPlayerId();
                            if (typeof callback === 'function') callback({ oneSignalUserId: pid });
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

        // Restore WebView state if activity was recreated (e.g. rotation)
        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
        } else if (isConnected()) {
            binding.webView.loadUrl(TARGET_URL)
        } else {
            showNoConnection()
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
        if (pausedAt > 0 && System.currentTimeMillis() - pausedAt > SESSION_TIMEOUT_MS) {
            // User was away more than 5 minutes → fresh home page load
            pausedAt = 0
            if (isConnected()) {
                binding.webView.loadUrl(TARGET_URL)
            } else {
                showNoConnection()
            }
        } else {
            pausedAt = 0  // reset; was away less than 5 min, resume as-is
        }
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
                // Cache-first: use cached content instantly, refresh in background
                cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
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
                    view?.evaluateJavascript(BRIDGE_JS, null)
                    binding.progressBar.visibility = View.VISIBLE
                    binding.noConnectionLayout.visibility = View.GONE
                    binding.webView.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
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
                        binding.progressBar.visibility = View.GONE
                        binding.swipeRefresh.isRefreshing = false
                        showNoConnection()
                    }
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
        fun getOneSignalPlayerId(): String = OneSignal.User.onesignalId ?: ""

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
                if (isConnected()) {
                    binding.noConnectionLayout.visibility = View.GONE
                    binding.webView.visibility = View.VISIBLE
                    binding.webView.reload()
                } else {
                    isRefreshing = false
                    showNoConnection()
                }
            }
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
