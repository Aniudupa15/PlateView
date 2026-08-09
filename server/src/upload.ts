import multer from 'multer'

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
      cb(new Error('Photo must be a JPEG, PNG, or WebP image'))
      return
    }
    cb(null, true)
  },
})
