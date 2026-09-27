# Pattern Atelier — Build Spec (5.15 Demo Must Match)

Visual and product target for the Spectacles (2024) rebuild. The 5.23 reference is the source of truth for look; this file is the compressed contract.

## Product one-liner

AI sewing atelier for Specs: choose garment → body/size → describe style → see patterns → place **1:1 cut lines** on fabric in the room.

## Demo MVP acceptance (video)

On Specs 2024, in one take:

1. See editorial **landing** board (mannequin mockup) + **EN ▾** + assistant strip.
2. Tap **ENTER ATELIER** → garment screen.
3. Pick a garment card → body → measure → confirm.
4. Reach **preview** or go straight to **fabric** with **demoSeed** patterns.
5. Pattern board sits on a **real table**; user can walk around; cut lines stay readable.

Optional (if RSG works): TTS on assistant strip; one live AI style prompt.

## Flow (atelier face)

```text
LANDING → GARMENT → BODY → MEASURE → DESIGN → GENERATE → PREVIEW → FABRIC
```

| Step | Screen texture | Interaction |
|------|----------------|-------------|
| LANDING | `screen_landing.png` | Hotspot `enter` |
| GARMENT | `screen_garment.png` | `card0`–`card4` (TOP/DRESS/TROUSERS/SKIRT/JACKET) |
| BODY | `screen_body.png` | `woman` / `man` / `confirm` |
| MEASURE | `screen_measure.png` | `scan`/`manual`/`standard`/`confirm` (demo: all → default size M) |
| DESIGN | `screen_design.png` | `type`/`voice` → PromptButton; or skip if seeded |
| GENERATE | `screen_generate.png` | Auto while AI busy (or brief flash if seeded) |
| PREVIEW | `screen_preview.png` | `approve` → fabric |
| FABRIC | `screen_fabric.png` | Board + PatternRenderer; `nextPiece` optional |

**Language is never a full-screen step.** Minimal `EN ▾` dropdown only (`LangDropdown`).

## Visual system

- **Boards**: full mockup textures as large stickers (~52–58 cm wide), not rebuilt HTML.
- **Hotspots**: invisible tappable boxes in normalized coords (`AtelierFace` `HOTSPOTS`).
- **Assistant**: thin glass strip under board — `A · ASSISTANT` + one status line + ✕. No cloud mascot.
- **Language**: small pill top-right of UIRoot.
- **Hide** for demo: old language/garment carousels, sewing progress buttons, cloud art.

## Garment mapping (mockup → pattern keys)

| Card index | Mockup label | Internal key | Block seed |
|------------|--------------|--------------|------------|
| 0 | TOP | `camisa` | shirt/bodice |
| 1 | DRESS | `vestido` | bodice + circle_skirt |
| 2 | TROUSERS | `pantalon` | pants (or stub) |
| 3 | SKIRT | `pollera` | circle_skirt |
| 4 | JACKET | `camisa` | shirt (closest) |

## demoSeed default project

When `AppFlow.demoSeed = true`:

- Garment: vestido / Dress
- Measurements: woman M (bust 93, waist 75, hip 101)
- Cards: bodice + circle_skirt (names localized)

Enough to show fabric projection without OpenAI.

## Assistant copy (EN)

- Landing: `Welcome to the atelier. Tap ENTER ATELIER to begin.`
- Keep status on **one line** (wrap ≥ 72–80 chars).

## Non-goals for 5.15 demo

- Full 11-language QA  
- Fit-preview image generation chain  
- Perfect hotspot calibration on every screen  
- Publishing / Lens submission  
- CLAD / Lens Studio MCP workflows  

## Reference locations in 5.23 project

- Flow + UI: `Assets/Scripts/AppFlow.ts`, `AtelierFace.ts`, `LangDropdown.ts`, `Mascot.ts`
- Pattern: `PatternRenderer.ts`, `BlockRegistry.ts`, `*Block.ts`
- Spatial: `BoardLeveler.ts`, `HandleSetup.ts`, `LazyFollow.ts`
- Art: `Assets/UI/Atelier/screen_*.png`
