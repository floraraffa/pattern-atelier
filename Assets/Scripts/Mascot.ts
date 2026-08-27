// "Nube", la mascota guía del taller ☁ — arte nube+globo de Flor con poses
// intercambiables (todas comparten el mismo encuadre): boca cerrada (reposo),
// boca abierta (hablando, alterna con cerrada), pregunta (pensando) y error.
// El texto se escribe DENTRO del globo cosido. Habla con TTS de OpenAI en el
// idioma elegido. Se cierra con ✕ y reabre con ?.
//
// ✏️ EDITABLE EN EL INSPECTOR (objeto MascotRoot):
//   - posición/rotación: el transform del objeto
//   - cloudSizeCm: tamaño del arte
//   - bubbleTextSize / bubbleTextX / bubbleTextY / bubbleWrapChars: el texto del globo

import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { makeLabel, makeButton, makeSticker, makeTappable, resetLocal } from "./UiLite";
import { buildTexturedQuadMesh } from "./LineMesh";

@component
export class Mascot extends BaseScriptComponent {
  @input cloudMaterial: Material; // unlit con alpha; el baseTex se swapea
  @input texClosed: Texture; // nube+globo boca cerrada (reposo)
  @input texOpen: Texture; // nube+globo boca abierta (hablando)
  @input texThink: Texture; // nube+globo pensando (AI ocupada)
  @input
  @allowUndefined
  texError: Texture; // nube+globo error (si falta, usa la cerrada)
  @input
  @allowUndefined
  texHappy: Texture; // nube feliz (moldes listos)
  @input
  @allowUndefined
  texWink: Texture; // nube guiño (a la tela)
  @input closeMaterial: Material;
  @input
  @allowUndefined
  texCloseBtn: Texture; // botón ✕ (arte)
  @input
  @allowUndefined
  texQuestionBtn: Texture; // botón ? (arte)
  @input cloudSizeCm: number = 10; // ancho del arte ≈ cloudSizeCm × 1.55
  // ✏️ NUBE: posición y rotación (relativas al objeto MascotRoot)
  @input faceX: number = 0;
  @input faceY: number = 0;
  @input faceRotDeg: number = 0;
  // ✏️ TEXTO dentro del globo (cm, relativo al centro del arte)
  @input bubbleTextSize: number = 0.82;
  @input bubbleTextX: number = -2.5;
  @input bubbleTextY: number = -3.8;
  @input bubbleTextRotDeg: number = 0;
  @input bubbleWrapChars: number = 26;
  @input maxBubbleLines: number = 4; // si el texto pasa esto, se muestra en 2 partes
  // ✏️ BOTÓN ✕ y BOTÓN ?
  @input closeBtnX: number = 6.5;
  @input closeBtnY: number = 1.5;
  @input closeBtnSize: number = 4;
  @input helpBtnX: number = 0;
  @input helpBtnY: number = -4;
  @input helpBtnSize: number = 5;
  @input ttsVoice: string = "nova";
  @input ttsEnabled: boolean = true;

  private bubbleText: Text | null = null;
  private body: SceneObject | null = null;
  private reopenBtn: SceneObject | null = null;
  private faceMaterial: Material | null = null;
  private audio: AudioComponent | null = null;
  private lastMessage: string = "";

  private talking: boolean = false;
  private sayToken: number = 0;
  private talkTimer: number = 0;
  private talkUntil: number = 0;
  private mouthOpen: boolean = false;
  private thinking: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.build());
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  private build() {
    this.body = global.scene.createSceneObject("mascotBody");
    this.body.setParent(this.sceneObject);
    resetLocal(this.body);

    // El arte nube+globo (todas las poses comparten encuadre)
    const face = global.scene.createSceneObject("cloudFace");
    face.setParent(this.body);
    resetLocal(face);
    const w = this.cloudSizeCm * 1.55;
    const h = w * (this.texClosed.getHeight() / this.texClosed.getWidth());
    face.getTransform().setLocalPosition(new vec3(this.faceX, this.faceY - h / 2, 0));
    face.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, (this.faceRotDeg * Math.PI) / 180));
    const mesh = buildTexturedQuadMesh(w, h);
    if (mesh !== null) {
      const rmv = face.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
      rmv.mesh = mesh;
      this.faceMaterial = this.cloudMaterial.clone();
      rmv.mainMaterial = this.faceMaterial;
      this.setFace(this.texClosed);
    }

    this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;

    // Texto dentro del globo cosido
    this.bubbleText = makeLabel(
      face, "", this.bubbleTextSize,
      new vec3(this.bubbleTextX, this.bubbleTextY, 0.3),
      new vec4(0.13, 0.17, 0.32, 1)
    );
    this.bubbleText.getSceneObject().getTransform().setLocalRotation(
      quat.fromEulerAngles(0, 0, (this.bubbleTextRotDeg * Math.PI) / 180)
    );

    // Cerrar / reabrir
    if (this.texCloseBtn !== undefined && !isNull(this.texCloseBtn)) {
      const closeBtn = makeSticker(this.body, "closeMascot", this.cloudMaterial, this.texCloseBtn, this.closeBtnSize);
      closeBtn.getTransform().setLocalPosition(new vec3(this.closeBtnX, this.closeBtnY, 1));
      makeTappable(closeBtn, this.closeBtnSize, this.closeBtnSize, () => this.hide());
    } else {
      const closeBtn = makeButton(this.body, "closeMascot", "✕", 3.5, 3.5, this.closeMaterial, 1.6, () => this.hide());
      closeBtn.getTransform().setLocalPosition(new vec3(this.closeBtnX, this.closeBtnY, 0));
    }
    if (this.texQuestionBtn !== undefined && !isNull(this.texQuestionBtn)) {
      this.reopenBtn = makeSticker(this.sceneObject, "reopenMascot", this.cloudMaterial, this.texQuestionBtn, this.helpBtnSize);
      this.reopenBtn.getTransform().setLocalPosition(new vec3(this.helpBtnX, this.helpBtnY, 0));
      makeTappable(this.reopenBtn, this.helpBtnSize, this.helpBtnSize, () => this.show());
    } else {
      this.reopenBtn = makeButton(this.sceneObject, "reopenMascot", "?", this.helpBtnSize, this.helpBtnSize, this.closeMaterial, 2.2, () => this.show());
      this.reopenBtn.getTransform().setLocalPosition(new vec3(this.helpBtnX, this.helpBtnY, 0));
    }
    this.reopenBtn.enabled = false;
  }

  private setFace(tex: Texture) {
    if (this.faceMaterial !== null && tex !== undefined && !isNull(tex)) {
      this.faceMaterial.mainPass.baseTex = tex;
    }
  }

  private mood: Texture | null = null;

  private idleFace(): Texture {
    if (this.thinking) {
      return this.texThink;
    }
    if (this.mood !== null && !isNull(this.mood)) {
      return this.mood;
    }
    return this.texClosed;
  }

  // Humor temporal (feliz, guiño…): reemplaza la cara de reposo hasta el próximo cambio
  setMood(which: string) {
    if (which === "happy" && this.texHappy !== undefined && !isNull(this.texHappy)) {
      this.mood = this.texHappy;
    } else if (which === "wink" && this.texWink !== undefined && !isNull(this.texWink)) {
      this.mood = this.texWink;
    } else {
      this.mood = null;
    }
    if (!this.talking) {
      this.setFace(this.idleFace());
    }
  }

  // --- Estados ---

  setThinking(on: boolean) {
    this.thinking = on;
    if (!this.talking) {
      this.setFace(this.idleFace());
    }
  }

  showError(message: string) {
    this.thinking = false;
    this.talking = false;
    const tex = this.texError !== undefined && !isNull(this.texError) ? this.texError : this.texClosed;
    this.setFace(tex);
    this.say(message);
  }

  say(message: string) {
    this.lastMessage = message;
    this.sayToken += 1;
    const token = this.sayToken;
    const wrapped = this.wrap(message, this.bubbleWrapChars);
    const lines = wrapped.split("\n");
    if (lines.length <= this.maxBubbleLines) {
      this.setBubble(wrapped);
      return;
    }
    // Texto largo: partirlo en dos y mostrarlo por partes
    const words = message.split(" ");
    let part1 = "";
    let i = 0;
    while (i < words.length && (part1.length + words[i].length) < message.length / 2) {
      part1 += (part1 === "" ? "" : " ") + words[i];
      i += 1;
    }
    const part2 = words.slice(i).join(" ");
    this.setBubble(this.wrap(part1 + " …", this.bubbleWrapChars));
    const evt = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent;
    evt.bind(() => {
      if (token === this.sayToken) {
        this.setBubble(this.wrap(part2, this.bubbleWrapChars));
      }
    });
    evt.reset(Math.max(3.5, part1.length / 12));
  }

  private setBubble(textValue: string) {
    if (this.bubbleText !== null) {
      this.bubbleText.text = textValue;
    }
  }

  // Habla: muestra el texto y lo reproduce con TTS moviendo la boca.
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
        this.audio.audioTrack = track;
        this.audio.play(1);
        let dur = 0;
        try {
          dur = this.audio.duration;
        } catch (e) {
          dur = 0;
        }
        if (dur === undefined || dur === null || dur <= 0 || isNaN(dur)) {
          dur = Math.max(2, message.length / 13);
        }
        this.talking = true;
        this.talkUntil = getTime() + dur;
      })
      .catch((error) => {
        print("Mascot: TTS falló (sigue solo texto): " + error);
      });
  }

  private tick() {
    if (!this.talking) {
      return;
    }
    if (getTime() >= this.talkUntil) {
      this.talking = false;
      this.setFace(this.idleFace());
      return;
    }
    this.talkTimer += getDeltaTime();
    if (this.talkTimer > 0.13) {
      this.talkTimer = 0;
      this.mouthOpen = !this.mouthOpen;
      this.setFace(this.mouthOpen ? this.texOpen : this.texClosed);
    }
  }

  hide() {
    if (this.body !== null) {
      this.body.enabled = false;
    }
    if (this.reopenBtn !== null) {
      this.reopenBtn.enabled = true;
    }
    if (this.audio !== null && !isNull(this.audio)) {
      this.audio.stop(false);
    }
    this.talking = false;
  }

  show() {
    if (this.body !== null) {
      this.body.enabled = true;
    }
    if (this.reopenBtn !== null) {
      this.reopenBtn.enabled = false;
    }
    this.say(this.lastMessage);
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
