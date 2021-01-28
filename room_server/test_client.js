const nbnet = require('nbnet')
const client = new nbnet.Room.Client('room_server-protocol', process.argv[2])

client.connect('localhost', 42042)
