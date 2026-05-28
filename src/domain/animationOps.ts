import type { Animation, Frame, Point } from './model'
import { uid } from './color'

export function addFrame(frames: Frame[], spriteId: string, position: Point = { x: 0, y: 0 }, duration = 100): Frame[] {
  return [...frames, { id: uid(), spriteId, position: { ...position }, duration }]
}

export function removeFrame(frames: Frame[], index: number): Frame[] {
  return frames.filter((_, i) => i !== index)
}

export function reorderFrame(frames: Frame[], fromIdx: number, toIdx: number): Frame[] {
  if (fromIdx === toIdx) return frames
  const result = [...frames]
  const [item] = result.splice(fromIdx, 1)
  result.splice(toIdx, 0, item)
  return result
}

export function updateFrameSprite(frames: Frame[], index: number, spriteId: string): Frame[] {
  return frames.map((f, i) => i === index ? { ...f, spriteId } : f)
}

export function updateFramePosition(frames: Frame[], index: number, position: Point): Frame[] {
  return frames.map((f, i) => i === index ? { ...f, position: { ...position } } : f)
}

export function updateFrameDuration(frames: Frame[], index: number, duration: number): Frame[] {
  return frames.map((f, i) => i === index ? { ...f, duration } : f)
}

export function duplicateFrame(frames: Frame[], index: number): Frame[] {
  const src = frames[index]
  if (!src) return frames
  const copy: Frame = { ...src, id: uid(), position: { ...src.position } }
  return [...frames.slice(0, index + 1), copy, ...frames.slice(index + 1)]
}

export function resizeStage(animation: Animation, width: number, height: number): Animation {
  return { ...animation, width, height }
}
