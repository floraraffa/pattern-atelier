// Bloque paramétrico: corpiño básico delantero (cuarto de molde, al doblez).
// Trazado simplificado del bloque clásico: escote, hombro, sisa, costado y pinza de talle.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";
import { t } from "./I18n";

export interface BodiceParams {
  bust: number; // contorno de busto total
  waist: number; // contorno de cintura total
  length: number; // largo de talle (cuello a cintura), típico 40-44
}

function bodiceQuarter(
  name: string,
  quarterBust: number,
  quarterWaist: number,
  length: number,
  neckDepth: number,
  dartIntake: number
): PatternPiece {
  // y=0 la cintura, y=length la línea de hombro/cuello. x=0 centro (al doblez).
  const neckWidth = 6.8;
  const shoulderLen = 12.5;
  const shoulderDrop = 4.2;
  const armholeDepth = length * 0.52;

  const shoulderTip = p(neckWidth + shoulderLen * 0.92, length - shoulderDrop);
  const underarm = p(quarterBust, length - armholeDepth);

  const outline: Point2[] = [];
  // Escote: del centro-escote al punto de cuello
  outline.push(...quadBezier(p(0, length - neckDepth), p(neckWidth * 0.85, length - neckDepth * 0.85), p(neckWidth, length), 10));
  // Hombro
  outline.push(shoulderTip);
  // Sisa: curva del hombro a la axila
  outline.push(
    ...quadBezier(shoulderTip, p(quarterBust * 0.92, length - armholeDepth * 0.55), underarm, 12)
  );
  // Costado: de la axila a la cintura, entallado
  const waistSide = p(quarterWaist + dartIntake, 0);
  outline.push(...quadBezier(underarm, p(quarterBust * 0.98, length * 0.2), waistSide, 8));
  // Cintura al centro
  outline.push(p(0, 0));

  // Pinza de talle: apunta hacia el busto
  const dartCenter = (quarterWaist + dartIntake) * 0.5;
  const halfDart = dartIntake / 2;
  const dart: Point2[] = [
    p(dartCenter - halfDart, 0),
    p(dartCenter, length * 0.62),
    p(dartCenter + halfDart, 0)
  ];

  // Hilo de tela
  const gx = quarterBust * 0.78;
  const grain: Point2[] = [p(gx, length * 0.55), p(gx, length * 0.15)];
  const arrowL: Point2[] = [p(gx - 1.5, length * 0.15 + 3), p(gx, length * 0.15)];
  const arrowR: Point2[] = [p(gx + 1.5, length * 0.15 + 3), p(gx, length * 0.15)];

  return {
    name: name,
    outline: outline,
    internalLines: [dart, grain, arrowL, arrowR],
    cutOnFold: true
  };
}

export function draftBodice(params: BodiceParams): PatternSpec {
  const quarterBust = params.bust / 4 + 1.5;
  const quarterWaist = params.waist / 4 + 1;

  const front = bodiceQuarter(t("pieceFront"), quarterBust, quarterWaist, params.length, 7.2, 3);
  const back = bodiceQuarter(t("pieceBack"), quarterBust - 0.5, quarterWaist, params.length, 2.5, 3.5);

  return {
    name: "Corpiño básico",
    section: "tops",
    pieces: [front, back]
  };
}
