import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Sheet, SheetEntry, Rect, RgbColor } from '../domain/model'
import { uid } from '../domain/color'
import { useProjectStore } from './projectStore'

export type SheetTool = 'pickMatte' | 'drawRect' | 'growRect' | 'shrinkRect'

function generateThumbnail(sourceRef: string, rect: Rect): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 24
      canvas.height = 24
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      const scale = Math.min(24 / rect.w, 24 / rect.h)
      const dw = Math.round(rect.w * scale)
      const dh = Math.round(rect.h * scale)
      const dx = Math.floor((24 - dw) / 2)
      const dy = Math.floor((24 - dh) / 2)
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, dx, dy, dw, dh)
      resolve(canvas.toDataURL())
    }
    img.src = sourceRef
  })
}

export const useSheetStore = defineStore('sheet', () => {
  const projectStore = useProjectStore()

  const activeSheetId = ref<string | null>(null)
  const activeEntryName = ref<string | null>(null)
  const inProgressRect = ref<Rect | null>(null)
  const activeTool = ref<SheetTool>('drawRect')
  const previousTool = ref<SheetTool>('drawRect')
  const checkedEntryNames = ref<string[]>([])

  // Per-sheet creation counter — only ever incremented, never reset on delete
  const entryCreationCount = new Map<string, number>()

  function getSheet(id: string): Sheet | undefined {
    return projectStore.project?.sheets.find(s => s.id === id)
  }

  // ─── Sheet CRUD ───────────────────────────────────────────────────────────

  function addSheet(name: string): Sheet | null {
    if (!projectStore.project) return null
    const sheet: Sheet = { id: uid(), name, sourceRef: '', entries: [], matteColor: null }
    projectStore.project.sheets.push(sheet)
    activeSheetId.value = sheet.id
    projectStore.markDirty()
    return sheet
  }

  function renameSheet(id: string, name: string): void {
    const sheet = getSheet(id)
    if (!sheet) return
    sheet.name = name
    projectStore.markDirty()
  }

  function deleteSheet(id: string): void {
    if (!projectStore.project) return
    projectStore.project.sheets = projectStore.project.sheets.filter(s => s.id !== id)
    if (activeSheetId.value === id) {
      activeSheetId.value = projectStore.project.sheets[0]?.id ?? null
      activeEntryName.value = null
    }
    projectStore.markDirty()
  }

  // ─── SheetEntry CRUD ──────────────────────────────────────────────────────

  function nextEntryName(sheetId: string): string {
    const n = (entryCreationCount.get(sheetId) ?? 0) + 1
    entryCreationCount.set(sheetId, n)
    return `entry_${String(n).padStart(2, '0')}`
  }

  function addEntry(sheetId: string, rect: Rect): SheetEntry | null {
    const sheet = getSheet(sheetId)
    if (!sheet) return null
    const entry: SheetEntry = { name: nextEntryName(sheetId), rect }
    sheet.entries.push(entry)
    projectStore.markDirty()
    return entry
  }

  function updateEntryRect(sheetId: string, entryName: string, rect: Rect): void {
    const entry = getSheet(sheetId)?.entries.find(e => e.name === entryName)
    if (!entry) return
    entry.rect = rect
    projectStore.markDirty()
  }

  function renameEntry(sheetId: string, oldName: string, newName: string): void {
    const sheet = getSheet(sheetId)
    if (!sheet) return
    const entry = sheet.entries.find(e => e.name === oldName)
    if (!entry) return
    entry.name = newName
    if (activeEntryName.value === oldName) activeEntryName.value = newName
    const idx = checkedEntryNames.value.indexOf(oldName)
    if (idx >= 0) checkedEntryNames.value[idx] = newName
    projectStore.markDirty()
  }

  function deleteEntry(sheetId: string, entryName: string): void {
    const sheet = getSheet(sheetId)
    if (!sheet) return
    sheet.entries = sheet.entries.filter(e => e.name !== entryName)
    if (activeEntryName.value === entryName) activeEntryName.value = null
    const idx = checkedEntryNames.value.indexOf(entryName)
    if (idx >= 0) checkedEntryNames.value.splice(idx, 1)
    projectStore.markDirty()
  }

  function reorderEntry(sheetId: string, fromIdx: number, toIdx: number): void {
    const sheet = getSheet(sheetId)
    if (!sheet) return
    const { entries } = sheet
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= entries.length || toIdx >= entries.length) return
    const [item] = entries.splice(fromIdx, 1)
    entries.splice(toIdx, 0, item)
    projectStore.markDirty()
  }

  // ─── Entry selection ──────────────────────────────────────────────────────

  // Sets both activeEntryName and inProgressRect to reflect the selected entry.
  // Bypasses setInProgressRect intentionally to avoid clearing activeEntryName.
  function selectEntry(sheetId: string, entryName: string): void {
    const entry = getSheet(sheetId)?.entries.find(e => e.name === entryName)
    if (!entry) return
    activeEntryName.value = entryName
    inProgressRect.value = { ...entry.rect }
  }

  // ─── Matte and tool state ─────────────────────────────────────────────────

  function setMatteColor(sheetId: string, color: RgbColor | null): void {
    const sheet = getSheet(sheetId)
    if (!sheet) return
    sheet.matteColor = color
    if (activeTool.value === 'pickMatte') {
      activeTool.value = previousTool.value
    }
    projectStore.markDirty()
  }

  function setActiveTool(tool: SheetTool): void {
    if (tool === 'pickMatte') previousTool.value = activeTool.value
    activeTool.value = tool
  }

  // clearActiveEntry: pass true when starting a fresh draw so any selected entry is deselected.
  // Passing null always clears activeEntryName (Cancel).
  function setInProgressRect(rect: Rect | null, clearActiveEntry = false): void {
    inProgressRect.value = rect
    if (rect === null || clearActiveEntry) activeEntryName.value = null
  }

  function patchInProgressRect(patch: Partial<Rect>): void {
    if (!inProgressRect.value) return
    inProgressRect.value = { ...inProgressRect.value, ...patch }
  }

  function acceptInProgressRect(): void {
    if (!inProgressRect.value || !activeSheetId.value) return
    const rect = { ...inProgressRect.value }
    const sheetId = activeSheetId.value
    const sheet = getSheet(sheetId)

    if (activeEntryName.value) {
      // Update existing selected entry
      const entryName = activeEntryName.value
      updateEntryRect(sheetId, entryName, rect)
      if (sheet?.sourceRef) {
        generateThumbnail(sheet.sourceRef, rect).then(thumb => {
          const entry = getSheet(sheetId)?.entries.find(e => e.name === entryName)
          if (entry) entry.thumbnail = thumb
        })
      }
    } else {
      // Create new entry
      const entry = addEntry(sheetId, rect)
      if (entry && sheet?.sourceRef) {
        const entryName = entry.name
        generateThumbnail(sheet.sourceRef, rect).then(thumb => {
          // Re-fetch through the reactive path so Vue tracks the property write
          const reactiveEntry = getSheet(sheetId)?.entries.find(e => e.name === entryName)
          if (reactiveEntry) reactiveEntry.thumbnail = thumb
        })
      }
    }

    inProgressRect.value = null
    activeEntryName.value = null
  }

  function clearCheckedEntries(): void {
    checkedEntryNames.value = []
  }

  return {
    activeSheetId, activeEntryName, inProgressRect, activeTool, previousTool, checkedEntryNames,
    addSheet, renameSheet, deleteSheet,
    addEntry, updateEntryRect, renameEntry, deleteEntry, reorderEntry,
    selectEntry,
    setMatteColor, setActiveTool, setInProgressRect, patchInProgressRect, acceptInProgressRect, clearCheckedEntries,
  }
})
