cmake_minimum_required(VERSION 3.20)
project(BT3ModderCore VERSION 0.3.0 LANGUAGES C)

option(BT3_BUILD_ARCHIVE_CLI "Build the libarchive-backed 7z/RAR/ISO desktop CLI" ON)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

add_library(bt3_core STATIC core/bt3_core.c)
target_include_directories(bt3_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/core)
target_compile_options(bt3_core PRIVATE
    $<$<C_COMPILER_ID:GNU,Clang>:-Wall;-Wextra;-Werror;-pedantic>
)

add_executable(bt3_core_tests core/test_bt3_core.c)
target_link_libraries(bt3_core_tests PRIVATE bt3_core)
target_compile_options(bt3_core_tests PRIVATE
    $<$<C_COMPILER_ID:GNU,Clang>:-Wall;-Wextra;-Werror;-pedantic>
)

enable_testing()
add_test(NAME bt3_core_tests COMMAND bt3_core_tests)

add_executable(bt3_inspect desktop/bt3_inspect.c)
target_link_libraries(bt3_inspect PRIVATE bt3_core)

if(BT3_BUILD_ARCHIVE_CLI)
    find_package(LibArchive QUIET)
    if(LibArchive_FOUND)
        add_executable(bt3_archive_cli desktop/bt3_archive_cli.c)
        target_link_libraries(bt3_archive_cli PRIVATE LibArchive::LibArchive)
        message(STATUS "LibArchive found: building 7z/RAR/ISO archive CLI")
    else()
        message(STATUS "LibArchive not found: bt3_archive_cli will not be built")
    endif()
endif()
