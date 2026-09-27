// Minimal atelier assistant — glass status strip + small "A" mark.
// API unchanged: say / speak / setThinking / setMood / showError / hide / show

import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { makeLabel, makePlate, makeTappable, resetLocal } from "./UiLite";
import { MusicController } from "./MusicController";

const INK = new vec4(0.08, 0.08, 0.08, 1);
const MUTED = new vec4(0.4, 0.4, 0.4, 1);
const GOLD = new vec4(0.72, 0.58, 0.28, 1);
const ERROR = new vec4(0.55, 0.18, 0.18, 1);
const GLASS = new vec4(0.96, 0.94, 0.90, 0.42);

@component
export class Mascot extends BaseScriptComponent {
  @input
  @allowUndefined
  cloudMaterial: Material;
  @input
  @allowUndefined
  texClosed: Texture;
  @input
  @allowUndefined
  texOpen: Texture;
  @input
  @allowUndefined
  texThink: Texture;
  @input
  @allowUndefined
  texError: Texture;
  @input
  @allowUndefined
  texHappy: Texture;
  @input
  @allowUndefined
  texWink: Texture;
  @input
  @allowUndefined
  closeMaterial: Material;
  @input
  @allowUndefined
  texCloseBtn: Texture;
  @input
  @allowUndefined
  texQuestionBtn: Texture;
  @input cloudSizeCm: number = 10;
  @input faceX: number = 0;
  @input faceY: number = 0;
  @input faceRotDeg: number = 0;
  @input bubbleTextSize: number = 0.82;
  @input bubbleTextX: number = -2.5;
  @input bubbleTextY: number = -3.8;
  @input bubbleTextRotDeg: number = 0;
  @input bubbleWrapChars: number = 72;
  @input maxBubbleLines: number = 1;
  @input closeBtnX: number = 6.5;
  @input closeBtnY: number = 1.5;
  @input closeBtnSize: number = 4;
  @input helpBtnX: number = 0;
  @input helpBtnY: number = -4;
  @input helpBtnSize: number = 5;

  @input
  @allowUndefined
  plateMaterial: Material;
  @input stripWidthCm: number = 48;
  @input stripHeightCm: number = 4.4;
  @input markSizeCm: number = 0.95;
  @input statusTextSize: number = 0.58;
  @input ttsVoice: string = "nova";
  @input ttsEnabled: boolean = true;
  @input
  @allowUndefined
  music: MusicController;

  private body: SceneObject | null = null;
  private reopenBtn: SceneObject | null = null;
  private markLabel: Text | null = null;
  private roleLabel: Text | null = null;
  private statusLabel: Text | null = null;
  private pulsePlate: SceneObject | null = null;
  private glassMat: Material | null = null;
  private audio: AudioComponent | null = null;
  private lastMessage: string = "";

  private talking: boolean = false;
  private sayToken: number = 0;
  private talkUntil: number = 0;
  private thinking: boolean = false;
  private moodName: string = "";
  private pulseT: number = 0;
  private built: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.build());
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  private sourceMat(): Material {
    if (this.plateMaterial !== undefined && !isNull(this.plateMaterial)) {
      return this.plateMaterial;
    }
    if (this.closeMaterial !== undefined && !isNull(this.closeMaterial)) {
      return this.closeMaterial;
    }
    return this.cloudMaterial;
  }

  private makeGlass(): Material {
    const src = this.sourceMat();
    const mat = src.clone();
    try {
      mat.mainPass.baseColor = GLASS;
    } catch (e) {
      // some materials expose color differently; plate still works
    }
    this.glassMat = mat;
    return mat;
  }

  private build() {
    if (this.built) {
      return;
    }
    this.built = true;

    this.body = global.scene.createSceneObject("assistantBody");
    this.body.setParent(this.sceneObject);
    resetLocal(this.body);

    const mat = this.makeGlass();
    const w = this.stripWidthCm;
    const h = this.stripHeightCm;

    // Glass strip
    const strip = makePlate(this.body, "statusStrip", w, h, mat);
    strip.getTransform().setLocalPosition(new vec3(0, 0, 0));
    const rmv = strip.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    if (rmv !== null && !isNull(rmv)) {
      rmv.renderOrder = 80;
    }
    // Tap strip → replay last line aloud
    makeTappable(strip, w, h, () => this.replay());

    // Thin left accent (pulses while speaking) — no separate giant "A"
    this.pulsePlate = makePlate(this.body, "accent", 0.28, h - 0.8, mat);
    this.pulsePlate.getTransform().setLocalPosition(new vec3(-w / 2 + 0.9, 0, 0.08));

    // Single copy column: role on top, message below — nothing stacked on the same glyph
    // Centered so Left-alignment + large scale cannot collide with a monogram.
    this.roleLabel = makeLabel(this.body, "A  ·  ASSISTANT", 0.55, new vec3(0, 0.9, 0.3), MUTED);
    this.roleLabel.horizontalAlignment = HorizontalAlignment.Center;
    this.roleLabel.renderOrder = 110;
    this.markLabel = null;

    this.statusLabel = makeLabel(this.body, "", this.statusTextSize, new vec3(0, -0.65, 0.3), INK);
    this.statusLabel.horizontalAlignment = HorizontalAlignment.Center;
    this.statusLabel.renderOrder = 110;

    // Audio — must be enabled or play/stop throw
    this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;
    this.audio.enabled = true;

    // Mute on the right
    const mute = makePlate(this.body, "mute", 2.6, h - 0.6, mat);
    mute.getTransform().setLocalPosition(new vec3(w / 2 - 1.8, 0, 0.12));
    makeLabel(mute, "✕", 0.7, new vec3(0, 0, 0.2), MUTED);
    makeTappable(mute, 3.0, h, () => this.hide());

    // Reopen chip
    this.reopenBtn = makePlate(this.sceneObject, "reopenAssistant", 3.4, 3.4, mat);
    this.reopenBtn.getTransform().setLocalPosition(new vec3(0, 0, 0));
    makeLabel(this.reopenBtn, "A", 1.1, new vec3(0, 0, 0.2), INK);
    makeTappable(this.reopenBtn, 3.8, 3.8, () => this.show());
    this.reopenBtn.enabled = false;

    this.setRoleLine();

    // If a message arrived before build finished, show it now
    if (this.lastMessage !== "") {
      this.setStatus(this.wrap(this.lastMessage, this.bubbleWrapChars));
    }
  }

  private setRoleLine() {
    if (this.roleLabel === null || isNull(this.roleLabel)) {
      return;
    }
    if (this.thinking) {
      this.roleLabel.text = "A  ·  ASSISTANT  ·  WORKING";
      this.roleLabel.textFill.color = GOLD;
    } else if (this.talking) {
      this.roleLabel.text = "A  ·  ASSISTANT  ·  SPEAKING";
      this.roleLabel.textFill.color = INK;
    } else if (this.moodName === "error") {
      this.roleLabel.text = "A  ·  ASSISTANT  ·  ERROR";
      this.roleLabel.textFill.color = ERROR;
    } else {
      this.roleLabel.text = "A  ·  ASSISTANT";
      this.roleLabel.textFill.color = MUTED;
    }
  }

  setMood(which: string) {
    this.moodName = which === "happy" || which === "wink" ? which : "";
    this.setRoleLine();
  }

  setThinking(on: boolean) {
    this.thinking = on;
    this.setRoleLine();
  }

  showError(message: string) {
    this.thinking = false;
    this.talking = false;
    this.moodName = "error";
    this.setRoleLine();
    this.speak(message);
  }

  say(message: string) {
    this.lastMessage = message;
    this.sayToken += 1;
    const token = this.sayToken;
    if (!this.built) {
      // Defer until strip exists
      const evt = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent;
      evt.bind(() => {
        if (token === this.sayToken) {
          this.say(message);
        }
      });
      evt.reset(0.08);
      return;
    }
    const parts = this.splitParts(message);
    this.showPart(parts, 0, token);
  }

  /** Tap the strip to hear the last line again. */
  private replay() {
    if (this.lastMessage === "") {
      return;
    }
    this.speak(this.lastMessage);
  }

  private splitParts(message: string): string[] {
    const words = message.split(" ");
    const parts: string[] = [];
    let current = "";
    for (const w of words) {
      const cand = current === "" ? w : current + " " + w;
      const lines = this.wrap(cand + " …", this.bubbleWrapChars).split("\n").length;
      if (lines > this.maxBubbleLines && current !== "") {
        parts.push(current);
        current = w;
      } else {
        current = cand;
      }
    }
    if (current !== "") {
      parts.push(current);
    }
    return parts.length > 0 ? parts : [""];
  }

  private showPart(parts: string[], idx: number, token: number) {
    if (token !== this.sayToken || idx >= parts.length) {
      return;
    }
    const isLast = idx === parts.length - 1;
    this.setStatus(this.wrap(parts[idx] + (isLast ? "" : " …"), this.bubbleWrapChars));
    if (!isLast) {
      const evt = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent;
      evt.bind(() => this.showPart(parts, idx + 1, token));
      evt.reset(Math.max(2.8, parts[idx].length / 14));
    }
  }

  private setStatus(textValue: string) {
    if (this.statusLabel !== null && !isNull(this.statusLabel)) {
      this.statusLabel.text = textValue;
    }
  }

  speak(message: string) {
    this.say(message);
    if (!this.ttsEnabled) {
      return;
    }
    OpenAI.speech({
      model: "gpt-4o-mini-tts",
      voice: this.ttsVoice,
      input: message,
      response_format: "mp3"
    })
      .then((track: AudioTrackAsset) => {
        if (this.audio === null || isNull(this.audio)) {
          return;
        }
        try {
          this.audio.enabled = true;
          this.audio.audioTrack = track;
          this.audio.play(1);
        } catch (e) {
          print("Assistant: audio play failed: " + e);
          return;
        }
        let dur = 0;
        try {
          dur = this.audio.duration;
        } catch (e2) {
          dur = 0;
        }
        if (dur === undefined || dur === null || dur <= 0 || isNaN(dur)) {
          dur = Math.max(2, message.length / 13);
        }
        this.talking = true;
        this.talkUntil = getTime() + dur;
        this.setRoleLine();
        this.setMusicDucked(true);
      })
      .catch((error) => {
        print("Assistant: TTS failed (text only): " + error);
        this.setMusicDucked(false);
      });
  }

  private tick() {
    if (this.pulsePlate !== null && !isNull(this.pulsePlate)) {
      this.pulseT += getDeltaTime();
      const active = this.thinking || this.talking;
      const s = active ? 1 + 0.12 * Math.sin(this.pulseT * 5) : 1;
      this.pulsePlate.getTransform().setLocalScale(new vec3(1, s, 1));
    }
    if (!this.talking) {
      return;
    }
    if (getTime() >= this.talkUntil) {
      this.talking = false;
      this.setRoleLine();
      this.setMusicDucked(false);
    }
  }

  private stopAudioSafe() {
    if (this.audio === null || isNull(this.audio)) {
      return;
    }
    try {
      this.audio.enabled = true;
      this.audio.stop(false);
    } catch (e) {
      // Audio player not ready — ignore
    }
  }

  hide() {
    this.stopAudioSafe();
    if (this.body !== null) {
      this.body.enabled = false;
    }
    if (this.reopenBtn !== null) {
      this.reopenBtn.enabled = true;
    }
    this.talking = false;
    this.setMusicDucked(false);
  }

  private setMusicDucked(on: boolean) {
    if (this.music !== undefined && !isNull(this.music)) {
      this.music.setDucked(on);
    }
  }

  show() {
    if (this.body !== null) {
      this.body.enabled = true;
    }
    if (this.reopenBtn !== null) {
      this.reopenBtn.enabled = false;
    }
    if (this.lastMessage !== "") {
      this.speak(this.lastMessage);
    }
  }

  private wrap(message: string, maxLine: number): string {
    const words = message.split(" ");
    let line = "";
    let out = "";
    for (const w of words) {
      if ((line + " " + w).length > maxLine) {
        out += (out === "" ? "" : "\n") + line;
        line = w;
      } else {
        line = line === "" ? w : line + " " + w;
      }
    }
    out += (out === "" ? "" : "\n") + line;
    return out;
  }
}
