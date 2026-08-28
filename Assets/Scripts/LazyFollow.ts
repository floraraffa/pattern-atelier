// Seguimiento perezoso de la interfaz (UIRoot): si te movés o girás, el panel
// te acompaña con un deslizamiento suave y se pone de frente — pero NO está
// pegado a la cabeza: mientras lo mirás de frente se queda quieto.
// El molde (PatternBoard) NO usa esto: queda clavado donde vos lo apoyaste.
//
// ✏️ EDITABLE: followDistanceCm (a qué distancia se para el panel),
//    angleThresholdDeg (cuánto podés girar antes de que te siga),
//    followSpeed (qué tan rápido te alcanza), heightOffsetCm.

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider";

@component
export class LazyFollow extends BaseScriptComponent {
  @input followDistanceCm: number = 110;
  @input angleThresholdDeg: number = 28;
  @input followSpeed: number = 2.6;
  @input heightOffsetCm: number = 0;
  @input followEnabled: boolean = true;

  private camT: Transform | null = null;
  private following: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      try {
        this.camT = WorldCameraFinderProvider.getInstance().getTransform();
      } catch (e) {
        print("LazyFollow: no encontré la cámara (" + e + ")");
      }
    });
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  private tick() {
    if (!this.followEnabled || this.camT === null || isNull(this.camT)) {
      return;
    }
    const tr = this.getSceneObject().getTransform();
    const camPos = this.camT.getWorldPosition();
    const fwd = this.camT.getWorldRotation().multiplyVec3(new vec3(0, 0, -1));

    // Dirección de la mirada proyectada al plano horizontal
    let fx = fwd.x;
    let fz = fwd.z;
    const fLen = Math.sqrt(fx * fx + fz * fz);
    if (fLen < 0.15) {
      return; // mirando casi vertical: no reposicionar
    }
    fx /= fLen;
    fz /= fLen;

    const pos = tr.getWorldPosition();
    let dx = pos.x - camPos.x;
    let dz = pos.z - camPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.001) {
      dx /= dist;
      dz /= dist;
    }

    // ¿Cuánto se corrió el panel del centro de la vista?
    const dot = Math.max(-1, Math.min(1, dx * fx + dz * fz));
    const angDeg = (Math.acos(dot) * 180) / Math.PI;
    const targetY = camPos.y + this.heightOffsetCm;
    const dy = Math.abs(pos.y - targetY);

    if (!this.following) {
      const far = dist > this.followDistanceCm * 1.45;
      const near = dist < this.followDistanceCm * 0.55;
      if (angDeg > this.angleThresholdDeg || far || near || dy > 45) {
        this.following = true;
      }
    }

    if (this.following) {
      const target = new vec3(
        camPos.x + fx * this.followDistanceCm,
        targetY,
        camPos.z + fz * this.followDistanceCm
      );
      const k = Math.min(1, getDeltaTime() * this.followSpeed);
      const np = vec3.lerp(pos, target, k);
      tr.setWorldPosition(np);
      // Llegó: se vuelve a quedar quieto (histéresis)
      const settled = angDeg < 5 && Math.abs(dist - this.followDistanceCm) < 10 && dy < 8;
      if (settled) {
        this.following = false;
      }
    }

    // Siempre de frente (solo giro vertical, suave)
    const cur = tr.getWorldRotation();
    const yaw = Math.atan2(camPos.x - pos.x, camPos.z - pos.z);
    const targetRot = quat.angleAxis(yaw, vec3.up());
    tr.setWorldRotation(quat.slerp(cur, targetRot, Math.min(1, getDeltaTime() * 5)));
  }
}
