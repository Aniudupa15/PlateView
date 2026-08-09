import { setTimeout as sleep } from 'node:timers/promises'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import obj2gltf from 'obj2gltf'

// camenduru/tripo-sr — open-source (MIT) single-image 3D reconstruction,
// hosted on Replicate. https://replicate.com/camenduru/tripo-sr
const MODEL_VERSION = 'e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a'
const REPLICATE_API = 'https://api.replicate.com/v1'
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90 // ~3 minutes total

export class ModelGenerationError extends Error {}

interface Prediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output: string | string[] | null
  error: string | null
}

function apiToken(): string {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    throw new ModelGenerationError('REPLICATE_API_TOKEN is not configured on the server')
  }
  return token
}

export async function generateModelFromImageUrl(imageUrl: string): Promise<Buffer> {
  const token = apiToken()

  const createRes = await fetch(`${REPLICATE_API}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: { image_path: imageUrl, do_remove_background: true },
    }),
  })

  if (!createRes.ok) {
    throw new ModelGenerationError(
      `Replicate rejected the generation request (${createRes.status}): ${await createRes.text()}`,
    )
  }

  let prediction = (await createRes.json()) as Prediction

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (prediction.status === 'succeeded') break
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new ModelGenerationError(`Model generation ${prediction.status}: ${prediction.error ?? 'unknown error'}`)
    }

    await sleep(POLL_INTERVAL_MS)
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!pollRes.ok) {
      throw new ModelGenerationError(`Lost track of the generation job (${pollRes.status})`)
    }
    prediction = (await pollRes.json()) as Prediction
  }

  if (prediction.status !== 'succeeded') {
    throw new ModelGenerationError('Model generation timed out after 3 minutes')
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  if (typeof outputUrl !== 'string') {
    throw new ModelGenerationError('Replicate returned no output file')
  }

  const fileRes = await fetch(outputUrl)
  if (!fileRes.ok) {
    throw new ModelGenerationError('Could not download the generated model file')
  }
  const fileBuffer = Buffer.from(await fileRes.arrayBuffer())

  return isGlb(fileBuffer) ? fileBuffer : convertObjToGlb(fileBuffer)
}

function isGlb(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'glTF'
}

async function convertObjToGlb(objBuffer: Buffer): Promise<Buffer> {
  const tempPath = path.join(tmpdir(), `plateview-${Date.now()}-${Math.random().toString(36).slice(2)}.obj`)
  try {
    await writeFile(tempPath, objBuffer)
    return await obj2gltf(tempPath, { binary: true })
  } catch {
    throw new ModelGenerationError('The generated model could not be converted to glTF')
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}
