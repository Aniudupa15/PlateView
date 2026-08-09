import type { Request } from 'express'

export function publicOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host')}`
}
