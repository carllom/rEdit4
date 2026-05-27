import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../projectStore'
import { makeLayer } from '../../domain/color'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('initial state', () => {
  it('project is null', () => {
    expect(useProjectStore().project).toBeNull()
  })

  it('hasProject is false', () => {
    expect(useProjectStore().hasProject).toBe(false)
  })

  it('isDirty is false', () => {
    expect(useProjectStore().isDirty).toBe(false)
  })
})

describe('newProject', () => {
  it('creates a project with the given name', () => {
    const store = useProjectStore()
    store.newProject('My Project')
    expect(store.project?.name).toBe('My Project')
  })

  it('defaults to Untitled when no name given', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.project?.name).toBe('Untitled')
  })

  it('project has a non-empty id', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.project?.id).toBeTruthy()
  })

  it('project starts with one default palette', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.project?.palettes).toHaveLength(1)
  })

  it('default palette has slot 0 as the transparent entry', () => {
    const store = useProjectStore()
    store.newProject()
    const pal = store.project!.palettes[0]
    expect(pal.colors[0].a).toBe(0)
    expect(pal.colors[0].name).toBe('transparent')
  })

  it('project starts with empty images, sprites, animations, sheets', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.project?.images).toHaveLength(0)
    expect(store.project?.sprites).toHaveLength(0)
    expect(store.project?.animations).toHaveLength(0)
    expect(store.project?.sheets).toHaveLength(0)
  })

  it('hasProject becomes true', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.hasProject).toBe(true)
  })

  it('isDirty is false after newProject', () => {
    const store = useProjectStore()
    store.markDirty()
    store.newProject()
    expect(store.isDirty).toBe(false)
  })

  it('replaces any previously open project', () => {
    const store = useProjectStore()
    store.newProject('First')
    const firstId = store.project!.id
    store.newProject('Second')
    expect(store.project?.name).toBe('Second')
    expect(store.project?.id).not.toBe(firstId)
  })
})

describe('addImage', () => {
  it('returns null when no project is open', () => {
    const store = useProjectStore()
    expect(store.addImage(8, 8)).toBeNull()
  })

  it('adds an image to the project and returns it', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(16, 8, 'Sprite')
    expect(store.project?.images).toHaveLength(1)
    expect(img?.name).toBe('Sprite')
  })

  it('added image has the correct dimensions', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(32, 16)
    expect(img?.width).toBe(32)
    expect(img?.height).toBe(16)
  })

  it('added image is assigned the first palette id', () => {
    const store = useProjectStore()
    store.newProject()
    const paletteId = store.project!.palettes[0].id
    const img = store.addImage(8, 8)
    expect(img?.paletteId).toBe(paletteId)
  })

  it('marks the project dirty', () => {
    const store = useProjectStore()
    store.newProject()
    store.addImage(8, 8)
    expect(store.isDirty).toBe(true)
  })

  it('multiple images accumulate', () => {
    const store = useProjectStore()
    store.newProject()
    store.addImage(8, 8, 'A')
    store.addImage(8, 8, 'B')
    expect(store.project?.images).toHaveLength(2)
  })
})

describe('removeImage', () => {
  it('does nothing when no project is open', () => {
    const store = useProjectStore()
    expect(() => store.removeImage('img-x')).not.toThrow()
  })

  it('removes the image with the matching id', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(8, 8)!
    store.removeImage(img.id)
    expect(store.project?.images).toHaveLength(0)
  })

  it('leaves other images intact', () => {
    const store = useProjectStore()
    store.newProject()
    const a = store.addImage(8, 8, 'A')!
    const b = store.addImage(8, 8, 'B')!
    store.removeImage(a.id)
    expect(store.project?.images).toHaveLength(1)
    expect(store.project?.images[0].id).toBe(b.id)
  })

  it('marks the project dirty', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(8, 8)!
    store.markClean()
    store.removeImage(img.id)
    expect(store.isDirty).toBe(true)
  })
})

describe('getPalette', () => {
  it('returns undefined when no project is open', () => {
    expect(useProjectStore().getPalette('pal-1')).toBeUndefined()
  })

  it('returns the palette with the matching id', () => {
    const store = useProjectStore()
    store.newProject()
    const paletteId = store.project!.palettes[0].id
    const pal = store.getPalette(paletteId)
    expect(pal?.id).toBe(paletteId)
  })

  it('returns undefined for an unknown id', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.getPalette('nonexistent')).toBeUndefined()
  })
})

describe('getImage', () => {
  it('returns undefined when no project is open', () => {
    expect(useProjectStore().getImage('img-1')).toBeUndefined()
  })

  it('returns the image with the matching id', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(8, 8)!
    expect(store.getImage(img.id)?.id).toBe(img.id)
  })

  it('returns undefined for an unknown id', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.getImage('nonexistent')).toBeUndefined()
  })
})

describe('reorderLayer', () => {
  it('does nothing when the image does not exist', () => {
    const store = useProjectStore()
    store.newProject()
    expect(() => store.reorderLayer('nonexistent', 0, 1)).not.toThrow()
  })

  it('moves a layer from fromIdx to toIdx', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(4, 4)!
    // Manually add two more layers so we have three total
    img.layers.push(makeLayer(4, 4, 'B'), makeLayer(4, 4, 'C'))
    const [nameA, nameB, nameC] = img.layers.map(l => l.name)
    store.reorderLayer(img.id, 0, 2)
    expect(img.layers[0].name).toBe(nameB)
    expect(img.layers[1].name).toBe(nameC)
    expect(img.layers[2].name).toBe(nameA)
  })

  it('does nothing when fromIdx equals toIdx', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(4, 4)!
    const originalName = img.layers[0].name
    store.reorderLayer(img.id, 0, 0)
    expect(img.layers[0].name).toBe(originalName)
  })

  it('does nothing for out-of-range indices', () => {
    const store = useProjectStore()
    store.newProject()
    const img = store.addImage(4, 4)!
    expect(() => store.reorderLayer(img.id, 0, 5)).not.toThrow()
  })
})

describe('addSprite', () => {
  it('returns null when no project is open', () => {
    expect(useProjectStore().addSprite()).toBeNull()
  })

  it('adds a Sprite and returns it', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite('Hero')
    expect(store.project?.sprites).toHaveLength(1)
    expect(sprite?.name).toBe('Hero')
  })

  it('new Sprite has anchor at (0, 0)', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite()!
    expect(sprite.anchor).toEqual({ x: 0, y: 0 })
  })

  it('new Sprite has an empty parts list', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite()!
    expect(sprite.parts).toHaveLength(0)
  })

  it('new Sprite has a non-empty id', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.addSprite()?.id).toBeTruthy()
  })

  it('marks the project dirty', () => {
    const store = useProjectStore()
    store.newProject()
    store.markClean()
    store.addSprite()
    expect(store.isDirty).toBe(true)
  })

  it('multiple sprites accumulate', () => {
    const store = useProjectStore()
    store.newProject()
    store.addSprite('A')
    store.addSprite('B')
    expect(store.project?.sprites).toHaveLength(2)
  })
})

describe('removeSprite', () => {
  it('does nothing when no project is open', () => {
    expect(() => useProjectStore().removeSprite('spr-x')).not.toThrow()
  })

  it('removes the Sprite with the matching id', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite()!
    store.removeSprite(sprite.id)
    expect(store.project?.sprites).toHaveLength(0)
  })

  it('leaves other Sprites intact', () => {
    const store = useProjectStore()
    store.newProject()
    const a = store.addSprite('A')!
    const b = store.addSprite('B')!
    store.removeSprite(a.id)
    expect(store.project?.sprites).toHaveLength(1)
    expect(store.project?.sprites[0].id).toBe(b.id)
  })

  it('marks the project dirty', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite()!
    store.markClean()
    store.removeSprite(sprite.id)
    expect(store.isDirty).toBe(true)
  })
})

describe('getSprite', () => {
  it('returns undefined when no project is open', () => {
    expect(useProjectStore().getSprite('spr-1')).toBeUndefined()
  })

  it('returns the Sprite with the matching id', () => {
    const store = useProjectStore()
    store.newProject()
    const sprite = store.addSprite()!
    expect(store.getSprite(sprite.id)?.id).toBe(sprite.id)
  })

  it('returns undefined for an unknown id', () => {
    const store = useProjectStore()
    store.newProject()
    expect(store.getSprite('nonexistent')).toBeUndefined()
  })
})

describe('markDirty / markClean', () => {
  it('markDirty sets isDirty to true', () => {
    const store = useProjectStore()
    store.newProject()
    store.markDirty()
    expect(store.isDirty).toBe(true)
  })

  it('markClean sets isDirty to false', () => {
    const store = useProjectStore()
    store.newProject()
    store.markDirty()
    store.markClean()
    expect(store.isDirty).toBe(false)
  })
})
