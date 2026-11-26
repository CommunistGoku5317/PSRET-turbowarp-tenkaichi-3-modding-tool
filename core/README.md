# BT3 Core (prototype)

This directory starts the shared C core for the TurboWarp, Web, and standalone desktop editions.

## Current scope

The first prototype validates the Spike PAK header and returns entry ranges. It deliberately does **not** decode QRS textures yet. QRS parsing, palette association, swizzling, and PNG encoding will be ported only after the C tests can be compared against known-good fixtures.

## Native test

```sh
cc -std=c11 -Wall -Wextra -Werror -pedantic bt3_core.c test_bt3_core.c -o bt3_core_tests
./bt3_core_tests
```

## WebAssembly build

Install the Emscripten SDK, then from this directory run:

```sh
emcc bt3_core.c -O2 -std=c11 -Wall -Wextra -Werror \
  -sSTRICT -sMODULARIZE -sEXPORT_NAME=BT3Core \
  -sENVIRONMENT=web,worker \
  -sEXPORTED_FUNCTIONS=_bt3_pak_validate,_bt3_pak_entry_range,_bt3_status_message,_malloc,_free \
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap \
  -o ../web/bt3_core.js
```

The generated JavaScript loader and `bt3_core.wasm` must be served together over HTTP(S). The browser frontend will wait for the asynchronous module initialization before enabling file operations.

## Design rules

- Keep file-format logic independent of TurboWarp, DOM, and desktop UI code.
- Keep the native and WebAssembly builds on the same C source.
- Every parser change must have native tests and fixture comparisons before it is used by an edition.
- C/WebAssembly is not assumed to fix format bugs by itself; correctness comes from tests and verified format rules.
