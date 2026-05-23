import type { PixelDiff } from '../../domain/history'

// 4-connected flood fill. Modifies data in place and returns the list of changed pixels.
// Returns an empty array if targetIdx === fillIdx (no-op).
export function floodFill(
  data: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetIdx: number,
  fillIdx: number,
): PixelDiff[] {
  if (targetIdx === fillIdx) return []

  const diffs: PixelDiff[] = []
  const stack: number[] = [startY * width + startX]
  const visited = new Uint8Array(width * height)  // 0 = unvisited

  while (stack.length > 0) {
    const linear = stack.pop()!
    if (visited[linear]) continue
    visited[linear] = 1
    if (data[linear] !== targetIdx) continue

    const x = linear % width
    const y = (linear / width) | 0

    diffs.push({ x, y, oldIndex: targetIdx, newIndex: fillIdx })
    data[linear] = fillIdx

    if (x > 0)           stack.push(linear - 1)
    if (x < width - 1)   stack.push(linear + 1)
    if (y > 0)           stack.push(linear - width)
    if (y < height - 1)  stack.push(linear + width)
  }

  return diffs
}
