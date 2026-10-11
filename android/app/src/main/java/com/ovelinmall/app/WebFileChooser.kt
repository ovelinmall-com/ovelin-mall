package com.ovelinmall.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

/** Android owns the picker; WebView receives only the selected, granted URIs. */
class WebFileChooser(private val activity: ComponentActivity) {
    private var callback: ValueCallback<Array<Uri>>? = null
    private var skipNextResume = false
    private val launcher = activity.registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val selected = if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val clip = data?.clipData
            if (clip != null) {
                Array(clip.itemCount) { clip.getItemAt(it).uri }
            } else {
                data?.data?.let { arrayOf(it) }
            }
        } else null
        val safe = selected?.filter { it.scheme == "content" || it.scheme == "file" }
            ?.toTypedArray()?.takeIf { it.isNotEmpty() }
        finish(safe)
    }

    fun show(
        next: ValueCallback<Array<Uri>>?,
        params: WebChromeClient.FileChooserParams?,
    ): Boolean {
        if (next == null) return false
        // Do not allow a second picker result to reach the first input.
        if (callback != null) {
            next.onReceiveValue(null)
            return true
        }
        callback = next
        skipNextResume = true
        try {
            val mimeTypes = params?.acceptTypes.orEmpty()
                .flatMap { it.split(',') }.map { it.trim().lowercase() }
                .mapNotNull {
                    when {
                        '/' in it -> it
                        it.startsWith(".") -> MimeTypeMap.getSingleton()
                            .getMimeTypeFromExtension(it.removePrefix("."))
                        else -> null
                    }
                }.distinct()
            val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT)
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.type = if (mimeTypes.size == 1) mimeTypes[0] else "*/*"
            if (mimeTypes.size > 1) intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                params?.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE)
            try {
                launcher.launch(intent)
            } catch (_: ActivityNotFoundException) {
                launcher.launch(Intent(intent).setAction(Intent.ACTION_OPEN_DOCUMENT))
            }
        } catch (_: Exception) {
            skipNextResume = false
            finish(null)
            Toast.makeText(activity, "تعذر فتح منتقي الصور. حاول مرة أخرى.", Toast.LENGTH_LONG).show()
        }
        return true
    }

    fun consumeResumeGuard(): Boolean {
        val guard = skipNextResume || callback != null
        skipNextResume = false
        return guard
    }

    fun cancel() {
        skipNextResume = false
        finish(null)
    }

    private fun finish(uris: Array<Uri>?) {
        val pending = callback
        callback = null
        pending?.onReceiveValue(uris)
    }
}
