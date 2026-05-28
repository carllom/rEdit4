import type { Animation, Sprite, ReImage, Palette } from '../domain/model'
import { compositeImage } from '../domain/color'

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function exportPNGSequence(
  animation: Animation,
  spriteMap: Map<string, Sprite>,
  imgMap: Map<string, ReImage>,
  palMap: Map<string, Palette>,
): Promise<void> {
  const { frames, width, height, name } = animation
  if (frames.length === 0) return

  const safeName = sanitizeName(name)
  const padWidth = Math.max(2, String(frames.length - 1).length)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    ctx.clearRect(0, 0, width, height)

    const sprite = spriteMap.get(frame.spriteId)
    if (sprite && sprite.parts.length > 0) {
      // Cache composited part canvases for this frame (parts may share an imageId)
      const partCache = new Map<string, HTMLCanvasElement>()

      for (const part of sprite.parts) {
        if (!partCache.has(part.imageId)) {
          const img = imgMap.get(part.imageId)
          if (!img) continue
          const pal = palMap.get(img.paletteId)
          if (!pal) continue
          const rgba = compositeImage(img, pal)
          const offscreen = document.createElement('canvas')
          offscreen.width = img.width
          offscreen.height = img.height
          offscreen.getContext('2d')!.putImageData(
            new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0,
          )
          partCache.set(part.imageId, offscreen)
        }

        const offscreen = partCache.get(part.imageId)
        const img = imgMap.get(part.imageId)
        if (!offscreen || !img) continue

        // Same position formula as AnimationStageCanvas at zoom=1, pan=(0,0)
        const px = frame.position.x - sprite.anchor.x + part.position.x
        const py = frame.position.y - sprite.anchor.y + part.position.y
        ctx.drawImage(offscreen, 0, 0, img.width, img.height, px, py, img.width, img.height)
      }
    }

    const blob = await canvasToBlob(canvas)
    const idx = String(i).padStart(padWidth, '0')
    triggerDownload(blob, `${safeName}_${idx}.png`)

    if (i < frames.length - 1) {
      await delay(150)
    }
  }
}
