// Dependency substitution is deliberately explicit, restricted to test invocations.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'ws' && process.env.ATLAS_DIAGNOSTIC_BUNDLE) {
    return { url: new URL('./diagnostic-transport.mjs', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
