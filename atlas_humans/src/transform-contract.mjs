import { Matrix4 } from "three";
const EPS = 1e-5;
export function rigidMatrix(values) {
  if (
    !Array.isArray(values) ||
    values.length !== 16 ||
    !values.every(Number.isFinite)
  )
    throw new TypeError("MATRIX_NONFINITE_OR_MISSING");
  if (values.slice(12, 15).some((v) => Math.abs(v) > 1e8))
    throw new RangeError("MATRIX_TRANSLATION_OUT_OF_RANGE");
  if (
    Math.abs(values[3]) +
      Math.abs(values[7]) +
      Math.abs(values[11]) +
      Math.abs(values[15] - 1) >
    EPS
  )
    throw new TypeError("MATRIX_NOT_AFFINE");
  const axes = [values.slice(0, 3), values.slice(4, 7), values.slice(8, 11)],
    dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  if (
    axes.some((a) => Math.abs(dot(a, a) - 1) > EPS) ||
    Math.abs(dot(axes[0], axes[1])) +
      Math.abs(dot(axes[0], axes[2])) +
      Math.abs(dot(axes[1], axes[2])) >
      EPS
  )
    throw new TypeError("MATRIX_NOT_RIGID");
  const matrix = new Matrix4().fromArray(values);
  if (Math.abs(matrix.determinant() - 1) > EPS)
    throw new TypeError("MATRIX_REFLECTED_OR_SINGULAR");
  return matrix;
}
export function transformPair({ localToWorld, worldToLocal } = {}) {
  const forward = rigidMatrix(localToWorld),
    inverse = rigidMatrix(worldToLocal),
    product = forward.clone().multiply(inverse).elements;
  if (product.some((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) > EPS))
    throw new TypeError("MATRIX_INVERSE_MISMATCH");
  return { forward, inverse };
}
export function stampedTransform(transform, frame) {
  if (
    !frame ||
    typeof frame.epoch !== "string" ||
    !frame.epoch ||
    !Number.isFinite(frame.time) ||
    frame.time < 0
  )
    throw new TypeError("FRAME_IDENTITY_REQUIRED");
  if (
    !transform ||
    transform.epoch !== frame.epoch ||
    !Number.isFinite(transform.time) ||
    Math.abs(transform.time - frame.time) > 1e-6
  )
    throw new TypeError("STALE_TRANSFORM");
  return transformPair(transform);
}
