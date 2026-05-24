import { defineStore } from 'pinia'
import { ref } from 'vue'

export type EditorTab = 'image' | 'sprite' | 'animation' | 'sheet'

export const useEditorStore = defineStore('editor', () => {
  const activeTab = ref<EditorTab>('image')
  const activeImageId = ref<string | null>(null)
  const activeLayerId = ref<string | null>(null)
  const activePaletteId = ref<string | null>(null)
  const activeSpriteId = ref<string | null>(null)
  const activeAnimationId = ref<string | null>(null)

  function setTab(tab: EditorTab) { activeTab.value = tab }
  function setActiveImage(imageId: string, layerId: string, paletteId: string) {
    activeImageId.value = imageId
    activeLayerId.value = layerId
    activePaletteId.value = paletteId
  }
  function setActiveLayer(layerId: string) { activeLayerId.value = layerId }
  function clearActiveImage() {
    activeImageId.value = null
    activeLayerId.value = null
    activePaletteId.value = null
  }

  return {
    activeTab, activeImageId, activeLayerId, activePaletteId, activeSpriteId, activeAnimationId,
    setTab, setActiveImage, setActiveLayer, clearActiveImage,
  }
}, {
  persist: {
    pick: ['activeTab'],
  },
})
