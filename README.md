<p align="center">
  <img src="Assets/UI/ui_logo.png" alt="Pattern Atelier" width="380">
</p>

# Pattern Atelier ☁🧵

**AI-powered sewing pattern maker for Snap Spectacles** — built for the CLAD Summer Hackathon, Week 4: *Create*.

Describe a garment with your voice, pick your size, and Pattern Atelier drafts real, cut-ready sewing patterns projected at **1:1 real-world scale** onto your fabric — so you can cut along the projected lines with real scissors. A talking assistant guides beginners step by step, in **11 languages** (including Farsi, Arabic, Chinese and Japanese).

## How it works
1. **Landing** — editorial atelier board; language via minimal **EN ▾** (not a flag carousel).
2. **Garment** — top, dress, trousers, skirt, jacket (mockup carousel).
3. **Body / Measure** — woman/man profile + size / measurements.
4. **Design** — dictate or type the style; AI decomposes into parametric pattern blocks.
5. **Preview** — approve the look before cutting.
6. **Fabric** — pattern projected at real scale on a surface-leveled board: thick yellow line = cut, white line = seam.

## Tech
- **Lens Studio 5.23** · Spectacles (SPECS) · Spectacles Interaction Kit
- **Remote Service Gateway**: OpenAI (GPT-4o + TTS) → Gemini → DeepSeek fallback chain for text; Snap3D / gpt-image / Imagen for illustrations
- **ASR Module** for voice input; keyboard fallback in editor preview
- Parametric drafting blocks (skirt, circle skirt, bodice, sleeve, shirt + collar + cuff, pants, leggings, underwear)
- UI lazy-follows; pattern board snaps flat to real surfaces via World Query on Specs
- UI art by Florencia Raffa + editorial mockup boards

## Setup (this 5.23 project)
1. Open the project in Lens Studio 5.23+.
2. Remote Service Gateway tokens: paste into `RemoteServiceGatewayCredentials` (**Window → Remote Service Gateway Token**) if needed.
3. Refresh the preview, or push to compatible Specs hardware.

## Spectacles (2024) / Lens Studio 5.15 demo rebuild

This repo is the **5.23 CLAD** reference. For **Spectacles 2024**, rebuild a **fresh 5.15 project** — do not open this `.esproj` in 5.15.

Full pack (paste prompts, build spec, script order, scene wiring, shot list, art):

- [`docs/5.15-demo/README.md`](docs/5.15-demo/README.md)
- Start the dedicated Cursor window with [`docs/5.15-demo/WINDOW_B_5.15_ONDEVICE.md`](docs/5.15-demo/WINDOW_B_5.15_ONDEVICE.md)

## Built with CLAD
Developed end-to-end with Claude + Lens Studio MCP: parametric pattern math, AI orchestration, i18n, UI assembly and in-editor testing.
