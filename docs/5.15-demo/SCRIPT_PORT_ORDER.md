# Script Port Order — 5.23 → 5.15 Demo

Copy TypeScript from `Pattern Fashion AI/Assets/Scripts/` into the 5.15 project and adapt. Do **not** copy `Packages/*.lspkg` from 5.23.

## Package versions

Install from **5.15 Asset Library**:

- Spectacles Interaction Kit → use whatever 5.15 resolves (import paths may differ slightly from 0.18.x)
- Remote Service Gateway → for `OpenAI.speech` / optional `PatternAI`

After install, fix imports if package folder names differ (e.g. `SpectaclesInteractionKit.lspkg/...`).

## Step A — Foundations

| File | Notes for 5.15 |
|------|----------------|
| `LineMesh.ts` | Runtime mesh builders; usually ports clean |
| `UiLite.ts` | Depends on SIK `Interactable`; verify `getTypeName()` / import path |
| `DestroyHelper.ts` | LateUpdate destroy queue — keep |
| `UiTheme.ts` | Optional |
| `I18n.ts` | Must include `mIntroLanding`, `mLangChanged`; EN+ES enough |
| `PatternTypes.ts` | Types only |
| `PatternStore.ts` | Can stub save/load |

## Step B — Pattern + board

| File | Notes |
|------|-------|
| `BodiceBlock.ts`, `SkirtBlock.ts`, `CircleSkirtBlock.ts` | Core math for demoSeed dress |
| `ShirtBlock.ts`, `SleeveBlock.ts`, `MoreBlocks.ts` | Port if time; else stub registry entries |
| `BlockRegistry.ts` | `buildSpecFromCard` |
| `PatternRenderer.ts` | Needs chalk + seam materials (create Unlit colors in 5.15) |
| `BoardLeveler.ts` | **Verify World Query API** in 5.15 StudioLib — names may differ from 5.23 |
| `HandleSetup.ts` | SIK Interactable + Manipulate — check 5.15 SIK docs |
| `LazyFollow.ts` | Nice-to-have for UI follow |

## Step C — Editorial UI + flow

| File | Notes |
|------|-------|
| `AtelierFace.ts` | Mockup boards + `HOTSPOTS` — port as-is; assign textures |
| `LangDropdown.ts` | Minimal EN▾ |
| `Mascot.ts` | **Minimal assistant strip version** (current 5.23), not cloud |
| `PromptButton.ts` | ASR/keyboard — VoiceML vs ASR Module naming may differ on 5.15 |
| `AppFlow.ts` | **Slim**: atelier path + `demoSeed=true` default; drop unused carousel wiring if carousels not ported |

### Optional / skip for demo

| File | Why skip |
|------|----------|
| `Carousel.ts`, `ProgressSteps.ts`, `BackNav.ts`, `ProjectCards.ts`, `FitPreview.ts` | Replaced by atelier boards / not needed for shot list |
| Cloud textures under `Assets/Mascot/` | Do not use |

## AppFlow slim contract

States: `LANDING | GARMENT | BODY | MEASURE | DESIGN | GENERATE | PREVIEW | FABRIC`

Required `@input`s for demo:

- `atelierFace`, `langDropdown`, `mascot`, `ai` (optional), `renderer`, `promptBtn` (optional)
- `demoSeed: true`

If carousels are absent, remove `@input langCarousel` etc. or create empty disabled stubs — prefer removing dead inputs to avoid null crashes.

## Known 5.15 adaptation hotspots

1. **SIK Interactable** import path / `Interactable.getTypeName()`
2. **World Query** surface hit API in `BoardLeveler`
3. **ASR / VoiceML** for `PromptButton` (editor vs device)
4. **OpenAI.speech** via RSG — same idea, confirm 5.15 RSG package examples
5. **AudioComponent.enabled** before play/stop (assistant TTS)

## Verification after each step

- A: empty scene compiles, one label renders  
- B: `demoSeed` renders 2 pieces on a board object in Preview  
- C: landing texture visible; ENTER advances; assistant shows one-line welcome  
