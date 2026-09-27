# Scene Wiring Checklist — 5.15 Demo

Build this hierarchy in Lens Studio 5.15 (names can match for easy scripting).

```text
Scene
├── Camera (Spectacles / Device Tracking as required by 5.15 template)
├── [SIK prefab / Interaction Manager — from package examples]
├── RemoteServiceGatewayCredentials   (tokens: USER PASTES ONLY)
├── BoardRoot
│   ├── PatternBoard (mesh / empty + PatternRenderer)
│   ├── Handle (HandleSetup)
│   └── BoardLeveler
└── UIRoot                          (LazyFollow optional)
    ├── AtelierFace                 (AtelierFace.ts + 8 screen textures + sticker mat)
    ├── LangDropdown                (top-right local pos ~ [24, 14, 2])
    ├── AssistantRoot / MascotRoot  (Mascot.ts minimal strip; pos ~ [0, -18.5, 3] under board)
    ├── PromptButton                (hidden until DESIGN type/voice)
    ├── PatternAI                   (optional)
    └── FlowRoot                    (AppFlow.ts)
```

## Materials to create in 5.15

| Name | Use |
|------|-----|
| `UiGlassMat` / Unlit+alpha cream | Assistant strip, lang pill, plates |
| `UiStickerMat` / Unlit+alpha | AtelierFace screen textures |
| `ChalkLine` Unlit yellow | Cut lines |
| `SeamLine` Unlit white/gray | Seam lines |

## AtelierFace `@input` textures

| Input | File |
|-------|------|
| `screenLanding` | `Assets/UI/Atelier/screen_landing.png` |
| `screenGarment` | `Assets/UI/Atelier/screen_garment.png` |
| `screenBody` | `Assets/UI/Atelier/screen_body.png` |
| `screenMeasure` | `Assets/UI/Atelier/screen_measure.png` |
| `screenDesign` | `Assets/UI/Atelier/screen_design.png` |
| `screenGenerate` | `Assets/UI/Atelier/screen_generate.png` |
| `screenPreview` | `Assets/UI/Atelier/screen_preview.png` |
| `screenFabric` | `Assets/UI/Atelier/screen_fabric.png` |
| `stickerMaterial` | `UiStickerMat` |
| `boardWidthCm` | `56`–`58` |

## AppFlow `@input` (slim)

| Input | Target |
|-------|--------|
| `atelierFace` | AtelierFace component |
| `langDropdown` | LangDropdown component |
| `mascot` | Assistant Mascot component |
| `renderer` | PatternRenderer |
| `promptBtn` | PromptButton (optional) |
| `ai` | PatternAI (optional) |
| `demoSeed` | **true** |

## Mascot / Assistant `@input`

| Input | Value |
|-------|-------|
| `plateMaterial` | UiGlassMat |
| `stripWidthCm` | 52 |
| `stripHeightCm` | 4.4 |
| `bubbleWrapChars` | 80 |
| `maxBubbleLines` | 1 |
| `statusTextSize` | 0.55 |
| `ttsEnabled` | true if RSG token present, else false |
| `music` | optional MusicController |

## Preflight null check

Before Send to Spectacles, every required `@input` above must be non-null. Print a startup checklist from `AppFlow.onStart` if helpful:

```text
[Demo] atelierFace=OK lang=OK assistant=OK renderer=OK demoSeed=true
```

## Reference scene (5.23)

Inspect names in the reference project: `UIRoot`, `FlowRoot`, `AtelierFace`, `LangDropdown`, `MascotRoot`, `PatternAI`, board/handle objects — mirror structure, rebuild components fresh.
