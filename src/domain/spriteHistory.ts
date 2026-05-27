import type { Part, Point } from './model'

export type SpriteCommand =
  | { type: 'move-part'; partIndex: number; oldPosition: Point; newPosition: Point }
  | { type: 'add-part'; part: Part; insertIndex: number }
  | { type: 'remove-part'; part: Part; removedIndex: number }
  | { type: 'reorder-part'; fromIdx: number; toIdx: number }
  | { type: 'move-anchor'; oldAnchor: Point; newAnchor: Point }
  | { type: 'rename-part'; partIndex: number; oldName: string | undefined; newName: string | undefined }
  | { type: 'rename-sprite'; oldName: string; newName: string }

const MAX_HISTORY = 100

type PendingDrag =
  | { type: 'move-part'; partIndex: number; initialPosition: Point }
  | { type: 'move-anchor'; initialAnchor: Point }

export class SpriteHistoryManager {
  private past: SpriteCommand[] = []
  private future: SpriteCommand[] = []
  private pending: PendingDrag | null = null

  beginPartDrag(partIndex: number, initialPosition: Point): void {
    this.pending = { type: 'move-part', partIndex, initialPosition: { ...initialPosition } }
  }

  beginAnchorDrag(initialAnchor: Point): void {
    this.pending = { type: 'move-anchor', initialAnchor: { ...initialAnchor } }
  }

  // Commits a pending drag. Returns the committed command, or null if nothing moved.
  commitDrag(finalValue: Point): SpriteCommand | null {
    const p = this.pending
    this.pending = null
    if (!p) return null

    if (p.type === 'move-part') {
      if (p.initialPosition.x === finalValue.x && p.initialPosition.y === finalValue.y) return null
      return this._push({ type: 'move-part', partIndex: p.partIndex, oldPosition: p.initialPosition, newPosition: { ...finalValue } })
    } else {
      if (p.initialAnchor.x === finalValue.x && p.initialAnchor.y === finalValue.y) return null
      return this._push({ type: 'move-anchor', oldAnchor: p.initialAnchor, newAnchor: { ...finalValue } })
    }
  }

  push(command: SpriteCommand): SpriteCommand {
    return this._push(command)
  }

  private _push(command: SpriteCommand): SpriteCommand {
    this.past.push(command)
    if (this.past.length > MAX_HISTORY) this.past.shift()
    this.future = []
    return command
  }

  undo(): SpriteCommand | null {
    const cmd = this.past.pop() ?? null
    if (cmd) this.future.push(cmd)
    return cmd
  }

  redo(): SpriteCommand | null {
    const cmd = this.future.pop() ?? null
    if (cmd) this.past.push(cmd)
    return cmd
  }

  get canUndo(): boolean { return this.past.length > 0 }
  get canRedo(): boolean { return this.future.length > 0 }

  reset(): void {
    this.past = []
    this.future = []
    this.pending = null
  }
}
