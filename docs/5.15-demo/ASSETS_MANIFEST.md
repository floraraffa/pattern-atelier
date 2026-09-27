# Assets Manifest — Copy into 5.15

## Safe to copy (files)

From `docs/5.15-demo/assets-to-copy/` → 5.15 project:

| Source file | Destination in 5.15 |
|-------------|---------------------|
| `screen_landing.png` | `Assets/UI/Atelier/` |
| `screen_garment.png` | `Assets/UI/Atelier/` |
| `screen_body.png` | `Assets/UI/Atelier/` |
| `screen_measure.png` | `Assets/UI/Atelier/` |
| `screen_design.png` | `Assets/UI/Atelier/` |
| `screen_generate.png` | `Assets/UI/Atelier/` |
| `screen_preview.png` | `Assets/UI/Atelier/` |
| `screen_fabric.png` | `Assets/UI/Atelier/` |
| `atelier_music.wav` | `Assets/Audio/` (optional) |

Import via Lens Studio Asset Browser (drag-drop), not by copying `.meta` from 5.23.

## Do not copy from 5.23

- `Packages/*.lspkg` / `.lsc`
- `Cache/`
- `*.esproj`
- Scene binaries expecting 5.23 component IDs
- Cloud mascot PNGs (unless you explicitly want them — demo should not)

## Scripts

Copy **source `.ts` only** from `Pattern Fashion AI/Assets/Scripts/` per `SCRIPT_PORT_ORDER.md`, then fix imports for 5.15 packages.

## Optional extras later

- Logo `Assets/UI/ui_logo.png`
- Custom font `.ttf` / `.otf` for UiTheme
- Garment card art (not needed if using mockup screens)
