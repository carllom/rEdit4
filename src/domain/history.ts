// Command-pattern undo/redo for pixel paint operations.
// Pixel data is stored as index diffs, not full layer snapshots.

export interface PixelDiff {
  x: number
  y: number
  oldIndex: number
  newIndex: number
}

export interface Command {
  imageId: string
  layerId: string
  pixels: PixelDiff[]
  label: string
}

const MAX_HISTORY = 100

export class HistoryManager {
  private past: Command[] = []
  private future: Command[] = []

  // Pending stroke accumulator — keyed by pixel index for O(1) dedup
  private pending = new Map<number, PixelDiff>()
  private pendingMeta: { imageId: string; layerId: string; label: string } | null = null

  // Call at the start of a draw gesture (mousedown / tool activate)
  beginStroke(imageId: string, layerId: string, label: string) {
    this.pending.clear()
    this.pendingMeta = { imageId, layerId, label }
  }

  // Call for each pixel touched during the stroke.
  // The first touch for a pixel records oldIndex; subsequent touches only update newIndex.
  recordPixel(linearIndex: number, x: number, y: number, oldIndex: number, newIndex: number) {
    const existing = this.pending.get(linearIndex)
    if (existing) {
      existing.newIndex = newIndex
    } else {
      this.pending.set(linearIndex, { x, y, oldIndex, newIndex })
    }
  }

  // Call on mouseup / stroke end. Returns the committed command, or null if nothing changed.
  commitStroke(): Command | null {
    if (!this.pendingMeta || this.pending.size === 0) {
      this.pendingMeta = null
      return null
    }
    // Filter out pixels where nothing actually changed
    const pixels = Array.from(this.pending.values()).filter(p => p.oldIndex !== p.newIndex)
    const meta = this.pendingMeta
    this.pending.clear()
    this.pendingMeta = null
    if (pixels.length === 0) return null

    const cmd: Command = { ...meta!, pixels }
    this.past.push(cmd)
    if (this.past.length > MAX_HISTORY) this.past.shift()
    this.future = []
    return cmd
  }

  undo(): Command | null {
    const cmd = this.past.pop() ?? null
    if (cmd) this.future.push(cmd)
    return cmd
  }

  redo(): Command | null {
    const cmd = this.future.pop() ?? null
    if (cmd) this.past.push(cmd)
    return cmd
  }

  get canUndo(): boolean { return this.past.length > 0 }
  get canRedo(): boolean { return this.future.length > 0 }

  reset() {
    this.past = []
    this.future = []
    this.pending.clear()
    this.pendingMeta = null
  }
}
