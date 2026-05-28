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
  const activePartIndex = ref<number | null>(null)
  const activeFrameIndex = ref<number>(0)
  const onionSkinEnabled = ref<boolean>(false)
  const onionSkinBefore = ref<number>(1)
  const onionSkinAfter = ref<number>(1)
  const playbackMode = ref<'loop' | 'once' | 'pingpong'>('loop')

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
  function setActiveSprite(id: string | null) {
    activeSpriteId.value = id
    activePartIndex.value = null
  }
  function setActivePartIndex(index: number | null) {
    activePartIndex.value = index
  }
  function setActiveAnimation(id: string | null) {
    activeAnimationId.value = id
    activeFrameIndex.value = 0
  }
  function setActiveFrameIndex(index: number) {
    activeFrameIndex.value = index
  }
  // Clamps activeFrameIndex when the frame list shrinks. Call after removing frames.
  function clampFrameIndex(frameCount: number) {
    if (frameCount === 0) {
      activeFrameIndex.value = 0
    } else if (activeFrameIndex.value >= frameCount) {
      activeFrameIndex.value = frameCount - 1
    }
  }
  function setOnionSkinEnabled(enabled: boolean) { onionSkinEnabled.value = enabled }
  function setOnionSkinBefore(count: number) { onionSkinBefore.value = Math.max(1, Math.min(3, count)) }
  function setOnionSkinAfter(count: number) { onionSkinAfter.value = Math.max(1, Math.min(3, count)) }
  function setPlaybackMode(mode: 'loop' | 'once' | 'pingpong') { playbackMode.value = mode }

  return {
    activeTab, activeImageId, activeLayerId, activePaletteId, activeSpriteId, activeAnimationId, activePartIndex,
    activeFrameIndex, onionSkinEnabled, onionSkinBefore, onionSkinAfter, playbackMode,
    setTab, setActiveImage, setActiveLayer, clearActiveImage, setActiveSprite, setActivePartIndex,
    setActiveAnimation, setActiveFrameIndex, clampFrameIndex,
    setOnionSkinEnabled, setOnionSkinBefore, setOnionSkinAfter, setPlaybackMode,
  }
}, {
  persist: {
    pick: ['activeTab'],
  },
})
