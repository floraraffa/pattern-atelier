# Pattern Atelier — WINDOW B: Lens Studio 5.15 (On-Device)

> **Self-contained.** Use this file in the Cursor window that owns the 5.15 project.
>
> **Target folder**: `Pattern-Atelier-5.15-Demo/` (or your name) — Lens Studio **5.15.0.x**  
> **Reference folder** (read-only): `Pattern Fashion AI/` (5.23 CLAD)  
> **Hardware**: Spectacles **(2024)**  
> **Role**: Wearable demo video. Rebuild from scratch — never open the 5.23 `.esproj` in 5.15.

Lens Studio mapping on this machine (verify):
- **5.15.0** → often `/Applications/Lens Studio 2.app`
- **5.23.x** → `/Applications/Lens Studio.app` (keep for reference only)

---

## BEFORE YOU START

### 1. Create the empty 5.15 project
1. Quit other Lens Studio instances if they fight over MCP ports (optional but cleaner).
2. Open **Lens Studio 5.15.0.x**.
3. **File → New Project** targeting **Spectacles**.
4. Save as e.g. `Pattern Atelier 5.15 Demo.esproj` inside a **new** folder:
   ```text
   ~/Downloads/Pattern-Atelier-5.15-Demo/
   ```
5. From **5.15 Asset Library** only, install:
   - Spectacles Interaction Kit (SIK)
   - Remote Service Gateway (for TTS / optional AI)
   - (Optional) Spectacles UI Kit — only if you need it; this demo mostly uses custom quads
6. Confirm the project opens clean with no missing packages.

### 2. Copy this instruction pack into the 5.15 folder
From the reference project, copy the whole folder:
```text
Pattern Fashion AI/docs/5.15-demo/  →  Pattern-Atelier-5.15-Demo/docs/5.15-demo/
```
Also drag `docs/5.15-demo/assets-to-copy/*` into `Assets/UI/Atelier/` and `Assets/Audio/` in the 5.15 project (via Lens Studio Asset Browser).

### 3. Cursor workspace
1. **New Cursor window**.
2. Open `Pattern-Atelier-5.15-Demo/` as the workspace root.
3. **File → Add Folder to Workspace** → add `Pattern Fashion AI/` (read-only reference).
4. Do **not** expect Lens Studio MCP / CLAD tools — treat Cursor as a plain code editor for 5.15.

---

## PROMPT 1 — Scope + read/write boundary

Paste alone:

```
This Cursor window works across two folders:
- Pattern-Atelier-5.15-Demo/ — fresh Lens Studio 5.15.0.x Spectacles project. This is the ONLY folder you write to.
- Pattern Fashion AI/ — existing 5.23 CLAD reference. READ-ONLY. Never edit, delete, or save into it.

Goal: rebuild a DEMO-ONLY Pattern Atelier for Spectacles (2024) that LOOKS like the reference editorial UI and can place seeded sewing patterns on a real surface for a video. Not full feature parity. No CLAD/MCP assumptions.

Read docs/5.15-demo/BUILD_SPEC.md, SCRIPT_PORT_ORDER.md, SCENE_WIRING.md, and DEMO_SHOTLIST.md before writing code.

Confirm the boundary and summarize the demo MVP in 5 bullets, then wait.
```

---

## PROMPT 2 — Import art + materials bootstrap

```
In Pattern-Atelier-5.15-Demo only:

1. Ensure Assets/UI/Atelier/ has the 8 screen_*.png from docs/5.15-demo/assets-to-copy/ (import via LS if not already).
2. Ensure Assets/Audio/atelier_music.wav is imported (optional for demo).
3. Create or reuse an Unlit material with alpha for UI plates/stickers (name it UiGlassMat or use a simple Unlit). Document the asset paths.

Do not port scripts yet. List the imported texture asset paths and confirm.
```

---

## PROMPT 3 — Core utilities (port order step A)

```
Read SCRIPT_PORT_ORDER.md step A. From the READ-ONLY reference Pattern Fashion AI/Assets/Scripts/, adapt into Pattern-Atelier-5.15-Demo/Assets/Scripts/:

1. LineMesh.ts
2. UiLite.ts (makePlate, makeLabel, makeSticker, makeTappable, safeDestroy)
3. DestroyHelper.ts
4. UiTheme.ts (optional font)
5. I18n.ts (keep EN + ES minimum; include mIntroLanding / mLangChanged)
6. PatternTypes.ts
7. PatternStore.ts (can be no-op/persist-light for demo)

Adapt any 5.23-only APIs. Flag unknowns before inventing. Do not wire the scene yet.
```

---

## PROMPT 4 — Pattern math + board (step B)

```
Continue SCRIPT_PORT_ORDER.md step B. Port / adapt:

1. BlockRegistry.ts + BodiceBlock / SkirtBlock / CircleSkirtBlock / ShirtBlock / SleeveBlock / MoreBlocks (or a minimal subset: bodice + circle_skirt only if timeboxed)
2. PatternRenderer.ts + needed line materials (chalk/seam) — create simple Unlit colored materials in 5.15 if reference mats don't import
3. BoardLeveler.ts (World Query surface snap — verify 5.15 API names)
4. HandleSetup.ts (grab/drag board)

demoSeed must be able to render at least 2 pattern pieces on the board.
```

---

## PROMPT 5 — Atelier UI face (step C) — visual parity

```
This is the visual heart of the demo. Port / adapt from reference:

1. AtelierFace.ts + HOTSPOTS map (landing, garment, body, measure, design, generate, preview, fabric)
2. LangDropdown.ts (EN ▾ — not a language landing carousel)
3. Mascot.ts as the MINIMAL assistant strip (A · ASSISTANT + status + TTS). Do NOT port the old cloud character.
4. PromptButton.ts (TYPE/VOICE for design step — keyboard/ASR as available on 5.15)
5. AppFlow.ts SLIM: atelier path only (LANDING→…→FABRIC). Enable demoSeed by default for wearable demos. Hide legacy carousels if not ported.

Wire textures from Assets/UI/Atelier/screen_*.png. Match BUILD_SPEC.md look: mockup boards + language pill + assistant strip under the board.
```

---

## PROMPT 6 — Scene hierarchy + wiring

```
Follow SCENE_WIRING.md exactly. Create the hierarchy under a UIRoot + BoardRoot. Attach scripts, assign @inputs, enable demoSeed=true on AppFlow. Then give me a checklist of every @input still null.
```

---

## PROMPT 7 — RSG credentials (user-owned)

```
Do NOT regenerate or invent Remote Service Gateway tokens.
Ask me to paste OpenAI / Google / Snap tokens into RemoteServiceGatewayCredentials myself, or leave TTS optional if tokens missing.
For the demo video, demoSeed patterns must work WITHOUT AI. TTS/AI are nice-to-have.
```

---

## PROMPT 8 — On-device smoke + demo take

```
Prepare for Spectacles (2024):
1. Confirm Preview Wearable mode works in 5.15.
2. List pairing + Send to Spectacles steps.
3. Follow DEMO_SHOTLIST.md for a 60–90s take: enter atelier → garment → body → measure → design (or skip prompt if seeded) → preview → fabric with board on a table, walk around.

Fix only blockers for that shot list.
```

---

## CHECKPOINT — Push before polishing

After Prompt 6:
1. Pair Specs 2024 in Developer Mode.
2. **Send to Spectacles**.
3. Confirm: landing board visible, pinch ENTER, board places on table, seeded pattern lines visible.
4. Only then chase TTS / AI / hotspot fine-tuning.

---

## Hard rules for the 5.15 agent

- Write **only** inside the 5.15 project folder.
- Install packages **only** from 5.15 Asset Library (do not copy `.lspkg` from 5.23).
- Prefer **copying TypeScript sources** from reference and adapting, not binary scene/prefab dumps from 5.23.
- Mockup PNGs and music from `assets-to-copy/` are safe to import.
- Demo > completeness. If blocked, ship the shot list path with stubs.
- Never regenerate RSG tokens unless the human explicitly asks.
