// Reads every HF_TOKEN / HF_TOKEN_2 / HF_TOKEN_3 ... env var into a pool.
// Multiple Hugging Face accounts each get their own separate free ZeroGPU
// quota (~3.5-5 min/day), so rotating across several accounts multiplies
// the effective daily budget for TRELLIS generations.
const TOKEN_KEY_PATTERN = /^HF_TOKEN(_\d+)?$/

export function getHfTokens(): string[] {
  return Object.keys(process.env)
    .filter((key) => TOKEN_KEY_PATTERN.test(key))
    .sort() // HF_TOKEN before HF_TOKEN_2 before HF_TOKEN_3, ...
    .map((key) => process.env[key])
    .filter((value): value is string => Boolean(value))
}
