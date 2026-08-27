// Botonera de progreso del flujo (idea del concepto de Flor): botones de
// costura unidos por línea punteada, con el paso activo en celeste y su
// etiqueta abajo, en el idioma elegido.

import { makeLabel, makeSticker, makeTappable, resetLocal, makePlate } from "./UiLite";
import { buildQuadMesh } from "./LineMesh";

const GOLD = new vec4(0.98, 0.76, 0.16, 1);
const GOLD_ACTIVE = new vec4(1, 0.87, 0.35, 1);

@component
export class ProgressSteps extends BaseScriptComponent {
  @input stickerMaterial: Material;
  @input buttonTexture: Texture; // botón beige (paso pendiente)
  @input buttonActiveTexture: Texture; // botón celeste (paso actual)
  @input dashMaterial: Material; // guiones amarillos entre botones
  @input stepSpacing: number = 9.5;
  @input buttonSize: number = 4.2;

  private root: SceneObject | null = null;
  public onStepTapped: ((index: number) => void) | null = null;

  setSteps(labels: string[], active: number) {
    if (this.root !== null && !isNull(this.root)) {
      this.root.destroy();
    }
    this.root = global.scene.createSceneObject("steps");
    this.root.setParent(this.sceneObject);
    resetLocal(this.root);

    const n = labels.length;
    const totalW = (n - 1) * this.stepSpacing;

    for (let i = 0; i < n; i++) {
      const x = -totalW / 2 + i * this.stepSpacing;
      const tex = i === active ? this.buttonActiveTexture : this.buttonTexture;
      const btn = makeSticker(this.root, "step_" + i, this.stickerMaterial, tex, this.buttonSize);
      btn.getTransform().setLocalPosition(new vec3(x, 0, 0));
      const stepIdx = i;
      makeTappable(btn, this.buttonSize + 2, this.buttonSize + 3, () => {
        if (this.onStepTapped !== null) {
          this.onStepTapped(stepIdx);
        }
      });
      // Dorado y "bold" (doble trazo con leve offset)
      const col = i === active ? GOLD_ACTIVE : GOLD;
      const sz = i === active ? 1.35 : 1.2;
      makeLabel(this.root, labels[i], sz, new vec3(x, -3.2, 0.2), col);
      makeLabel(this.root, labels[i], sz, new vec3(x + 0.07, -3.2, 0.19), col);

      // Guiones hacia el siguiente botón
      if (i < n - 1) {
        for (let d = 1; d <= 3; d++) {
          const dash = makePlate(this.root, "dash", 1.1, 0.4, this.dashMaterial);
          dash.getTransform().setLocalPosition(
            new vec3(x + (this.stepSpacing * d) / 4, 0, -0.2)
          );
        }
      }
    }
  }
}
