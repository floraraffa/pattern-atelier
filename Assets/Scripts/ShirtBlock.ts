// Bloques de camisa: cuerpo (delantero con cartera de botones + trasero con
// canesú), cuello camisero (cuello + pie de cuello) y puño. En cm.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";

// ---------- CUERPO DE CAMISA ----------

export interface ShirtParams {
  bust: number; // contorno de busto/pecho
  waist: number; // contorno de cintura (poco entalle en camisa)
  length: number; // largo desde hombro (típico 68)
}

function shirtBody(
  name: string,
  quarterBust: number,
  length: number,
  neckDepth: number,
  placket: number, // ancho de cartera (solo delantero)
  yoke: boolean // línea de canesú (solo trasero)
): PatternPiece {
  const neckWidth = 7.2;
  const shoulderLen = 13.5;
  const shoulderDrop = 4;
  const armholeDepth = 24;

  const shoulderTip = p(neckWidth + shoulderLen * 0.94, length - shoulderDrop);
  const underarm = p(quarterBust, length - armholeDepth);

  const outline: Point2[] = [];
  // Borde del centro: con cartera se corre -placket
  const cfX = -placket;
  outline.push(p(cfX, length - neckDepth));
  // Escote
  outline.push(...quadBezier(p(0, length - neckDepth), p(neckWidth * 0.85, length - neckDepth * 0.8), p(neckWidth, length), 8));
  // Hombro
  outline.push(shoulderTip);
  // Sisa
  outline.push(...quadBezier(shoulderTip, p(quarterBust * 0.9, length - armholeDepth * 0.5), underarm, 10));
  // Costado casi recto con leve entalle
  outline.push(...quadBezier(underarm, p(quarterBust - 1.5, length * 0.35), p(quarterBust - 0.5, 0), 8));
  // Ruedo con curvita de camisa
  outline.push(...quadBezier(p(quarterBust - 0.5, 0), p(quarterBust * 0.5, -2), p(cfX, 0), 8));
  // Centro (cierra el polígono hasta el escote)

  const internal: Point2[][] = [];
  if (placket > 0) {
    // Cortina de botones incorporada: la extensión mide 2× el ancho de cartera.
    // Línea de DOBLEZ (por donde se pliega la cortina hacia adentro):
    internal.push([p(-placket / 2, length - neckDepth), p(-placket / 2, 0)]);
    // Línea de centro (donde caen los botones):
    internal.push([p(0, length - neckDepth), p(0, 0)]);
    // Botones marcados sobre el centro
    for (let i = 0; i < 6; i++) {
      const by = (length - neckDepth - 4) - i * ((length - neckDepth - 8) / 5);
      internal.push([p(-1, by), p(1, by)]);
    }
  }
  if (yoke) {
    // Canesú: línea horizontal bajo el hombro
    internal.push([p(0, length - 9), p(quarterBust * 0.97, length - 9)]);
  }
  // Hilo de tela
  const gx = quarterBust * 0.55;
  internal.push([p(gx, length * 0.6), p(gx, length * 0.2)]);
  internal.push([p(gx - 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);
  internal.push([p(gx + 1.5, length * 0.2 + 3), p(gx, length * 0.2)]);

  return {
    name: name,
    outline: outline,
    internalLines: internal,
    cutOnFold: placket === 0,
    doubleFabric: placket > 0
  };
}

export function draftShirt(params: ShirtParams): PatternSpec {
  const quarterBust = params.bust / 4 + 3; // holgura de camisa
  // Cortina de botones: 3 cm de cartera → extensión de 6 cm con línea de doblez
  const front = shirtBody("DELANTERO", quarterBust, params.length, 8, 6, false);
  const back = shirtBody("TRASERO", quarterBust + 0.5, params.length + 1, 3, 0, true);
  return { name: "Camisa base", section: "tops", pieces: [front, back] };
}

// ---------- CUELLO CAMISERO ----------

export interface CollarParams {
  neck: number; // contorno de cuello (típico 38-42)
  height?: number; // altura del cuello (default 7)
}

export function draftCollar(params: CollarParams): PatternSpec {
  const halfNeck = params.neck / 2 + 1;
  const h = params.height !== undefined ? params.height : 7;

  // Cuello: rectángulo con punta
  const collar: Point2[] = [];
  collar.push(p(0, h));
  collar.push(p(halfNeck - 2, h));
  collar.push(p(halfNeck + 2.5, 0)); // punta del cuello
  collar.push(p(0, 0));
  const cPiece: PatternPiece = {
    name: "CUELLO",
    outline: collar,
    internalLines: [[p(halfNeck * 0.4, h * 0.65), p(halfNeck * 0.7, h * 0.65)]],
    cutOnFold: true,
    doubleFabric: true
  };

  // Pie de cuello: banda curva
  const stand: Point2[] = [];
  stand.push(...quadBezier(p(0, 3.4), p(halfNeck * 0.6, 3.6), p(halfNeck + 1.5, 2.6), 10));
  stand.push(...quadBezier(p(halfNeck + 1.5, 2.6), p(halfNeck + 2, 1.2), p(halfNeck, 0), 6));
  stand.push(p(0, 0));
  const sPiece: PatternPiece = {
    name: "PIE DE CUELLO",
    outline: stand,
    internalLines: [],
    cutOnFold: true,
    doubleFabric: true
  };

  return { name: "Cuello camisero", section: "cuellos", pieces: [cPiece, sPiece] };
}

// ---------- PUÑO ----------

export interface CuffParams {
  wrist: number; // contorno de puño cerrado (típico 22)
  height?: number; // alto del puño (default 6)
}

export function draftCuff(params: CuffParams): PatternSpec {
  const w = params.wrist + 3; // superposición para el botón
  const h = params.height !== undefined ? params.height : 6;

  const outline: Point2[] = [];
  // Rectángulo con esquinas inferiores redondeadas
  outline.push(p(0, h));
  outline.push(p(w, h));
  outline.push(...quadBezier(p(w, h * 0.35), p(w, 0), p(w - 1.5, 0), 5));
  outline.push(...quadBezier(p(1.5, 0), p(0, 0), p(0, h * 0.35), 5));

  const piece: PatternPiece = {
    name: "PUÑO",
    outline: outline,
    internalLines: [[p(2, h / 2), p(3, h / 2)], [p(w - 3, h / 2), p(w - 2, h / 2)]],
    cutOnFold: false,
    doubleFabric: true
  };

  return { name: "Puño", section: "puños", pieces: [piece] };
}
