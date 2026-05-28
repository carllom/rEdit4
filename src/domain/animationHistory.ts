import type { Frame, Point } from './model'

export type AnimationCommand =
  | { type: 'add-frame'; frame: Frame; insertIndex: number }
  | { type: 'remove-frame'; frame: Frame; removedIndex: number }
  | { type: 'reorder-frame'; fromIdx: number; toIdx: number }
  | { type: 'move-frame'; frameIndex: number; oldPosition: Point; newPosition: Point }
  | { type: 'duration-change'; frameIndex: number; oldDuration: number; newDuration: number }
  | { type: 'duplicate-frame'; originalIndex: number; newFrame: Frame; insertIndex: number }
  | { type: 'stage-resize'; oldWidth: number; oldHeight: number; newWidth: number; newHeight: number }
  | { type: 'rename-animation'; oldName: string; newName: string }

const MAX_HISTORY = 100

type PendingDrag = { frameIndex: number; initialPosition: Point }

export class AnimationHistoryManager {
  private past: AnimationCommand[] = []
  private future: AnimationCommand[] = []
  private pending: PendingDrag | null = null

  beginFrameDrag(frameIndex: number, initialPosition: Point): void {
    this.pending = { frameIndex, initialPosition: { ...initialPosition } }
  }

  // Commits a pending drag. Returns the committed command, or null if nothing moved.
  commitDrag(finalPosition: Point): AnimationCommand | null {
    const p = this.pending
    this.pending = null
    if (!p) return null
    if (p.initialPosition.x === finalPosition.x && p.initialPosition.y === finalPosition.y) return null
    return this._push({
      type: 'move-frame',
      frameIndex: p.frameIndex,
      oldPosition: p.initialPosition,
      newPosition: { ...finalPosition },
    })
  }

  push(command: AnimationCommand): AnimationCommand {
    return this._push(command)
  }

  private _push(command: AnimationCommand): AnimationCommand {
    this.past.push(command)
    if (this.past.length > MAX_HISTORY) this.past.shift()
    this.future = []
    return command
  }

  undo(): AnimationCommand | null {
    const cmd = this.past.pop() ?? null
    if (cmd) this.future.push(cmd)
    return cmd
  }

  redo(): AnimationCommand | null {
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
