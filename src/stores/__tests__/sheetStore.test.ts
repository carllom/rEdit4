import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../projectStore'
import { useSheetStore } from '../sheetStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

function setup() {
  const projectStore = useProjectStore()
  projectStore.newProject()
  return { projectStore, sheetStore: useSheetStore() }
}

// ─── initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('activeSheetId is null', () => {
    expect(useSheetStore().activeSheetId).toBeNull()
  })

  it('activeEntryName is null', () => {
    expect(useSheetStore().activeEntryName).toBeNull()
  })

  it('inProgressRect is null', () => {
    expect(useSheetStore().inProgressRect).toBeNull()
  })

  it('activeTool defaults to drawRect', () => {
    expect(useSheetStore().activeTool).toBe('drawRect')
  })

  it('checkedEntryNames is empty', () => {
    expect(useSheetStore().checkedEntryNames).toHaveLength(0)
  })
})

// ─── addSheet ─────────────────────────────────────────────────────────────────

describe('addSheet', () => {
  it('returns null when no project is open', () => {
    expect(useSheetStore().addSheet('S')).toBeNull()
  })

  it('adds a Sheet to the project with the given name', () => {
    const { projectStore, sheetStore } = setup()
    sheetStore.addSheet('My Sheet')
    expect(projectStore.project?.sheets).toHaveLength(1)
    expect(projectStore.project?.sheets[0].name).toBe('My Sheet')
  })

  it('sets activeSheetId to the new sheet', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    expect(sheetStore.activeSheetId).toBe(sheet.id)
  })

  it('new sheet starts with empty entries and null matteColor', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    expect(sheet.entries).toHaveLength(0)
    expect(sheet.matteColor).toBeNull()
  })
})

// ─── renameSheet ──────────────────────────────────────────────────────────────

describe('renameSheet', () => {
  it('updates the sheet name', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('Old')!
    sheetStore.renameSheet(sheet.id, 'New')
    expect(sheet.name).toBe('New')
  })

  it('does nothing for an unknown id', () => {
    const { sheetStore } = setup()
    expect(() => sheetStore.renameSheet('nonexistent', 'X')).not.toThrow()
  })
})

// ─── deleteSheet ──────────────────────────────────────────────────────────────

describe('deleteSheet', () => {
  it('removes the sheet from the project', () => {
    const { projectStore, sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.deleteSheet(sheet.id)
    expect(projectStore.project?.sheets).toHaveLength(0)
  })

  it('clears activeSheetId when the active sheet is deleted', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.deleteSheet(sheet.id)
    expect(sheetStore.activeSheetId).toBeNull()
  })

  it('leaves other sheets intact', () => {
    const { projectStore, sheetStore } = setup()
    const a = sheetStore.addSheet('A')!
    const b = sheetStore.addSheet('B')!
    sheetStore.deleteSheet(a.id)
    expect(projectStore.project?.sheets).toHaveLength(1)
    expect(projectStore.project?.sheets[0].id).toBe(b.id)
  })
})

// ─── Pick Matte auto-revert ───────────────────────────────────────────────────

describe('Pick Matte auto-revert', () => {
  it('setMatteColor restores activeTool to previousTool when tool is pickMatte', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.setActiveTool('growRect')
    sheetStore.setActiveTool('pickMatte')
    sheetStore.setMatteColor(sheet.id, { r: 0, g: 255, b: 0 })
    expect(sheetStore.activeTool).toBe('growRect')
  })

  it('setMatteColor does not change activeTool when not on pickMatte', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.setActiveTool('shrinkRect')
    sheetStore.setMatteColor(sheet.id, { r: 0, g: 255, b: 0 })
    expect(sheetStore.activeTool).toBe('shrinkRect')
  })

  it('previousTool is saved when switching to pickMatte', () => {
    const { sheetStore } = setup()
    sheetStore.setActiveTool('drawRect')
    sheetStore.setActiveTool('pickMatte')
    expect(sheetStore.previousTool).toBe('drawRect')
  })

  it('switching between non-pickMatte tools does not update previousTool', () => {
    const { sheetStore } = setup()
    sheetStore.setActiveTool('drawRect')
    sheetStore.setActiveTool('growRect')
    expect(sheetStore.previousTool).toBe('drawRect')
  })
})

// ─── acceptInProgressRect ─────────────────────────────────────────────────────

describe('acceptInProgressRect', () => {
  it('adds a SheetEntry with auto-generated name', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.setInProgressRect({ x: 0, y: 0, w: 10, h: 10 })
    sheetStore.acceptInProgressRect()
    expect(sheet.entries).toHaveLength(1)
    expect(sheet.entries[0].name).toBe('entry_01')
  })

  it('clears inProgressRect after accepting', () => {
    const { sheetStore } = setup()
    sheetStore.addSheet('S')
    sheetStore.setInProgressRect({ x: 0, y: 0, w: 10, h: 10 })
    sheetStore.acceptInProgressRect()
    expect(sheetStore.inProgressRect).toBeNull()
  })

  it('stores the correct rect on the new entry', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.setInProgressRect({ x: 5, y: 3, w: 20, h: 15 })
    sheetStore.acceptInProgressRect()
    expect(sheet.entries[0].rect).toEqual({ x: 5, y: 3, w: 20, h: 15 })
  })

  it('does nothing when inProgressRect is null', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.acceptInProgressRect()
    expect(sheet.entries).toHaveLength(0)
  })

  it('does nothing when no active sheet is set', () => {
    const { sheetStore } = setup()
    sheetStore.setInProgressRect({ x: 0, y: 0, w: 5, h: 5 })
    // activeSheetId is null — no sheet added
    sheetStore.acceptInProgressRect()
    expect(sheetStore.inProgressRect).not.toBeNull()
  })
})

// ─── Auto-generated name sequencing ──────────────────────────────────────────

describe('auto-generated entry names', () => {
  it('names are sequential by creation order', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(sheet.id, { x: 10, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(sheet.id, { x: 20, y: 0, w: 5, h: 5 })
    expect(sheet.entries.map(e => e.name)).toEqual(['entry_01', 'entry_02', 'entry_03'])
  })

  it('deleting entry_02 does not cause the next entry to be named entry_02 again', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(sheet.id, { x: 10, y: 0, w: 5, h: 5 })
    sheetStore.deleteEntry(sheet.id, 'entry_02')
    sheetStore.addEntry(sheet.id, { x: 20, y: 0, w: 5, h: 5 })
    const names = sheet.entries.map(e => e.name)
    expect(names).toContain('entry_03')
    expect(names).not.toContain('entry_02')
  })

  it('each sheet has its own independent name counter', () => {
    const { sheetStore } = setup()
    const s1 = sheetStore.addSheet('S1')!
    const s2 = sheetStore.addSheet('S2')!
    sheetStore.addEntry(s1.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(s1.id, { x: 10, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(s2.id, { x: 0, y: 0, w: 5, h: 5 })
    expect(s2.entries[0].name).toBe('entry_01')
  })
})

// ─── deleteEntry ──────────────────────────────────────────────────────────────

describe('deleteEntry', () => {
  it('removes the named entry from the sheet', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.deleteEntry(sheet.id, 'entry_01')
    expect(sheet.entries).toHaveLength(0)
  })

  it('does not affect entries on other Sheets', () => {
    const { sheetStore } = setup()
    const s1 = sheetStore.addSheet('S1')!
    const s2 = sheetStore.addSheet('S2')!
    sheetStore.addEntry(s1.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(s2.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.deleteEntry(s1.id, 'entry_01')
    expect(s1.entries).toHaveLength(0)
    expect(s2.entries).toHaveLength(1)
  })

  it('clears activeEntryName if the deleted entry was active', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.activeEntryName = 'entry_01'
    sheetStore.deleteEntry(sheet.id, 'entry_01')
    expect(sheetStore.activeEntryName).toBeNull()
  })
})

// ─── updateEntryRect ──────────────────────────────────────────────────────────

describe('updateEntryRect', () => {
  it('updates the rect of the named entry', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.updateEntryRect(sheet.id, 'entry_01', { x: 10, y: 20, w: 30, h: 40 })
    expect(sheet.entries[0].rect).toEqual({ x: 10, y: 20, w: 30, h: 40 })
  })

  it('does nothing for an unknown entry name', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    expect(() => sheetStore.updateEntryRect(sheet.id, 'nonexistent', { x: 0, y: 0, w: 1, h: 1 })).not.toThrow()
  })
})

// ─── reorderEntry ─────────────────────────────────────────────────────────────

describe('reorderEntry', () => {
  it('moves an entry from one index to another', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(sheet.id, { x: 10, y: 0, w: 5, h: 5 })
    sheetStore.addEntry(sheet.id, { x: 20, y: 0, w: 5, h: 5 })
    sheetStore.reorderEntry(sheet.id, 0, 2)
    expect(sheet.entries[0].name).toBe('entry_02')
    expect(sheet.entries[2].name).toBe('entry_01')
  })

  it('does nothing when fromIdx equals toIdx', () => {
    const { sheetStore } = setup()
    const sheet = sheetStore.addSheet('S')!
    sheetStore.addEntry(sheet.id, { x: 0, y: 0, w: 5, h: 5 })
    const originalName = sheet.entries[0].name
    sheetStore.reorderEntry(sheet.id, 0, 0)
    expect(sheet.entries[0].name).toBe(originalName)
  })
})

// ─── clearCheckedEntries ──────────────────────────────────────────────────────

describe('clearCheckedEntries', () => {
  it('empties checkedEntryNames', () => {
    const { sheetStore } = setup()
    sheetStore.checkedEntryNames.push('entry_01', 'entry_02')
    sheetStore.clearCheckedEntries()
    expect(sheetStore.checkedEntryNames).toHaveLength(0)
  })

  it('is a no-op when already empty', () => {
    const { sheetStore } = setup()
    expect(() => sheetStore.clearCheckedEntries()).not.toThrow()
    expect(sheetStore.checkedEntryNames).toHaveLength(0)
  })
})
