# Pattern Atelier on Spectacles (2024)

Pattern Atelier was built in **Lens Studio 5.23** for Specs (2026).
**Spectacles (2024) only run Lenses built with Lens Studio 5.15.x**, the last
release line Snap supports for that device.
Lens Studio can't open a project saved by a newer version. That means the
`.esproj` and `Assets/Scene.scene` can't be downgraded in place: the scene has
to be rebuilt in 5.15, and the code and art are reused.

## What carries over as-is

- **All TypeScript** in `Assets/Scripts/` (≈5,000 lines). It only uses APIs
  that already exist in the 5.15 / Spectacles (2024) era:
  - Spectacles Interaction Kit: `Interactable`, `WorldCameraFinderProvider`
  - Remote Service Gateway: `OpenAI` (chat, speech, images), `Gemini`,
    `Imagen`, `Deepseek`, `Snap3D`
  - `AsrModule`, `WorldQueryModule`, `InternetModule`, `RemoteMediaModule`,
    `TextInputSystem`, `persistentStorageSystem`
- **All art**: `Assets/UI/*.png`, `Assets/3D Assets/MascotAguja3D.glb`,
  the HDR, and the audio loop.

Most of the UI (carousels, cards, mascot, pattern board, buttons) is built
in code at runtime with `createSceneObject`. The scene itself is small: one
object per component, plus inspector references to materials and textures.

## What must be recreated in 5.15

| Item | Why |
|---|---|
| Project (`.esproj`) and `Scene.scene` | Saved in 5.23. 5.15 won't open them. |
| Packages: SpectaclesInteractionKit, RemoteServiceGateway, SnapDecorators, Utilities, SpectaclesUIKit | Install the versions the **5.15 Asset Library** offers. The 5.23 `.lspkg` builds won't load. |
| Materials (`*.mat`, `image_unlit.graphShader`) | The asset format may be newer than 5.15. Re-create them if they fail to import (see below). |
| RSG credentials | Generate the tokens again from **Window → Remote Service Gateway Token** in 5.15 and paste them into `RemoteServiceGatewayCredentials`. |

`AiPreviewAgentInspect`, `AiPreviewAgentInteract`, `Leaf` and `Bitmoji 3D`
are editor/agent helpers. The Lens doesn't need them at runtime.

## Step by step

1. **Install Lens Studio 5.15.x** (not 5.23), and pair the Spectacles (2024)
   with the Spectacles app.
2. **New project** → *Spectacles* template. The template already includes
   SIK, the camera and hand tracking.
3. **Asset Library** → install **Remote Service Gateway** and
   **Snap Decorators**, plus **Utilities** / **Spectacles UI Kit** if the
   compiler asks for them.
4. **Copy assets** from this repo into the new project's `Assets/`:
   `Scripts/`, `UI/`, `3D Assets/`, `Render/Echopark.hdr`, the audio track,
   and the PNG screenshots. Leave out `Scene.scene` and any `.meta` files, so
   Lens Studio assigns fresh IDs.
5. **Materials.** Create one *Unlit* material with blend mode *Normal* /
   alpha and **Depth Write off**. The scripts clone it for every sticker
   (`CloudMat`, `BubbleMat`, `CardMat`, `ActionMat`, `MicButtonMat`,
   `MascotMat`, `HandleMat`, `ThumbLineMat`). Then create two opaque unlit
   line materials: `SeamLineMat` (yellow, the cut line) and `ChalkLine`
   (white, the seam line).
6. **Rebuild the scene**, keeping this order (hierarchy order is also run
   order):
   - `RemoteServiceGatewayCredentials` (from the RSG package) with your
     tokens.
   - `UIRoot` with **LazyFollow** as the parent of all UI:
     - `LangCarousel`, `GarmentCarousel` and `SizeCarousel`, each with
       **Carousel**
     - `Cards` with **ProjectCards**
     - `PromptBar` with **PromptButton**
     - `Mascot` with **Mascot**, plus **MusicController** (pass `music` to
       Mascot)
     - `Progress` with **ProgressSteps**, `Back` with **BackNav**, `Fit`
       with **FitPreview**
     - `LogoRoot` with **Sticker** (`ui_logo.png`)
   - `PatternBoard`, *outside* `UIRoot` (world-locked), with
     **PatternRenderer** + **BoardLeveler**. Add a child `Handle` with
     **HandleSetup** + SIK **Interactable** + **InteractableManipulation**,
     and wire it to `BoardLeveler.handle`.
   - `AI` with **PatternAI**.
   - `App` with **AppFlow**. Wire every reference above, plus the texture
     arrays: `langCardTextures` (`lang_card_*.png`), `garmentCardTextures`
     (`garment_*.png`), `genderIconTextures` (`icon_female/male.png`),
     `sizeCardTexturesF` (`size_f_*.png`), `sizeCardTexturesM`
     (`size_m_*.png`).
   - `DestroyHelper` on any object near the top.
7. **Project Settings → Platform = Spectacles**. In **Project Settings →
   Permissions**, enable the Internet, Microphone and World Query
   permissions (or *Experimental APIs*, if 5.15 requires it for RSG).
8. Check it in Preview, then **Preview Lens → Send to Spectacles**.

## Things to test on the 2024 hardware

- **Performance**: the 2024 device has less thermal headroom. If it throttles,
  try `MusicController.startOn = false` or `Mascot.ttsEnabled = false`.
- **Field of view (46°)**: the UI sits at `LazyFollow.followDistanceCm = 110`.
  If the cards clip at the edges, raise it to around 130.
- **World Query** (`BoardLeveler.snapToSurface`) should work on 2024. If the
  hit test returns nothing, the board still levels (yaw-only) without
  snapping.
- **ASR**: `AsrMode.HighAccuracy` needs internet. On a weak connection, the
  keyboard fallback still works.
- **Image models**: `gpt-image-1` / `imagen-3.0-generate-002` / Snap3D depend
  on what RSG in 5.15 exposes. If one fails to compile, remove it from the
  chain in `PatternAI.ts`. The fallback chain covers the rest.
