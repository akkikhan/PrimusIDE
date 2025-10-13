# Packaging Pipeline (Electron Builder)

This document outlines how Primus IDE is packaged for distribution.

## Overview

We use `electron-builder` (configured in `package.json` under the `build` field) to produce installable artifacts. The existing build scripts already compile preload, main, and renderer bundles to `dist/` prior to packaging.

## Directory Layout

- `dist/main` – compiled Electron main process
- `dist/preload` – compiled preload script(s)
- `dist/renderer` – webpack‑bundled React UI
- `release/` – output directory for packaged artifacts (installer + archives)
- `build-resources/` – place app icons, background images, or other platform metadata here (create directory if adding assets)

## Commands

```bash
# Produce production bundles then package for all configured targets
npm run build && npm run dist

# Windows only installer/zip
npm run build && npm run dist:win

# Directory unpacked build for inspection
npm run build && npm run dist:dir
```

## Code Signing (Placeholder)

Currently no certificates are configured. For Windows code signing:

- Obtain a code signing certificate (EV recommended) and export a PFX.
- Provide environment variables (CI recommended):
  - `CSC_LINK` (path or base64 of PFX)
  - `CSC_KEY_PASSWORD`
- electron-builder will automatically sign if variables are present.

Mac / Notarization (future):

- Add `mac` target with `hardenedRuntime: true` and configure Apple ID credentials.

## Auto-Update (Future Roadmap)

The config includes a generic provider placeholder. For real updates:

1. Host the generated `latest.yml` and artifacts at a stable URL.
2. Add `autoUpdater` wiring in the main process (not yet implemented) guarded behind a user setting.

## Optimization Opportunities

- Strip source maps from production (`devtool: false` in prod webpack) once debugging stabilizes.
- Consider splitting monaco languages to reduce renderer bundle size.
- Add `afterPack` hook to prune dev-only files (logs, caches) if needed.

## Icon & Branding Assets

Providing platform‑appropriate icons improves installer trust & OS integration.

Current status: A placeholder `icon.ico` has been added to `build-resources/` and referenced via the `icon` field in the electron-builder `build` config (package.json). Replace with a real multi-resolution ICO before public release.

### Windows (ICO)

- Single `.ico` containing multiple sizes: 16, 24, 32, 48, 64, 128, 256 (at minimum 256x256 required for high DPI).
- Place file at `build-resources/icon.ico`.
- electron-builder auto-detects `icon` for Windows when present in `buildResources`.

Generate from a PNG (example using ImageMagick):

```bash
magick convert logo-1024.png -resize 256x256 -define icon:auto-resize=256,128,64,48,32,24,16 build-resources/icon.ico
```

### macOS (Future Target)

- Create `icon.icns` from a set of PNGs (1024, 512, 256, 128, 64, 32, 16).
- Place at `build-resources/icon.icns`.
- Add a `mac` section to `package.json` `build` config when enabling mac packaging:

```jsonc
"mac": {
  "category": "public.app-category.developer-tools",
  "target": ["dmg", "zip"],
  "hardenedRuntime": true
}
```

Generate (example using `iconutil` on macOS):

```bash
mkdir -p icon.iconset
for size in 16 32 64 128 256 512 1024; do \
  magick logo-1024.png -resize ${size}x${size} icon.iconset/icon_${size}x${size}.png; \
  magick logo-1024.png -resize $((size*2))x$((size*2)) icon.iconset/icon_${size}x${size}@2x.png; \
done
iconutil -c icns icon.iconset -o build-resources/icon.icns
```

### Linux (Future Target)

- Provide PNGs in a hierarchy (or rely on a single large PNG): 16, 32, 48, 64, 128, 256, 512.
- Place them under `build-resources/icons/` or provide `icon.png` (512x512) root fallback.
- Add `linux` section in builder config when enabling:

```jsonc
"linux": {
  "target": ["AppImage", "deb"],
  "category": "Development"
}
```

### Verification

After adding icons:

1. Re-run `npm run dist:win` (or platform target) and open the generated installer.
2. Confirm custom icon appears in:
   - NSIS installer dialogs
   - Installed executable shortcut
3. Inspect `release/win-unpacked/resources/app.asar.unpacked` only if you externalize assets (not needed for standard icon usage).

### Fallback Behavior

If no icon present, electron-builder logs: `default Electron icon is used`. This is acceptable for internal builds but not for public distribution.

## Release Checklist

1. `npm ci` (clean install)
2. `npm test` (ensure tests pass)
3. `npm run build` (verify output)
4. `npm run dist:win` (generate installer)
5. Install locally, smoke test launch, quick AI bar, context gather, tool registry.
6. Tag & publish artifacts (manual or future CI pipeline).

## Troubleshooting

- If packaging fails due to missing assets, ensure `build-resources/` exists (even empty) OR remove the reference.
- Large bundle size warnings are expected (Monaco). Future optimization: dynamic import or CDN mode.
- If `electron` version mismatch occurs, align `electron` and `electron-builder` declared versions.

---

This scaffold is intentionally minimal—extend as distribution targets (macOS/Linux) become priorities.
