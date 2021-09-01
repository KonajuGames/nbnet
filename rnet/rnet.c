#define NBNET_IMPL

#include "rnet.h"

#ifdef PLATFORM_DESKTOP

#include "../net_drivers/udp.h"

#endif

#ifdef PLATFORM_WEB

#include "../net_drivers/webrtc.h"

#endif

static NBN_OutgoingMessage *CreateOutgoingMessage(uint8_t *bytes, unsigned int length);

static uint32_t last_disconnected_client_id;

/*******************************/
/*          Client API         */
/*******************************/

void StartClient(const char *protocol_name, const char *ip_address, uint16_t port)
{
    NBN_GameClient_Init(protocol_name, ip_address, port);

    if (NBN_GameClient_Start() == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to start client");

        RNetAbort();
    }
}

void StopClient(void)
{
    NBN_GameClient_Stop();
    NBN_GameClient_Deinit();
}

void DisconnectClient(void)
{
    NBN_GameClient_Disconnect();
}

void AddClientTime(double secs)
{
    NBN_GameClient_AddTime(secs);
}

void SendUnreliableMessage(uint8_t *bytes, unsigned int length)
{
    if (NBN_GameClient_SendUnreliableMessage(CreateOutgoingMessage(bytes, length)) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to send unreliable message to server");

        RNetAbort();
    }
}

void SendReliableMessage(uint8_t *bytes, unsigned int length)
{
    if (NBN_GameClient_SendReliableMessage(CreateOutgoingMessage(bytes, length)) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to send reliable message to server");

        RNetAbort();
    }
}

void FlushClient(void)
{
    if (NBN_GameClient_SendPackets() == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to flush client");

        RNetAbort();
    }
}

ClientEvent PollClient(void)
{
    int ev = NBN_GameClient_Poll();

    if (ev == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "An error occured while polling client network events");

        RNetAbort();
    }

    if (ev == NBN_NO_EVENT)
        return NO_EVENT;

    if (ev == NBN_CONNECTED)
        return CONNECTED;

    if (ev == NBN_DISCONNECTED)
        return DISCONNECTED;

    if (ev == NBN_MESSAGE_RECEIVED)
        return MESSAGE_RECEIVED;

    TraceLog(LOG_ERROR, "Unsupported client network event");

    RNetAbort();

    return NBN_ERROR;
}

void ReadReceivedServerMessage(Message *msg)
{
    NBN_MessageInfo msg_info = NBN_GameClient_GetMessageInfo();

    RNetAssert(msg_info.type == NBN_BYTE_ARRAY_MESSAGE_TYPE);

    NBN_ByteArrayMessage *b_arr_msg = msg_info.data;

    memcpy(msg->bytes, b_arr_msg->bytes, b_arr_msg->length);

    msg->length = b_arr_msg->length;
}

/*******************************/
/*          Server API         */
/*******************************/

void StartServer(const char *protocol_name, uint16_t port)
{
    NBN_GameServer_Init(protocol_name, port);

    if (NBN_GameServer_Start() == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to start server");

        RNetAbort();
    }
}

void StopServer(void)
{
    NBN_GameServer_Stop();
    NBN_GameServer_Deinit();
}

void AddServerTime(double secs)
{
    NBN_GameServer_AddTime(secs);
}

void SendUnreliableMessageTo(uint8_t *bytes, unsigned int length, uint32_t client_id)
{
    NBN_Connection *client = NBN_GameServer_FindClientById(client_id);

    if (!client)
    {
        TraceLog(LOG_ERROR, "Failed to send unreliable message to server: client %d does not exist",
            client_id);

        RNetAbort();
    }

    if (NBN_GameServer_SendUnreliableMessageTo(client, CreateOutgoingMessage(bytes, length)) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to send unreliable message to server");

        RNetAbort();
    }
}

void SendReliableMessageTo(uint8_t *bytes, unsigned int length, uint32_t client_id)
{
    NBN_Connection *client = NBN_GameServer_FindClientById(client_id);

    if (!client)
    {
        TraceLog(LOG_ERROR, "Failed to send unreliable message to server: client %d does not exist",
            client_id);

        RNetAbort();
    }

    if (NBN_GameServer_SendReliableMessageTo(client, CreateOutgoingMessage(bytes, length)) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to send unreliable message to server");

        RNetAbort();
    }
}

void BroadcastUnreliableMessage(uint8_t *bytes, unsigned int length)
{
    NBN_OutgoingMessage *outgoing_msg = CreateOutgoingMessage(bytes, length);

    if (NBN_GameServer_BroadcastUnreliableMessage(outgoing_msg) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to broadcast unreliable message to server");

        RNetAbort();
    }
}

void BroadcastReliableMessage(uint8_t *bytes, unsigned int length)
{
    NBN_OutgoingMessage *outgoing_msg = CreateOutgoingMessage(bytes, length);

    if (NBN_GameServer_BroadcastReliableMessage(outgoing_msg) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to broadcast unreliable message to server");

        RNetAbort();
    }
}

void FlushServer(void)
{
    if (NBN_GameServer_SendPackets() == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to flush server");

        RNetAbort();
    }
}

ServerEvent PollServer(void)
{
    int ev = NBN_GameServer_Poll();

    if (ev == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "An error occured while polling server network events");

        RNetAbort();
    }

    if (ev == NBN_NO_EVENT)
        return NO_EVENT;

    if (ev == NBN_NEW_CONNECTION)
        return CLIENT_CONNECTION_REQUEST;

    if (ev == NBN_CLIENT_DISCONNECTED)
    {
        NBN_Connection *cli = NBN_GameServer_GetDisconnectedClient();

        last_disconnected_client_id = cli->id;

        NBN_Connection_Destroy(cli);

        return CLIENT_DISCONNECTED;
    }

    if (ev == NBN_CLIENT_MESSAGE_RECEIVED)
        return CLIENT_MESSAGE_RECEIVED;

    TraceLog(LOG_ERROR, "Unsupported server network event");

    RNetAbort();

    return NBN_ERROR;
}

uint32_t AcceptClient(void)
{
    if (NBN_GameServer_AcceptIncomingConnection(NULL) == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to accept client");

        RNetAbort();
    }

    return NBN_GameServer_GetIncomingConnection()->id;
}

void RejectClient(void)
{
    if (NBN_GameServer_RejectIncomingConnection() == NBN_ERROR)
    {
        TraceLog(LOG_ERROR, "Failed to reject client");

        RNetAbort();
    }
}

uint32_t GetDisconnectedClientID(void)
{
    return last_disconnected_client_id;
}

void ReadReceivedClientMessage(Message *msg)
{
    NBN_MessageInfo msg_info = NBN_GameServer_GetMessageInfo();

    RNetAssert(msg_info.type == NBN_BYTE_ARRAY_MESSAGE_TYPE);

    NBN_ByteArrayMessage *b_arr_msg = msg_info.data;

    memcpy(msg->bytes, b_arr_msg->bytes, b_arr_msg->length);

    msg->length = b_arr_msg->length;
    msg->sender_id = msg_info.sender->id;
}

/*******************************/
/*          Private API        */
/*******************************/

static NBN_OutgoingMessage *CreateOutgoingMessage(uint8_t *bytes, unsigned int length)
{
    if (length > NBN_BYTE_ARRAY_MAX_SIZE)
    {
        TraceLog(LOG_ERROR,
                 "Cannot create a message bigger than %d bytes"
                 " (increase it by setting NBN_BYTE_ARRAY_MAX_SIZE)",
                 NBN_BYTE_ARRAY_MAX_SIZE);

        RNetAbort();
    }

    NBN_OutgoingMessage *outgoing_msg = NBN_GameClient_CreateByteArrayMessage(bytes, length);

    if (!outgoing_msg)
    {
        TraceLog(LOG_ERROR, "Failed to create unreliable message");

        RNetAbort();
    }

    return outgoing_msg;
}
