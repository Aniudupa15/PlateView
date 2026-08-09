import { Client, handle_file } from '@gradio/client'

// stabilityai/TripoSR — Stability AI's official public Space running the
// open-source (MIT) TripoSR model on Hugging Face's free "ZeroGPU" quota.
// Not an official product/SLA, so this can be slower or occasionally
// unavailable compared to a paid API.
const SPACE = 'stabilityai/TripoSR'
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
  const token = apiToken()

  let client: Client
  try {
    client = await Client.connect(SPACE, { token: token as `hf_${string}` })
  } catch (err) {
    throw new ModelGenerationError(
      `Could not connect to the 3D generation service: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const preprocessed = await client
    .predict('/preprocess', [handle_file(imageUrl), true, 0.85])
    .catch((err: unknown) => {
      throw new ModelGenerationError(`Preprocessing step failed: ${err instanceof Error ? err.message : String(err)}`)
    })

  const processedImage = preprocessed.data && (preprocessed.data as unknown[])[0]
  if (!processedImage) {
    throw new ModelGenerationError('Preprocessing step returned no image')
  }

  const generated = await client.predict('/generate', [processedImage, 256]).catch((err: unknown) => {
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
