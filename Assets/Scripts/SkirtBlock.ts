// Bloque paramétrico: falda recta con pinzas.
// Trazado clásico sobre cuarto de molde (delantero y trasero), medidas en cm.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";

export interface SkirtParams {
  waist: number; // contorno de cintura total
  hip: number; // contorno de cadera total
  length: number; // largo de falda desde cintura
  flare?: number; // ensanche del ruedo en el lateral, 0 = recta (default 0)
  hipDepth?: number; // altura de cadera (default 20)
  easeHip?: number; // holgura en cadera por cuarto (default 1)
  frontDart?: number; // profundidad de pinza delantera (default 2)
  backDart?: number; // profundidad de pinza trasera (default 3)
}

function skirtQuarter(
  name: string,
  quarterWaist: number,
  quarterHip: number,
  length: number,
  hipDepth: number,
  dartIntake: number,
  dartLength: number,
  flare: number
): PatternPiece {
  // y=0 es el ruedo, y=length la cintura. x=0 es el centro (al doblez).
  const sideRise = 1.2; // la costura lateral sube un poco en cintura
  const waistEdge = quarterWaist + dartIntake;

  const outline: Point2[] = [];
  // Centro-cintura → curva de cintura hasta el lateral
  outline.push(
    ...quadBezier(p(0, length), p(waistEdge * 0.6, length), p(waistEdge, length + sideRise), 10)
  );
  // Costura lateral: curva de cintura a cadera
  outline.push(
    ...quadBezier(p(waistEdge, length + sideRise), p(quarterHip, length - hipDepth * 0.3), p(quarterHip, length - hipDepth), 12)
  );
  // Lateral de cadera a ruedo (recto o evasé según flare)
  outline.push(p(quarterHip + flare, 0));
  // Ruedo: si hay flare, leve curva para mantener el largo en el lateral
  if (flare > 0) {
    outline.push(...quadBezier(p(quarterHip + flare, 0), p((quarterHip + flare) * 0.5, -flare * 0.15), p(0, 0), 8));
  } else {
    outline.push(p(0, 0));
  }
  // El cierre al centro lo hace el polígono cerrado (0,0)→(0,length)

  // Pinza: centrada a ~55% del recorrido de cintura, perpendicular hacia abajo
  const dartCenter = waistEdge * 0.55;
  const halfDart = dartIntake / 2;
  const dartTip = p(dartCenter, length - dartLength);
  const dart: Point2[] = [
    p(dartCenter - halfDart, length),
    dartTip,
    p(dartCenter + halfDart, length)
  ];

  // Hilo de tela: línea vertical con flecha, al centro de la pieza
  const gx = quarterHip * 0.5;
  const grain: Point2[] = [p(gx, length * 0.75), p(gx, length * 0.25)];
  const arrowL: Point2[] = [p(gx - 1.5, length * 0.25 + 3), p(gx, length * 0.25)];
  const arrowR: Point2[] = [p(gx + 1.5, length * 0.25 + 3), p(gx, length * 0.25)];

  return {
    name: name,
    outline: outline,
    internalLines: [dart, grain, arrowL, arrowR],
    cutOnFold: true
  };
}

export function draftStraightSkirt(params: SkirtParams): PatternSpec {
  const hipDepth = params.hipDepth !== undefined ? params.hipDepth : 20;
  const easeHip = params.easeHip !== undefined ? params.easeHip : 1;
  const frontDart = params.frontDart !== undefined ? params.frontDart : 2;
  const backDart = params.backDart !== undefined ? params.backDart : 3;

  const flare = params.flare !== undefined ? params.flare : 0;
  const quarterWaist = params.waist / 4;
  const quarterHip = params.hip / 4 + easeHip;

  const front = skirtQuarter("DELANTERO", quarterWaist, quarterHip, params.length, hipDepth, frontDart, 9, flare);
  const back = skirtQuarter("TRASERO", quarterWaist, quarterHip, params.length, hipDepth, backDart, 13, flare);

  return {
    name: flare > 0 ? "Falda evasé" : "Falda recta",
    section: "faldas",
    pieces: [front, back]
  };
}
