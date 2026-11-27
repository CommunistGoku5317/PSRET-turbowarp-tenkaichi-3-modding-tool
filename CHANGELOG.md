# Changelog

## 0.3.0 — shared-core prototype

This development milestone adds the first shared parsing layer and browser/desktop integrations while retaining the existing TurboWarp JavaScript implementation as the reference for features not yet ported.

### Added

- Shared C core for AFS, AFL, and Spike PAK validation and entry metadata.
- Native CMake build, parser tests, and a small archive-inspection utility.
- LibArchive-backed desktop CLI for listing generic archives and safely extracting one regular file.
- Vite browser interface with the C core compiled to WebAssembly.
- Browser-side generic archive support through `archive-wasm` 2.1.0, including 7z, RAR-family, and ISO reader paths.
- Nested archive opening in the browser interface.
- GitHub Actions jobs for native Linux tests, Windows builds/tests, and the WebAssembly/browser bundle.
- Experimental TurboWarp Stage iframe bridge.

### Preserved

- The root `BT3-Web-Modder.js` remains unchanged.
- Existing JavaScript AFS/PAK/AFL/QRS behavior remains the reference.
- QRS decoding, palette handling, PNG replacement encoding, and archive rebuilding are not claimed as ported to the C core.

### Known limitations

- RAR/RAR5 behavior still needs verification with representative real-world fixtures.
- Browser archive handling reads the selected file into memory; very large disc images may exceed browser memory limits.
- The TurboWarp Stage bridge currently requires Unsandboxed DOM access; it is not sandbox-compatible.
- The desktop CLI is a prototype and does not replace the existing desktop GUI.
- The WebAssembly production build and deployment must pass CI before this milestone is considered verified.
