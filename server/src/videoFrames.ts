import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

// ffmpeg-static ships a CJS `module.exports = string` at runtime but an
// ESM-shaped `export default` .d.ts, which NodeNext module resolution
// mistypes as the whole module namespace. createRequire sidesteps the
// mismatched types entirely.
const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static') as string | null

const FRAME_COUNT = 6
const MAX_DURATION_SECONDS = 90

export class VideoProcessingError extends Error {}

function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new VideoProcessingError('ffmpeg binary is not available on this server'))
      return
    }
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', (err) => reject(new VideoProcessingError(`Could not run ffmpeg: ${err.message}`)))
    proc.on('close', (code) => {
      if (code === 0) resolve(stderr)
      else reject(new VideoProcessingError(`ffmpeg exited with code ${code}`))
    })
  })
}

async function getDurationSeconds(videoPath: string): Promise<number> {
  // ffmpeg-static doesn't bundle ffprobe, so read the duration from ffmpeg's
  // own stderr banner (it always prints this before erroring out with no
  // output specified).
  let stderr = ''
  try {
    stderr = await runFfmpeg(['-i', videoPath])
  } catch (err) {
    if (err instanceof VideoProcessingError && err.message.startsWith('ffmpeg exited')) {
      // Expected -- ffmpeg errors when given no output, but still logs duration first.
    } else {
      throw err
    }
  }
  const match = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr)
  if (!match) {
    throw new VideoProcessingError('Could not read video duration')
  }
  const [, hours, minutes, seconds] = match
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
}

/** Extracts a handful of evenly-spaced frames from a video, for feeding a
 * multi-image 3D reconstruction model instead of a single flat photo. */
export async function extractFrames(video: Buffer): Promise<Buffer[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'plateview-frames-'))
  const videoPath = path.join(dir, 'input.mp4')

  try {
    await writeFile(videoPath, video)

    let duration: number
    try {
      duration = await getDurationSeconds(videoPath)
    } catch {
      duration = 10 // reasonable fallback if duration parsing fails
    }
    if (duration > MAX_DURATION_SECONDS) {
      throw new VideoProcessingError(`Video is too long (max ${MAX_DURATION_SECONDS}s)`)
    }

    // Sample a bit faster than the exact target rate -- fps-filter output
    // timestamps don't always land neatly within the source's duration, so
    // asking for exactly count/duration tends to undershoot by 1-2 frames.
    // -vframes below still hard-caps the actual output at FRAME_COUNT.
    const fps = (FRAME_COUNT + 2) / Math.max(duration, 0.5)
    const outputPattern = path.join(dir, 'frame-%03d.jpg')
    await runFfmpeg(['-i', videoPath, '-vf', `fps=${fps}`, '-vframes', String(FRAME_COUNT), '-q:v', '3', outputPattern])

    const files = (await readdir(dir)).filter((f) => f.startsWith('frame-')).sort()
    if (files.length === 0) {
      throw new VideoProcessingError('No frames could be extracted from this video')
    }
    return await Promise.all(files.map((f) => readFile(path.join(dir, f))))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
