// Bloque paramétrico: blazer recto simplificado. Delantero con cruce de
// botones y solapa recta (línea de doblez marcada), espalda al doblez con
// leve entalle de centro, y la manga base reutilizada del bloque de manga.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";
import { draftSleeve } from "./SleeveBlock";
import { t } from "./I18n";

export interface BlazerParams {
  bust: number; // contorno de busto/pecho
  waist: number; // contorno de cintura (entalle suave)
  length?: number; // largo desde hombro (default 65)
  shoulder?: number; // largo de hombro (default 13)
}

const BUTTON_EXT = 2.5; // extensión de cruce delantero

function blazerFront(
  quarterBust: number,
  quarterWaist: number,
  length: number,
  shoulder: number
): PatternPiece {
  // y=0 el ruedo, y=length la línea de hombro/cuello. x=0 el centro delantero;
  // la extensión de botones corre el borde a -BUTTON_EXT.
  const neckWidth = 7.5;
  const shoulderDrop = 4;
  const armholeDepth = 25;
  const neckDepth = 9; // escote profundo: la solapa tapa el hueco
  const waistY = length * 0.35;

  const cfX = -BUTTON_EXT;
  const shoulderTip = p(neckWidth + shoulder * 0.94, length - shoulderDrop);
  const underarm = p(quarterBust, length - armholeDepth);

  const outline: Point2[] = [];
  outline.push(p(cfX, length - neckDepth));
  // Escote
  outline.push(...quadBezier(p(0, length - neckDepth), p(neckWidth * 0.85, length - neckDepth * 0.8), p(neckWidth, length), 8));
  // Hombro
  outline.push(shoulderTip);
  // Sisa
  outline.push(...quadBezier(shoulderTip, p(quarterBust * 0.9, length - armholeDepth * 0.55), underarm, 10));
  // Costado recto con entalle suave en la cintura
  outline.push(...quadBezier(underarm, p(quarterWaist + 5, waistY), p(quarterBust - 0.5, 0), 8));
  // Ruedo recto
  outline.push(p(cfX, 0));
  // Borde delantero (cierra el polígono hasta el escote)

  const internal: Point2[][] = [];
  // Solapa recta: línea de doblez del punto de cuello al quiebre sobre el borde
  const breakY = waistY + 6;
  internal.push([p(neckWidth - 1.5, length), p(cfX, breakY)]);
  // Botones sobre el centro, debajo del quiebre
  internal.push([p(-1, breakY - 4), p(1, breakY - 4)]);
  internal.push([p(-1, breakY - 12), p(1, breakY - 12)]);
  // Pinza de entalle (doble punta, no llega al ruedo)
  const dartX = quarterBust * 0.5;
  internal.push([p(dartX, waistY + 12), p(dartX - 1, waistY), p(dartX, waistY - 10), p(dartX + 1, waistY), p(dartX, waistY + 12)]);
  // Hilo de tela
  const gx = quarterBust * 0.75;
  internal.push([p(gx, length * 0.6), p(gx, length * 0.2)]);
  internal.push([p(gx - 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);
  internal.push([p(gx + 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);

  return {
    name: t("pieceFront"),
    outline: outline,
    internalLines: internal,
    cutOnFold: false,
    doubleFabric: true
  };
}

function blazerBack(
  quarterBust: number,
  quarterWaist: number,
  length: number,
  shoulder: number
): PatternPiece {
  // Al doblez: x=0 el centro de espalda. El entalle del centro se marca como
  // pinza suave interna (el contorno queda recto sobre el doblez).
  const neckWidth = 7.5;
  const shoulderDrop = 4;
  const armholeDepth = 25;
  const neckDepth = 2.5;
  const waistY = length * 0.35;

  const shoulderTip = p(neckWidth + shoulder * 0.94, length - shoulderDrop);
  const underarm = p(quarterBust, length - armholeDepth);

  const outline: Point2[] = [];
  outline.push(...quadBezier(p(0, length - neckDepth), p(neckWidth * 0.85, length - neckDepth * 0.8), p(neckWidth, length), 8));
  outline.push(shoulderTip);
  outline.push(...quadBezier(shoulderTip, p(quarterBust * 0.9, length - armholeDepth * 0.55), underarm, 10));
  outline.push(...quadBezier(underarm, p(quarterWaist + 5.5, waistY), p(quarterBust - 0.5, 0), 8));
  outline.push(p(0, 0));
  // Centro (cierra el polígono al doblez)

  const internal: Point2[][] = [];
  // Entalle del centro trasero: pinza suave sobre el doblez
  internal.push([p(0, waistY + 14), p(0.9, waistY), p(0, waistY - 12)]);
  // Hilo de tela
  const gx = quarterBust * 0.55;
  internal.push([p(gx, length * 0.6), p(gx, length * 0.2)]);
  internal.push([p(gx - 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);
  internal.push([p(gx + 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);

  return {
    name: t("pieceBack"),
    outline: outline,
    internalLines: internal,
    cutOnFold: true
  };
}

export function draftBlazer(params: BlazerParams): PatternSpec {
  const length = params.length !== undefined ? params.length : 65;
  const shoulder = params.shoulder !== undefined ? params.shoulder : 13;

  const quarterBust = params.bust / 4 + 4; // holgura de saco
  const quarterWaist = params.waist / 4 + 3;

  const front = blazerFront(quarterBust, quarterWaist, length, shoulder);
  const back = blazerBack(quarterBust + 0.5, quarterWaist + 0.5, length, shoulder);

  // Manga: se reutiliza el bloque de manga base, larga y con puño de saco.
  const sleeveSpec = draftSleeve({ armhole: params.bust / 2 - 2, length: 58, wrist: 26 });
  const sleeve = sleeveSpec.pieces[0];
  sleeve.doubleFabric = true; // dos mangas, derecho con derecho

  return {
    name: "Blazer base",
    section: "tops",
    pieces: [front, back, sleeve]
  };
}
