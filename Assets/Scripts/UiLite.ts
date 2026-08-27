// Mini-kit de UI espacial construido por código: placas, etiquetas y taps.
// Calibración de texto: size 48 ≈ 1 cm de alto a escala 1.

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { buildQuadMesh, buildTexturedQuadMesh } from "./LineMesh";

// Sticker: quad con textura (respeta el aspecto de la imagen). El material
// base se clona para que cada sticker tenga su propia textura.
export function makeSticker(
  parent: SceneObject,
  name: string,
  baseMaterial: Material,
  texture: Texture,
  widthCm: number
): SceneObject {
  const obj = global.scene.createSceneObject(name);
  obj.setParent(parent);
  resetLocal(obj);
  const aspect = texture.getHeight() / texture.getWidth();
  const mesh = buildTexturedQuadMesh(widthCm, widthCm * aspect);
  if (mesh !== null) {
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    rmv.mesh = mesh;
    const mat = baseMaterial.clone();
    mat.mainPass.baseTex = texture;
    rmv.mainMaterial = mat;
  }
  return obj;
}

// Fuente global de la UI: se setea desde el componente UiTheme (objeto UIRoot).
let uiFont: Font | null = null;
export function setUiFont(font: Font | null) {
  uiFont = font;
}

export function resetLocal(obj: SceneObject) {
  obj.getTransform().setLocalPosition(vec3.zero());
  obj.getTransform().setLocalRotation(quat.quatIdentity());
  obj.getTransform().setLocalScale(new vec3(1, 1, 1));
}

export function makePlate(parent: SceneObject, name: string, w: number, h: number, material: Material): SceneObject {
  const obj = global.scene.createSceneObject(name);
  obj.setParent(parent);
  resetLocal(obj);
  const mesh = buildQuadMesh(w, h);
  if (mesh !== null) {
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    rmv.mesh = mesh;
    rmv.mainMaterial = material;
  }
  return obj;
}

export function makeLabel(parent: SceneObject, value: string, sizeCm: number, localPos: vec3, color?: vec4): Text {
  const obj = global.scene.createSceneObject("label");
  obj.setParent(parent);
  resetLocal(obj);
  obj.getTransform().setLocalPosition(localPos);
  obj.getTransform().setLocalScale(new vec3(sizeCm, sizeCm, sizeCm));
  const text = obj.createComponent("Component.Text") as Text;
  text.text = value;
  text.size = 48;
  // Jerarquía alta: el texto SIEMPRE se dibuja sobre los stickers/placas,
  // sin importar el ángulo desde donde mires
  text.renderOrder = 100;
  if (uiFont !== null && !isNull(uiFont)) {
    text.font = uiFont;
  }
  if (color !== undefined) {
    text.textFill.color = color;
  }
  text.horizontalAlignment = HorizontalAlignment.Center;
  text.verticalAlignment = VerticalAlignment.Center;
  return text;
}

export function makeTappable(obj: SceneObject, w: number, h: number, onTap: () => void): Interactable {
  const collider = obj.createComponent("Physics.ColliderComponent") as ColliderComponent;
  const shape = Shape.createBoxShape();
  shape.size = new vec3(w, h, 2);
  collider.shape = shape;
  const interactable = obj.createComponent(Interactable.getTypeName()) as Interactable;
  interactable.onTriggerEnd.add(() => onTap());
  return interactable;
}

export function makeButton(
  parent: SceneObject,
  name: string,
  labelText: string,
  w: number,
  h: number,
  material: Material,
  textSizeCm: number,
  onTap: () => void
): SceneObject {
  const plate = makePlate(parent, name, w, h, material);
  makeLabel(plate, labelText, textSizeCm, new vec3(0, 0, 0.2));
  makeTappable(plate, w, h, onTap);
  return plate;
}
