// Música de fondo del atelier (loop propio, sin licencias) con botón on-off
// claro: nota celeste = sonando, nota gris tachada = apagada.
// La música es un FONDO: suena bajito y se agacha (ducking) automáticamente
// cuando Nube habla, para que la AI tenga protagonismo.
// Posición: mover el objeto MusicRoot en el Inspector (o los offsets de abajo).

import { makeSticker, makeTappable, resetLocal } from "./UiLite";

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
  onTexture: Texture; // nota celeste (música sonando)
  @input
  @allowUndefined
  offTexture: Texture; // nota gris tachada (música apagada)
  // ✏️ Volúmenes: normal de fondo, y agachado mientras habla la nube
  @input volume: number = 0.22;
  @input duckVolume: number = 0.05;
  @input buttonSize: number = 4.6;
  @input startOn: boolean = true;
  // ✏️ Ajuste fino de posición del botón dentro de MusicRoot
  @input offsetX: number = 0;
  @input offsetY: number = 0;

  private audio: AudioComponent | null = null;
  private visual: RenderMeshVisual | null = null;
  private playing: boolean = false;
  private ducked: boolean = false;
  private currentVol: number = 0;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.setup());
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  private setup() {
    if (this.audioTrack !== undefined && !isNull(this.audioTrack)) {
      this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent;
      this.audio.audioTrack = this.audioTrack;
      this.setVol(0);
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
    makeTappable(btn, this.buttonSize + 1.5, this.buttonSize + 1.5, () => this.toggle());

    if (this.startOn) {
      this.playMusic();
    } else {
      this.updateLook();
    }
  }

  toggle() {
    print("MusicController: toggle → " + (this.playing ? "OFF" : "ON"));
    if (this.playing) {
      this.stopMusic();
    } else {
      this.playMusic();
    }
  }

  // La nube llama esto al empezar/terminar de hablar
  setDucked(on: boolean) {
    this.ducked = on;
  }

  private targetVol(): number {
    if (!this.playing) {
      return 0;
    }
    return this.ducked ? this.duckVolume : this.volume;
  }

  // Transición suave de volumen (sube/baja sin saltos)
  private tick() {
    if (this.audio === null || isNull(this.audio)) {
      return;
    }
    const target = this.targetVol();
    if (Math.abs(this.currentVol - target) > 0.002) {
      this.currentVol += (target - this.currentVol) * Math.min(1, getDeltaTime() * 6);
      this.setVol(this.currentVol);
    }
  }

  private setVol(v: number) {
    if (this.audio !== null && !isNull(this.audio)) {
      try {
        this.audio.volume = v;
      } catch (e) {
        // por si el track no soporta volumen: seguimos igual
      }
    }
  }

  private playMusic() {
    if (this.audio !== null && !isNull(this.audio)) {
      try {
        this.audio.play(-1); // loop infinito
      } catch (e) {
        print("MusicController: play falló: " + e);
      }
    }
    this.playing = true;
    this.updateLook();
  }

  private stopMusic() {
    this.playing = false;
    this.currentVol = 0;
    this.setVol(0);
    if (this.audio !== null && !isNull(this.audio)) {
      try {
        this.audio.stop(false);
      } catch (e) {
        // fallback: silenciado por volumen 0 (ya aplicado)
      }
    }
    this.updateLook();
  }

  private updateLook() {
    if (this.visual !== null && !isNull(this.visual)) {
      const tex = this.playing ? this.onTexture : this.offTexture;
      if (tex !== undefined && !isNull(tex)) {
        this.visual.mainMaterial.mainPass.baseTex = tex;
      }
    }
  }
}
