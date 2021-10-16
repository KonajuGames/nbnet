/*

Copyright (C) 2020 BIAGINI Nathan

This software is provided 'as-is', without any express or implied
warranty.  In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software. If you use this software
   in a product, an acknowledgment in the product documentation would be
   appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.

*/

// --- Game server API ---

mergeInto(LibraryManager.library, {
    __js_game_server_init: function (port, protocol_id, use_https, key_pem, cert_pem) {
        const nbnet = require('nbnet')

        const signalingServer = new nbnet.Standalone.SignalingServer(
            port,
            protocol_id,
            use_https ? { https: true, key: UTF8ToString(key_pem), cert: UTF8ToString(cert_pem) } : {}
        )

        this.gameServer = new nbnet.GameServer(signalingServer)
    },

    __js_game_server_start: function () {
        return Asyncify.handleSleep(function (wakeUp) {
            this.gameServer.start().then(() => {
                wakeUp(0)
            }).catch(_ => {
                wakeUp(-1)
            })
        })
    }
})

// --- Game client API ---

mergeInto(LibraryManager.library, {
    __js_game_client_init: function(protocol_id, use_https) {
        let nbnet

        if (typeof window === 'undefined') {
            // we are running in node so we can use require
            nbnet = require('nbnet')
        } else {
            // we are running in a web browser so we used to "browserified" nbnet (see nbnet.js)
            nbnet = Module.nbnet
        }

        const signalingClient = new nbnet.Standalone.SignalingClient(protocol_id, { https: use_https })

        this.gameClient = new nbnet.GameClient(signalingClient)
    },

    __js_game_client_start: function(hostPtr, port) {
        return Asyncify.handleSleep(function (wakeUp) {
            this.gameClient.connect(UTF8ToString(hostPtr), port).then(() => {
                wakeUp(0)
            }).catch(_ => {
                wakeUp(-1)
            })
        })
    }
})
