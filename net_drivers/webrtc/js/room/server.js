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
const Room = require('./room.js')

function Server(protocol) {
    this.protocol = protocol
    this.logger = loggerFactory.createLogger('RoomServer')
    this.rooms = {}
}

Server.prototype.start = function(port) {
    return new Promise((resolve, reject) => {
        this.logger.info('Starting (protocol: %s)...', this.protocol)

        const server = require('http').createServer((request, response) => {
            this.logger.info('Received request for ' + request.url)

            response.writeHead(404)
            response.end()
        })

        const WebSocketServer = require('websocket').server

        this.wsServer = new WebSocketServer({
            httpServer: server,
            autoAcceptConnections: false
        })

        this.wsServer.on('request', (request) => {
            this.logger.info('New connection')

	    const conn = request.accept(this.protocol, request.origin)

            this.logger.info('Connection accepted: %s', conn.remoteAddress)

	    conn.on('message', (msg) => { handleMessage(this, conn, JSON.parse(msg.utf8Data)) })
	    conn.on('close', () => { handleConnectionClosed(this, conn) })
        })

        server.listen(port, () => {
            this.logger.info('Started, listening on port %d...', port);

            resolve()
        })
    })
}

function handleMessage(server, connection, message) {
    server.logger.info('Received message: %s', message)

    if (message['type'] == 'create_room') {
	let res = {}

	handleCreateRoomMessage(server, connection, res)

        if (res.status) {
	    connection.sendUTF(JSON.stringify({ type: 'create_room', status: 'ok', room_id: res.room_id }))
	}
	else {
	    server.logger.error('Failed to create room. Close connection %s', connection.remoteAddress)

	    connection.close()
	}
    }
    else if (message['type'] == 'join_room') {
        if (handleJoinRoomMessage(server, connection, message)) {
	    connection.sendUTF(JSON.stringify({ type: 'join_room', status: 'ok' }))
	}
	else {
	    server.logger.error('Failed to join room. Close connection %s', connection.remoteAddress)

	    connection.close()
	}
    }
    else if (message['type'] == 'host_signaling') {
        handleHostSignalingMessage(server, connection, message)
    }
    else if (message['type'] == 'client_signaling') {
        handleClientSignalingMessage(server, connection, message)
    }
    else {
        server.logger.error('Received an unexpected message from connection %s. Closing connection',
	    connection.remoteAddress)

	connection.close()
    }
}

function handleCreateRoomMessage(server, connection, res) {
    if (findRoomHostedByConnection(server, connection)) {
        server.logger.error('A room already exists for connection %s', connection.remoteAddress)

	res.status = false

	return
    }

    const room = new Room(connection)

    server.rooms[room.id] = room

    room.onClientAdded = (client) => {
	server.logger.info('Client %d joined room %s. Notify room host', client.id, room.id)

	// notify the room host that a new client has joined
        connection.sendUTF(JSON.stringify({ type: 'client_joined', client_id: client.id }))
    }

    server.logger.info('Created room (connection: %s, id: %s)', connection.remoteAddress, room.id)

    res.status = true
    res.room_id = room.id
}

function handleJoinRoomMessage(server, connection, message) {
    const roomId = message['room_id']
    const room = server.rooms[roomId]

    if (room) {
	if (room.addClient(connection)) {
            return true
	}
	else {
	    server.logger.error('Failed to join room %s', roomId)

	    return false
	}
    }

    server.logger.error('Room %s does not exist', roomId)

    return false
}

function handleHostSignalingMessage(server, connection, message) {
    const data = message['data']
    const clientId = message['client_id']
    const room = findRoomHostedByConnection(server, connection)

    server.logger.info('Received host signaling data: %s (connection: %s)', data, connection.remoteAddress)

    if (room)
    {
	const client = room.findClientById(clientId)

	if (client)
	{
            server.logger.info('Forwarding received host signaling data from room %s host to client %d (connection: %s)',
	        room.id, client.id, client.connection.remoteAddress)

            client.connection.sendUTF(JSON.stringify({ type: 'signaling', data: data }))
	}
	else
	{
            server.logger.error('Received a host signaling message for an unknown client %d (room: %s, connection: %s)',
	        clientId, room.id, connection.remoteAddress)
	}
    }
    else
    {
        server.logger.error('Received a host signaling message for an unknown room (connection: %s)',
	    connection.remoteAddress)
    }
}

function handleClientSignalingMessage(server, connection, message) {
    const data = message['data']
    const room = findRoomContainingClient(server, connection)

    server.logger.info('Received client signaling data: %s (connection: %s)', data, connection.remoteAddress)

    if (room)
    {
	const client = room.findClientByConnection(connection)
	
	if (client)
	{
	    server.logger.info('Forwarding received client signaling data from client %d to room %s host',
	        client.id, room.id)

            room.host.sendUTF(JSON.stringify({ type: 'signaling', client_id: client.id, data: data }))
	}
	else
	{
            server.logger.error('Received a client signaling message for an unknown client (room: %s, connection: %s)',
	        room.id, connection.remoteAddress)
	}
    }
    else
    {
        server.logger.error('Received a client signaling message for an unknown room (connection: %s)',
	    connection.remoteAddress)
    }
}

function handleConnectionClosed(server, connection) {
    server.logger.info('Connection closed: %s', connection.remoteAddress)

    let room
    
    room = findRoomHostedByConnection(server, connection)

    if (room) {
	// the connection is a room host
	
	room.close() // close the room (and all containing clients)
        delete server.rooms[room.id]

        server.logger.info('Closed and deleted room: %s (connection: %s)', room.id, connection.remoteAddress)
    }

    room = findRoomContainingClient(server, connection)

    if (room) {
        // the connection is a room client
	
	const client = room.findClientByConnection(connection)
	
	// notify the host that a client has left
	room.host.sendUTF(JSON.stringify({ type: 'client_left', client_id: client.id }))
    }
}

function findRoomHostedByConnection(server, connection) {
    return Object.values(server.rooms).find(r => r.host.remoteAddress === connection.remoteAddress)
}

function findRoomContainingClient(server, connection) {
    return Object.values(server.rooms).find(r => r.containsClient(connection))
}

module.exports = Server 

/*
if (process.argv.length < 3)
{
    console.log('Usage: room_server PORT')
    process.exit(1)
}

const args = process.argv.slice(2)
const port = parseInt(args[0])

const roomServer = new RoomServer('room_server-protocol')

roomServer.start(port)*/
