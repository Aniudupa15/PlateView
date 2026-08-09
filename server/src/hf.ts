import { Client, handle_file } from '@gradio/client'
import { getHfTokens } from './hfTokens.js'

// stabilityai/TripoSR — Stability AI's official public Space running the
// open-source (MIT) TripoSR model on Hugging Face's free "ZeroGPU" quota.
// Not an official product/SLA, so this can be slower or occasionally
// unavailable compared to a paid API.
//
// Runs the Space's own two-step pipeline: /preprocess (background removal)
// then /generate. Two real bugs found here, both confirmed by direct
// inspection of the resulting glb's vertex color data, not guesswork:
//  1. Reusing the same Client/session across /preprocess and /generate made
//     /generate hang with zero events, ever. A fresh Client.connect() per
//     call fixes it.
//  2. Passing the *URL* of our own served photo into /preprocess (instead of
//     the raw image bytes) consistently produced a mesh where ~85% of
//     vertices were near-black -- a different, worse mesh topology than
//     passing the same photo as raw bytes. Passing a Buffer directly (which
//     we already have from the DB, no extra fetch needed) fixes it.
const SPACE = 'stabilityai/TripoSR'
const FOREGROUND_RATIO = 0.85
const MC_RESOLUTION = 256
const GENERATION_TIMEOUT_MS = 3 * 60 * 1000

export class ModelGenerationError extends Error {}
export class QuotaExceededError extends ModelGenerationError {}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ModelGenerationError(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function connect(token: string): Promise<Client> {
  try {
    return await Client.connect(SPACE, { token: token as `hf_${string}` })
  } catch (err) {
    throw new ModelGenerationError(`Could not connect to the 3D generation service: ${errorMessage(err)}`)
  }
}

function extractFileUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  if (typeof v.url === 'string') return v.url
  if (typeof v.path === 'string' && /^https?:\/\//.test(v.path)) return v.path
  if (typeof v.data === 'string' && /^https?:\/\//.test(v.data)) return v.data
  return undefined
}

/** Rotates across every HF_TOKEN* configured on the server, same as
 * trellis.ts -- TripoSR rarely hits its (much cheaper) ZeroGPU quota, but
 * this keeps behavior consistent if it ever does. */
export async function generateModelFromImageBuffer(photo: Buffer): Promise<Buffer> {
  const tokens = getHfTokens()
  if (tokens.length === 0) {
    throw new ModelGenerationError('HF_TOKEN is not configured on the server')
  }

  for (const token of tokens) {
    try {
      return await withTimeout(generate(photo, token), GENERATION_TIMEOUT_MS, 'Model generation')
    } catch (err) {
      if (err instanceof QuotaExceededError) continue
      throw err
    }
  }

  throw new QuotaExceededError(
    tokens.length > 1
      ? `All ${tokens.length} configured Hugging Face accounts have used up their free daily quota for today. Try again tomorrow.`
      : 'Free daily quota is used up for today. Try again tomorrow.',
  )
}

async function generate(photo: Buffer, token: string): Promise<Buffer> {
  const preprocessClient = await connect(token)
  const preprocessed = await preprocessClient.predict('/preprocess', [handle_file(photo), true, FOREGROUND_RATIO]).catch(
    (err: unknown) => {
      const message = errorMessage(err)
      if (/quota|zerogpu/i.test(message)) throw new QuotaExceededError(message)
      throw new ModelGenerationError(`Preprocessing step failed: ${message}`)
    },
  )

  const processedImageUrl = extractFileUrl((preprocessed.data as unknown[])?.[0])
  if (!processedImageUrl) {
    throw new ModelGenerationError('Preprocessing step returned no image')
  }

  // A fresh client is required here -- see the module comment above.
  const generateClient = await connect(token)
  const generated = await generateClient.predict('/generate', [handle_file(processedImageUrl), MC_RESOLUTION]).catch(
    (err: unknown) => {
      const message = errorMessage(err)
      if (/quota|zerogpu/i.test(message)) throw new QuotaExceededError(message)
      throw new ModelGenerationError(`Generation step failed: ${message}`)
    },
  )

  const outputs = generated.data as unknown[]
  // outputs = [objModel, glbModel]
  const glbUrl = extractFileUrl(outputs?.[1])
  if (!glbUrl) {
    throw new ModelGenerationError('Generation finished but returned no downloadable .glb file')
  }

  const fileRes = await fetch(glbUrl)
  if (!fileRes.ok) {
    throw new ModelGenerationError('Could not download the generated model file')
  }
  return Buffer.from(await fileRes.arrayBuffer())
}
