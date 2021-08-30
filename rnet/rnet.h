#ifndef RNET_H
#define RNET_H

#include <stdlib.h>
#include <stdint.h>
#include <assert.h>
#include <raylib.h>

#define NBN_LogInfo(...) TraceLog(LOG_INFO, __VA_ARGS__)
#define NBN_LogTrace(...) TraceLog(LOG_TRACE, __VA_ARGS__)
#define NBN_LogDebug(...) TraceLog(LOG_DEBUG, __VA_ARGS__)
#define NBN_LogWarning(...) TraceLog(LOG_WARNING, __VA_ARGS__)
#define NBN_LogError(...) TraceLog(LOG_ERROR, __VA_ARGS__)

#ifndef RNetAbort
#define RNetAbort abort
#endif

#ifndef RNetAssert
#define RNetAssert assert
#endif

#include "../nbnet.h"

typedef NBN_Connection Connection;

#define NO_EVENT 0 // no event left to poll

typedef enum
{
    CONNECTED = 1,          // connection with the server has been established
    DISCONNECTED,           // connection with the server bas been lost
    MESSAGE_RECEIVED        // a message has been received from the server
} ClientEvent;

typedef enum
{
    CLIENT_CONNECTION_REQUEST = 1,  //  a new client has requested a connection
    CLIENT_DISCONNECTED,            //  a client has disconnected
    CLIENT_MESSAGE_RECEIVED         //  a message has been received from a client
} ServerEvent;

typedef struct
{
    Connection *sender; // NULL when coming from the server
    uint8_t *bytes;
    unsigned int length;
} Message;

/*******************************/
/*          Client API         */
/*******************************/

// Start the client and attempt to connect to a server
void StartClient(const char *protocol_name, const char *ip_address, uint16_t port);

// Stop the client and release memory
void StopClient(void);

// Send bytes to the server (unreliably)
void SendUnreliableMessage(uint8_t *bytes, unsigned int length);

// Send bytes to the server (reliably)
void SendReliableMessage(uint8_t *bytes, unsigned int length);

// Pack all messages into packets and send them to the server
void FlushClient(void);

// Poll client network events
ClientEvent PollClient(void);

// Read the last received message from the server
void ReadReceivedServerMessage(Message *msg);

/*******************************/
/*          Server API         */
/*******************************/

// Start the server
void StartServer(const char *protocol_name, uint16_t port);

// Stop the server and release memory
void StopServer(void);

// Send bytes to a connected client (unreliably)
void SendUnreliableMessageTo(uint8_t *bytes, unsigned int length, Connection *client);

// Send bytes to a connected client (reliably)
void SendReliableMessageTo(uint8_t *bytes, unsigned int length, Connection *client);

// Broadcast bytes to all connected clients (unreliably)
void BroadcastUnreliableMessage(uint8_t *bytes, unsigned int length);

// Broadcast bytes to all connected clients (reliably)
void BroadcastReliableMessage(uint8_t *bytes, unsigned int length);

// Pack all messages into packets and send them to clients
void FlushServer(void);

// Poll server network events
ServerEvent PollServer(void);

// Accept the pending connection request
Connection *AcceptClient(void);

// Reject the pending connection request
void RejectClient(void);

// Return the last disconnected client
Connection *GetDisconnectedClient(void);

// Read the last received message from a client
void ReadReceivedClientMessage(Message *msg);

#endif // RNET_H