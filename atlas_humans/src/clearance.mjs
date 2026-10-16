import { Box3, Vector3, Triangle, Ray } from "three";
import { rigidMatrix } from "./transform-contract.mjs";
const V = (a) => new Vector3(...a),
  finite = (a) =>
    Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const directions = [
  [1, 0.371, 0.529],
  [0.217, 1, 0.413],
  [0.317, 0.193, 1],
].map((v) => V(v).normalize());
// Offline diagnostic oracle. Actual triangles are never inflated, patched or remeshed.
export function createClearanceSource({
  name,
  positions,
  indices,
  weldToleranceM = 1e-6,
}) {
  if (
    typeof name !== "string" ||
    !name ||
    !Array.isArray(positions) ||
    positions.length % 3 ||
    !positions.every(Number.isFinite) ||
    !Array.isArray(indices) ||
    indices.length % 3 ||
    !indices.every(
      (i) => Number.isSafeInteger(i) && i >= 0 && i < positions.length / 3,
    ) ||
    !Number.isFinite(weldToleranceM) ||
    weldToleranceM <= 0
  )
    throw new TypeError("CLEARANCE_GEOMETRY_INVALID");
  const vertices = Array.from({ length: positions.length / 3 }, (_, i) =>
      V(positions.slice(i * 3, i * 3 + 3)),
    ),
    weld = new Map(),
    ids = vertices.map((p) => {
      const k = p
        .toArray()
        .map((x) => Math.round(x / weldToleranceM))
        .join(",");
      if (!weld.has(k)) weld.set(k, weld.size);
      return weld.get(k);
    }),
    edges = new Map(),
    triangles = [],
    adj = [];
  let degenerate = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const ix = indices.slice(i, i + 3),
      tri = new Triangle(...ix.map((i) => vertices[i])),
      id = triangles.length;
    if (tri.getArea() < 1e-14) {
      degenerate++;
      continue;
    }
    const box = new Box3().setFromPoints(ix.map((i) => vertices[i]));
    triangles.push({
      id,
      sourceTriangle: i / 3,
      tri,
      box,
      center: box.getCenter(new Vector3()),
    });
    adj.push([]);
    for (let k = 0; k < 3; k++) {
      const a = ids[ix[k]],
        b = ids[ix[(k + 1) % 3]],
        key = [Math.min(a, b), Math.max(a, b)].join(":");
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push({ id, direction: a < b ? 1 : -1 });
    }
  }
  for (const list of edges.values())
    for (let i = 1; i < list.length; i++) {
      adj[list[0].id].push(list[i].id);
      adj[list[i].id].push(list[0].id);
    }
  const componentFor = new Int32Array(triangles.length).fill(-1),
    components = [];
  for (let i = 0; i < triangles.length; i++)
    if (componentFor[i] < 0) {
      const id = components.length,
        stack = [i],
        items = [];
      componentFor[i] = id;
      while (stack.length) {
        const k = stack.pop();
        items.push(triangles[k]);
        for (const j of adj[k])
          if (componentFor[j] < 0) {
            componentFor[j] = id;
            stack.push(j);
          }
      }
      components.push({
        id,
        items,
        boundaryEdges: 0,
        nonmanifoldEdges: 0,
        windingErrors: 0,
      });
    }
  for (const list of edges.values()) {
    const c = components[componentFor[list[0].id]];
    if (list.length === 1) c.boundaryEdges++;
    if (list.length > 2) c.nonmanifoldEdges++;
    if (list.length === 2 && list[0].direction === list[1].direction)
      c.windingErrors++;
  }
  function tree(items) {
    const box = new Box3();
    items.forEach((t) => box.union(t.box));
    if (items.length <= 12) return { box, items };
    const size = box.getSize(new Vector3()),
      axis =
        size.x >= size.y && size.x >= size.z
          ? "x"
          : size.y >= size.z
            ? "y"
            : "z",
      sorted = [...items].sort((a, b) => a.center[axis] - b.center[axis]),
      mid = Math.floor(sorted.length / 2);
    return {
      box,
      left: tree(sorted.slice(0, mid)),
      right: tree(sorted.slice(mid)),
    };
  }
  if (!triangles.length) throw new TypeError("CLEARANCE_EMPTY_GEOMETRY");
  const root = tree(triangles);
  components.forEach((c) => {
    c.closed =
      c.boundaryEdges === 0 &&
      c.nonmanifoldEdges === 0 &&
      c.windingErrors === 0;
    c.root = tree(c.items);
  });
  function closest(point, node = root, best = { distance: Infinity }) {
    if (node.box.distanceToPoint(point) > best.distance) return best;
    if (node.items) {
      for (const t of node.items) {
        const p = t.tri.closestPointToPoint(point, new Vector3()),
          distance = p.distanceTo(point);
        if (distance < best.distance)
          best = {
            distance,
            point: p.toArray(),
            sourceTriangle: t.sourceTriangle,
            component: componentFor[t.id],
            barycentric: t.tri.getBarycoord(p, new Vector3()).toArray(),
          };
      }
      return best;
    }
    const children = [node.left, node.right].sort(
      (a, b) => a.box.distanceToPoint(point) - b.box.distanceToPoint(point),
    );
    for (const c of children) best = closest(point, c, best);
    return best;
  }
  function hits(ray, node, maxDistance = Infinity, out = []) {
    if (!ray.intersectsBox(node.box)) return out;
    if (node.items) {
      for (const t of node.items) {
        const p = ray.intersectTriangle(
          t.tri.a,
          t.tri.b,
          t.tri.c,
          false,
          new Vector3(),
        );
        if (p) {
          const distance = p.distanceTo(ray.origin);
          if (distance <= maxDistance)
            out.push({
              distance,
              sourceTriangle: t.sourceTriangle,
              point: p.toArray(),
              component: componentFor[t.id],
            });
        }
      }
    } else {
      hits(ray, node.left, maxDistance, out);
      hits(ray, node.right, maxDistance, out);
    }
    return out;
  }
  function inside(point, c) {
    if (!c.root.box.containsPoint(point)) return false;
    const answers = directions.map((d) => {
      const distances = hits(new Ray(point, d), c.root)
          .map((h) => h.distance)
          .filter((d) => d > 1e-8)
          .sort((a, b) => a - b),
        unique = distances.filter(
          (d, i) => i === 0 || d - distances[i - 1] > 1e-7,
        );
      return unique.length % 2 === 1;
    });
    return answers.every((a) => a === answers[0]) ? answers[0] : null;
  }
  const topology = {
    name,
    triangles: triangles.length,
    degenerateTriangles: degenerate,
    weldToleranceM,
    components: components.map(
      ({
        id,
        items,
        closed,
        boundaryEdges,
        nonmanifoldEdges,
        windingErrors,
      }) => ({
        id,
        triangles: items.length,
        closed,
        boundaryEdges,
        nonmanifoldEdges,
        windingErrors,
      }),
    ),
    solidComplete: degenerate === 0 && components.every((c) => c.closed),
  };
  return {
    topology,
    bounds: { min: root.box.min.toArray(), max: root.box.max.toArray() },
    query(pointVessel, sourceToVessel) {
      if (!finite(pointVessel)) throw new TypeError("CLEARANCE_POINT_INVALID");
      const m = rigidMatrix(sourceToVessel),
        p = V(pointVessel).applyMatrix4(m.clone().invert()),
        nearest = closest(p);
      let depth = 0,
        penetrationWitness = null,
        insideComponents = [],
        unknown = !topology.solidComplete;
      for (const c of components)
        if (c.closed && c.root.box.containsPoint(p)) {
          const state = inside(p, c);
          if (state === null) unknown = true;
          else if (state) {
            insideComponents.push(c.id);
            const witness = closest(p, c.root);
            if (witness.distance > depth) {
              depth = witness.distance;
              penetrationWitness = {
                ...witness,
                point: V(witness.point).applyMatrix4(m).toArray(),
              };
            }
          }
        }
      return {
        ...nearest,
        point: V(nearest.point).applyMatrix4(m).toArray(),
        insideComponents,
        penetrationWitness,
        penetrationM: insideComponents.length ? depth : null,
        classification: insideComponents.length
          ? "inside-closed-component"
          : unknown
            ? "unknown-solid"
            : "outside",
        solidComplete: topology.solidComplete,
      };
    },
    segment(a, b, sourceToVessel) {
      if (!finite(a) || !finite(b))
        throw new TypeError("CLEARANCE_SEGMENT_INVALID");
      const inverse = rigidMatrix(sourceToVessel).invert(),
        p = V(a).applyMatrix4(inverse),
        q = V(b).applyMatrix4(inverse),
        length = p.distanceTo(q);
      if (length < 1e-10) return [];
      return hits(new Ray(p, q.sub(p).normalize()), root, length).filter(
        (h) => h.distance > 1e-7 && h.distance < length - 1e-7,
      );
    },
  };
}
// Absence of a proven collision does not establish clearance for open/missing geometry.
export function clearanceDecision({
  sources,
  missing = [],
  maxPenetrationM,
  edgeCrossings,
  hardToleranceM = 0.001,
}) {
  if (
    !Array.isArray(sources) ||
    !Array.isArray(missing) ||
    !Number.isFinite(maxPenetrationM) ||
    maxPenetrationM < 0 ||
    !Number.isSafeInteger(edgeCrossings) ||
    edgeCrossings < 0 ||
    !Number.isFinite(hardToleranceM) ||
    hardToleranceM < 0
  )
    throw new TypeError("CLEARANCE_RESULT_INVALID");
  if (maxPenetrationM > hardToleranceM || edgeCrossings > 0)
    return { status: "fail", productionEnabled: false };
  if (
    !sources.length ||
    missing.length ||
    sources.some((s) => !s.solidComplete)
  )
    return { status: "unknown", productionEnabled: false };
  return { status: "sampled-pass", productionEnabled: false };
}
// Narrow receiving interface. Expected context comes from the owner, never the packet.
// A sampled result is diagnostic and cannot authorize full-body or production activation.
export function readClearanceSample(packet, expected) {
  const reject = (reason) => ({
    status: "unknown",
    reason,
    productionEnabled: false,
    fullBodyAccepted: false,
  });
  const text = (x) => typeof x === "string" && x.trim().length > 0;
  if (
    !expected ||
    !packet ||
    ![
      "bodyRevision",
      "sourceSetRevision",
      "vesselInstanceId",
      "activationId",
      "simulationEpoch",
    ].every((k) => text(expected[k]) && packet[k] === expected[k]) ||
    !Number.isSafeInteger(expected.frameId) ||
    expected.frameId < 0 ||
    packet.frameId !== expected.frameId ||
    !Number.isFinite(expected.time) ||
    expected.time < 0 ||
    packet.time !== expected.time
  )
    return reject("CLEARANCE_CONTEXT_MISMATCH");
  if (
    !Array.isArray(expected.sources) ||
    !expected.sources.length ||
    !Array.isArray(packet.measurements)
  )
    return reject("CLEARANCE_COVERAGE_MISSING");
  if (
    new Set(expected.sources.map((s) => s?.id)).size !== expected.sources.length
  )
    return reject("CLEARANCE_DUPLICATE_POLICY_SOURCE");
  const names = packet.measurements.map((m) => m?.sourceId);
  if (new Set(names).size !== names.length)
    return reject("CLEARANCE_DUPLICATE_SOURCE");
  let unknown = false,
    failures = [];
  for (const source of expected.sources) {
    if (
      !text(source.id) ||
      !Number.isFinite(source.penetrationToleranceM) ||
      source.penetrationToleranceM < 0 ||
      !Number.isFinite(source.vertexClearanceMarginM) ||
      source.vertexClearanceMarginM < 0
    )
      return reject("CLEARANCE_POLICY_INVALID");
    const m = packet.measurements.find((m) => m.sourceId === source.id);
    if (
      !m ||
      !Number.isSafeInteger(m.sampleCount) ||
      m.sampleCount <= 0 ||
      !Number.isFinite(m.maxPenetrationM) ||
      m.maxPenetrationM < 0 ||
      !Number.isFinite(m.minVertexSeparationM) ||
      m.minVertexSeparationM < 0 ||
      !Number.isSafeInteger(m.edgeCrossings) ||
      m.edgeCrossings < 0 ||
      typeof m.solidComplete !== "boolean"
    )
      return reject("CLEARANCE_MEASUREMENT_MISSING_OR_INVALID");
    if (
      m.maxPenetrationM > source.penetrationToleranceM ||
      m.edgeCrossings > 0 ||
      m.minVertexSeparationM < source.vertexClearanceMarginM
    )
      failures.push(source.id);
    if (!m.solidComplete || source.solidInterpretationAccepted !== true)
      unknown = true;
  }
  if (names.some((id) => !expected.sources.some((s) => s.id === id)))
    return reject("CLEARANCE_UNEXPECTED_SOURCE");
  return {
    status: failures.length ? "fail" : unknown ? "unknown" : "sampled-pass",
    failures,
    productionEnabled: false,
    fullBodyAccepted: false,
  };
}
