import { defineStore } from 'pinia'
import { reactive, watch, computed } from 'vue'
import { usePaletteTemplateStore } from './paletteTemplateStore'

const STORAGE_KEY = 'redit:settings'
const FALLBACK_PALETTE_ID = 'builtin-cga'

export interface AppSettings {
  autosaveFrequency: number                       // seconds, 1–60
  isometricSnap: boolean
  cursorOpacity: number                           // 0–100
  previewBackground: 'checkerboard' | 'solid'
  previewBackgroundColor: string                  // hex, used when previewBackground === 'solid'
  defaultPaletteTemplateId: string
  spritePreviewZoom: number                       // 1–8
}

const DEFAULTS: AppSettings = {
  autosaveFrequency: 2,
  isometricSnap: false,
  cursorOpacity: 100,
  previewBackground: 'checkerboard',
  previewBackgroundColor: '#000000',
  defaultPaletteTemplateId: FALLBACK_PALETTE_ID,
  spritePreviewZoom: 2,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed: AppSettings = { ...DEFAULTS, ...JSON.parse(raw) }
    parsed.spritePreviewZoom = clamp(parsed.spritePreviewZoom, 1, 8)
    return parsed
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<AppSettings>(load())
  const templates = usePaletteTemplateStore()

  watch(settings, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, { deep: true })

  const resolvedDefaultPaletteId = computed(() => {
    const id = settings.defaultPaletteTemplateId
    const all = [...templates.builtIn, ...templates.userTemplates]
    return all.some(t => t.id === id) ? id : FALLBACK_PALETTE_ID
  })

  return { settings, resolvedDefaultPaletteId }
})
