package com.auris.app.plugins

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.media3.common.Player
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MediaSession")
class MediaSessionPlugin : Plugin() {

    private var playbackService: MusicPlaybackService? = null
    private var isBound = false

    private fun getService(): MusicPlaybackService? {
        return playbackService ?: MusicPlaybackService.instance
    }

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as? MusicPlaybackService.LocalBinder
            playbackService = binder?.getService()
            isBound = true

            playbackService?.getPlayer()?.addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    val p = playbackService?.getPlayer()
                    val state = JSObject().apply {
                        put("isPlaying", isPlaying)
                        put("positionMs", p?.currentPosition ?: 0)
                        put("durationMs", p?.duration ?: 0)
                    }
                    notifyListeners("playbackStateChange", state)
                }
            })
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            playbackService = null
            isBound = false
        }
    }

    override fun load() {
        super.load()
        val intent = Intent(context, MusicPlaybackService::class.java).apply {
            action = "LOCAL_BIND"
        }
        context.startService(Intent(context, MusicPlaybackService::class.java))
        context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }

    @PluginMethod
    fun playTrack(call: PluginCall) {
        val trackObj = call.getObject("track")
        if (trackObj == null) {
            call.reject("track object is required")
            return
        }

        val videoId = trackObj.getString("videoId") ?: ""
        val title = trackObj.getString("title") ?: "Unknown Title"
        val artist = trackObj.getString("artist") ?: "Unknown Artist"
        val artworkUrl = trackObj.getString("artworkUrl")
        val streamUrl = trackObj.getString("streamUrl")

        if (streamUrl.isNullOrEmpty()) {
            call.reject("streamUrl is empty")
            return
        }

        activity?.runOnUiThread {
            getService()?.playTrack(videoId, title, artist, artworkUrl, streamUrl)
            call.resolve()
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity?.runOnUiThread {
            val s = getService()
            s?.pause()
            s?.getPlayer()?.playWhenReady = false
            s?.getPlayer()?.pause()
            call.resolve()
        }
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        activity?.runOnUiThread {
            val s = getService()
            s?.resume()
            s?.getPlayer()?.playWhenReady = true
            s?.getPlayer()?.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = call.getInt("positionMs")?.toLong() ?: 0L
        activity?.runOnUiThread {
            getService()?.seekTo(positionMs)
            call.resolve()
        }
    }

    @PluginMethod
    fun skipNext(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun skipPrevious(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun setQueue(call: PluginCall) {
        call.resolve()
    }

    override fun handleOnDestroy() {
        if (isBound) {
            context.unbindService(serviceConnection)
            isBound = false
        }
        super.handleOnDestroy()
    }
}
