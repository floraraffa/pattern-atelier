// Bloques paramétricos adicionales: pantalón base, short, mallas (calza) y
// ropa interior (bombacha). Trazados simplificados pero creíbles, en cm.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";
import { t } from "./I18n";

// ---------- PANTALÓN ----------

export interface PantsParams {
  waist: number;
  hip: number;
  length: number; // largo total desde cintura
  rise?: number; // tiro (default 26)
  legOpening?: number; // boca de pierna, contorno (default 40)
}

function pantsHalf(
  name: string,
  quarterWaist: number,
  quarterHip: number,
  length: number,
  rise: number,
  crotchExt: number,
  legHalf: number,
  dartIntake: number
): PatternPiece {
  const riseY = length - rise;
  const legCenter = (quarterHip - crotchExt) / 2;

  const outline: Point2[] = [];
  // CF/CB en x=0, cintura arriba
  outline.push(p(0, length));
  outline.push(p(quarterWaist + dartIntake, length));
  // Costado: cintura → cadera → botamanga
  outline.push(...quadBezier(p(quarterWaist + dartIntake, length), p(quarterHip, length - rise * 0.5), p(quarterHip, riseY), 8));
  outline.push(...quadBezier(p(quarterHip, riseY), p(quarterHip * 0.82, riseY * 0.5), p(legCenter + legHalf, 0), 10));
  // Botamanga
  outline.push(p(legCenter - legHalf, 0));
  // Entrepierna: botamanga → punta de tiro
  outline.push(...quadBezier(p(legCenter - legHalf, 0), p(-crotchExt * 0.55, riseY * 0.72), p(-crotchExt, riseY), 10));
  // Curva de tiro: punta → línea de centro
  outline.push(...quadBezier(p(-crotchExt, riseY), p(-crotchExt * 0.1, riseY + rise * 0.22), p(0, riseY + rise * 0.5), 8));
  // Centro hasta cintura (cierra el polígono)

  const dartCenter = (quarterWaist + dartIntake) * 0.55;
  const halfDart = dartIntake / 2;
  const dart: Point2[] = [p(dartCenter - halfDart, length), p(dartCenter, length - 10), p(dartCenter + halfDart, length)];
  const grain: Point2[] = [p(legCenter, length * 0.6), p(legCenter, length * 0.15)];
  const arrowL: Point2[] = [p(legCenter - 1.5, length * 0.15 + 3), p(legCenter, length * 0.15)];
  const arrowR: Point2[] = [p(legCenter + 1.5, length * 0.15 + 3), p(legCenter, length * 0.15)];

  return { name: name, outline: outline, internalLines: [dart, grain, arrowL, arrowR], cutOnFold: false, doubleFabric: true };
}

export function draftPants(params: PantsParams): PatternSpec {
  const rise = params.rise !== undefined ? params.rise : 26;
  const legOpening = params.legOpening !== undefined ? params.legOpening : 40;
  const legHalf = legOpening / 4 + 1;

  const front = pantsHalf(t("pieceFront"), params.waist / 4 + 1, params.hip / 4 + 1.5, params.length, rise, params.hip / 16 + 1, legHalf, 2);
  const back = pantsHalf(t("pieceBack"), params.waist / 4 + 2, params.hip / 4 + 2.5, params.length, rise + 1, params.hip / 8 + 1, legHalf + 1, 3);

  return { name: "Pantalón base", section: "pantalones", pieces: [front, back] };
}

// ---------- SHORT ----------

export interface ShortsParams {
  waist: number;
  hip: number;
  length?: number; // largo por el costado desde cintura (default 35)
  rise?: number; // tiro (default 26)
}

function shortsHalf(
  name: string,
  quarterWaist: number,
  quarterHip: number,
  length: number,
  rise: number,
  crotchExt: number,
  dartIntake: number
): PatternPiece {
  // Mismo planteo que el pantalón: CF/CB en x=0, cintura arriba, ruedo en y=0.
  // Con el largo corto, el ruedo queda apenas por debajo del tiro y casi tan
  // ancho como la línea de cadera (sin afinar hacia la botamanga).
  const riseY = length - rise;
  const legCenter = (quarterHip - crotchExt) / 2;
  const hemOuter = quarterHip - 1.2; // leve entalle del costado hacia el ruedo
  const hemInner = -crotchExt + 1.2; // la entrepierna vuelve un poco al centro

  const outline: Point2[] = [];
  // CF/CB en x=0, cintura arriba
  outline.push(p(0, length));
  outline.push(p(quarterWaist + dartIntake, length));
  // Costado: cintura → cadera → ruedo
  outline.push(...quadBezier(p(quarterWaist + dartIntake, length), p(quarterHip, length - rise * 0.5), p(quarterHip, riseY), 8));
  outline.push(...quadBezier(p(quarterHip, riseY), p(quarterHip - 0.5, riseY * 0.5), p(hemOuter, 0), 6));
  // Ruedo (se termina con doblez, igual que el pantalón)
  outline.push(p(hemInner, 0));
  // Entrepierna corta: ruedo → punta de tiro, apenas ahuecada
  outline.push(...quadBezier(p(hemInner, 0), p((hemInner - crotchExt) * 0.5 - 0.6, riseY * 0.55), p(-crotchExt, riseY), 6));
  // Curva de tiro: punta → línea de centro
  outline.push(...quadBezier(p(-crotchExt, riseY), p(-crotchExt * 0.1, riseY + rise * 0.22), p(0, riseY + rise * 0.5), 8));
  // Centro hasta cintura (cierra el polígono)

  const internal: Point2[][] = [];
  if (dartIntake > 0) {
    const dartCenter = (quarterWaist + dartIntake) * 0.55;
    const halfDart = dartIntake / 2;
    internal.push([p(dartCenter - halfDart, length), p(dartCenter, length - 9), p(dartCenter + halfDart, length)]);
  }
  internal.push([p(legCenter, length * 0.6), p(legCenter, length * 0.15)]);
  internal.push([p(legCenter - 1.5, length * 0.15 + 3), p(legCenter, length * 0.15)]);
  internal.push([p(legCenter + 1.5, length * 0.15 + 3), p(legCenter, length * 0.15)]);

  return { name: name, outline: outline, internalLines: internal, cutOnFold: false, doubleFabric: true };
}

export function draftShorts(params: ShortsParams): PatternSpec {
  const length = params.length !== undefined ? params.length : 35;
  // El tiro no puede comerse el largo: dejamos al menos 4 cm de entrepierna
  // (cuenta también el +1 del tiro trasero).
  const rise = Math.min(params.rise !== undefined ? params.rise : 26, length - 5);

  // Delantero sin pinza; el trasero lleva una pinza de 3 cm como el pantalón.
  const front = shortsHalf(t("pieceFront"), params.waist / 4 + 1, params.hip / 4 + 1.5, length, rise, params.hip / 16 + 1, 0);
  const back = shortsHalf(t("pieceBack"), params.waist / 4 + 2, params.hip / 4 + 2.5, length, rise + 1, params.hip / 8 + 1, 3);

  return { name: "Short base", section: "pantalones", pieces: [front, back] };
}

// ---------- MALLAS / CALZA ----------

export interface LeggingsParams {
  waist: number;
  hip: number;
  length: number; // largo total (tobillo ~ 90)
  ankle?: number; // contorno de tobillo (default 22)
}

export function draftLeggings(params: LeggingsParams): PatternSpec {
  // Elasticidad: se trazan al 90% del cuerpo. Una sola pieza por pierna
  // (delantero+trasero unidos, sin costura lateral), corte en tela doble.
  const w = params.waist * 0.9;
  const h = params.hip * 0.9;
  const ankle = (params.ankle !== undefined ? params.ankle : 22) * 0.9;
  const rise = 25;
  const L = params.length;
  const riseY = L - rise;

  const halfW = h / 4; // media pierna a la altura de cadera
  const crotchF = h / 20;
  const crotchB = h / 11;
  const ankleHalf = ankle / 2;
  const legCenter = 0;

  const outline: Point2[] = [];
  // Cintura (delantero a la izquierda, trasero a la derecha)
  outline.push(p(-w / 4 + 1, L));
  outline.push(p(w / 4 + 2, L + 2)); // el trasero sube un poco
  // Lado trasero hacia la punta de tiro trasera
  outline.push(...quadBezier(p(w / 4 + 2, L + 2), p(halfW + crotchB * 0.6, L - rise * 0.55), p(halfW + crotchB, riseY), 8));
  // Entrepierna trasera → tobillo
  outline.push(...quadBezier(p(halfW + crotchB, riseY), p(ankleHalf + (halfW + crotchB - ankleHalf) * 0.35, riseY * 0.45), p(ankleHalf, 0), 10));
  // Tobillo
  outline.push(p(-ankleHalf, 0));
  // Tobillo → entrepierna delantera
  outline.push(...quadBezier(p(-ankleHalf, 0), p(-ankleHalf - (halfW + crotchF - ankleHalf) * 0.35, riseY * 0.45), p(-halfW - crotchF, riseY), 10));
  // Punta de tiro delantera → cintura
  outline.push(...quadBezier(p(-halfW - crotchF, riseY), p(-halfW * 0.9, L - rise * 0.5), p(-w / 4 + 1, L), 8));

  const grain: Point2[] = [p(0, L * 0.6), p(0, L * 0.15)];
  const arrowL: Point2[] = [p(-1.5, L * 0.15 + 3), p(0, L * 0.15)];
  const arrowR: Point2[] = [p(1.5, L * 0.15 + 3), p(0, L * 0.15)];

  const leg: PatternPiece = {
    name: t("pieceLeg"),
    outline: outline,
    internalLines: [grain, arrowL, arrowR],
    cutOnFold: false,
    doubleFabric: true
  };

  return { name: "Calza base", section: "pantalones", pieces: [leg] };
}

// ---------- ROPA INTERIOR (BOMBACHA) ----------

export interface UnderwearParams {
  hip: number;
  rise?: number; // altura de tiro (default 22)
}

export function draftUnderwear(params: UnderwearParams): PatternSpec {
  const rise = params.rise !== undefined ? params.rise : 22;
  const crotchW = 3.4; // media entrepierna

  const frontTop = params.hip / 4 - 2;
  const backTop = params.hip / 4 + 1;

  function piece(name: string, topHalf: number, height: number, legFullness: number): PatternPiece {
    const outline: Point2[] = [];
    outline.push(p(0, height));
    outline.push(p(topHalf, height));
    // Curva de pierna: costado → entrepierna
    outline.push(...quadBezier(p(topHalf, height), p(topHalf * legFullness, height * 0.35), p(crotchW, 0), 12));
    outline.push(p(0, 0));
    const grain: Point2[] = [p(topHalf * 0.35, height * 0.75), p(topHalf * 0.35, height * 0.3)];
    return { name: name, outline: outline, internalLines: [grain], cutOnFold: true };
  }

  const front = piece(t("pieceFront"), frontTop, rise, 0.55);
  const back = piece(t("pieceBack"), backTop, rise + 2, 0.8);

  // Entrepierna (forro): rectángulo con leves curvas
  const g: Point2[] = [];
  g.push(...quadBezier(p(0, 12), p(crotchW * 1.15, 11), p(crotchW, 6), 6));
  g.push(...quadBezier(p(crotchW, 6), p(crotchW * 1.1, 1), p(0, 0), 6));
  const gusset: PatternPiece = {
    name: t("pieceGusset"),
    outline: g,
    internalLines: [],
    cutOnFold: true,
    doubleFabric: true
  };

  return { name: "Bombacha base", section: "ropa interior", pieces: [front, back, gusset] };
}
