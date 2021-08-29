#include "../rnet.h"

int main(void)
{
    StartClient("test-rnet", "127.0.0.1", 42042);

    StopClient();

    return 0;
}