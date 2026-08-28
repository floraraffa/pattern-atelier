// Música de fondo del atelier ("Cute Lofi", librería licenciada de Snap) con
// botón on-off estilo botón de costura: celeste = sonando, beige = apagada.
// Posición: mover el objeto MusicRoot en el Inspector (o los offsets de abajo).

import { makeLabel, makeSticker, makeTappable, resetLocal } from "./UiLite";

@component
export class MusicController extends BaseScriptComponent {
  @input
  @allowUndefined
  audioTrack: AudioTrackAsset;
  @input
  @allowUndefined
  stickerMaterial: Material; // CloudMat (unlit + alpha, se clona)
  @input
  @allowUndefined
  onTexture: Texture; // botón celeste (música sonando)
  @input
  @allowUndefined
  offTexture: Texture; // botón beige (música apagada)
  @input volume: number = 0.25;
  @input buttonSize: number = 4.2;
  @input startOn: boolean = true;
  // ✏️ Ajuste fino de posición del botón dentro de MusicRoot
  @input offsetX: number = 0;
  @input offsetY: number = 0;

  private audio: AudioComponent | null = null;
  private visual: RenderMeshVisual | null = null;
  private noteLabel: Text | null = null;
  private playing: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.setup());
  }

  private setup() {
    if (this.audioTrack !== undefined && !isNull(this.audioTrack)) {
      this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;
      this.audio.audioTrack = this.audioTrack;
      // Los Licensed Sound no aceptan cambios de volumen: se ajusta solo si se puede
      try {
        this.audio.volume = this.volume;
      } catch (e) {
        // track licenciado: volumen fijo, seguimos igual
      }
    }

    let btn: SceneObject;
    const skinned = this.stickerMaterial !== undefined && !isNull(this.stickerMaterial) &&
      this.onTexture !== undefined && !isNull(this.onTexture);
    if (skinned) {
      btn = makeSticker(this.sceneObject, "musicBtn", this.stickerMaterial, this.onTexture, this.buttonSize);
      this.visual = btn.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    } else {
      btn = global.scene.createSceneObject("musicBtn");
      btn.setParent(this.sceneObject);
      resetLocal(btn);
    }
    btn.getTransform().setLocalPosition(new vec3(this.offsetX, this.offsetY, 0));
    this.noteLabel = makeLabel(btn, "♪", 1.9, new vec3(0.05, -0.05, 0.3), new vec4(0.13, 0.17, 0.32, 1));
    makeTappable(btn, this.buttonSize + 1, this.buttonSize + 1, () => this.toggle());

    if (this.startOn) {
      this.play();
    } else {
      this.updateLook();
    }
  }

  toggle() {
    if (this.playing) {
      this.stopMusic();
    } else {
      this.play();
    }
  }

  private play() {
    if (this.audio !== null && !isNull(this.audio)) {
      this.audio.play(-1); // loop infinito
    }
    this.playing = true;
    this.updateLook();
  }

  private stopMusic() {
    if (this.audio !== null && !isNull(this.audio)) {
      this.audio.stop(false);
    }
    this.playing = false;
    this.updateLook();
  }

  private updateLook() {
    // Celeste cuando suena, beige apagada (mismos botones que la botonera)
    if (this.visual !== null && !isNull(this.visual)) {
      const tex = this.playing ? this.onTexture : this.offTexture;
      if (tex !== undefined && !isNull(tex)) {
        this.visual.mainMaterial.mainPass.baseTex = tex;
      }
    }
    if (this.noteLabel !== null && !isNull(this.noteLabel)) {
      const NAVY = new vec4(0.13, 0.17, 0.32, 1);
      const GRAY = new vec4(0.55, 0.52, 0.48, 1);
      this.noteLabel.textFill.color = this.playing ? NAVY : GRAY;
      this.noteLabel.text = this.playing ? "♪" : "♪ ✕";
    }
  }
}
