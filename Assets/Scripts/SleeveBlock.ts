// Bloque paramétrico: manga base. Pieza completa (no al doblez):
// copa con curva delantera y trasera, afinando hacia el puño.

import { PatternPiece, PatternSpec, Point2, p, quadBezier } from "./PatternTypes";
import { t } from "./I18n";

export interface SleeveParams {
  armhole: number; // contorno de sisa (típico 42-48)
  length: number; // largo de manga (corta 22, 3/4 42, larga 58)
  wrist: number; // ancho de puño (contorno, típico 22-26)
}

export function draftSleeve(params: SleeveParams): PatternSpec {
  const biceps = params.armhole * 0.92 + 2.5; // ancho total de la manga
  const capHeight = params.armhole / 3;
  const halfBiceps = biceps / 2;
  const halfWrist = params.wrist / 2 + 1;

  // y=0 el puño, y=length la línea de biceps, la copa sube hasta length+capHeight.
  // x=0 el centro de la manga.
  const L = params.length;
  const capTop = p(0, L + capHeight);
  const bicepsFront = p(-halfBiceps, L);
  const bicepsBack = p(halfBiceps, L);

  const outline: Point2[] = [];
  // Copa delantera: de biceps al tope (más cóncava abajo, convexa arriba)
  outline.push(...quadBezier(bicepsFront, p(-halfBiceps * 0.72, L + capHeight * 0.18), p(-halfBiceps * 0.42, L + capHeight * 0.55), 8));
  outline.push(...quadBezier(p(-halfBiceps * 0.42, L + capHeight * 0.55), p(-halfBiceps * 0.18, L + capHeight), capTop, 8));
  // Copa trasera (algo más llena)
  outline.push(...quadBezier(capTop, p(halfBiceps * 0.25, L + capHeight), p(halfBiceps * 0.48, L + capHeight * 0.58), 8));
  outline.push(...quadBezier(p(halfBiceps * 0.48, L + capHeight * 0.58), p(halfBiceps * 0.78, L + capHeight * 0.15), bicepsBack, 8));
  // Costura trasera hacia el puño
  outline.push(p(halfWrist, 0));
  // Puño
  outline.push(p(-halfWrist, 0));
  // Costura delantera de vuelta al biceps (el cierre lo hace el polígono)

  // Línea de codo (referencia) y hilo de tela
  const elbow: Point2[] = [p(-halfWrist - (halfBiceps - halfWrist) * 0.45, L * 0.45), p(halfWrist + (halfBiceps - halfWrist) * 0.45, L * 0.45)];
  const grain: Point2[] = [p(0, L * 0.85), p(0, L * 0.2)];
  const arrowL: Point2[] = [p(-1.5, L * 0.2 + 3), p(0, L * 0.2)];
  const arrowR: Point2[] = [p(1.5, L * 0.2 + 3), p(0, L * 0.2)];

  const piece: PatternPiece = {
    name: t("pieceSleeve"),
    outline: outline,
    internalLines: [elbow, grain, arrowL, arrowR],
    cutOnFold: false
  };

  return {
    name: "Manga base",
    section: "mangas",
    pieces: [piece]
  };
}
