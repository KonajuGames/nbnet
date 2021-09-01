#include <stdbool.h>

#include "../rnet.h"

int main(void)
{
    bool disconnected = false;

    StartClient("test-rnet", "127.0.0.1", 42042);

    InitWindow(640, 480, "client");

    while (!WindowShouldClose() && !disconnected)
    {
        ClientEvent ev;

        AddClientTime(GetFrameTime());

        while ((ev = PollClient()) != NO_EVENT)
        {
            if (ev == CONNECTED)
            {
                TraceLog(LOG_INFO, "Connected");
            }
            else if (ev == DISCONNECTED)
            {
                disconnected = true;
            }
        }

        if (IsKeyPressed(KEY_SPACE))
        {
            const char *msg = "Hello world!";

            SendReliableMessage((uint8_t *)msg, strlen(msg) + 1);
        }

        FlushClient();

        BeginDrawing();
            ClearBackground(LIGHTGRAY);
        EndDrawing();
    }

    DisconnectClient();
    StopClient();

    return 0;
}