import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Point } from '../domain/model'

export type Tool = 'draw' | 'erase' | 'fill' | 'eyedropper' | 'line' | 'rect'

export interface ViewportState {
  zoom: number
  panOffset: Point
}

const TOOL_VARIANT_ORDER: Partial<Record<Tool, string[]>> = {
  draw: ['dot', 'connected', 'pixel-perfect', 'bezier'],
  rect: ['outline', 'filled'],
  fill: ['flood', 'replace'],
  erase: ['normal', 'clear'],
}

export const usePaintStore = defineStore('paint', () => {
  const activeTool = ref<Tool>('draw')
  const activeColorIndex = ref<number>(1)
  const isDrawing = ref<boolean>(false)

  const toolVariants = ref<Record<Tool, string>>({
    draw: 'connected',
    erase: 'normal',
    fill: 'flood',
    eyedropper: '',
    line: '',
    rect: 'filled',
  })

  // Per-image viewport state. Keyed by imageId. Ephemeral — not persisted.
  const viewports = reactive<Record<string, ViewportState>>({})

  // Per-image flash card preview zoom. Keyed by imageId. Session only — not persisted.
  const previewZooms = reactive<Record<string, number>>({})

  function cycleToolVariant(tool: Tool) {
    const order = TOOL_VARIANT_ORDER[tool]
    if (!order || order.length <= 1) return
    const idx = order.indexOf(toolVariants.value[tool])
    toolVariants.value[tool] = order[(idx + 1) % order.length]
  }

  function setTool(tool: Tool) {
    if (activeTool.value === tool) {
      cycleToolVariant(tool)
    } else {
      activeTool.value = tool
    }
  }

  function setToolVariant(tool: Tool, variant: string) {
    toolVariants.value[tool] = variant
  }

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

  function setPreviewZoom(imageId: string, zoom: number) {
    previewZooms[imageId] = zoom
  }

  return {
    activeTool, activeColorIndex, isDrawing, toolVariants, viewports, previewZooms,
    setTool, setToolVariant, setColorIndex, getViewport, setViewport, initViewport, setPreviewZoom,
  }
}, {
  persist: {
    pick: ['activeTool', 'toolVariants'],
  },
})
