// Full-bleed atelier UI face: each step is a mockup texture board with
// transparent tap hotspots. Language is NOT a screen — use LangDropdown.

import { makeLabel, makePlate, makeSticker, makeTappable, resetLocal, safeDestroy } from "./UiLite";

export type AtelierScreenId =
  | "landing"
  | "garment"
  | "body"
  | "measure"
  | "design"
  | "generate"
  | "preview"
  | "fabric";

export interface Hotspot {
  id: string;
  // Normalized coords: 0..1 from board left/bottom, size as fraction of board.
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}

@component
export class AtelierFace extends BaseScriptComponent {
  @input stickerMaterial: Material;
  @input
  @allowUndefined
  boardWidthCm: number = 58;

  @input
  @allowUndefined
  screenLanding: Texture;
  @input
  @allowUndefined
  screenGarment: Texture;
  @input
  @allowUndefined
  screenBody: Texture;
  @input
  @allowUndefined
  screenMeasure: Texture;
  @input
  @allowUndefined
  screenDesign: Texture;
  @input
  @allowUndefined
  screenGenerate: Texture;
  @input
  @allowUndefined
  screenPreview: Texture;
  @input
  @allowUndefined
  screenFabric: Texture;

  public onHotspot: ((id: string) => void) | null = null;

  private root: SceneObject | null = null;
  private board: SceneObject | null = null;
  private hits: SceneObject | null = null;
  private current: AtelierScreenId | null = null;
  private caption: Text | null = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.root = global.scene.createSceneObject("atelierFaceRoot");
      this.root.setParent(this.sceneObject);
      resetLocal(this.root);
      // Visibility is owned by AppFlow — do not hide here (race with enterLanding).
    });
  }

  private texFor(id: AtelierScreenId): Texture | null {
    if (id === "landing") return this.orNull(this.screenLanding);
    if (id === "garment") return this.orNull(this.screenGarment);
    if (id === "body") return this.orNull(this.screenBody);
    if (id === "measure") return this.orNull(this.screenMeasure);
    if (id === "design") return this.orNull(this.screenDesign);
    if (id === "generate") return this.orNull(this.screenGenerate);
    if (id === "preview") return this.orNull(this.screenPreview);
    if (id === "fabric") return this.orNull(this.screenFabric);
    return null;
  }

  private orNull(t: Texture | undefined): Texture | null {
    if (t === undefined || isNull(t)) {
      return null;
    }
    return t;
  }

  show(id: AtelierScreenId, hotspots: Hotspot[]) {
    this.current = id;
    this.sceneObject.enabled = true;
    if (this.root === null || isNull(this.root)) {
      this.root = global.scene.createSceneObject("atelierFaceRoot");
      this.root.setParent(this.sceneObject);
      resetLocal(this.root);
    }
    if (this.board !== null && !isNull(this.board)) {
      safeDestroy(this.board);
      this.board = null;
    }
    if (this.hits !== null && !isNull(this.hits)) {
      safeDestroy(this.hits);
      this.hits = null;
    }
    this.caption = null;

    const tex = this.texFor(id);
    const w = this.boardWidthCm;
    if (tex !== null) {
      this.board = makeSticker(this.root, "screen_" + id, this.stickerMaterial, tex, w);
      this.board.getTransform().setLocalPosition(new vec3(0, 0, 0));
      const rmv = this.board.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
      if (rmv !== null && !isNull(rmv)) {
        rmv.renderOrder = 20;
      }
    } else {
      // Fallback plate if texture not wired yet
      print("AtelierFace: missing texture for " + id);
      this.caption = makeLabel(this.root, id.toUpperCase(), 2.0, new vec3(0, 0, 0.2));
    }

    this.hits = global.scene.createSceneObject("hits");
    this.hits.setParent(this.root);
    resetLocal(this.hits);

    const aspect =
      tex !== null ? tex.getHeight() / tex.getWidth() : 9 / 16;
    const h = w * aspect;

    for (let i = 0; i < hotspots.length; i++) {
      const hs = hotspots[i];
      const hw = Math.max(hs.nw * w, 2);
      const hh = Math.max(hs.nh * h, 2);
      // nx/ny = center of hotspot in 0..1 from bottom-left
      const x = (hs.nx - 0.5) * w;
      const y = (hs.ny - 0.5) * h;
      const hit = global.scene.createSceneObject("hit_" + hs.id);
      hit.setParent(this.hits);
      resetLocal(hit);
      hit.getTransform().setLocalPosition(new vec3(x, y, 0.4));
      const hid = hs.id;
      makeTappable(hit, hw, hh, () => {
        if (this.onHotspot !== null) {
          this.onHotspot(hid);
        }
      });
    }
  }

  hide() {
    this.current = null;
    this.sceneObject.enabled = false;
    if (this.board !== null && !isNull(this.board)) {
      safeDestroy(this.board);
      this.board = null;
    }
    if (this.hits !== null && !isNull(this.hits)) {
      safeDestroy(this.hits);
      this.hits = null;
    }
  }

  getCurrent(): AtelierScreenId | null {
    return this.current;
  }
}

/** Hotspot maps aligned to the editorial mockups (normalized 0–1). */
export const HOTSPOTS: { [id: string]: Hotspot[] } = {
  landing: [{ id: "enter", nx: 0.22, ny: 0.28, nw: 0.22, nh: 0.08 }],
  garment: [
    { id: "prev", nx: 0.08, ny: 0.48, nw: 0.05, nh: 0.1 },
    { id: "next", nx: 0.92, ny: 0.48, nw: 0.05, nh: 0.1 },
    { id: "card0", nx: 0.22, ny: 0.48, nw: 0.12, nh: 0.55 },
    { id: "card1", nx: 0.36, ny: 0.48, nw: 0.12, nh: 0.55 },
    { id: "card2", nx: 0.50, ny: 0.48, nw: 0.12, nh: 0.55 },
    { id: "card3", nx: 0.64, ny: 0.48, nw: 0.12, nh: 0.55 },
    { id: "card4", nx: 0.78, ny: 0.48, nw: 0.12, nh: 0.55 }
  ],
  body: [
    { id: "woman", nx: 0.32, ny: 0.48, nw: 0.28, nh: 0.55 },
    { id: "man", nx: 0.62, ny: 0.48, nw: 0.28, nh: 0.55 },
    { id: "confirm", nx: 0.88, ny: 0.18, nw: 0.14, nh: 0.08 }
  ],
  measure: [
    { id: "scan", nx: 0.18, ny: 0.62, nw: 0.22, nh: 0.1 },
    { id: "manual", nx: 0.18, ny: 0.48, nw: 0.22, nh: 0.1 },
    { id: "standard", nx: 0.18, ny: 0.34, nw: 0.22, nh: 0.1 },
    { id: "confirm", nx: 0.88, ny: 0.18, nw: 0.14, nh: 0.08 },
    { id: "back", nx: 0.12, ny: 0.12, nw: 0.1, nh: 0.06 }
  ],
  design: [
    { id: "type", nx: 0.78, ny: 0.12, nw: 0.12, nh: 0.07 },
    { id: "voice", nx: 0.90, ny: 0.12, nw: 0.12, nh: 0.07 },
    { id: "back", nx: 0.12, ny: 0.12, nw: 0.1, nh: 0.06 }
  ],
  generate: [],
  preview: [
    { id: "approve", nx: 0.88, ny: 0.22, nw: 0.16, nh: 0.07 },
    { id: "regenerate", nx: 0.88, ny: 0.14, nw: 0.16, nh: 0.06 },
    { id: "back", nx: 0.12, ny: 0.12, nw: 0.1, nh: 0.06 }
  ],
  fabric: [
    { id: "nextPiece", nx: 0.88, ny: 0.18, nw: 0.16, nh: 0.07 },
    { id: "back", nx: 0.12, ny: 0.12, nw: 0.1, nh: 0.06 }
  ]
};
