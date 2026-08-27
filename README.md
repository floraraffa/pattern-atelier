# Pattern Atelier ☁🧵

**AI-powered sewing pattern maker for Snap Spectacles** — built for the CLAD Summer Hackathon, Week 4: *Create*.

Describe a garment with your voice, pick your size, and Pattern Atelier drafts real, cut-ready sewing patterns projected at **1:1 real-world scale** onto your fabric — so you can cut along the projected lines with real scissors. A talking cloud mascot ("Nube") guides beginners step by step, in **11 languages** (including Farsi, Arabic, Chinese and Japanese).

## How it works
1. **Language** — swipeable carousel; the whole UI, mascot voice and AI switch live.
2. **Garment** — skirt, bodice, shirt, pants, dress, jumpsuit, leggings, underwear.
3. **Size** — gender + XXS→4XL size guide with real measurements.
4. **Style** — dictate your request ("a 1950s dress with a circle skirt"). The AI decomposes it into parametric pattern blocks.
5. **Patterns** — each piece becomes a card: modify it by voice, or send it to the fabric.
6. **Cut** — the pattern is projected at real scale: thick yellow line = cut, white line = seam, per-piece labels (ON FOLD / ×2 DOUBLE LAYER). Nube speaks a beginner-friendly cutting guide in your language.

## Tech
- **Lens Studio 5.23** · Spectacles (SPECS) · Spectacles Interaction Kit
- **Remote Service Gateway**: OpenAI (GPT-4o + TTS) → Gemini → DeepSeek fallback chain
- **ASR Module** for voice input (40+ languages, on-device)
- Parametric drafting blocks (skirt, circle skirt, bodice, sleeve, shirt + collar + cuff, pants, leggings, underwear) — the AI parameterizes real pattern-making blocks, so every output is sewable
- All UI hand-crafted art by Florencia Raffa, assembled programmatically

## Setup
1. Open `Pattern Atelier.esproj` in Lens Studio 5.23+.
2. Generate your Remote Service Gateway tokens (**Window → Remote Service Gateway Token**) and paste them into the `RemoteServiceGatewayCredentials` object (OpenAI / Google / Snap). *Tokens are never committed to this repo.*
3. Refresh the preview, or push to Spectacles.

## Built with CLAD
Developed end-to-end in conversation with Claude (Claude Code + Lens Studio MCP): parametric pattern math, AI orchestration, i18n, UI assembly and in-editor testing were all driven through the CLAD workflow.
