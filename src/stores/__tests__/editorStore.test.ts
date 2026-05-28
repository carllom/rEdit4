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

describe('setActiveSprite', () => {
  it('sets activeSpriteId', () => {
    const store = useEditorStore()
    store.setActiveSprite('spr-1')
    expect(store.activeSpriteId).toBe('spr-1')
  })

  it('resets activePartIndex to null', () => {
    const store = useEditorStore()
    store.setActivePartIndex(2)
    store.setActiveSprite('spr-1')
    expect(store.activePartIndex).toBeNull()
  })

  it('accepts null to deselect', () => {
    const store = useEditorStore()
    store.setActiveSprite('spr-1')
    store.setActiveSprite(null)
    expect(store.activeSpriteId).toBeNull()
  })
})

describe('setActivePartIndex', () => {
  it('sets activePartIndex', () => {
    const store = useEditorStore()
    store.setActivePartIndex(3)
    expect(store.activePartIndex).toBe(3)
  })

  it('accepts null to deselect', () => {
    const store = useEditorStore()
    store.setActivePartIndex(1)
    store.setActivePartIndex(null)
    expect(store.activePartIndex).toBeNull()
  })

  it('does not affect activeSpriteId', () => {
    const store = useEditorStore()
    store.setActiveSprite('spr-1')
    store.setActivePartIndex(0)
    expect(store.activeSpriteId).toBe('spr-1')
  })
})

describe('setActiveAnimation', () => {
  it('sets activeAnimationId', () => {
    const store = useEditorStore()
    store.setActiveAnimation('anim-1')
    expect(store.activeAnimationId).toBe('anim-1')
  })

  it('resets activeFrameIndex to 0', () => {
    const store = useEditorStore()
    store.setActiveFrameIndex(5)
    store.setActiveAnimation('anim-1')
    expect(store.activeFrameIndex).toBe(0)
  })

  it('accepts null to deselect', () => {
    const store = useEditorStore()
    store.setActiveAnimation('anim-1')
    store.setActiveAnimation(null)
    expect(store.activeAnimationId).toBeNull()
  })
})

describe('setActiveFrameIndex', () => {
  it('sets activeFrameIndex', () => {
    const store = useEditorStore()
    store.setActiveFrameIndex(3)
    expect(store.activeFrameIndex).toBe(3)
  })

  it('default activeFrameIndex is 0', () => {
    expect(useEditorStore().activeFrameIndex).toBe(0)
  })
})

describe('clampFrameIndex', () => {
  it('clamps to frameCount - 1 when index is out of range', () => {
    const store = useEditorStore()
    store.setActiveFrameIndex(4)
    store.clampFrameIndex(3)
    expect(store.activeFrameIndex).toBe(2)
  })

  it('does not change index when it is still in range', () => {
    const store = useEditorStore()
    store.setActiveFrameIndex(1)
    store.clampFrameIndex(3)
    expect(store.activeFrameIndex).toBe(1)
  })

  it('sets index to 0 when frameCount is 0', () => {
    const store = useEditorStore()
    store.setActiveFrameIndex(3)
    store.clampFrameIndex(0)
    expect(store.activeFrameIndex).toBe(0)
  })
})

describe('onion skin and playback defaults', () => {
  it('onionSkinEnabled defaults to false', () => {
    expect(useEditorStore().onionSkinEnabled).toBe(false)
  })

  it('onionSkinBefore defaults to 1', () => {
    expect(useEditorStore().onionSkinBefore).toBe(1)
  })

  it('onionSkinAfter defaults to 1', () => {
    expect(useEditorStore().onionSkinAfter).toBe(1)
  })

  it('playbackMode defaults to loop', () => {
    expect(useEditorStore().playbackMode).toBe('loop')
  })
})

describe('onion skin setters', () => {
  it('setOnionSkinEnabled toggles the flag', () => {
    const store = useEditorStore()
    store.setOnionSkinEnabled(true)
    expect(store.onionSkinEnabled).toBe(true)
    store.setOnionSkinEnabled(false)
    expect(store.onionSkinEnabled).toBe(false)
  })

  it('setOnionSkinBefore accepts values 1–3', () => {
    const store = useEditorStore()
    store.setOnionSkinBefore(2)
    expect(store.onionSkinBefore).toBe(2)
  })

  it('setOnionSkinBefore clamps below 1', () => {
    const store = useEditorStore()
    store.setOnionSkinBefore(0)
    expect(store.onionSkinBefore).toBe(1)
  })

  it('setOnionSkinBefore clamps above 3', () => {
    const store = useEditorStore()
    store.setOnionSkinBefore(5)
    expect(store.onionSkinBefore).toBe(3)
  })

  it('setOnionSkinAfter clamps above 3', () => {
    const store = useEditorStore()
    store.setOnionSkinAfter(10)
    expect(store.onionSkinAfter).toBe(3)
  })
})

describe('setPlaybackMode', () => {
  it('sets playbackMode to once', () => {
    const store = useEditorStore()
    store.setPlaybackMode('once')
    expect(store.playbackMode).toBe('once')
  })

  it('sets playbackMode to pingpong', () => {
    const store = useEditorStore()
    store.setPlaybackMode('pingpong')
    expect(store.playbackMode).toBe('pingpong')
  })

  it('sets playbackMode back to loop', () => {
    const store = useEditorStore()
    store.setPlaybackMode('once')
    store.setPlaybackMode('loop')
    expect(store.playbackMode).toBe('loop')
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
