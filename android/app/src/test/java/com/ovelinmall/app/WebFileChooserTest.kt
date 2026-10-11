package com.ovelinmall.app

import android.app.Activity
import android.app.Application
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config

class PickerTestActivity : ComponentActivity() {
    val chooser = WebFileChooser(this)
}

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [28])
class WebFileChooserTest {
    private lateinit var controller: ActivityController<PickerTestActivity>
    private lateinit var activity: PickerTestActivity
    private val params = object : WebChromeClient.FileChooserParams() {
        override fun getMode() = MODE_OPEN
        override fun getAcceptTypes() = arrayOf("image/*")
        override fun isCaptureEnabled() = false
        override fun getTitle(): CharSequence? = null
        override fun getFilenameHint(): String? = null
        override fun createIntent() = Intent(Intent.ACTION_GET_CONTENT)
    }

    @Before fun setup() {
        controller = Robolectric.buildActivity(PickerTestActivity::class.java).setup()
        activity = controller.get()
    }
    @After fun teardown() {
        activity.chooser.cancel()
        controller.pause().stop().destroy()
    }

    @Test fun opensImagePickerAndReturnsSelectedReceipt() {
        val results = mutableListOf<Array<Uri>?>()
        assertTrue(activity.chooser.show(ValueCallback { results.add(it) }, params))
        val shadow = shadowOf(activity)
        val request = shadow.nextStartedActivityForResult
        assertEquals(Intent.ACTION_GET_CONTENT, request.intent.action)
        assertEquals("image/*", request.intent.type)
        assertTrue(request.intent.hasCategory(Intent.CATEGORY_OPENABLE))
        assertTrue(request.intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
        val uri = Uri.parse("content://receipt-provider/images/receipt")
        shadow.receiveResult(request.intent, Activity.RESULT_OK, Intent().setData(uri))
        assertEquals(uri, results.single()!!.single())
        assertTrue(activity.chooser.consumeResumeGuard())
        assertFalse(activity.chooser.consumeResumeGuard())
    }

    @Test fun cancellationCompletesInputAndAllowsRetry() {
        val results = mutableListOf<Array<Uri>?>()
        activity.chooser.show(ValueCallback { results.add(it) }, params)
        val shadow = shadowOf(activity)
        val request = shadow.nextStartedActivityForResult
        shadow.receiveResult(request.intent, Activity.RESULT_CANCELED, null)
        assertEquals(1, results.size)
        assertNull(results[0])
        activity.chooser.show(ValueCallback { results.add(it) }, params)
        assertNotNull(shadow.nextStartedActivityForResult)
    }

    @Test fun clipDataIsReturnedAndDuplicatePickerIsRejected() {
        val first = mutableListOf<Array<Uri>?>()
        val second = mutableListOf<Array<Uri>?>()
        activity.chooser.show(ValueCallback { first.add(it) }, params)
        val shadow = shadowOf(activity)
        val request = shadow.nextStartedActivityForResult
        activity.chooser.show(ValueCallback { second.add(it) }, params)
        assertNull(second.single())
        assertTrue(first.isEmpty())
        val uri = Uri.parse("content://receipt-provider/images/receipt")
        val clip = ClipData.newRawUri("receipt", uri)
        shadow.receiveResult(request.intent, Activity.RESULT_OK, Intent().apply { clipData = clip })
        assertEquals(uri, first.single()!!.single())
    }

    @Test fun destroyingActivityCancelsPendingInput() {
        val results = mutableListOf<Array<Uri>?>()
        activity.chooser.show(ValueCallback { results.add(it) }, params)
        activity.chooser.cancel()
        assertNull(results.single())
        assertFalse(activity.chooser.consumeResumeGuard())
    }
}
