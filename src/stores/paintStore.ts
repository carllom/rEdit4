import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Tool = 'draw' | 'erase' | 'fill' | 'eyedropper' | 'line' | 'rect'

export const usePaintStore = defineStore('paint', () => {
  const activeTool = ref<Tool>('draw')
  const activeColorIndex = ref<number>(1)  // 0 = transparent, start on first real color slot
  const zoom = ref<number>(8)
  const panX = ref<number>(0)
  const panY = ref<number>(0)
  const isDrawing = ref<boolean>(false)

  function setTool(tool: Tool) { activeTool.value = tool }
  function setColorIndex(index: number) { activeColorIndex.value = index }
  function setZoom(z: number) { zoom.value = Math.max(1, Math.min(32, z)) }
  function setPan(x: number, y: number) { panX.value = x; panY.value = y }

  return { activeTool, activeColorIndex, zoom, panX, panY, isDrawing, setTool, setColorIndex, setZoom, setPan }
}, {
  persist: {
    pick: ['activeTool', 'zoom'],
  },
})
