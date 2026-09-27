<p align="center">
  <img src="Assets/UI/Atelier/screen_landing.png" alt="Pattern Atelier — Generative Fashion System" width="920">
</p>

<p align="center">
  <strong>PATTERN ATELIER</strong> · Generative Fashion System<br>
  <em>From idea to fabric in spatial reality · Snap Spectacles</em>
</p>

# Pattern Atelier

**AI-powered sewing pattern maker for Snap Spectacles** — built for the CLAD Summer Hackathon, Week 4: *Create*.

Describe a garment, set your body profile, and Pattern Atelier drafts **cut-ready patterns at 1:1 real-world scale** onto your fabric. Editorial atelier UI, minimal language control, and a slim voice assistant — no flag carousel, no cartoon mascot.

<p align="center">
  <img src="Assets/UI/Atelier/screen_garment.png" alt="Select garment type" width="440">
  &nbsp;
  <img src="Assets/UI/Atelier/screen_body.png" alt="Body profile" width="440">
</p>
<p align="center">
  <img src="Assets/UI/Atelier/screen_design.png" alt="Design your piece" width="440">
  &nbsp;
  <img src="Assets/UI/Atelier/screen_fabric.png" alt="To fabric" width="440">
</p>

## How it works

1. **Landing** — enter the atelier. Language via a minimal **EN ▾** pill (not a full-screen flag picker).
2. **Garment** — top, dress, trousers, skirt, jacket.
3. **Body / Measure** — woman or man profile, then size / measurements.
4. **Design** — voice or type your style; AI turns it into parametric pattern blocks.
5. **Preview** — approve the look before cutting.
6. **Fabric** — project pieces on a surface-leveled board: **yellow = cut**, **white = seam**.

An **A · ASSISTANT** status strip speaks short guidance (TTS) without a character mascot.

## Tech

- **Lens Studio 5.23** · Spectacles (SPECS) · Spectacles Interaction Kit  
- **Remote Service Gateway** — OpenAI / Gemini / DeepSeek for text + TTS; Snap3D / gpt-image / Imagen for illustrations  
- **ASR** for voice input (keyboard fallback in editor)  
- Parametric blocks: skirt, circle skirt, bodice, sleeve, shirt + collar + cuff, pants, leggings, underwear  
- Lazy-follow UI; board snaps flat to real surfaces (World Query)  
- Editorial mockup boards + UI art by Florencia Raffa  

## Setup (this 5.23 project)

1. Open in **Lens Studio 5.23+**.  
2. Paste Remote Service Gateway tokens into `RemoteServiceGatewayCredentials` (**Window → Remote Service Gateway Token**) if needed.  
3. Refresh Preview, or push to compatible Specs hardware.

## Spectacles (2024) / Lens Studio 5.15

This repo is the **5.23 CLAD** reference. For **Spectacles 2024**, rebuild a **fresh 5.15 project** — do not open this `.esproj` in 5.15.

Rebuild pack (prompts, spec, wiring, shot list, art):

- [`docs/5.15-demo/README.md`](docs/5.15-demo/README.md)  
- Cursor window starter: [`docs/5.15-demo/WINDOW_B_5.15_ONDEVICE.md`](docs/5.15-demo/WINDOW_B_5.15_ONDEVICE.md)

## Built with CLAD

Developed end-to-end with Claude + Lens Studio MCP: pattern math, AI orchestration, i18n, UI assembly, and in-editor testing.
