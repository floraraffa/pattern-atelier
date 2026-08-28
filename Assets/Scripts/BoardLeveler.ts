// Nivelador del tablero de moldes: el molde queda SIEMPRE plano (horizontal),
// como una hoja apoyada — al moverlo o girarlo solo rota alrededor del eje
// vertical, nunca se inclina. Y en las Specs, al soltarlo se "apoya" solo
// sobre la superficie real que tengas debajo (mesa, piso) usando World Query.
//
// ✏️ EDITABLE: levelSpeed (qué tan rápido se endereza), snapToSurface,
//    surfaceOffsetCm (a cuántos cm de la superficie queda).

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

@component
export class BoardLeveler extends BaseScriptComponent {
  @input levelSpeed: number = 10;
  @input snapToSurface: boolean = true;
  @input surfaceOffsetCm: number = 1;
  // La manija: mientras la tenés agarrada, no snapeamos a la superficie
  @input
  @allowUndefined
  handle: Interactable;

  private hitSession: unknown = null;
  private rayBusy: boolean = false;
  private held: boolean = false;
  private targetY: number | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.setup());
    this.createEvent("LateUpdateEvent").bind(() => this.tick());
  }

  private setup() {
    if (this.handle !== undefined && !isNull(this.handle)) {
      this.handle.onTriggerStart.add(() => {
        this.held = true;
        this.targetY = null;
      });
      this.handle.onTriggerEnd.add(() => {
        this.held = false;
      });
    }
    if (!this.snapToSurface) {
      return;
    }
    // World Query solo existe en Spectacles; en el editor seguimos sin snap
    try {
      const mod = require("LensStudio:WorldQueryModule") as {
        createHitTestSession?: () => unknown;
      };
      if (mod !== null && mod.createHitTestSession !== undefined) {
        this.hitSession = mod.createHitTestSession();
        const s = this.hitSession as { start?: () => void };
        if (s.start !== undefined) {
          s.start();
        }
        print("BoardLeveler: World Query listo (snap a superficies)");
      }
    } catch (e) {
      print("BoardLeveler: sin World Query (editor); solo nivelado");
    }
  }

  private tick() {
    const tr = this.getSceneObject().getTransform();

    // 1) Nivelar: conservar SOLO el giro vertical (yaw); nada de inclinación
    const rot = tr.getWorldRotation();
    const right = rot.multiplyVec3(new vec3(1, 0, 0));
    const yaw = Math.atan2(-right.z, right.x);
    const flat = quat.angleAxis(-Math.PI / 2, new vec3(1, 0, 0));
    const target = quat.angleAxis(yaw, vec3.up()).multiply(flat);
    const s = Math.min(1, getDeltaTime() * this.levelSpeed);
    tr.setWorldRotation(quat.slerp(rot, target, s));

    // 2) Apoyo en superficie real (Specs): al soltar, baja/sube suave hasta ella
    if (this.hitSession === null || this.held) {
      return;
    }
    const pos = tr.getWorldPosition();
    if (!this.rayBusy) {
      this.rayBusy = true;
      const from = new vec3(pos.x, pos.y + 40, pos.z);
      const to = new vec3(pos.x, pos.y - 250, pos.z);
      try {
        const session = this.hitSession as {
          hitTest: (a: vec3, b: vec3, cb: (r: { position: vec3 } | null) => void) => void;
        };
        session.hitTest(from, to, (result) => {
          this.rayBusy = false;
          if (result !== null && !this.held) {
            this.targetY = result.position.y + this.surfaceOffsetCm;
          }
        });
      } catch (e) {
        this.rayBusy = false;
        this.hitSession = null; // API distinta a la esperada: apagamos el snap
        print("BoardLeveler: hitTest no disponible: " + e);
      }
    }
    if (this.targetY !== null) {
      const k = Math.min(1, getDeltaTime() * 6);
      const ny = pos.y + (this.targetY - pos.y) * k;
      tr.setWorldPosition(new vec3(pos.x, ny, pos.z));
    }
  }
}
