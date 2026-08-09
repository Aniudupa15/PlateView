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
