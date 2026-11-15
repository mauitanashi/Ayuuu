package com.auris.app.plugins

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.StreamInfo
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(name = "NewPipeExtractor")
class NewPipeExtractorPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val initialized = AtomicBoolean(false)

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .callTimeout(60, TimeUnit.SECONDS)
        .build()

    private fun ensureInitialized() {
        if (initialized.compareAndSet(false, true)) {
            val downloader = object : Downloader() {
                @Throws(IOException::class)
                override fun execute(request: org.schabi.newpipe.extractor.downloader.Request): Response {
                    val httpReqBuilder = Request.Builder()
                        .url(request.url())
                        .method(request.httpMethod(), request.dataToSend()?.let {
                            it.toRequestBody(null)
                        })

                    request.headers().forEach { (key, values) ->
                        values.forEach { v -> httpReqBuilder.addHeader(key, v) }
                    }

                    val resp = okHttpClient.newCall(httpReqBuilder.build()).execute()
                    val body = resp.body?.string().orEmpty()
                    return Response(resp.code, resp.message, resp.headers.toMultimap(), body, resp.request.url.toString())
                }
            }

            NewPipe.init(
                downloader,
                Localization.DEFAULT,
                ContentCountry("US")
            )
        }
    }

    @PluginMethod
    fun resolveAudio(call: PluginCall) {
        val videoId = call.getString("videoId")
        if (videoId.isNullOrBlank()) {
            call.reject("videoId is required")
            return
        }

        ensureInitialized()

        scope.launch {
            try {
                val service = ServiceList.YouTube
                val url = "https://www.youtube.com/watch?v=$videoId"
                val streamInfo = StreamInfo.getInfo(service, url)

                val audioStreams = streamInfo.audioStreams
                if (audioStreams.isNullOrEmpty()) {
                    call.reject("No audio streams found for video: $videoId")
                    return@launch
                }

                // Pick highest bitrate audio stream
                val bestAudio = audioStreams.maxByOrNull { it.averageBitrate } ?: audioStreams.first()

                val ret = JSObject().apply {
                    put("streamUrl", bestAudio.url ?: "")
                    put("format", bestAudio.format?.name ?: "M4A")
                    put("bitrate", bestAudio.averageBitrate)
                    put("durationSeconds", streamInfo.duration)
                    put("title", streamInfo.name)
                    put("artist", streamInfo.uploaderName)
                }

                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Extraction error: ${e.message}", e)
            }
        }
    }
}
