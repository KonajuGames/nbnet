const nbnet = require('nbnet')
const host = new nbnet.Room.Host('room_server-protocol')

host.onConnection = (conn) => {
    console.log(`New connection ${conn.id}`)
}

host.connect('localhost', 42042)
