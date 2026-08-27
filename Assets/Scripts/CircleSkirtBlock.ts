// Bloque paramétrico: pollera plato (falda circular).
// Se corta en dos medias lunas (al doblez cada una = círculo completo).
// El radio de cintura sale del contorno: r = cintura / (2π · fullness).

import { PatternPiece, PatternSpec, Point2, p } from "./PatternTypes";

export interface CircleSkirtParams {
  waist: number; // contorno de cintura total
  length: number; // largo de falda desde cintura
  fullness?: number; // 1 = plato completo (360°), 0.5 = media campana (180°)
}

function halfAnnulus(name: string, rWaist: number, rHem: number): PatternPiece {
  // Media luna: arco de cintura y arco de ruedo, de -90° a +90°.
  // x=0 es el borde al doblez, la pieza se abre hacia +x.
  const outline: Point2[] = [];
  const steps = 26;
  // Arco de ruedo (de abajo hacia arriba)
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    outline.push(p(Math.cos(a) * rHem, Math.sin(a) * rHem));
  }
  // Arco de cintura (de arriba hacia abajo)
  for (let i = steps; i >= 0; i--) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    outline.push(p(Math.cos(a) * rWaist, Math.sin(a) * rWaist));
  }

  // Hilo de tela: radial al centro de la pieza
  const midR = (rWaist + rHem) / 2;
  const grain: Point2[] = [p(midR - (rHem - rWaist) * 0.3, 0), p(midR + (rHem - rWaist) * 0.3, 0)];
  const arrowA: Point2[] = [p(midR + (rHem - rWaist) * 0.3 - 3, 1.5), p(midR + (rHem - rWaist) * 0.3, 0)];
  const arrowB: Point2[] = [p(midR + (rHem - rWaist) * 0.3 - 3, -1.5), p(midR + (rHem - rWaist) * 0.3, 0)];

  return {
    name: name,
    outline: outline,
    internalLines: [grain, arrowA, arrowB],
    cutOnFold: true
  };
}

export function draftCircleSkirt(params: CircleSkirtParams): PatternSpec {
  const fullness = params.fullness !== undefined && params.fullness > 0 ? params.fullness : 1;
  // Cada media luna cubre media circunferencia de cintura (con fullness=1).
  const rWaist = params.waist / (2 * Math.PI * fullness);
  const rHem = rWaist + params.length;

  const front = halfAnnulus("DELANTERO", rWaist, rHem);
  const back = halfAnnulus("TRASERO", rWaist, rHem);

  return {
    name: fullness >= 0.9 ? "Pollera plato" : "Pollera semi-plato",
    section: "faldas",
    pieces: [front, back]
  };
}
