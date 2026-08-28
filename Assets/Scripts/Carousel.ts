// Carrusel espacial estilo selector de banderas de la Play: deslizás con los
// dedos (pinch-drag en Specs, drag de mouse en editor) para pasar las opciones,
// la del centro se agranda, y confirmás con el botón ✓ (o flechas ‹ › para ir
// de a una). Componente genérico: AppFlow lo usa para idiomas y para prendas.

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { makePlate, makeLabel, makeTappable, makeSticker, resetLocal } from "./UiLite";
import { buildQuadMesh } from "./LineMesh";

export interface CarouselItem {
  title: string;
  subtitle: string;
  texture?: Texture; // si viene, la card es una imagen (sticker) en vez de placa
  labelTexture?: Texture; // contenedor del nombre propio de este item (ej: rosa/celeste)
}

@component
export class Carousel extends BaseScriptComponent {
  @input plateMaterial: Material;
  @input selectedMaterial: Material;
  @input confirmMaterial: Material;
  @input itemWidth: number = 24;
  @input itemHeight: number = 13;
  @input spacing: number = 28;
  // Skin opcional (texturas del diseño de Flor); si faltan, se usa el look plano
  @input
  @allowUndefined
  stickerMaterial: Material; // base unlit+alpha para clonar
  @input
  @allowUndefined
  backgroundTexture: Texture; // tablero de fondo
  @input
  @allowUndefined
  confirmTexture: Texture; // botón de confirmar ilustrado
  @input
  @allowUndefined
  progressTexture: Texture; // barra de progreso superior
  @input
  @allowUndefined
  arrowMaterial: Material; // flechas en modo sticker (crema)
  @input
  @allowUndefined
  arrowBackTexture: Texture; // flecha retroceder (arte)
  @input
  @allowUndefined
  arrowNextTexture: Texture; // flecha avanzar (arte)
  @input stripOffsetY: number = 0; // corrimiento vertical de las cards
  @input headerY: number = 13.5; // altura del título de texto
  @input confirmY: number = -15.5; // altura del botón de confirmar
  @input confirmWidth: number = 19; // ancho del botón de confirmar (cm)
  @input confirmTextSize: number = 1.5; // tamaño del texto del botón (cm)
  @input itemTextNavy: boolean = false; // texto de items azul marino (para placas claras)
  @input showCenteredTitle: boolean = false; // nombre del item centrado bajo el carrusel
  // ✏️ Corrimiento horizontal del título/subtítulo (despegarlo del logo)
  @input headerX: number = 4;
  // Contenedor cosido para el nombre del item central (arte de Flor)
  @input
  @allowUndefined
  centeredLabelTexture: Texture;
  @input centeredLabelWidth: number = 12.5; // ancho del contenedor (cm)
  @input centeredLabelTextSize: number = 1.1; // tamaño del nombre dentro del contenedor
  @input centeredLabelY: number = 0; // ajuste fino vertical del contenedor

  private headerTitle: string = "";
  private headerSubtitle: string = "";
  private confirmLabel: string = "";
  private headerTitleText: Text | null = null;
  private headerSubText: Text | null = null;
  private confirmText: Text | null = null;

  private textured: boolean = false;

  public onPick: ((index: number) => void) | null = null;
  public onCentered: ((index: number) => void) | null = null;

  private items: CarouselItem[] = [];
  private strip: SceneObject | null = null;
  private chrome: SceneObject | null = null;
  private plates: SceneObject[] = [];
  private titleText: Text | null = null;
  private centeredTitleText: Text | null = null;
  private centeredTitleBold: Text | null = null;
  private centeredPillVisual: RenderMeshVisual | null = null;

  private offset: number = 0; // desplazamiento actual en cm
  private targetOffset: number = 0;
  private centered: number = 0;
  private dragging: boolean = false;

  onAwake() {
    this.createEvent("UpdateEvent").bind(() => this.tick());
  }

  setTitle(title: string) {
    if (this.titleText !== null) {
      this.titleText.text = title;
    }
  }

  // Título/subtítulo de texto plano (localizables) dentro del tablero
  setShowCenteredTitle(v: boolean) {
    this.showCenteredTitle = v;
  }

  setHeader(title: string, subtitle: string) {
    this.headerTitle = title;
    this.headerSubtitle = subtitle;
    if (this.headerTitleText !== null && !isNull(this.headerTitleText)) {
      this.headerTitleText.text = title;
    }
    if (this.headerSubText !== null && !isNull(this.headerSubText)) {
      this.headerSubText.text = subtitle;
    }
  }

  // Texto del botón de confirmar (cambia con el idioma)
  setConfirmLabel(label: string) {
    this.confirmLabel = label;
    if (this.confirmText !== null && !isNull(this.confirmText)) {
      this.confirmText.text = label;
    }
  }

  setItems(items: CarouselItem[], startIndex: number, title: string) {
    this.items = items;
    this.centered = Math.max(0, Math.min(startIndex, items.length - 1));
    this.offset = this.centered * this.spacing;
    this.targetOffset = this.offset;
    this.rebuild(title);
  }

  private rebuild(title: string) {
    if (this.strip !== null && !isNull(this.strip)) {
      this.strip.destroy();
    }
    if (this.chrome !== null && !isNull(this.chrome)) {
      this.chrome.destroy();
    }
    this.plates = [];

    this.strip = global.scene.createSceneObject("strip");
    this.strip.setParent(this.sceneObject);
    resetLocal(this.strip);

    const canSticker = this.stickerMaterial !== undefined && !isNull(this.stickerMaterial);
    for (let i = 0; i < this.items.length; i++) {
      const tex = this.items[i].texture;
      if (canSticker && tex !== undefined && !isNull(tex)) {
        this.textured = true;
        this.plates.push(makeSticker(this.strip, "item_" + i, this.stickerMaterial, tex, this.itemWidth));
      } else {
        const plate = makePlate(this.strip, "item_" + i, this.itemWidth, this.itemHeight, this.plateMaterial);
        const navy = new vec4(0.13, 0.17, 0.32, 1);
        makeLabel(plate, this.items[i].title, 2.2, new vec3(0, 1.2, 0.2), this.itemTextNavy ? navy : undefined);
        if (this.items[i].subtitle !== "") {
          makeLabel(plate, this.items[i].subtitle, 1.2, new vec3(0, -3, 0.2), this.itemTextNavy ? navy : undefined);
        }
        this.plates.push(plate);
      }
    }

    // Chrome: título, zona de arrastre, flechas y confirmación
    this.chrome = global.scene.createSceneObject("chrome");
    this.chrome.setParent(this.sceneObject);
    resetLocal(this.chrome);

    // Decorado: tablero de fondo, barra de progreso y título ilustrado
    if (canSticker && this.backgroundTexture !== undefined && !isNull(this.backgroundTexture)) {
      const board = makeSticker(this.chrome, "board", this.stickerMaterial, this.backgroundTexture, this.spacing * 3.1);
      board.getTransform().setLocalPosition(new vec3(0, -1, -6));
    }
    if (canSticker && this.progressTexture !== undefined && !isNull(this.progressTexture)) {
      const prog = makeSticker(this.chrome, "progress", this.stickerMaterial, this.progressTexture, this.spacing * 2.6);
      prog.getTransform().setLocalPosition(new vec3(0, this.itemHeight / 2 + 12.5, -1));
    }
    if (this.headerTitle === "") {
      this.titleText = makeLabel(this.chrome, title, 2.4, new vec3(0, this.itemHeight / 2 + 6, 0));
    }
    // Título y subtítulo de texto (estilo referencia: azul marino + ✗✗✗ rosas)
    if (this.headerTitle !== "") {
      const NAVY = new vec4(0.13, 0.17, 0.32, 1);
      const GRAYW = new vec4(0.42, 0.38, 0.34, 1);
      const hy = this.headerY;
      const hx = this.headerX;
      this.headerTitleText = makeLabel(this.chrome, this.headerTitle, 2.5, new vec3(hx, hy, 0), NAVY);
      if (this.headerSubtitle !== "") {
        this.headerSubText = makeLabel(this.chrome, this.headerSubtitle, 1.3, new vec3(hx, hy - 3.1, 0), GRAYW);
      }
    }

    // Zona de arrastre: plato invisible ancho por detrás de los items
    const dragZone = global.scene.createSceneObject("dragZone");
    dragZone.setParent(this.chrome);
    resetLocal(dragZone);
    dragZone.getTransform().setLocalPosition(new vec3(0, 0, -1));
    const collider = dragZone.createComponent("Physics.ColliderComponent") as ColliderComponent;
    const shape = Shape.createBoxShape();
    shape.size = new vec3(this.spacing * 3.4, this.itemHeight + 6, 2);
    collider.shape = shape;
    const interactable = dragZone.createComponent(Interactable.getTypeName()) as Interactable;
    interactable.onDragUpdate.add((args) => {
      const dv = (args as { dragVector?: vec3 }).dragVector;
      if (dv !== undefined && dv !== null) {
        this.dragging = true;
        // arrastrar a la derecha mueve el carrusel hacia atrás (como pasar página)
        this.targetOffset -= dv.x;
        this.clampTarget();
      }
    });
    interactable.onTriggerEnd.add(() => {
      this.dragging = false;
      this.snap();
    });

    const mkArrow = (label: string, x: number, delta: number) => {
      const arrowY = this.textured ? this.stripOffsetY : -this.itemHeight / 2 - 6;
      const artTex = delta < 0 ? this.arrowBackTexture : this.arrowNextTexture;
      const useArt = canSticker && artTex !== undefined && !isNull(artTex);
      let btn: SceneObject;
      if (useArt) {
        btn = makeSticker(this.chrome!, "arrow", this.stickerMaterial, artTex, 5);
        btn.getTransform().setLocalPosition(new vec3(x, arrowY, 0.5));
      } else {
        const useCream = this.textured && this.arrowMaterial !== undefined && !isNull(this.arrowMaterial);
        btn = makePlate(this.chrome!, "arrow", 5, 5, useCream ? this.arrowMaterial : this.plateMaterial);
        btn.getTransform().setLocalPosition(new vec3(x, arrowY, 0.5));
        makeLabel(btn, label, 2.2, new vec3(0, 0, 0.2), useCream ? new vec4(0.25, 0.55, 0.9, 1) : undefined);
      }
      makeTappable(btn, 5, 7.5, () => {
        this.centered = Math.max(0, Math.min(this.centered + delta, this.items.length - 1));
        this.targetOffset = this.centered * this.spacing;
        this.notifyCentered();
      });
    };
    if (this.textured) {
      mkArrow("‹", -this.spacing * 1.45, -1);
      mkArrow("›", this.spacing * 1.45, 1);
    } else {
      mkArrow("‹", -this.itemWidth / 2 - 5, -1);
      mkArrow("›", this.itemWidth / 2 + 5, 1);
    }

    if (canSticker && this.confirmTexture !== undefined && !isNull(this.confirmTexture)) {
      const okW = this.confirmWidth;
      const ok = makeSticker(this.chrome, "confirm", this.stickerMaterial, this.confirmTexture, okW);
      const okH = okW * this.confirmTexture.getHeight() / this.confirmTexture.getWidth();
      ok.getTransform().setLocalPosition(new vec3(0, this.confirmY, 0.5));
      if (this.confirmLabel !== "") {
        this.confirmText = makeLabel(ok, this.confirmLabel, this.confirmTextSize, new vec3(0.4, 0.12, 0.3), new vec4(0.13, 0.17, 0.32, 1));
      }
      makeTappable(ok, okW, okH, () => {
        if (this.onPick !== null) {
          this.onPick(this.centered);
        }
      });
    } else {
      const ok = makePlate(this.chrome, "confirm", 12, 6, this.confirmMaterial);
      ok.getTransform().setLocalPosition(new vec3(0, -this.itemHeight / 2 - 6, 0.5));
      makeLabel(ok, "✓", 2.6, new vec3(0, 0, 0.2));
      makeTappable(ok, 12, 6, () => {
        if (this.onPick !== null) {
          this.onPick(this.centered);
        }
      });
    }

    if (this.showCenteredTitle) {
      const NAVY2 = new vec4(0.13, 0.17, 0.32, 1);
      const item = this.items.length > 0 ? this.items[this.centered] : null;
      const txt = item !== null ? item.title.toUpperCase() : "";
      // Contenedor cosido de Flor: el que trae el item (rosa/celeste) o el general
      const itemPill = item !== null && item.labelTexture !== undefined && !isNull(item.labelTexture)
        ? item.labelTexture
        : undefined;
      const pillTex = itemPill !== undefined ? itemPill : this.centeredLabelTexture;
      const usePill = canSticker && pillTex !== undefined && !isNull(pillTex);
      // El nombre va en la parte inferior: al borde de abajo de la card central
      let cy = this.stripOffsetY - this.itemHeight / 2 - 2.4;
      if (this.textured && item !== null && item.texture !== undefined && !isNull(item.texture)) {
        const cardH = this.itemWidth * (item.texture.getHeight() / item.texture.getWidth()) * 1.15;
        cy = this.stripOffsetY - cardH / 2;
      }
      cy += this.centeredLabelY;
      if (usePill) {
        const pill = makeSticker(this.chrome, "namePill", this.stickerMaterial, pillTex, this.centeredLabelWidth);
        pill.getTransform().setLocalPosition(new vec3(0, cy, 2));
        this.centeredPillVisual = pill.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        // "Negrita": doble trazo con leve offset, corrido apenas por el botoncito azul
        const ts = this.centeredLabelTextSize;
        this.centeredTitleText = makeLabel(pill, txt, ts, new vec3(0.35, 0.05, 0.3), NAVY2);
        this.centeredTitleBold = makeLabel(pill, txt, ts, new vec3(0.43, 0.05, 0.29), NAVY2);
      } else {
        this.centeredPillVisual = null;
        this.centeredTitleText = makeLabel(this.chrome, txt, 1.3, new vec3(0, cy, 0.5), NAVY2);
        this.centeredTitleBold = makeLabel(this.chrome, txt, 1.3, new vec3(0.06, cy, 0.49), NAVY2);
      }
    } else {
      this.centeredTitleText = null;
      this.centeredTitleBold = null;
      this.centeredPillVisual = null;
    }

    this.layout();
  }

  private updateCenteredTitle() {
    if (this.centered >= this.items.length) {
      return;
    }
    const item = this.items[this.centered];
    const txt = item.title.toUpperCase();
    if (this.centeredTitleText !== null && !isNull(this.centeredTitleText)) {
      this.centeredTitleText.text = txt;
    }
    if (this.centeredTitleBold !== null && !isNull(this.centeredTitleBold)) {
      this.centeredTitleBold.text = txt;
    }
    // Si el item trae su propio contenedor (rosa/celeste), se cambia al deslizar
    if (this.centeredPillVisual !== null && !isNull(this.centeredPillVisual)) {
      const tex = item.labelTexture !== undefined && !isNull(item.labelTexture)
        ? item.labelTexture
        : this.centeredLabelTexture;
      if (tex !== undefined && !isNull(tex)) {
        this.centeredPillVisual.mainMaterial.mainPass.baseTex = tex;
      }
    }
  }

  private clampTarget() {
    const max = (this.items.length - 1) * this.spacing;
    if (this.targetOffset < -this.spacing * 0.4) {
      this.targetOffset = -this.spacing * 0.4;
    }
    if (this.targetOffset > max + this.spacing * 0.4) {
      this.targetOffset = max + this.spacing * 0.4;
    }
  }

  private snap() {
    const idx = Math.round(this.targetOffset / this.spacing);
    const clamped = Math.max(0, Math.min(idx, this.items.length - 1));
    if (clamped !== this.centered) {
      this.centered = clamped;
      this.notifyCentered();
    }
    this.targetOffset = this.centered * this.spacing;
  }

  private notifyCentered() {
    this.updateCenteredTitle();
    if (this.onCentered !== null) {
      this.onCentered(this.centered);
    }
  }

  private tick() {
    if (this.plates.length === 0) {
      return;
    }
    // Suavizado del desplazamiento
    const speed = this.dragging ? 0.6 : 0.18;
    this.offset += (this.targetOffset - this.offset) * speed;
    if (!this.dragging) {
      // Snap continuo mientras está suelto (por si el drag terminó sin evento)
      const idx = Math.round(this.targetOffset / this.spacing);
      const clamped = Math.max(0, Math.min(idx, this.items.length - 1));
      if (Math.abs(this.targetOffset - clamped * this.spacing) > 0.01 && Math.abs(this.offset - this.targetOffset) < 0.05) {
        this.snap();
      }
    }
    this.layout();
  }

  private layout() {
    for (let i = 0; i < this.plates.length; i++) {
      const x = i * this.spacing - this.offset;
      const dist = Math.min(Math.abs(x) / this.spacing, 1.6);
      const scale = 1.15 - dist * 0.35;
      const plate = this.plates[i];
      plate.getTransform().setLocalPosition(new vec3(x, this.stripOffsetY, -dist * 4));
      plate.getTransform().setLocalScale(new vec3(scale, scale, 1));
      // resaltar el del centro (solo en placas planas; los stickers ya traen su borde)
      if (!this.textured) {
        const rmv = plate.getComponent("Component.RenderMeshVisual") as RenderMeshVisual;
        if (rmv !== null && !isNull(rmv)) {
          rmv.mainMaterial = Math.abs(x) < this.spacing * 0.5 ? this.selectedMaterial : this.plateMaterial;
        }
      }
      plate.enabled = dist < 1.55;
    }
  }
}
