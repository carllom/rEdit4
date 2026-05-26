import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../editorStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('initial state', () => {
  it('activeTab defaults to image', () => {
    expect(useEditorStore().activeTab).toBe('image')
  })

  it('all ID refs default to null', () => {
    const store = useEditorStore()
    expect(store.activeImageId).toBeNull()
    expect(store.activeLayerId).toBeNull()
    expect(store.activePaletteId).toBeNull()
    expect(store.activeSpriteId).toBeNull()
    expect(store.activeAnimationId).toBeNull()
  })
})

describe('setTab', () => {
  it('changes activeTab to the given value', () => {
    const store = useEditorStore()
    store.setTab('sprite')
    expect(store.activeTab).toBe('sprite')
  })

  it('accepts all valid tab values', () => {
    const store = useEditorStore()
    for (const tab of ['image', 'sprite', 'animation', 'sheet'] as const) {
      store.setTab(tab)
      expect(store.activeTab).toBe(tab)
    }
  })
})

describe('setActiveImage', () => {
  it('sets imageId, layerId, and paletteId together', () => {
    const store = useEditorStore()
    store.setActiveImage('img-1', 'layer-1', 'pal-1')
    expect(store.activeImageId).toBe('img-1')
    expect(store.activeLayerId).toBe('layer-1')
    expect(store.activePaletteId).toBe('pal-1')
  })

  it('replaces previously set values', () => {
    const store = useEditorStore()
    store.setActiveImage('img-1', 'layer-1', 'pal-1')
    store.setActiveImage('img-2', 'layer-2', 'pal-2')
    expect(store.activeImageId).toBe('img-2')
    expect(store.activeLayerId).toBe('layer-2')
    expect(store.activePaletteId).toBe('pal-2')
  })
})

describe('setActiveLayer', () => {
  it('updates only activeLayerId', () => {
    const store = useEditorStore()
    store.setActiveImage('img-1', 'layer-a', 'pal-1')
    store.setActiveLayer('layer-b')
    expect(store.activeLayerId).toBe('layer-b')
    expect(store.activeImageId).toBe('img-1')
    expect(store.activePaletteId).toBe('pal-1')
  })
})

describe('clearActiveImage', () => {
  it('nulls imageId, layerId, and paletteId', () => {
    const store = useEditorStore()
    store.setActiveImage('img-1', 'layer-1', 'pal-1')
    store.clearActiveImage()
    expect(store.activeImageId).toBeNull()
    expect(store.activeLayerId).toBeNull()
    expect(store.activePaletteId).toBeNull()
  })

  it('does not affect activeSpriteId or activeAnimationId', () => {
    const store = useEditorStore()
    store.activeSpriteId = 'spr-1'
    store.activeAnimationId = 'anim-1'
    store.clearActiveImage()
    expect(store.activeSpriteId).toBe('spr-1')
    expect(store.activeAnimationId).toBe('anim-1')
  })
})
