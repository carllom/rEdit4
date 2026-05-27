import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useSettingsStore } from '../settingsStore'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('defaults', () => {
  it('autosaveFrequency defaults to 2', () => {
    expect(useSettingsStore().settings.autosaveFrequency).toBe(2)
  })

  it('isometricSnap defaults to false', () => {
    expect(useSettingsStore().settings.isometricSnap).toBe(false)
  })

  it('cursorOpacity defaults to 100', () => {
    expect(useSettingsStore().settings.cursorOpacity).toBe(100)
  })

  it('previewBackground defaults to checkerboard', () => {
    expect(useSettingsStore().settings.previewBackground).toBe('checkerboard')
  })

  it('previewBackgroundColor defaults to #000000', () => {
    expect(useSettingsStore().settings.previewBackgroundColor).toBe('#000000')
  })
})

describe('spritePreviewZoom defaults', () => {
  it('defaults to 2', () => {
    expect(useSettingsStore().settings.spritePreviewZoom).toBe(2)
  })
})

describe('spritePreviewZoom persistence', () => {
  it('persists spritePreviewZoom changes to localStorage', async () => {
    const store = useSettingsStore()
    store.settings.spritePreviewZoom = 4
    await nextTick()
    const raw = localStorage.getItem('redit:settings')
    expect(JSON.parse(raw!).spritePreviewZoom).toBe(4)
  })

  it('loads saved spritePreviewZoom from localStorage', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ spritePreviewZoom: 6 }))
    setActivePinia(createPinia())
    expect(useSettingsStore().settings.spritePreviewZoom).toBe(6)
  })
})

describe('spritePreviewZoom clamping', () => {
  it('clamps a stored value below 1 up to 1', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ spritePreviewZoom: 0 }))
    setActivePinia(createPinia())
    expect(useSettingsStore().settings.spritePreviewZoom).toBe(1)
  })

  it('clamps a stored value above 8 down to 8', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ spritePreviewZoom: 99 }))
    setActivePinia(createPinia())
    expect(useSettingsStore().settings.spritePreviewZoom).toBe(8)
  })

  it('leaves a valid value unchanged', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ spritePreviewZoom: 3 }))
    setActivePinia(createPinia())
    expect(useSettingsStore().settings.spritePreviewZoom).toBe(3)
  })
})

describe('persistence', () => {
  it('persists settings to localStorage after a mutation', async () => {
    const store = useSettingsStore()
    store.settings.autosaveFrequency = 10
    await nextTick()
    const raw = localStorage.getItem('redit:settings')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).autosaveFrequency).toBe(10)
  })

  it('loads saved settings from localStorage on store init', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ autosaveFrequency: 30, isometricSnap: true }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.autosaveFrequency).toBe(30)
    expect(store.settings.isometricSnap).toBe(true)
  })

  it('merges stored values with defaults — missing keys get default values', () => {
    localStorage.setItem('redit:settings', JSON.stringify({ cursorOpacity: 50 }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.cursorOpacity).toBe(50)
    expect(store.settings.autosaveFrequency).toBe(2)   // default
    expect(store.settings.isometricSnap).toBe(false)   // default
  })

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem('redit:settings', 'not-json{{{')
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.autosaveFrequency).toBe(2)
  })

  it('persists previewBackground changes', async () => {
    const store = useSettingsStore()
    store.settings.previewBackground = 'solid'
    await nextTick()
    const raw = localStorage.getItem('redit:settings')
    expect(JSON.parse(raw!).previewBackground).toBe('solid')
  })
})
