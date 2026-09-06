// Destrucción diferida de UI dinámica: evita que SIK referencie Interactables
// ya destruidos (CursorViewModel "Object is null").

@component
export class DestroyHelper extends BaseScriptComponent {
  private static queue: SceneObject[] = [];
  private static pumping: boolean = false;

  onAwake() {
    DestroyHelper.ensurePump(this);
  }

  static ensurePump(host: BaseScriptComponent) {
    if (DestroyHelper.pumping) {
      return;
    }
    DestroyHelper.pumping = true;
    host.createEvent("LateUpdateEvent").bind(() => {
      if (DestroyHelper.queue.length === 0) {
        return;
      }
      const batch = DestroyHelper.queue;
      DestroyHelper.queue = [];
      for (let i = 0; i < batch.length; i++) {
        const obj = batch[i];
        if (obj !== null && !isNull(obj)) {
          obj.destroy();
        }
      }
    });
  }

  static schedule(root: SceneObject | null) {
    if (root === null || isNull(root)) {
      return;
    }
    DestroyHelper.disableTree(root);
    root.enabled = false;
    DestroyHelper.queue.push(root);
  }

  private static disableTree(obj: SceneObject) {
    obj.enabled = false;
    const scripts = obj.getComponentsInDescendants(
      "Component.ScriptComponent",
      false,
      true
    ) as ScriptComponent[];
    for (let i = 0; i < scripts.length; i++) {
      scripts[i].enabled = false;
    }
    const colliders = obj.getComponentsInDescendants(
      "Physics.ColliderComponent",
      false,
      true
    ) as ColliderComponent[];
    for (let i = 0; i < colliders.length; i++) {
      colliders[i].enabled = false;
    }
  }
}
