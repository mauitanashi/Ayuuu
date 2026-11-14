package com.auris.app

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.auris.app.plugins.MediaSessionPlugin
import com.auris.app.plugins.NewPipeExtractorPlugin
import com.auris.app.plugins.VideoPlayerPlugin
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebViewClient
import okhttp3.OkHttpClient
import okhttp3.Request

class MainActivity : BridgeActivity() {
    private val httpClient = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NewPipeExtractorPlugin::class.java)
        registerPlugin(MediaSessionPlugin::class.java)
        registerPlugin(VideoPlayerPlugin::class.java)
        super.onCreate(savedInstanceState)

        bridge?.webView?.settings?.userAgentString = "Auris/1.0 (personal-client-4eb77cf5-46a6-4789-9305-73dd5d1290da-25f99f56)"

        bridge?.webView?.webViewClient = object : BridgeWebViewClient(bridge) {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                val url = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
                if (url.contains("readdetectiveconan.com") || url.contains("mangapill.com")) {
                    try {
                        val okReq = Request.Builder()
                            .url(url)
                            .header("Referer", "https://mangapill.com/")
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                            .build()
                        val response = httpClient.newCall(okReq).execute()
                        val contentType = response.header("Content-Type", "image/jpeg") ?: "image/jpeg"
                        val mimeType = contentType.substringBefore(";")
                        val stream = response.body?.byteStream()
                        if (stream != null) {
                            return WebResourceResponse(mimeType, "UTF-8", stream)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }
        }
    }
}
