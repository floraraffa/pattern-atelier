// Cards del proyecto actual, en CARRUSEL deslizable (misma dinámica que el
// selector de idiomas): pasás las piezas con los dedos, la del centro se
// agranda. Cada card: nombre + mini-molde + sección, y dos acciones:
// "Modificar" (cambios por voz/teclado vía AI) y "A la tela" (modo corte).

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { AICard } from "./PatternAI";
import { buildSpecFromCard } from "./BlockRegistry";
import { PatternSpec } from "./PatternTypes";
import { buildRibbonMesh } from "./LineMesh";
import { makePlate, makeLabel, makeTappable, makeSticker, resetLocal } from "./UiLite";
import { t } from "./I18n";

const CARD_W = 20;
const CARD_H = 25;
const SPACING = 24;

@component
export class ProjectCards extends BaseScriptComponent {
  @input cardMaterial: Material;
  @input cardSelectedMaterial: Material;
  @input thumbMaterial: Material;
  @input actionMaterial: Material;
  @input backMaterial: Material;
  @input
  @allowUndefined
  frameTexture: Texture; // porta-molde de Flor (con espacios de botones)
  @input
  @allowUndefined
  stickerMaterial: Material;
  @input
  @allowUndefined
  arrowBackTexture: Texture; // flecha ‹ (arte)
  @input
  @allowUndefined
  arrowNextTexture: Texture; // flecha › (arte)
  @input
  @allowUndefined
  menuTexture: Texture; // base del botón Menú (la del CONTINUAR)

  public onModify: ((index: number) => void) | null = null;
  public onToCut: ((index: number) => void) | null = null;
  public onBack: (() => void) | null = null;

  private root: SceneObject | null = null;
  private strip: SceneObject | null = null;
  private plates: SceneObject[] = [];
  private cards: AICard[] = [];
  private centered: number = 0;

  private offset: number = 0;
  private targetOffset: number = 0;
  private dragging: boolean = false;
  private framedMode: boolean = false;

  onAwake() {
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  show(cards: AICard[], selectedIndex: number) {
    this.cards = cards;
    this.centered = Math.max(0, Math.min(selectedIndex >= 0 ? selectedIndex : 0, cards.length - 1));
    this.offset = this.centered * SPACING;
    this.targetOffset = this.offset;
    this.rebuild();
  }

  private rebuild() {
    if (this.root !== null && !isNull(this.root)) {
      this.root.destroy();
    }
    this.root = global.scene.createSceneObject("cardsRoot");
    this.root.setParent(this.sceneObject);
    resetLocal(this.root);
    this.plates = [];

    this.strip = global.scene.createSceneObject("strip");
    this.strip.setParent(this.root);
    resetLocal(this.strip);

    for (let i = 0; i < this.cards.length; i++) {
      this.plates.push(this.buildCard(this.cards[i], i));
    }

    // Zona de arrastre detrás de las cards (pasar con los dedos)
    const dragZone = global.scene.createSceneObject("dragZone");
    dragZone.setParent(this.root);
    resetLocal(dragZone);
    dragZone.getTransform().setLocalPosition(new vec3(0, 0, -1.5));
    const collider = dragZone.createComponent("Physics.ColliderComponent") as ColliderComponent;
    const shape = Shape.createBoxShape();
    shape.size = new vec3(SPACING * 3.4, CARD_H + 4, 2);
    collider.shape = shape;
    const interactable = dragZone.createComponent(Interactable.getTypeName()) as Interactable;
    interactable.onDragUpdate.add((args) => {
      const dv = (args as { dragVector?: vec3 }).dragVector;
      if (dv !== undefined && dv !== null) {
        this.dragging = true;
        this.targetOffset -= dv.x;
        this.clampTarget();
      }
    });
    interactable.onTriggerEnd.add(() => {
      this.dragging = false;
      this.snap();
    });

    // Flechas (con el arte si está)
    const canSticker = this.stickerMaterial !== undefined && !isNull(this.stickerMaterial);
    const mkArrow = (label: string, tex: Texture | undefined, x: number, delta: number) => {
      let btn: SceneObject;
      if (canSticker && tex !== undefined && !isNull(tex)) {
        btn = makeSticker(this.root!, "cardArrow", this.stickerMaterial, tex, 3.2);
      } else {
        btn = makePlate(this.root!, "cardArrow", 6, 5, this.backMaterial);
        makeLabel(btn, label, 2.2, new vec3(0, 0, 0.2));
      }
      btn.getTransform().setLocalPosition(new vec3(x, 0, 0.5));
      makeTappable(btn, 4, 6, () => {
        this.centered = Math.max(0, Math.min(this.centered + delta, this.cards.length - 1));
        this.targetOffset = this.centered * SPACING;
      });
    };
    mkArrow("‹", this.arrowBackTexture, -CARD_W / 2 - 17, -1);
    mkArrow("›", this.arrowNextTexture, CARD_W / 2 + 17, 1);

    // Volver al menú: misma base que el CONTINUAR
    let back: SceneObject;
    if (canSticker && this.menuTexture !== undefined && !isNull(this.menuTexture)) {
      back = makeSticker(this.root!, "backBtn", this.stickerMaterial, this.menuTexture, 13);
      makeLabel(back, t("backMenu").replace("‹", "").trim(), 1.35, new vec3(0.25, 0.1, 0.3), new vec4(0.13, 0.17, 0.32, 1));
    } else {
      back = makePlate(this.root!, "backBtn", 12, 4.5, this.backMaterial);
      makeLabel(back, t("backMenu"), 1.6, new vec3(0, 0, 0.2));
    }
    back.getTransform().setLocalPosition(new vec3(0, -CARD_H / 2 - 3, 0));
    makeTappable(back, 13, 3.5, () => {
      if (this.onBack !== null) {
        this.onBack();
      }
    });

    this.layout();
  }

  private buildCard(card: AICard, index: number): SceneObject {
    const NAVY = new vec4(0.13, 0.17, 0.32, 1);
    const framed = this.frameTexture !== undefined && !isNull(this.frameTexture) &&
      this.stickerMaterial !== undefined && !isNull(this.stickerMaterial);
    this.framedMode = framed;
    let obj: SceneObject;
    let frameH = CARD_H;
    if (framed) {
      obj = makeSticker(this.strip!, "pcard_" + index, this.stickerMaterial, this.frameTexture, CARD_W);
      frameH = CARD_W * this.frameTexture.getHeight() / this.frameTexture.getWidth();
    } else {
      obj = makePlate(this.strip!, "pcard_" + index, CARD_W, CARD_H, this.cardMaterial);
    }

    const shortName = card.name.length > 18 ? card.name.substring(0, 17) + "…" : card.name;
    if (framed) {
      // Nombre bajo la etiqueta AI PREVIEW; lo que crea la AI va más abajo
      makeLabel(obj, shortName, 1.3, new vec3(0, frameH * 0.3, 0.2), NAVY);
    } else {
      makeLabel(obj, shortName, 1.5, new vec3(0, CARD_H / 2 - 2, 0.2));
      makeLabel(obj, card.section, 1.1, new vec3(0, CARD_H / 2 - 4.4, 0.2));
    }

    const spec = buildSpecFromCard(card);
    if (spec !== null) {
      this.addThumbnail(obj, spec, framed, frameH);
    }

    // Acciones: en el porta-molde van sobre los dos espacios punteados
    const btnW = framed ? CARD_W * 0.36 : CARD_W / 2 - 1.5;
    const btnH = framed ? frameH * 0.115 : 4.5;
    const modX = framed ? -CARD_W * 0.205 : -CARD_W / 4 + 0.4;
    const cutX = framed ? CARD_W * 0.205 : CARD_W / 4 - 0.4;
    const btnY = framed ? -frameH * 0.305 : -CARD_H / 2 + 3;

    let modBtn: SceneObject;
    let cutBtn: SceneObject;
    if (framed) {
      modBtn = global.scene.createSceneObject("modBtn");
      modBtn.setParent(obj);
      resetLocal(modBtn);
      cutBtn = global.scene.createSceneObject("cutBtn");
      cutBtn.setParent(obj);
      resetLocal(cutBtn);
    } else {
      modBtn = makePlate(obj, "modBtn", btnW, btnH, this.actionMaterial);
      cutBtn = makePlate(obj, "cutBtn", btnW, btnH, this.actionMaterial);
    }
    const HOVER_BLUE = new vec4(0.2, 0.48, 0.92, 1);
    const HOVER_RED = new vec4(0.88, 0.3, 0.32, 1);

    modBtn.getTransform().setLocalPosition(new vec3(modX, btnY, 0.3));
    const modLabel = makeLabel(modBtn, t("modify"), framed ? 1.15 : 1.25, new vec3(0, 0, 0.2), framed ? NAVY : undefined);
    const modInt = makeTappable(modBtn, btnW, btnH, () => {
      this.centered = index;
      this.targetOffset = index * SPACING;
      if (this.onModify !== null) {
        this.onModify(index);
      }
    });
    // Hover: se nota que es botón (tipografía azul + leve zoom)
    modInt.onHoverEnter.add(() => {
      modLabel.textFill.color = HOVER_BLUE;
      modBtn.getTransform().setLocalScale(new vec3(1.08, 1.08, 1));
    });
    modInt.onHoverExit.add(() => {
      modLabel.textFill.color = NAVY;
      modBtn.getTransform().setLocalScale(new vec3(1, 1, 1));
    });

    cutBtn.getTransform().setLocalPosition(new vec3(cutX, btnY, 0.3));
    const cutLabel = makeLabel(cutBtn, t("toFabric"), framed ? 1.15 : 1.25, new vec3(0, 0, 0.2), framed ? NAVY : undefined);
    const cutInt = makeTappable(cutBtn, btnW, btnH, () => {
      this.centered = index;
      this.targetOffset = index * SPACING;
      if (this.onToCut !== null) {
        this.onToCut(index);
      }
    });
    cutInt.onHoverEnter.add(() => {
      cutLabel.textFill.color = HOVER_RED;
      cutBtn.getTransform().setLocalScale(new vec3(1.08, 1.08, 1));
    });
    cutInt.onHoverExit.add(() => {
      cutLabel.textFill.color = NAVY;
      cutBtn.getTransform().setLocalScale(new vec3(1, 1, 1));
    });

    return obj;
  }

  private clampTarget() {
    const max = (this.cards.length - 1) * SPACING;
    if (this.targetOffset < -SPACING * 0.4) {
      this.targetOffset = -SPACING * 0.4;
    }
    if (this.targetOffset > max + SPACING * 0.4) {
      this.targetOffset = max + SPACING * 0.4;
    }
  }

  private snap() {
    const idx = Math.round(this.targetOffset / SPACING);
    this.centered = Math.max(0, Math.min(idx, this.cards.length - 1));
    this.targetOffset = this.centered * SPACING;
  }

  private tick() {
    if (this.plates.length === 0) {
      return;
    }
    const speed = this.dragging ? 0.6 : 0.18;
    this.offset += (this.targetOffset - this.offset) * speed;
    this.layout();
  }

  private layout() {
    for (let i = 0; i < this.plates.length; i++) {
      const x = i * SPACING - this.offset;
      const dist = Math.min(Math.abs(x) / SPACING, 1.6);
      const scale = 1.16 - dist * 0.42;
      const plate = this.plates[i];
      plate.getTransform().setLocalPosition(new vec3(x, 0, -dist * 4));
      plate.getTransform().setLocalScale(new vec3(scale, scale, 1));
      if (!this.framedMode) {
        const rmv = plate.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        if (rmv !== null && !isNull(rmv)) {
          rmv.mainMaterial = Math.abs(x) < SPACING * 0.5 ? this.cardSelectedMaterial : this.cardMaterial;
        }
      }
      plate.enabled = dist < 1.55;
    }
  }

  private addThumbnail(cardObj: SceneObject, spec: PatternSpec, framed: boolean = false, frameH: number = CARD_H) {
    let minX = Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
    let minY = Number.MAX_VALUE, maxY = -Number.MAX_VALUE;
    let offset = 0;
    const gap = 6;
    const placed: { pts: { x: number; y: number }[]; closed: boolean }[] = [];
    for (const piece of spec.pieces) {
      let pMinX = Number.MAX_VALUE, pMaxX = -Number.MAX_VALUE;
      for (const pt of piece.outline) {
        if (pt.x < pMinX) { pMinX = pt.x; }
        if (pt.x > pMaxX) { pMaxX = pt.x; }
      }
      const shift = offset - pMinX;
      const lines: { x: number; y: number }[][] = [piece.outline].concat(piece.internalLines !== undefined ? piece.internalLines : []);
      for (let li = 0; li < lines.length; li++) {
        const shifted = lines[li].map((pt) => ({ x: pt.x + shift, y: pt.y }));
        placed.push({ pts: shifted, closed: li === 0 });
        for (const pt of shifted) {
          if (pt.x < minX) { minX = pt.x; }
          if (pt.x > maxX) { maxX = pt.x; }
          if (pt.y < minY) { minY = pt.y; }
          if (pt.y > maxY) { maxY = pt.y; }
        }
      }
      offset += pMaxX - pMinX + gap;
    }

    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    const availW = framed ? CARD_W * 0.68 : CARD_W - 2.5;
    const availH = framed ? frameH * 0.34 : CARD_H - 11;
    const scale = Math.min(availW / w, availH / h);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const thumb = global.scene.createSceneObject("thumb");
    thumb.setParent(cardObj);
    resetLocal(thumb);
    thumb.getTransform().setLocalPosition(new vec3(0, framed ? -frameH * 0.005 : -1.5, 0.15));
    thumb.getTransform().setLocalScale(new vec3(scale, scale, 1));

    for (const line of placed) {
      const centered = line.pts.map((pt) => ({ x: pt.x - cx, y: pt.y - cy }));
      const mesh = buildRibbonMesh(centered, line.closed, 0.35 / scale * 0.5);
      if (mesh !== null) {
        const lineObj = global.scene.createSceneObject("tline");
        lineObj.setParent(thumb);
        resetLocal(lineObj);
        const rmv = lineObj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        rmv.mesh = mesh;
        rmv.mainMaterial = this.thumbMaterial;
      }
    }
  }
}
