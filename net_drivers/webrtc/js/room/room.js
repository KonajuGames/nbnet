const loggerFactory = require('../logger.js')

function Room(host, maxClientCount) {
    const { v4: uuidv4 } = require('uuid');

    this.host = host
    this.maxClientCount = maxClientCount
    this.id = uuidv4()
    this.clients = {}
    this.nextClientId = 0
    this.logger = loggerFactory.createLogger(`RoomServer ${this.id}`)
}

Room.prototype.addClient = function(connection) {
    const client = { id: this.nextClientId++, connection: connection }

    this.clients[client.id] = client

    this.logger.info('Added new client (id: %s, connection: %s)', client.id, connection.remoteAddress)

    this.onClientAdded(client)

    return true
}

Room.prototype.close = function() {
    this.logger.info('Closing...')

    Object.values(this.clients).forEach((c) => {
	this.logger.info('Close client (id: %d, connection: %s)', c.id, c.connection.remoteAddress)

        c.connection.close()
    })
}

Room.prototype.containsClient = function(connection) {
    return Object.values(this.clients).some(c => c.connection.remoteAddress === connection.remoteAddress)
}

Room.prototype.findClientByConnection = function(connection) {
    return Object.values(this.clients).find(c => c.connection.remoteAddress === connection.remoteAddress)
}

Room.prototype.findClientById = function(id) {
    return Object.values(this.clients).find(c => c.id === id)
}

module.exports = Room
