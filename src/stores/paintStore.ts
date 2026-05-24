import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Tool = 'draw' | 'erase' | 'fill' | 'eyedropper' | 'line' | 'rect'

export const usePaintStore = defineStore('paint', () => {
  const activeTool = ref<Tool>('draw')
  const activeColorIndex = ref<number>(1)  // 0 = transparent, start on first real color slot
  const zoom = ref<number>(8)
  const isDrawing = ref<boolean>(false)

  function setTool(tool: Tool) { activeTool.value = tool }
  function setColorIndex(index: number) { activeColorIndex.value = index }
  function setZoom(z: number) { zoom.value = Math.max(1, Math.min(32, z)) }

  return { activeTool, activeColorIndex, zoom, isDrawing, setTool, setColorIndex, setZoom }
}, {
  persist: {
    pick: ['activeTool', 'zoom'],
  },
})
