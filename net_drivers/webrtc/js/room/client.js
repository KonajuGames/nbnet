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

const loggerFactory = require('../logger.js')

function Client(protocol, roomId) {
    this.protocol = protocol
    this.roomId = roomId
    this.logger = loggerFactory.createLogger('RoomClient')
    this.connected = false
}

Client.prototype.connect = function (host, port) {
    return new Promise((resolve, reject) => {
        const uri = `ws://${host}:${port}`

        this.logger.info(`Connecting to room server at ${uri} (protocol: %s)...`, this.protocol)

        const WebSocket = require('websocket').w3cwebsocket

        this.ws = new WebSocket(uri, this.protocol, `http://${host}:${port}`)

        this.ws.onclose = (ev) => {
            if (this.connected) {
                this.logger.info('Connection closed')

                this.connected = false

                // this.onClosed()
            } else {
                this.logger.error('Connection failed')

                reject()
            }
        }

        this.ws.onopen = () => {
            this.logger.info('Connected')

            this.connected = true

            // Request to join a room
            this.ws.send(JSON.stringify({ type: 'join_room', room_id: this.roomId }))

            clearTimeout(timeoutId)
        }

        this.ws.onmessage = (ev) => {
            this.logger.info('Received room server message: %s', ev.data)

            const msg = JSON.parse(ev.data)

            if (msg['type'] == 'join_room') {
                if (msg['status'] == 'ok') {
                    this.logger.info('Joined room: %s', this.roomId)

                    this.ws.onmessage = (ev) => { handleRoomMessage(this, ev.data) }
                    resolve()
                }
                else {
                    this.logger.error('Failed to join room')

                    reject()
                }
            }
            else {
                this.logger.error('Received an unexpected message')

                reject()
            }
        }

        const timeoutId = setTimeout(() => {
            this.logger.error('Connection timeout')

            reject()
        }, 3000)
    })
}

Client.prototype.send = function (data) {
    this.logger.info('Send signaling data: %s (roomId: %s)', data, this.roomId)

    this.ws.send(JSON.stringify({ type: 'client_signaling', data: data }))
}

function handleRoomMessage(client, data) {
    const msg = JSON.parse(ev.data)

    if (msg['type'] == 'signaling') {
        client.onDataReceived(msg['data'])
    }
}

module.exports = Client
