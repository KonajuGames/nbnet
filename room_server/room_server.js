const nbnet = require('nbnet')
const roomServer = new nbnet.Room.Server('room_server-protocol')

roomServer.start(42042)
