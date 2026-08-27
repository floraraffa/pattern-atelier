// Sticker independiente: una imagen con transparencia como objeto de escena.
// La posición, rotación y escala se editan directo en el Inspector/gizmo.

import { buildTexturedQuadMesh } from "./LineMesh";

@component
export class Sticker extends BaseScriptComponent {
  @input texture: Texture;
  @input baseMaterial: Material; // unlit con alpha (se clona)
  @input widthCm: number = 20;
  // ✏️ Posición y rotación extra (se suman al transform del objeto)
  @input offsetX: number = 0;
  @input offsetY: number = 0;
  @input rotationDeg: number = 0;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      const holder = global.scene.createSceneObject("stickerVisual");
      holder.setParent(this.sceneObject);
      holder.getTransform().setLocalPosition(new vec3(this.offsetX, this.offsetY, 0));
      holder.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, (this.rotationDeg * Math.PI) / 180));
      holder.getTransform().setLocalScale(new vec3(1, 1, 1));
      const aspect = this.texture.getHeight() / this.texture.getWidth();
      const mesh = buildTexturedQuadMesh(this.widthCm, this.widthCm * aspect);
      if (mesh !== null) {
        const rmv = holder.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        rmv.mesh = mesh;
        const mat = this.baseMaterial.clone();
        mat.mainPass.baseTex = this.texture;
        rmv.mainMaterial = mat;
      }
    });
  }
}
