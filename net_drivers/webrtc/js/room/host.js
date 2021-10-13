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

const Connection = require('./connection.js')
const loggerFactory = require('../logger.js')

function Host(protocol) {
    this.protocol = protocol
    this.logger = loggerFactory.createLogger('RoomHost')
    this.connected = false
    this.clients = {}
}

Host.prototype.connect = function(host, port) {
    return new Promise((resolve, reject) => {
        const uri = `ws://${host}:${port}`

        this.logger.info(`Connecting to room server at ${uri} (protocol: %s)...`, this.protocol)

        const WebSocket = require('websocket').w3cwebsocket

        this.ws = new WebSocket(uri, this.protocol, `http://${host}:${port}`)

        this.ws.onclose = (ev) => {
            if (this.connected) {
                this.logger.error('Connection closed')

                this.connected = false

                this.onClosed()
            } else {
                this.logger.error('Connection failed')

                reject()
            }
        }

        this.ws.onopen = () => {
            this.logger.info('Connected')

            this.connected = true

            // Request a new room creation
            this.ws.send(JSON.stringify({ type: 'create_room' }))
            
            clearTimeout(timeoutId)
        }

        this.ws.onmessage = (ev) => {
            this.logger.info('Received room server message: %s', ev.data)

	    const msg = JSON.parse(ev.data)

            if (msg['type'] == 'create_room') {
	        if (msg['status'] == 'ok') {
		    const roomId = msg['room_id']

                    this.logger.info('Room created: %s', roomId)

		    this.ws.onmessage = (ev) => { handleRoomMessage(this, ev.data) }
                    resolve(roomId)
		}
		else {
                    this.logger.error('Failed to create room')

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

function handleRoomMessage(host, data) {
    const msg = JSON.parse(data)

    if (msg['type'] == 'client_joined') {
       const client_id = msg['client_id']

       // ignore message if a client with this id already exists
       if (client_id in host.clients)
           return

       const connection = new Connection(client_id, host.ws)

       host.logger.info('New client joined (id: %d)', connection.id)

       host.clients[client_id] = connection
       host.onConnection(connection) 
    }
    else if (msg['type'] == 'client_left') {
       const client_id = msg['client_id']

       // ignore message if the client does not exist
       if (!(client_id in host.clients))
           return

       connection = host.connections[client_id]

       connection.onClosed()
       delete host.connections[client_id]
    } else if (msg['type'] == 'signaling') {
        const client_id = msg['client_id']

       // ignore message if the client does not exist
       if (!(client_id in host.clients))
           return

       connection = host.connections[client_id]

       connection.onMessageReceived(msg['data']) 
    }
}

module.exports = Host
