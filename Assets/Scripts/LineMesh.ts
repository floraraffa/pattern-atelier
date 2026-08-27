// Construcción de mallas de línea: convierte polilíneas 2D (cm, plano XY)
// en cintas de triángulos doble cara con grosor configurable.

import { Point2 } from "./PatternTypes";

export function buildRibbonMesh(points: Point2[], closed: boolean, halfWidth: number): RenderMesh | null {
  const pts: Point2[] = points.slice();
  if (closed) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    if (dx * dx + dy * dy > 1e-6) {
      pts.push({ x: first.x, y: first.y });
    } else {
      pts[pts.length - 1] = { x: first.x, y: first.y };
    }
  }
  const n = pts.length;
  if (n < 2) {
    return null;
  }

  const verts: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) {
      dx = 1;
      dy = 0;
    } else {
      dx /= len;
      dy /= len;
    }
    const px = -dy * halfWidth;
    const py = dx * halfWidth;
    verts.push(pts[i].x + px, pts[i].y + py, 0);
    verts.push(pts[i].x - px, pts[i].y - py, 0);
  }

  const indices: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
    indices.push(c, b, a, c, d, b);
  }

  const builder = new MeshBuilder([{ name: "position", components: 3 }]);
  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;
  builder.appendVerticesInterleaved(verts);
  builder.appendIndices(indices);
  if (!builder.isValid()) {
    return null;
  }
  builder.updateMesh();
  return builder.getMesh();
}

// Desplaza un polígono cerrado hacia afuera (dist en cm, plano XY).
// Usa normales miter promediadas; detecta la orientación por área con signo.
export function offsetPolygon(points: Point2[], dist: number): Point2[] {
  const pts = points.slice();
  // Cerrar si hace falta
  const f = pts[0];
  const l = pts[pts.length - 1];
  if (Math.abs(f.x - l.x) < 1e-6 && Math.abs(f.y - l.y) < 1e-6) {
    pts.pop();
  }
  const n = pts.length;
  if (n < 3) {
    return points.slice();
  }
  // Área con signo: >0 = antihorario (normal exterior = derecha del recorrido invertida)
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  const sign = area > 0 ? 1 : -1;

  const out: Point2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    let d1x = cur.x - prev.x, d1y = cur.y - prev.y;
    let d2x = next.x - cur.x, d2y = next.y - cur.y;
    const l1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
    const l2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
    d1x /= l1; d1y /= l1; d2x /= l2; d2y /= l2;
    // Normales exteriores de cada segmento
    const n1x = sign * d1y, n1y = -sign * d1x;
    const n2x = sign * d2y, n2y = -sign * d2x;
    let mx = n1x + n2x, my = n1y + n2y;
    const ml = Math.sqrt(mx * mx + my * my);
    if (ml < 1e-4) {
      mx = n1x; my = n1y;
    } else {
      mx /= ml; my /= ml;
    }
    // Corrección miter (limitada para esquinas agudas)
    const dot = mx * n1x + my * n1y;
    const scale = Math.min(1 / Math.max(dot, 0.5), 2.0);
    out.push({ x: cur.x + mx * dist * scale, y: cur.y + my * dist * scale });
  }
  out.push({ x: out[0].x, y: out[0].y });
  return out;
}

// Quad con UVs (para texturas), doble cara, centrado en el origen.
export function buildTexturedQuadMesh(width: number, height: number): RenderMesh | null {
  const hw = width / 2;
  const hh = height / 2;
  // x, y, z, u, v
  const verts = [
    -hw, -hh, 0, 0, 0,
    hw, -hh, 0, 1, 0,
    hw, hh, 0, 1, 1,
    -hw, hh, 0, 0, 1
  ];
  const indices = [0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0];
  const builder = new MeshBuilder([
    { name: "position", components: 3 },
    { name: "texture0", components: 2 }
  ]);
  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;
  builder.appendVerticesInterleaved(verts);
  builder.appendIndices(indices);
  if (!builder.isValid()) {
    return null;
  }
  builder.updateMesh();
  return builder.getMesh();
}

// Quad relleno doble cara, centrado en el origen, en el plano XY.
export function buildQuadMesh(width: number, height: number): RenderMesh | null {
  const hw = width / 2;
  const hh = height / 2;
  const verts = [-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0];
  const indices = [0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0];
  const builder = new MeshBuilder([{ name: "position", components: 3 }]);
  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;
  builder.appendVerticesInterleaved(verts);
  builder.appendIndices(indices);
  if (!builder.isValid()) {
    return null;
  }
  builder.updateMesh();
  return builder.getMesh();
}
