package com.auris.app.plugins

import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VideoPlayer")
class VideoPlayerPlugin : Plugin() {

    @PluginMethod
    fun playVideo(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrEmpty()) {
            call.reject("url is required")
            return
        }

        val title = call.getString("title") ?: "Anime Episode"
        val headersObj = call.getObject("headers")
        val headersMap = HashMap<String, String>()

        headersObj?.let { obj ->
            val keys = obj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                obj.getString(key)?.let { value ->
                    headersMap[key] = value
                }
            }
        }

        val intent = Intent(context, ExoPlayerActivity::class.java).apply {
            putExtra(ExoPlayerActivity.EXTRA_URL, url)
            putExtra(ExoPlayerActivity.EXTRA_TITLE, title)
            putExtra(ExoPlayerActivity.EXTRA_HEADERS, headersMap)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun stopVideo(call: PluginCall) {
        call.resolve()
    }
}
