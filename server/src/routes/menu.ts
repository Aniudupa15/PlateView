import { Router } from 'express'
import { prisma } from '../db.js'

export const menuRouter = Router()

const PUBLIC_SELECT = {
  id: true,
  name: true,
  category: true,
  description: true,
  price: true,
  prepTimeMinutes: true,
  dietaryTags: true,
  allergens: true,
  spiceLevel: true,
  photoUrl: true,
  modelUrl: true,
} as const

menuRouter.get('/', async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { available: true },
    select: PUBLIC_SELECT,
    orderBy: { createdAt: 'asc' },
  })
  res.json(items.map((item) => ({ ...item, modelUrl: item.modelUrl ?? undefined })))
})

menuRouter.get('/:id/photo', async (req, res) => {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id as string },
    select: { photoData: true, photoMimeType: true },
  })

  if (!item?.photoData || !item.photoMimeType) {
    res.status(404).end()
    return
  }

  res.set('Content-Type', item.photoMimeType)
  res.set('Cache-Control', 'public, max-age=300')
  res.send(item.photoData)
})

menuRouter.get('/:id/model', async (req, res) => {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id as string },
    select: { modelData: true },
  })

  if (!item?.modelData) {
    res.status(404).end()
    return
  }

  res.set('Content-Type', 'model/gltf-binary')
  res.set('Cache-Control', 'public, max-age=300')
  res.send(item.modelData)
})
