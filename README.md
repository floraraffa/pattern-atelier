<p align="center">
  <img src="Assets/UI/ui_logo.png" alt="Pattern Atelier" width="380">
</p>

# Pattern Atelier ☁🧵

**AI-powered sewing pattern maker for Snap Spectacles** — built for the CLAD Summer Hackathon, Week 4: *Create*.

Describe a garment with your voice, pick your size, and Pattern Atelier drafts real, cut-ready sewing patterns projected at **1:1 real-world scale** onto your fabric — so you can cut along the projected lines with real scissors. A talking cloud mascot ("Nube") guides beginners step by step, in **11 languages** (including Farsi, Arabic, Chinese and Japanese).

## How it works
1. **Language** — swipeable carousel; the whole UI, mascot voice and AI switch live.
2. **Garment** — skirt, bodice, shirt, pants, dress, jumpsuit, leggings, underwear.
3. **Size** — gender + XXS→4XL size guide with real measurements.
4. **Style** — dictate your request ("a 1950s dress with a circle skirt"), or type it. The AI decomposes it into parametric pattern blocks.
5. **Patterns** — each piece becomes a card: modify it by voice, or preview the finished look.
6. **Finished** — AI fit note plus a Burda-style illustration of the sewn garment, so you can check silhouette before cutting.
7. **Cut** — the pattern is projected at real scale on a surface-leveled board: thick yellow line = cut, white line = seam, per-piece labels (ON FOLD / ×2 DOUBLE LAYER). Nube speaks a beginner-friendly cutting guide in your language.

## Tech
- **Lens Studio 5.23** · Spectacles (SPECS) · Spectacles Interaction Kit
- **Remote Service Gateway**: OpenAI (GPT-4o + TTS) → Gemini → DeepSeek fallback chain for text; Snap3D / gpt-image / Imagen for the finished-garment illustration
- **ASR Module** for voice input (40+ languages, on-device); keyboard fallback in the editor preview
- Parametric drafting blocks (skirt, circle skirt, bodice, sleeve, shirt + collar + cuff, pants, leggings, underwear) — the AI parameterizes real pattern-making blocks, so every output is sewable
- UI lazy-follows when you walk or turn; the pattern board stays where you place it and snaps flat to real surfaces via World Query on Specs
- All UI hand-crafted art by Florencia Raffa, assembled programmatically

## Setup
1. Open the project in Lens Studio 5.23+.
2. Install **Remote Service Gateway** and generate your tokens (**Window → Remote Service Gateway Token**), then paste them into the `RemoteServiceGatewayCredentials` object in the scene (OpenAI / Google / Snap).
3. Refresh the preview, or push to Spectacles.

## Prompt log
See [CLAD-LOG.md](CLAD-LOG.md) for the development log and representative prompt transcript.

## Built with CLAD
Developed end-to-end in conversation with Claude (Claude Code + Lens Studio MCP): parametric pattern math, AI orchestration, i18n, UI assembly and in-editor testing were all driven through the CLAD workflow.
