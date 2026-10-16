import { Vector3, Matrix4, Quaternion, Triangle } from "three";
import { rigidMatrix } from "./transform-contract.mjs";
// Read-only candidate region on the pinned wheel mesh. CORE acceptance is separate.
export function createWheelRimSampler(mesh) {
  if (!mesh?.geometry?.attributes?.position)
    throw new TypeError("WHEEL_GEOMETRY_REQUIRED");
  const g = mesh.geometry,
    p = g.attributes.position,
    idx = g.index,
    triangles = [];
  const positions = Array.from(p.array),
    indices = idx ? Array.from(idx.array) : null;
  function verify() {
    if (
      mesh.geometry !== g ||
      g.attributes.position !== p ||
      g.index !== idx ||
      positions.some((v, i) => p.array[i] !== v) ||
      indices?.some((v, i) => idx.array[i] !== v)
    )
      throw new Error("WHEEL_SOURCE_CHANGED");
  }
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  for (let t = 0; t < (idx ? idx.count : p.count) / 3; t++) {
    const ids = [0, 1, 2].map((j) => (idx ? idx.getX(t * 3 + j) : t * 3 + j));
    a.fromBufferAttribute(p, ids[0]);
    b.fromBufferAttribute(p, ids[1]);
    c.fromBufferAttribute(p, ids[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize(),
      point = a
        .clone()
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3),
      r = Math.hypot(point.y, point.z);
    // Actual back-facing rim band, excluding hub and spokes. No synthetic ring collider.
    if (r < 0.13 || r > 0.16 || normal.x > -0.05 || point.x > 0) continue;
    const tangent = new Vector3(0, 1, 0)
      .addScaledVector(normal, -normal.y)
      .normalize();
    const bitangent = tangent.clone().cross(normal).normalize();
    const q = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(tangent, normal, bitangent),
    );
    triangles.push({
      vertices: [a.toArray(), b.toArray(), c.toArray()],
      triangle: t,
      barycentric: [1 / 3, 1 / 3, 1 / 3],
      point: point.toArray(),
      normal: normal.toArray(),
      quaternion: q.toArray(),
    });
  }
  if (triangles.length < 8) throw new Error("WHEEL_RIM_REGION_UNAVAILABLE");
  for (const t of triangles) {
    for (const v of t.vertices) Object.freeze(v);
    for (const key of [
      "vertices",
      "barycentric",
      "point",
      "normal",
      "quaternion",
    ])
      Object.freeze(t[key]);
    Object.freeze(t);
  }
  Object.freeze(triangles);
  function sample(source, sourceToVessel, verified = false) {
    if (!verified) verify();
    const t = triangles.find((t) => t.triangle === source.triangle);
    if (!t) throw new Error("UNKNOWN_RIM_TRIANGLE");
    const m = rigidMatrix(sourceToVessel),
      q = new Quaternion().setFromRotationMatrix(m);
    const bary = source.barycentric || t.barycentric;
    if (
      !Array.isArray(bary) ||
      bary.length !== 3 ||
      !bary.every(Number.isFinite) ||
      bary.some((v) => v < -1e-10 || v > 1 + 1e-10) ||
      Math.abs(bary.reduce((a, b) => a + b, 0) - 1) > 1e-8
    )
      throw new TypeError("RIM_BARYCENTRIC_INVALID");
    const point = new Vector3();
    t.vertices.forEach((p, i) =>
      point.addScaledVector(new Vector3(...p), bary[i]),
    );
    return {
      ...t,
      barycentric: [...bary],
      point: point.applyMatrix4(m).toArray(),
      normal: new Vector3(...t.normal).transformDirection(m).toArray(),
      quaternion: q.multiply(new Quaternion(...t.quaternion)).toArray(),
    };
  }
  function closest(pointVessel, sourceToVessel) {
    verify();
    if (
      !Array.isArray(pointVessel) ||
      pointVessel.length !== 3 ||
      !pointVessel.every(Number.isFinite)
    )
      throw new TypeError("RIM_QUERY_INVALID");
    const m = rigidMatrix(sourceToVessel),
      point = new Vector3(...pointVessel).applyMatrix4(m.clone().invert());
    let best = null;
    for (const t of triangles) {
      const tri = new Triangle(...t.vertices.map((p) => new Vector3(...p))),
        p = tri.closestPointToPoint(point, new Vector3()),
        distance = p.distanceToSquared(point);
      if (!best || distance < best.distance)
        best = {
          distance,
          triangle: t.triangle,
          barycentric: tri.getBarycoord(p, new Vector3()).toArray(),
        };
    }
    return sample(best, sourceToVessel, true);
  }
  return {
    triangles,
    sample: (source, matrix) => sample(source, matrix),
    closest,
    all: (m) => {
      verify();
      return triangles.map((t) => sample(t, m, true));
    },
  };
}
