import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, signToken, verifyPassword } from '../auth.js'
import { loginSchema, menuItemInputSchema, menuItemUpdateSchema } from '../validation.js'

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
  const items = await prisma.menuItem.findMany({ orderBy: { createdAt: 'asc' } })
  res.json(items)
})

adminRouter.post('/menu', async (req, res) => {
  const parsed = menuItemInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  const existing = await prisma.menuItem.findUnique({ where: { id: parsed.data.id } })
  if (existing) {
    res.status(409).json({ error: `An item with id "${parsed.data.id}" already exists` })
    return
  }

  const item = await prisma.menuItem.create({
    data: { ...parsed.data, modelUrl: parsed.data.modelUrl || null },
  })
  res.status(201).json(item)
})

adminRouter.put('/menu/:id', async (req, res) => {
  const parsed = menuItemUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }

  try {
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { ...parsed.data, modelUrl: parsed.data.modelUrl === '' ? null : parsed.data.modelUrl },
    })
    res.json(item)
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})

adminRouter.delete('/menu/:id', async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})
