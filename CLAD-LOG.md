# CLAD Log — Pattern Atelier (Week 4 "Create")

Development log and representative prompt transcript for the AI-assisted creation of Pattern Atelier in Lens Studio 5.23.1. The project was developed collaboratively by Florencia Raffa, urbanpeppermint and Claude (Anthropic) through CLAD and the Lens Studio MCP server.

## Human + AI collaboration

- **Florencia:** concept, product decisions, all hand-crafted kawaii artwork (logo, screens, cards, cloud mascot poses, stitched containers), UX direction, size-guide anchors, acceptance testing on preview and Spectacles, and every course correction below.
- **urbanpeppermint:** co-design sessions, fit-preview concept and layout tuning, testing.
- **Claude:** Lens Studio scene construction and inspection, TypeScript implementation, parametric pattern-drafting math, SIK interaction wiring, ASR/TTS integration, three-provider AI orchestration, i18n across 11 languages, music synthesis, debugging from runtime logs, and repository preparation.

OpenAI, Gemini and DeepSeek run through Snap's Remote Service Gateway, so the scene runs directly in Lens Studio once tokens are configured.

## Concept — patterns you can cut, not pictures

**Representative prompts:** "Week 4 Create idea: an AI pattern maker — you describe the garment, it drafts the sewing pattern and projects it at real scale on the fabric so you cut directly." … "The cards should be saved by sections, like designers organize their blocks."

- Validated the one-week scope: real parametric drafting (not AI-generated images of patterns), projected 1:1 in AR — world units are centimeters, so real scale is free.
- Every AI output maps to hand-written drafting blocks, so every result is actually sewable.

## The guided-flow pivot

**Representative prompts:** "It's very uncomfortable to maneuver — first a selection of what you want to make." … "A 1950s dress with a circle skirt should become TWO cards: bodice and skirt." … "A mascot that helps step by step, and I can close her." … "Make the pattern as visible as possible, don't use black."

- Rebuilt the UX as a six-step state machine: Language → Garment → Size → Style → Patterns → Cut, with a tappable sewing-button progress bar to jump between steps.
- The AI decomposes a styled garment into multiple parametric cards; each card can be modified by voice independently.
- Nube/Cloud guides each step with TTS, animated mouth, moods, closable and reopenable; long guidance auto-paginates through the speech bubble.

## Parametric drafting blocks — the sewing truth

**Representative prompts:** "All the bases: skirt, bodice, shirt, pants, dress, jumpsuit, leggings and underwear — if someone asks for a shirt, ALL its parts must be there." … "Did you add the button placket to the shirt?" … "Sizes will be masculine and feminine, XXS to 4XL, with my size cards."

- Ten drafting blocks written from real pattern-making rules: straight/circle skirt, bodice, sleeve, shirt front with button placket + fold lines + buttons, back with fold-line yoke, collar + collar stand, cuff, pants with crotch curves, leggings, underwear (three pieces).
- Pieces carry cut-on-fold and double-fabric flags that drive both the projected labels and the spoken cutting guide.
- Gendered measurement tables anchored to Florencia's hand-drawn size cards (XXS→4XL, bust/waist/hip midpoints).

## Eleven languages, one atelier

**Representative prompts:** "Choose the language first — all languages, including Farsi." … "A selector like picking your team on PlayStation football, swiping with two fingers like turning a page." … "When I slide the language, the texts should change live." … "When I go to another language it still says 'falda' or 'corpiño' — check every language, even inside the AI."

- PlayStation-style swipeable carousels (drag, snap, center scale-up) reused for languages, garments, gender and sizes.
- Live language preview: centering a language re-renders every string on screen before confirming.
- A later localization sweep moved *everything* into the chosen language: AI card names and explanations, projected piece labels (FRONT/BACK/SLEEVE…), status messages, demo cards — the language rule tells the model the Spanish examples are format-only.

## The AI that had to listen

**Representative prompts:** "The AI is not respecting what I want — I dictate the modification and it does something else." … "I ask for things and it doesn't interpret them; can the model improve the prompt?"

- Editor "canned prompts" were replaced by the real system keyboard; on Spectacles the ASR module dictates, and the bar's mic circle is a real start/stop button.
- Upgraded to GPT-4o with few-shot examples in Florencia's own Rioplatense phrasing, plus an "explica" field so Cloud says out loud what the AI understood — transparency became the trust fix.
- Fallback chain OpenAI → Gemini → DeepSeek: any provider failure silently tries the next.

## An AR-aware cutting teacher

**Representative prompt:** "Cloud says 'pin the pattern' but the pattern is virtual — at most you pin the fabric layers so double fabric doesn't move."

- The cutting-guide prompt teaches the model the medium: the pattern is projected light, never paper — only fabric layers get pinned; cut the yellow line, the white one is the seam.
- Guides are generated and spoken in the user's language, at most five warm sentences, assuming the person has never sewn.

## Reskinning everything with Florencia's art

**Representative prompts:** "Take my screens and rebuild the UI like the reference." … "Leave me the position and rotation of EVERYTHING editable — the logo, the cloud, the bubble text; I'll place them." … "The names go inside my stitched container, at the bottom of the card — pink for woman, blue for man."

- Five screens skinned from hand-made art sheets; sprites were cropped by transparency bands (naive grid crops stole neighboring card borders).
- Transparency war stories: sticker materials needed depth-write off (transparent pixels were cutting rectangular holes in overlapping art) and text got a high render order so labels never vanish behind stickers.
- Every element ended up Inspector-editable — positions, rotations, sizes, text offsets — so art direction stayed in Florencia's hands.

## Sound: the licensed-music trap

**Representative prompts:** "Background music with an on-off button." … "The music should duck so the AI can talk — the AI has priority." … "Less shrill — more like a dentist's waiting room. And let me choose my own."

- Runtime logs exposed that Snap's licensed tracks don't support stop or volume — and worse, they *blocked the mascot's TTS entirely* ("Cannot play track while Licensed Sound is already playing").
- Replaced with an original loop synthesized in code (warm e-piano chords at 58 bpm, seamless wrap), giving full control: quiet background volume, smooth ducking while Cloud speaks, a working toggle, and drop-in support for any user-supplied mp3/wav.

## Spatial ergonomics — the board stays, the UI follows

**Representative prompts:** "When I put the pattern on the fabric I want it to balance onto surfaces — tables, anything — it doesn't feel easy or exact." … "If I turn, everything should come with me — but not glued to my head; the pattern stays where I put it."

- BoardLeveler keeps the projected pattern permanently flat (yaw-only rotation) and, on Spectacles, settles it onto the real surface below via World Query when released.
- LazyFollow gives the interface waiting-room manners: it stays put while you look at it and glides back in front only when you walk or turn past a threshold. The pattern board is exempt — it is world-locked where you placed it.

## Team session — finishing the look

**Representative prompts:** "My friend and I did an update outside — check what she added and let's push it." … "Add her as a collaborator: urbanpeppermint."

- The pair session added FitPreview (an AI-illustrated preview of the finished garment via gpt-image/Imagen/Snap3D before cutting), BackNav (one-step-back navigation), and DestroyHelper (deferred UI destruction that finally silenced SIK's "Object is null" cursor errors), plus card and bar proportion tuning.
- The repo gained its logo header and a second collaborator.

## Closed-loop verification

CLAD repeatedly ran the same loop:

1. Inspect the live Lens Studio scene and runtime state.
2. Make a scoped TypeScript or scene change.
3. Force TypeScript compilation.
4. Refresh Preview and collect fresh runtime logs.
5. Verify with Preview screenshots or simulated pinch interactions.
6. Refine copy, layout, interaction, or error handling — and never claim a fix without log evidence.

— Florencia Raffa, urbanpeppermint & Claude, September 2026
