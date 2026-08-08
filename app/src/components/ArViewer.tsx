interface ArViewerProps {
  modelUrl: string
  posterUrl: string
  alt: string
}

export function ArViewer({ modelUrl, posterUrl, alt }: ArViewerProps) {
  return (
    <div className="ar-viewer">
      <model-viewer
        src={modelUrl}
        poster={posterUrl}
        alt={alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        reveal="auto"
        loading="eager"
        className="ar-viewer-canvas"
      >
        <button slot="ar-button" className="ar-launch-button" type="button">
          View on your table (AR)
        </button>
      </model-viewer>
      <p className="ar-viewer-hint">Drag to rotate &middot; pinch to zoom &middot; true-to-scale plating</p>
    </div>
  )
}
