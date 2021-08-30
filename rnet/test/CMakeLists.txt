cmake_minimum_required(VERSION 3.0)

project(rnet_test C)

add_executable(client client.c ../rnet.c)
add_executable(server server.c ../rnet.c)

# set RAYLIB_LIBRARY_PATH from command line

target_link_libraries(client ${RAYLIB_LIBRARY_PATH} pthread m)
target_link_libraries(server ${RAYLIB_LIBRARY_PATH} pthread m)

add_compile_options(-Wall -Wextra -Werror)

target_compile_definitions(client PUBLIC NBN_DEBUG)
target_compile_definitions(server PUBLIC NBN_DEBUG)

if (APPLE)
  target_link_libraries(client "-framework OpenGL -framework Cocoa -framework IOKit -framework CoreAudio -framework CoreVideo")
  target_link_libraries(server "-framework OpenGL -framework Cocoa -framework IOKit -framework CoreAudio -framework CoreVideo")
endif (APPLE)

if(WIN32)
    target_link_libraries(client wsock32 ws2_32)
    target_link_libraries(server wsock32 ws2_32)
endif()

# set RAYLIB_INCLUDE_PATH from command line

target_include_directories(client PUBLIC "${RAYLIB_INCLUDE_PATH}")
target_include_directories(server PUBLIC "${RAYLIB_INCLUDE_PATH}")