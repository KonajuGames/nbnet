#ifndef __EMSCRIPTEN__

#include <time.h>

#endif

#include "../rnet.h"

#define DT (1.f / 60) // 60 times per second

static void Sleep(void);

int main(void)
{
    StartServer("test-rnet", 42042);

    while (true)
    {
        AddServerTime(DT); // call once every frame

        ServerEvent ev;

        // poll all server events
        while ((ev = PollServer()) != NO_EVENT)
        {
            if (ev == CLIENT_CONNECTION_REQUEST)
            {
                uint32_t client_id = AcceptClient();

                TraceLog(LOG_INFO, "Client connected (ID: %d)", client_id);
            }
            else if (ev == CLIENT_DISCONNECTED)
            {
                TraceLog(LOG_INFO, "Client disconnected (ID: %d)", GetDisconnectedClientID());
            }
            else if (ev == CLIENT_MESSAGE_RECEIVED)
            {
                Message msg;

                ReadReceivedClientMessage(&msg);

                TraceLog(LOG_INFO, "Received data: %s (length: %d) from client %d",
                    msg.bytes, msg.length, msg.sender_id);
            }
        }

        FlushServer(); // call once every frame

        // sleep for a bit...
        Sleep();
    }

    StopServer();

    return 0;
}

static void Sleep(void)
{
#ifdef __EMSCRIPTEN__
    emscripten_sleep(DT * 1000);
#else
    long nanos = DT * 1e9;
    struct timespec t = {.tv_sec = nanos / 999999999, .tv_nsec = nanos % 999999999};

    nanosleep(&t, &t);
#endif
}