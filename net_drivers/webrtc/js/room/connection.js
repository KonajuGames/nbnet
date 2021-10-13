function Connection(id, ws) {
    this.id = id
    this.ws = ws
}

Connection.prototype.send = function(data) {
    this.ws.send(JSON.stringify({ type: 'host_signaling', client_id: this.id, data: data }))
}

Connection.prototype.close = function() {
    // TODO
}

module.exports = Connection
