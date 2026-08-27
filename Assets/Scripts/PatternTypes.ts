// Tipos compartidos del sistema de moldes.
// Todas las coordenadas están en centímetros, en el plano XY local de la pieza.

export interface Point2 {
  x: number;
  y: number;
}

export interface PatternPiece {
  name: string;
  // Contorno cerrado de la pieza (la línea de corte).
  outline: Point2[];
  // Líneas internas: pinzas, hilo de tela, marcas. Polilíneas abiertas.
  internalLines?: Point2[][];
  // La pieza se corta con el centro sobre el doblez de la tela.
  cutOnFold?: boolean;
  // La pieza se corta dos veces (tela doble, derecho con derecho).
  doubleFabric?: boolean;
}

export interface PatternSpec {
  name: string;
  section: string; // "faldas" | "tops" | "pantalones" | "mangas" ...
  pieces: PatternPiece[];
}

export function p(x: number, y: number): Point2 {
  return { x: x, y: y };
}

// Muestrea una bézier cuadrática entre a y b con control c.
export function quadBezier(a: Point2, c: Point2, b: Point2, steps: number): Point2[] {
  const pts: Point2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
    });
  }
  return pts;
}
