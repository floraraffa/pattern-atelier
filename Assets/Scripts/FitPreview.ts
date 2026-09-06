// Vista previa de la prenda terminada — mismo tablero pergamino que el landing.

import { makePlate, makeLabel, makeTappable, makeSticker, resetLocal, safeDestroy } from "./UiLite";
import { t } from "./I18n";

const NAVY = new vec4(0.13, 0.17, 0.32, 1);
const MUTED = new vec4(0.42, 0.38, 0.34, 1);

@component
export class FitPreview extends BaseScriptComponent {
  @input stickerMaterial: Material;
  @input actionMaterial: Material;
  @input backMaterial: Material;
  @input
  @allowUndefined
  boardTexture: Texture; // mismo ui_board_bg del carrusel
  @input
  @allowUndefined
  menuTexture: Texture;

  public onCut: (() => void) | null = null;
  public onBack: (() => void) | null = null;

  private root: SceneObject | null = null;
  private frame: SceneObject | null = null;
  private imageSticker: SceneObject | null = null;
  private fitText: Text | null = null;
  private hintText: Text | null = null;

  onAwake() {
    this.sceneObject.enabled = false;
  }

  showLoading() {
    this.ensureChrome();
    if (this.fitText !== null && !isNull(this.fitText)) {
      this.fitText.text = t("fitWorking");
    }
    if (this.hintText !== null && !isNull(this.hintText)) {
      this.hintText.text = "";
    }
    if (this.imageSticker !== null && !isNull(this.imageSticker)) {
      safeDestroy(this.imageSticker);
      this.imageSticker = null;
    }
  }

  showResult(texture: Texture, phrase: string) {
    this.ensureChrome();
    this.setImage(texture);
    this.setPhrase(phrase, false);
  }

  showTextOnly(phrase: string, imageMissing: boolean = true) {
    this.ensureChrome();
    if (this.imageSticker !== null && !isNull(this.imageSticker)) {
      safeDestroy(this.imageSticker);
      this.imageSticker = null;
    }
    this.setPhrase(phrase, imageMissing);
  }

  hide() {
    if (this.root !== null && !isNull(this.root)) {
      safeDestroy(this.root);
      this.root = null;
    }
    this.frame = null;
    this.imageSticker = null;
    this.fitText = null;
    this.hintText = null;
    this.sceneObject.enabled = false;
  }

  private ensureChrome() {
    this.sceneObject.enabled = true;
    if (this.root !== null && !isNull(this.root)) {
      return;
    }
    this.buildChrome();
  }

  private setImage(texture: Texture) {
    if (this.frame === null || isNull(this.frame)) {
      return;
    }
    if (this.imageSticker !== null && !isNull(this.imageSticker)) {
      safeDestroy(this.imageSticker);
    }
    this.imageSticker = makeSticker(this.frame, "fitImg", this.stickerMaterial, texture, 16);
    this.imageSticker.getTransform().setLocalPosition(new vec3(0, 0, 0.2));
    const rmv = this.imageSticker.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    rmv.renderOrder = 60;
  }

  private truncatePhrase(text: string, maxLen: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxLen) {
      return trimmed;
    }
    return trimmed.substring(0, maxLen - 1) + "…";
  }

  private setPhrase(phrase: string, imageMissing: boolean) {
    if (this.fitText !== null && !isNull(this.fitText)) {
      this.fitText.text = this.truncatePhrase(phrase, 48);
    }
    if (this.hintText !== null && !isNull(this.hintText)) {
      this.hintText.text = imageMissing ? t("fitNoImage") : "";
    }
  }

  private buildChrome() {
    this.root = global.scene.createSceneObject("fitRoot");
    this.root.setParent(this.sceneObject);
    resetLocal(this.root);

    const canBoard = this.stickerMaterial !== undefined && !isNull(this.stickerMaterial) &&
      this.boardTexture !== undefined && !isNull(this.boardTexture);

    // Mismo tablero pergamino / ancho que el landing (~52 cm)
    if (canBoard) {
      const board = makeSticker(this.root, "board", this.stickerMaterial, this.boardTexture, 52);
      board.getTransform().setLocalPosition(new vec3(0, -1, -6));
    } else {
      const board = makePlate(this.root, "board", 52, 32, this.actionMaterial);
      board.getTransform().setLocalPosition(new vec3(0, -1, -6));
      (board.getComponent("Component.RenderMeshVisual") as RenderMeshVisual).renderOrder = 5;
    }

    makeLabel(this.root, t("fitTitle"), 1.9, new vec3(0, 11, 0.3), NAVY);

    this.frame = global.scene.createSceneObject("imgFrame");
    this.frame.setParent(this.root);
    resetLocal(this.frame);
    this.frame.getTransform().setLocalPosition(new vec3(0, 1.5, 0));

    this.fitText = makeLabel(this.root, t("fitWorking"), 1.0, new vec3(0, -9, 0.3), NAVY);
    this.hintText = makeLabel(this.root, "", 0.75, new vec3(0, -10.8, 0.3), MUTED);

    const canSticker = this.stickerMaterial !== undefined && !isNull(this.stickerMaterial) &&
      this.menuTexture !== undefined && !isNull(this.menuTexture);

    let cutBtn: SceneObject;
    if (canSticker) {
      cutBtn = makeSticker(this.root, "cutBtn", this.stickerMaterial, this.menuTexture, 16);
      makeLabel(cutBtn, t("toFabric"), 1.1, new vec3(0.3, 0.1, 0.3), NAVY);
    } else {
      cutBtn = makePlate(this.root, "cutBtn", 14, 4, this.actionMaterial);
      makeLabel(cutBtn, t("toFabric"), 1.2, new vec3(0, 0, 0.2));
    }
    cutBtn.getTransform().setLocalPosition(new vec3(0, -13.5, 0.4));

    let backBtn: SceneObject;
    if (canSticker) {
      backBtn = makeSticker(this.root, "backBtn", this.stickerMaterial, this.menuTexture, 13);
      makeLabel(backBtn, t("backPatterns"), 0.95, new vec3(0.2, 0.08, 0.3), NAVY);
    } else {
      backBtn = makePlate(this.root, "backBtn", 12, 3.5, this.backMaterial);
      makeLabel(backBtn, t("backPatterns"), 1.0, new vec3(0, 0, 0.2));
    }
    backBtn.getTransform().setLocalPosition(new vec3(0, -17.2, 0.4));

    makeTappable(cutBtn, 16, 4.5, () => {
      if (this.onCut !== null) {
        this.onCut();
      }
    });
    makeTappable(backBtn, 13, 4, () => {
      if (this.onBack !== null) {
        this.onBack();
      }
    });
  }
}
