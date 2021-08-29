#include "../rnet.h"

int main(void)
{
    StartServer("test-rnet", 42042);

    StopServer();

    return 0;
}