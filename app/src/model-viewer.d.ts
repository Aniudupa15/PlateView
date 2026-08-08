import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string
  alt?: string
  poster?: string
  ar?: boolean
  'ar-modes'?: string
  'ar-scale'?: string
  'camera-controls'?: boolean
  'auto-rotate'?: boolean
  'shadow-intensity'?: string
  'interaction-prompt'?: string
  reveal?: string
  loading?: 'auto' | 'lazy' | 'eager'
  exposure?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}

export {}
