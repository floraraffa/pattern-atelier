// Manija de agarre del tablero de moldes: genera su visual (quad doble cara)
// y un collider a medida para que SIK pueda apuntarle y manipular el tablero.

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

@component
export class HandleSetup extends BaseScriptComponent {
  @input material: Material;
  @input width: number = 14; // cm
  @input height: number = 5; // cm

  onAwake() {
    const hw = this.width / 2;
    const hh = this.height / 2;

    const verts = [
      -hw, -hh, 0,
      hw, -hh, 0,
      hw, hh, 0,
      -hw, hh, 0
    ];
    const indices = [0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0];

    const builder = new MeshBuilder([{ name: "position", components: 3 }]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;
    builder.appendVerticesInterleaved(verts);
    builder.appendIndices(indices);
    if (builder.isValid()) {
      builder.updateMesh();
      const rmv = this.sceneObject.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
      rmv.mesh = builder.getMesh();
      rmv.mainMaterial = this.material;
    }

    try {
      const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent;
      const shape = Shape.createBoxShape();
      shape.size = new vec3(this.width, this.height, 2);
      collider.shape = shape;
      print("HandleSetup: collider listo " + this.width + "x" + this.height);
    } catch (e) {
      print("HandleSetup: fallo el collider: " + e);
    }

    this.createEvent("OnStartEvent").bind(() => this.hookEvents());
  }

  private hookEvents() {
    const interactable = this.sceneObject.getComponent(
      Interactable.getTypeName()
    ) as Interactable;
    if (isNull(interactable)) {
      print("HandleSetup: no encontré Interactable en el objeto");
      return;
    }
    interactable.onHoverEnter.add(() => print("HandleSetup: hover enter"));
    interactable.onTriggerStart.add(() => print("HandleSetup: trigger start"));
    interactable.onTriggerEnd.add(() => print("HandleSetup: trigger end"));
    print("HandleSetup: eventos conectados, colliders=" + interactable.colliders.length);
  }
}
