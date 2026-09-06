// Botón «volver» (esquina TR del tablero): navega un paso atrás en el flujo.

import { makeSticker, makeTappable, resetLocal } from "./UiLite";

@component
export class BackNav extends BaseScriptComponent {
  @input stickerMaterial: Material;
  @input
  @allowUndefined
  backTexture: Texture; // flecha ‹ o botón circular
  @input buttonSize: number = 4.2;
  @input offsetX: number = 0;
  @input offsetY: number = 0;

  public onBack: (() => void) | null = null;

  private btn: SceneObject | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.setup());
  }

  private setup() {
    if (this.stickerMaterial === undefined || isNull(this.stickerMaterial) ||
      this.backTexture === undefined || isNull(this.backTexture)) {
      print("BackNav: falta stickerMaterial o backTexture");
      return;
    }
    this.btn = makeSticker(this.sceneObject, "backBtn", this.stickerMaterial, this.backTexture, this.buttonSize);
    this.btn.getTransform().setLocalPosition(new vec3(this.offsetX, this.offsetY, 0));
    makeTappable(this.btn, this.buttonSize + 1.2, this.buttonSize + 1.2, () => {
      if (this.onBack !== null) {
        this.onBack();
      }
    });
  }

  setVisible(on: boolean) {
    this.sceneObject.enabled = on;
  }
}
