package com.auris.app

import android.os.Bundle
import com.auris.app.plugins.MediaSessionPlugin
import com.auris.app.plugins.NewPipeExtractorPlugin
import com.auris.app.plugins.VideoPlayerPlugin
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NewPipeExtractorPlugin::class.java)
        registerPlugin(MediaSessionPlugin::class.java)
        registerPlugin(VideoPlayerPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Set non-browser User-Agent so media sources do not block with 403
        bridge?.webView?.settings?.userAgentString = "Auris/1.0 (Android; Mobile)"
    }
}
