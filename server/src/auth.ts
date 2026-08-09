import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET: string = process.env.JWT_SECRET

const TOKEN_TTL = '12h'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signToken(adminId: string) {
  return jwt.sign({ sub: adminId }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export interface AuthedRequest extends Request {
  adminId?: string
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    req.adminId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
