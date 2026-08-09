import { setTimeout as sleep } from 'node:timers/promises'

const MESHY_API = 'https://api.meshy.ai/openapi/v1'
const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 60 // ~3 minutes total

export class ModelGenerationError extends Error {}

interface MeshyTask {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  model_urls?: { glb?: string }
}

function apiKey(): string {
  const key = process.env.MESHY_API_KEY
  if (!key) {
    throw new ModelGenerationError('MESHY_API_KEY is not configured on the server')
  }
  return key
}

export async function generateModelFromImageUrl(imageUrl: string): Promise<Buffer> {
  const key = apiKey()

  const createRes = await fetch(`${MESHY_API}/image-to-3d`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl, should_texture: true, target_formats: ['glb'] }),
  })

  if (!createRes.ok) {
    throw new ModelGenerationError(
      `Meshy rejected the generation request (${createRes.status}): ${await createRes.text()}`,
    )
  }

  const { result: taskId } = (await createRes.json()) as { result: string }

  let task: MeshyTask | undefined
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const pollRes = await fetch(`${MESHY_API}/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!pollRes.ok) {
      throw new ModelGenerationError(`Lost track of the generation task (${pollRes.status})`)
    }
    task = (await pollRes.json()) as MeshyTask

    if (task.status === 'SUCCEEDED') break
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new ModelGenerationError(`Model generation ${task.status.toLowerCase()}`)
    }
    await sleep(POLL_INTERVAL_MS)
  }

  const glbUrl = task?.status === 'SUCCEEDED' ? task.model_urls?.glb : undefined
  if (!glbUrl) {
    throw new ModelGenerationError('Model generation timed out or returned no model')
  }

  const fileRes = await fetch(glbUrl)
  if (!fileRes.ok) {
    throw new ModelGenerationError('Could not download the generated model file')
  }
  return Buffer.from(await fileRes.arrayBuffer())
}
