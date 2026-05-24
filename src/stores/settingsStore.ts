import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'redit:settings'

export interface AppSettings {
  autosaveFrequency: number  // seconds, 1–60
  isometricSnap: boolean
  cursorOpacity: number      // 0–100
}

const DEFAULTS: AppSettings = {
  autosaveFrequency: 2,
  isometricSnap: false,
  cursorOpacity: 100,
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<AppSettings>(load())

  watch(settings, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, { deep: true })

  return { settings }
})
