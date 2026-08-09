import { Client, handle_file } from '@gradio/client'

// stabilityai/TripoSR — Stability AI's official public Space running the
// open-source (MIT) TripoSR model on Hugging Face's free "ZeroGPU" quota.
// Not an official product/SLA, so this can be slower or occasionally
// unavailable compared to a paid API.
//
// Runs the Space's own two-step pipeline: /preprocess (background removal)
// then /generate. The real bug when this was first wired up wasn't the file
// reference at all -- it was reusing the same Client/session across both
// calls, which made /generate hang with zero events, ever. A fresh
// Client.connect() for the /generate call fixes it; both steps together
// take ~10-15s, same as the Space's own web UI.
const SPACE = 'stabilityai/TripoSR'
const FOREGROUND_RATIO = 0.85
const MC_RESOLUTION = 256
const GENERATION_TIMEOUT_MS = 3 * 60 * 1000

export class ModelGenerationError extends Error {}

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

function apiToken(): string {
  const token = process.env.HF_TOKEN
  if (!token) {
    throw new ModelGenerationError('HF_TOKEN is not configured on the server')
  }
  return token
}

async function connect(): Promise<Client> {
  const token = apiToken()
  try {
    return await Client.connect(SPACE, { token: token as `hf_${string}` })
  } catch (err) {
    throw new ModelGenerationError(
      `Could not connect to the 3D generation service: ${err instanceof Error ? err.message : String(err)}`,
    )
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

export function generateModelFromImageUrl(imageUrl: string): Promise<Buffer> {
  return withTimeout(generate(imageUrl), GENERATION_TIMEOUT_MS, 'Model generation')
}

async function generate(imageUrl: string): Promise<Buffer> {
  const preprocessClient = await connect()
  const preprocessed = await preprocessClient
    .predict('/preprocess', [handle_file(imageUrl), true, FOREGROUND_RATIO])
    .catch((err: unknown) => {
      throw new ModelGenerationError(`Preprocessing step failed: ${err instanceof Error ? err.message : String(err)}`)
    })

  const processedImageUrl = extractFileUrl((preprocessed.data as unknown[])?.[0])
  if (!processedImageUrl) {
    throw new ModelGenerationError('Preprocessing step returned no image')
  }

  // A fresh client is required here -- see the module comment above.
  const generateClient = await connect()
  const generated = await generateClient
    .predict('/generate', [handle_file(processedImageUrl), MC_RESOLUTION])
    .catch((err: unknown) => {
      throw new ModelGenerationError(`Generation step failed: ${err instanceof Error ? err.message : String(err)}`)
    })

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
