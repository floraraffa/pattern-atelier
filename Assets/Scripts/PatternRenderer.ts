// Renderiza un PatternSpec como líneas de "tiza" a escala real (1 unidad = 1 cm).
// Cada polilínea se convierte en una cinta de triángulos con grosor configurable.

import { PatternPiece, PatternSpec, Point2 } from "./PatternTypes";
import { draftStraightSkirt } from "./SkirtBlock";
import { buildRibbonMesh, offsetPolygon } from "./LineMesh";
import { makeLabel } from "./UiLite";
import { t, tf } from "./I18n";
import { draftShirt, draftCollar, draftCuff } from "./ShirtBlock";
import { draftPants } from "./MoreBlocks";

// Spec combinado de prueba: camisa + cuello + puño + pantalón (drawTestSkirt)
function buildTestSpec(): PatternSpec {
  const shirt = draftShirt({ bust: 92, waist: 76, length: 68 });
  const collar = draftCollar({ neck: 39 });
  const cuff = draftCuff({ wrist: 22 });
  const pants = draftPants({ waist: 74, hip: 100, length: 100 });
  return {
    name: "TEST bloques",
    section: "test",
    pieces: shirt.pieces.concat(collar.pieces, cuff.pieces, pants.pieces)
  };
}

@component
export class PatternRenderer extends BaseScriptComponent {
  @input lineMaterial: Material; // línea de costura (blanca, fina)
  @input seamMaterial: Material; // línea de CORTE (amarilla, gruesa)
  @input lineWidth: number = 0.5; // cm
  @input seamAllowance: number = 1; // margen de costura en cm; 0 = sin margen
  @input pieceGap: number = 8; // separación entre piezas, cm
  @input drawTestSkirt: boolean = true;
  @input showLegend: boolean = true;

  private pieceObjects: SceneObject[] = [];

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      if (this.drawTestSkirt) {
        this.renderPattern(buildTestSpec());
      }
    });
  }

  clear() {
    for (const obj of this.pieceObjects) {
      obj.destroy();
    }
    this.pieceObjects = [];
  }

  renderPattern(spec: PatternSpec) {
    this.clear();
    let offsetX = 0;
    for (const piece of spec.pieces) {
      const bounds = this.pieceBounds(piece);
      const obj = this.renderPiece(piece, offsetX - bounds.minX);
      this.pieceObjects.push(obj);
      offsetX += bounds.maxX - bounds.minX + this.pieceGap;
    }
    if (this.showLegend) {
      this.addLegend(offsetX - this.pieceGap);
    }
    print("PatternRenderer: '" + spec.name + "' con " + spec.pieces.length + " piezas, ancho total " + offsetX.toFixed(1) + " cm");
  }

  // Leyenda al pie: qué línea se corta y cuál se cose.
  private addLegend(totalWidth: number) {
    const legend = global.scene.createSceneObject("legend");
    legend.setParent(this.getSceneObject());
    legend.getTransform().setLocalPosition(new vec3(totalWidth / 2, -13, 0));
    legend.getTransform().setLocalRotation(quat.quatIdentity());
    legend.getTransform().setLocalScale(new vec3(1, 1, 1));
    this.pieceObjects.push(legend);

    const cutSample: Point2[] = [{ x: -16, y: 0 }, { x: -10, y: 0 }];
    this.addPolyline(legend, cutSample, false, this.seamMaterial, this.lineWidth * 1.8);
    makeLabel(legend, t("cutLine"), 1.6, new vec3(2, 0, 0.1));

    const sewSample: Point2[] = [{ x: -16, y: -3.5 }, { x: -10, y: -3.5 }];
    this.addPolyline(legend, sewSample, false, this.lineMaterial, this.lineWidth);
    makeLabel(legend, tf("sewLine", "" + this.seamAllowance), 1.4, new vec3(2.4, -3.5, 0.1));
  }

  private pieceBounds(piece: PatternPiece) {
    let minX = Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
    for (const pt of piece.outline) {
      if (pt.x < minX) { minX = pt.x; }
      if (pt.x > maxX) { maxX = pt.x; }
    }
    return { minX: minX, maxX: maxX };
  }

  private renderPiece(piece: PatternPiece, offsetX: number): SceneObject {
    const obj = global.scene.createSceneObject("piece_" + piece.name);
    obj.setParent(this.getSceneObject());
    obj.getTransform().setLocalPosition(new vec3(offsetX, 0, 0));
    obj.getTransform().setLocalRotation(quat.quatIdentity());
    obj.getTransform().setLocalScale(new vec3(1, 1, 1));

    this.addPolyline(obj, piece.outline, true);
    if (this.seamAllowance > 0 && this.seamMaterial !== undefined && !isNull(this.seamMaterial)) {
      // La línea EXTERIOR (con el margen sumado) es por donde se corta: gruesa y amarilla
      const cut = offsetPolygon(piece.outline, this.seamAllowance);
      this.addPolyline(obj, cut, true, this.seamMaterial, this.lineWidth * 1.8);
    }
    if (piece.internalLines) {
      for (const line of piece.internalLines) {
        this.addPolyline(obj, line, false);
      }
    }

    // Etiquetas de la pieza: nombre + cómo va sobre la tela
    let minX = Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
    for (const pt of piece.outline) {
      if (pt.x < minX) { minX = pt.x; }
      if (pt.x > maxX) { maxX = pt.x; }
    }
    const cx = (minX + maxX) / 2;
    makeLabel(obj, piece.name, 2.2, new vec3(cx, -3.2, 0.1));
    if (piece.cutOnFold === true) {
      makeLabel(obj, t("onFold"), 1.6, new vec3(cx, -6.2, 0.1));
    } else if (piece.doubleFabric === true) {
      makeLabel(obj, t("doubleFabric"), 1.6, new vec3(cx, -6.2, 0.1));
    }
    return obj;
  }

  private addPolyline(parent: SceneObject, points: Point2[], closed: boolean, material?: Material, width?: number) {
    if (points.length < 2) {
      return;
    }
    const obj = global.scene.createSceneObject("line");
    obj.setParent(parent);
    obj.getTransform().setLocalPosition(vec3.zero());
    obj.getTransform().setLocalRotation(quat.quatIdentity());
    obj.getTransform().setLocalScale(new vec3(1, 1, 1));

    const w = width !== undefined ? width : this.lineWidth;
    const mesh = buildRibbonMesh(points, closed, w * 0.5);
    if (mesh === null) {
      return;
    }
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    rmv.mesh = mesh;
    rmv.mainMaterial = material !== undefined ? material : this.lineMaterial;
  }
}
