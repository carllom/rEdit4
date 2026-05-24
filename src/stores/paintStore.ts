import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Point } from '../domain/model'

export type Tool = 'draw' | 'erase' | 'fill' | 'eyedropper' | 'line' | 'rect'

export interface ViewportState {
  zoom: number
  panOffset: Point
}

export const usePaintStore = defineStore('paint', () => {
  const activeTool = ref<Tool>('draw')
  const activeColorIndex = ref<number>(1)
  const isDrawing = ref<boolean>(false)

  // Per-image viewport state. Keyed by imageId. Ephemeral — not persisted.
  const viewports = reactive<Record<string, ViewportState>>({})

  function setTool(tool: Tool) { activeTool.value = tool }
  function setColorIndex(index: number) { activeColorIndex.value = index }

  function getViewport(imageId: string): ViewportState | undefined {
    return viewports[imageId]
  }

  function setViewport(imageId: string, state: ViewportState) {
    viewports[imageId] = state
  }

  // Initializes viewport state for an image only if it has never been opened this session.
  function initViewport(imageId: string, zoom: number, panOffset: Point) {
    if (!viewports[imageId]) {
      viewports[imageId] = { zoom, panOffset }
    }
  }

  return {
    activeTool, activeColorIndex, isDrawing, viewports,
    setTool, setColorIndex, getViewport, setViewport, initViewport,
  }
}, {
  persist: {
    pick: ['activeTool'],
  },
})
