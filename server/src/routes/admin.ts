import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, signToken, verifyPassword } from '../auth.js'
import { loginSchema, menuItemInputSchema, menuItemUpdateSchema } from '../validation.js'
import { uploadPhoto } from '../upload.js'
import { publicOrigin } from '../publicUrl.js'
import { generateModelFromImageUrl, ModelGenerationError } from '../meshy.js'

export const adminRouter = Router()

adminRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password format' })
    return
  }

  const { email, password } = parsed.data
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    res.status(401).json({ error: 'Incorrect email or password' })
    return
  }

  res.json({ token: signToken(admin.id) })
})

adminRouter.use(requireAuth)

adminRouter.get('/menu', async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    omit: { photoData: true, modelData: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(items)
})

function parseItemFields(body: unknown) {
  if (typeof body !== 'object' || body === null || !('data' in body) || typeof (body as { data: unknown }).data !== 'string') {
    return { error: 'Missing "data" field with the item JSON' as const }
  }
  try {
    return { json: JSON.parse((body as { data: string }).data) as unknown }
  } catch {
    return { error: 'The "data" field is not valid JSON' as const }
  }
}

adminRouter.post('/menu', uploadPhoto.single('photo'), async (req, res) => {
  const parsedFields = parseItemFields(req.body)
  if ('error' in parsedFields) {
    res.status(400).json({ error: parsedFields.error })
    return
  }

  const parsed = menuItemInputSchema.safeParse(parsedFields.json)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  if (!req.file) {
    res.status(400).json({ error: 'A photo is required' })
    return
  }

  const existing = await prisma.menuItem.findUnique({ where: { id: parsed.data.id } })
  if (existing) {
    res.status(409).json({ error: `An item with id "${parsed.data.id}" already exists` })
    return
  }

  const item = await prisma.menuItem.create({
    data: {
      ...parsed.data,
      photoUrl: `${publicOrigin(req)}/api/menu/${parsed.data.id}/photo`,
      photoData: new Uint8Array(req.file.buffer),
      photoMimeType: req.file.mimetype,
    },
    omit: { photoData: true, modelData: true },
  })
  res.status(201).json(item)
})

adminRouter.put('/menu/:id', uploadPhoto.single('photo'), async (req, res) => {
  const parsedFields = parseItemFields(req.body)
  if ('error' in parsedFields) {
    res.status(400).json({ error: parsedFields.error })
    return
  }

  const parsed = menuItemUpdateSchema.safeParse(parsedFields.json)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  const id = req.params.id as string

  try {
    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(req.file && {
          photoUrl: `${publicOrigin(req)}/api/menu/${id}/photo`,
          photoData: new Uint8Array(req.file.buffer),
          photoMimeType: req.file.mimetype,
        }),
      },
      omit: { photoData: true, modelData: true },
    })
    res.json(item)
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})

adminRouter.delete('/menu/:id', async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id as string } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})

adminRouter.post('/menu/:id/generate-model', async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id as string } })
  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }

  try {
    const glb = await generateModelFromImageUrl(item.photoUrl)
    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        modelData: new Uint8Array(glb),
        modelUrl: `${publicOrigin(req)}/api/menu/${item.id}/model`,
      },
      omit: { photoData: true, modelData: true },
    })
    res.json(updated)
  } catch (err) {
    const message = err instanceof ModelGenerationError ? err.message : 'Model generation failed unexpectedly'
    res.status(502).json({ error: message })
  }
})
