package com.auris.app.plugins

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import okhttp3.OkHttpClient

@UnstableApi
class ExoPlayerActivity : AppCompatActivity() {

    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var webView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during anime playback and lock to landscape
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        val streamUrl = intent.getStringExtra(EXTRA_URL) ?: run {
            finish()
            return
        }

        // If it is an embed/stream URL, use hardware-accelerated full-screen WebView with WebChromeClient
        if (streamUrl.contains("/stream/") || streamUrl.contains("/embed") || streamUrl.contains("megaplay") || streamUrl.contains("zokoanime")) {
            val wv = WebView(this).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.allowFileAccess = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                settings.userAgentString = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()
                loadUrl(streamUrl)
            }
            webView = wv
            setContentView(wv)
            return
        }

        playerView = PlayerView(this).apply {
            useController = true
            setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
        }
        setContentView(playerView)

        val headers = intent.getSerializableExtra(EXTRA_HEADERS) as? HashMap<String, String> ?: hashMapOf()

        // Configure OkHttp client with custom Referer and User-Agent headers
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val reqBuilder = chain.request().newBuilder()
                headers.forEach { (key, value) ->
                    reqBuilder.header(key, value)
                }
                chain.proceed(reqBuilder.build())
            }
            .build()

        val dataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        val exo = ExoPlayer.Builder(this)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()

        player = exo
        playerView?.player = exo

        val mediaItem = MediaItem.Builder()
            .setUri(streamUrl)
            .apply {
                if (streamUrl.contains(".m3u8")) {
                    setMimeType(MimeTypes.APPLICATION_M3U8)
                } else if (streamUrl.contains(".mpd")) {
                    setMimeType(MimeTypes.APPLICATION_MPD)
                }
            }
            .build()

        exo.setMediaItem(mediaItem)
        exo.prepare()
        exo.play()
    }

    override fun onPause() {
        super.onPause()
        player?.pause()
        webView?.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onDestroy() {
        player?.release()
        player = null
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    companion object {
        const val EXTRA_URL = "extra_url"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_HEADERS = "extra_headers"
    }
}
