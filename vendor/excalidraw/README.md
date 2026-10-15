# Excalidraw renderer (vendored)

`exportToSvg` from [@excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) 0.18.1 (MIT
licence), bundled with React by esbuild into ES modules, plus the Latin font files it loads.
The tracker imports it only when a note containing an Excalidraw drawing is shown.

Rebuild: `export { exportToSvg } from "@excalidraw/excalidraw"` →
`esbuild --bundle --minify --format=esm --splitting --define:process.env.NODE_ENV='"production"'`.
