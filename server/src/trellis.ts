import { Client, handle_file } from '@gradio/client'
import { getHfTokens } from './hfTokens.js'

// trellis-community/TRELLIS -- Microsoft's TRELLIS (CVPR'25), free on Hugging
// Face's ZeroGPU quota. Meaningfully better output than TripoSR (proper quad
// mesh, PBR materials, real multi-image conditioning), but costs ~120s of
// GPU time per generation against a shared account-wide daily quota of only
// ~3.5-5 minutes -- roughly 1-2 generations/day on the free tier. Meant as
// an occasional "best quality" option, not the everyday default (see hf.ts
// for that).
//
// Unlike TripoSR, TRELLIS's pipeline is session-stateful (start_session ties
// server-side working state to the connection's session_hash), so the SAME
// Client must be reused across every call in a single generation -- the
// opposite of the fresh-client-per-call fix TripoSR needed.
const SPACE = 'trellis-community/TRELLIS'
const GENERATION_TIMEOUT_MS = 4 * 60 * 1000

const SEED = 0
const SS_GUIDANCE_STRENGTH = 7.5
const SS_SAMPLING_STEPS = 12
const SLAT_GUIDANCE_STRENGTH = 3
const SLAT_SAMPLING_STEPS = 12
const MULTIIMAGE_ALGO = 'stochastic'
const MESH_SIMPLIFY = 0.95
const TEXTURE_SIZE = 1024

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

function extractFileUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  if (typeof v.url === 'string') return v.url
  if (typeof v.path === 'string' && /^https?:\/\//.test(v.path)) return v.path
  return undefined
}

/** Generates a model from one or more photos. Multiple photos (e.g. frames
 * extracted from a walk-around video) give TRELLIS real multi-angle
 * geometry instead of having to guess unseen surfaces.
 *
 * Rotates across every HF_TOKEN* configured on the server -- each Hugging
 * Face account has its own separate free ZeroGPU quota, so a quota error on
 * one account just moves on to the next rather than failing outright. */
export async function generateModelFromImages(images: Buffer[]): Promise<Buffer> {
  if (images.length === 0) {
    throw new ModelGenerationError('At least one image is required')
  }

  const tokens = getHfTokens()
  if (tokens.length === 0) {
    throw new ModelGenerationError('HF_TOKEN is not configured on the server')
  }

  let lastQuotaError: QuotaExceededError | null = null
  for (const token of tokens) {
    try {
      return await withTimeout(generate(images, token), GENERATION_TIMEOUT_MS, 'TRELLIS model generation')
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        lastQuotaError = err
        continue // this account's quota is spent -- try the next one
      }
      throw err
    }
  }

  throw new QuotaExceededError(
    tokens.length > 1
      ? `All ${tokens.length} configured Hugging Face accounts have used up their free daily TRELLIS quota for today. Use the standard option instead, or try again tomorrow.`
      : (lastQuotaError?.message ?? 'TRELLIS quota exhausted'),
  )
}

async function generate(images: Buffer[], token: string): Promise<Buffer> {
  let client: Client
  try {
    client = await Client.connect(SPACE, { token: token as `hf_${string}` })
  } catch (err) {
    throw new ModelGenerationError(`Could not connect to TRELLIS: ${errorMessage(err)}`)
  }

  await client.predict('/start_session', []).catch((err: unknown) => {
    throw new ModelGenerationError(`Could not start TRELLIS session: ${errorMessage(err)}`)
  })

  const isMulti = images.length > 1
  let imageInput: unknown = null
  let multiImagesInput: unknown[] = []

  if (isMulti) {
    const preprocessed = await client
      .predict('/preprocess_images', [images.map((img) => ({ image: handle_file(img) }))])
      .catch((err: unknown) => {
        throw new ModelGenerationError(`Preprocessing failed: ${errorMessage(err)}`)
      })
    multiImagesInput = (preprocessed.data as unknown[])[0] as unknown[]
  } else {
    const preprocessed = await client.predict('/preprocess_image', [handle_file(images[0])]).catch((err: unknown) => {
      throw new ModelGenerationError(`Preprocessing failed: ${errorMessage(err)}`)
    })
    imageInput = (preprocessed.data as unknown[])[0]
  }

  const generated = await client
    .predict('/generate_and_extract_glb', [
      imageInput,
      multiImagesInput,
      SEED,
      SS_GUIDANCE_STRENGTH,
      SS_SAMPLING_STEPS,
      SLAT_GUIDANCE_STRENGTH,
      SLAT_SAMPLING_STEPS,
      MULTIIMAGE_ALGO,
      MESH_SIMPLIFY,
      TEXTURE_SIZE,
    ])
    .catch((err: unknown) => {
      const message = errorMessage(err)
      if (/quota|zerogpu/i.test(message)) {
        throw new QuotaExceededError(
          "TRELLIS's free daily quota is used up for today (resets ~24h after first use). Use the standard option instead, or try TRELLIS again tomorrow.",
        )
      }
      throw new ModelGenerationError(`Generation failed: ${message}`)
    })

  const outputs = generated.data as unknown[]
  // outputs = [videoPreview, litmodel3d (GLB/Gaussian), downloadGlbButton]
  const glbUrl = extractFileUrl(outputs?.[2]) ?? extractFileUrl(outputs?.[1])
  if (!glbUrl) {
    throw new ModelGenerationError('Generation finished but returned no downloadable .glb file')
  }

  const fileRes = await fetch(glbUrl)
  if (!fileRes.ok) {
    throw new ModelGenerationError('Could not download the generated model file')
  }
  return Buffer.from(await fileRes.arrayBuffer())
}
