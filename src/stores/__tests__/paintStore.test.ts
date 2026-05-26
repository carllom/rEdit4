import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePaintStore } from '../paintStore'
import type { Tool } from '../paintStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('initial state', () => {
  it('activeTool defaults to draw', () => {
    expect(usePaintStore().activeTool).toBe('draw')
  })

  it('activeColorIndex defaults to 1', () => {
    expect(usePaintStore().activeColorIndex).toBe(1)
  })

  it('isDrawing defaults to false', () => {
    expect(usePaintStore().isDrawing).toBe(false)
  })

  it('toolVariants has the expected defaults', () => {
    const { toolVariants } = usePaintStore()
    expect(toolVariants.draw).toBe('connected')
    expect(toolVariants.erase).toBe('normal')
    expect(toolVariants.fill).toBe('flood')
    expect(toolVariants.rect).toBe('filled')
    expect(toolVariants.ellipse).toBe('filled')
  })
})

describe('setTool', () => {
  it('switches to a different tool', () => {
    const store = usePaintStore()
    store.setTool('fill')
    expect(store.activeTool).toBe('fill')
  })

  it('does not cycle variant when switching to a new tool', () => {
    const store = usePaintStore()
    const originalDrawVariant = store.toolVariants.draw
    store.setTool('fill')
    store.setTool('draw')
    expect(store.toolVariants.draw).toBe(originalDrawVariant)
  })

  it('cycles variant when the same tool is selected again', () => {
    const store = usePaintStore()
    store.setTool('draw')  // activeTool is already 'draw'
    expect(store.toolVariants.draw).toBe('pixel-perfect')
  })

  it('cycling wraps around after the last variant', () => {
    const store = usePaintStore()
    // draw order: connected → pixel-perfect → bezier → dot
    store.setTool('draw')  // → pixel-perfect
    store.setTool('draw')  // → bezier
    store.setTool('draw')  // → dot
    store.setTool('draw')  // → connected (wraps)
    expect(store.toolVariants.draw).toBe('connected')
  })

  it('does not cycle variant for tools with no variant order (eyedropper)', () => {
    const store = usePaintStore()
    store.setTool('eyedropper')
    const variantBefore = store.toolVariants.eyedropper
    store.setTool('eyedropper')  // same tool again
    expect(store.toolVariants.eyedropper).toBe(variantBefore)
  })
})

describe('setToolVariant', () => {
  it('sets the variant for the given tool', () => {
    const store = usePaintStore()
    store.setToolVariant('draw', 'bezier')
    expect(store.toolVariants.draw).toBe('bezier')
  })

  it('does not affect other tools', () => {
    const store = usePaintStore()
    store.setToolVariant('fill', 'replace')
    expect(store.toolVariants.draw).toBe('connected')
  })
})

describe('setColorIndex', () => {
  it('updates activeColorIndex', () => {
    const store = usePaintStore()
    store.setColorIndex(5)
    expect(store.activeColorIndex).toBe(5)
  })

  it('accepts index 0 (transparent)', () => {
    const store = usePaintStore()
    store.setColorIndex(0)
    expect(store.activeColorIndex).toBe(0)
  })
})

describe('viewport', () => {
  it('getViewport returns undefined for an unknown imageId', () => {
    expect(usePaintStore().getViewport('img-unknown')).toBeUndefined()
  })

  it('setViewport stores state retrievable by getViewport', () => {
    const store = usePaintStore()
    store.setViewport('img-1', { zoom: 4, panOffset: { x: 10, y: 20 } })
    const vp = store.getViewport('img-1')
    expect(vp?.zoom).toBe(4)
    expect(vp?.panOffset).toEqual({ x: 10, y: 20 })
  })

  it('setViewport overwrites previous state for the same imageId', () => {
    const store = usePaintStore()
    store.setViewport('img-1', { zoom: 2, panOffset: { x: 0, y: 0 } })
    store.setViewport('img-1', { zoom: 8, panOffset: { x: 5, y: 5 } })
    expect(store.getViewport('img-1')?.zoom).toBe(8)
  })

  it('initViewport initialises viewport when none exists', () => {
    const store = usePaintStore()
    store.initViewport('img-new', 3, { x: 1, y: 2 })
    expect(store.getViewport('img-new')?.zoom).toBe(3)
  })

  it('initViewport does not overwrite existing viewport', () => {
    const store = usePaintStore()
    store.setViewport('img-1', { zoom: 6, panOffset: { x: 0, y: 0 } })
    store.initViewport('img-1', 1, { x: 0, y: 0 })
    expect(store.getViewport('img-1')?.zoom).toBe(6)
  })

  it('different imageIds have independent viewport state', () => {
    const store = usePaintStore()
    store.setViewport('img-a', { zoom: 2, panOffset: { x: 0, y: 0 } })
    store.setViewport('img-b', { zoom: 8, panOffset: { x: 0, y: 0 } })
    expect(store.getViewport('img-a')?.zoom).toBe(2)
    expect(store.getViewport('img-b')?.zoom).toBe(8)
  })
})

describe('setPreviewZoom', () => {
  it('stores preview zoom per imageId', () => {
    const store = usePaintStore()
    store.setPreviewZoom('img-1', 3)
    expect(store.previewZooms['img-1']).toBe(3)
  })

  it('independent entries per imageId', () => {
    const store = usePaintStore()
    store.setPreviewZoom('img-a', 2)
    store.setPreviewZoom('img-b', 5)
    expect(store.previewZooms['img-a']).toBe(2)
    expect(store.previewZooms['img-b']).toBe(5)
  })
})

describe('tool variant cycling across tools', () => {
  it.each<[Tool, string[]]>([
    ['draw',    ['connected', 'pixel-perfect', 'bezier', 'dot']],
    ['rect',    ['outline', 'filled']],
    ['ellipse', ['outline', 'filled']],
    ['fill',    ['flood', 'replace']],
    ['erase',   ['normal', 'clear']],
  ])('%s cycles through all variants in order', (tool, expectedOrder) => {
    const store = usePaintStore()
    store.setTool(tool === 'draw' ? 'fill' : 'draw')  // switch away first
    store.setTool(tool)
    // Start from the default and cycle through all positions
    const startVariant = store.toolVariants[tool]
    const startIdx = expectedOrder.indexOf(startVariant)
    for (let i = 1; i < expectedOrder.length; i++) {
      store.setTool(tool)
      const expected = expectedOrder[(startIdx + i) % expectedOrder.length]
      expect(store.toolVariants[tool]).toBe(expected)
    }
  })
})
