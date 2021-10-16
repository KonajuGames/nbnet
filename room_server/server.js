const nbnet = require('nbnet')
const roomServer = new nbnet.Room.Server('room_server-protocol')

roomServer.start(process.argv[2])