import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { usePaletteTemplateStore } from '../paletteTemplateStore'
import type { Palette, Project } from '../../domain/model'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makePalette(name: string, colorCount = 3): Palette {
  const colors = [
    { id: 'transparent', name: 'transparent', r: 0, g: 0, b: 0, a: 0 },
  ]
  for (let i = 1; i < colorCount; i++) {
    colors.push({ id: `c-${i}`, name: `Color ${i}`, r: i * 10, g: i * 20, b: i * 30, a: 255 })
  }
  return { id: 'pal-1', name, description: '', colors }
}

function makeProject(): Project {
  return { id: 'proj-1', name: 'Test', description: '', palettes: [], images: [], sprites: [], animations: [], sheets: [] }
}

// ─── setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

// ─── builtIn ─────────────────────────────────────────────────────────────────

describe('builtIn', () => {
  it('contains all six built-in templates', () => {
    const store = usePaletteTemplateStore()
    expect(store.builtIn).toHaveLength(6)
  })

  it('all built-in templates have isBuiltIn: true', () => {
    const store = usePaletteTemplateStore()
    expect(store.builtIn.every(t => t.isBuiltIn)).toBe(true)
  })

  it('contains CGA, EGA, PICO-8, DB16 Dawnbringer, DB32 Dawnbringer, ZX Spectrum', () => {
    const store = usePaletteTemplateStore()
    const names = store.builtIn.map(t => t.name)
    expect(names).toContain('CGA')
    expect(names).toContain('EGA')
    expect(names).toContain('PICO-8')
    expect(names).toContain('DB16 Dawnbringer')
    expect(names).toContain('DB32 Dawnbringer')
    expect(names).toContain('ZX Spectrum')
  })

  it('each built-in template has slot 0 as the transparent entry', () => {
    const store = usePaletteTemplateStore()
    for (const t of store.builtIn) {
      expect(t.colors[0].a).toBe(0)
      expect(t.colors[0].name).toBe('transparent')
    }
  })

  it('CGA has 17 color slots (transparent + 16)', () => {
    const store = usePaletteTemplateStore()
    const cga = store.builtIn.find(t => t.name === 'CGA')!
    expect(cga.colors).toHaveLength(17)
  })

  it('EGA has 65 color slots (transparent + 64)', () => {
    const store = usePaletteTemplateStore()
    const ega = store.builtIn.find(t => t.name === 'EGA')!
    expect(ega.colors).toHaveLength(65)
  })
})

// ─── promoteToTemplate ────────────────────────────────────────────────────────

describe('promoteToTemplate', () => {
  it('adds a new user template', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    expect(store.userTemplates).toHaveLength(1)
    expect(store.userTemplates[0].name).toBe('My Palette')
  })

  it('promoted template has isBuiltIn: false', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    expect(store.userTemplates[0].isBuiltIn).toBe(false)
  })

  it('promoted template has a fresh id distinct from source', () => {
    const store = usePaletteTemplateStore()
    const src = makePalette('My Palette')
    store.promoteToTemplate(src)
    expect(store.userTemplates[0].id).not.toBe(src.id)
  })

  it('slot 0 of promoted template is transparent', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    const t = store.userTemplates[0]
    expect(t.colors[0].a).toBe(0)
    expect(t.colors[0].name).toBe('transparent')
  })

  it('re-promoting with the same name overwrites the existing entry', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette', 3))
    store.promoteToTemplate(makePalette('My Palette', 5))
    expect(store.userTemplates).toHaveLength(1)
    expect(store.userTemplates[0].colors).toHaveLength(5)
  })

  it('throws when name matches a built-in template', () => {
    const store = usePaletteTemplateStore()
    expect(() => store.promoteToTemplate(makePalette('CGA'))).toThrow()
  })

  it('does not modify userTemplates when throwing for a built-in name', () => {
    const store = usePaletteTemplateStore()
    try { store.promoteToTemplate(makePalette('CGA')) } catch { /* expected */ }
    expect(store.userTemplates).toHaveLength(0)
  })

  it('mutation of source palette does not affect the stored template', () => {
    const store = usePaletteTemplateStore()
    const src = makePalette('My Palette', 3)
    store.promoteToTemplate(src)
    src.colors[1].r = 255
    expect(store.userTemplates[0].colors[1].r).not.toBe(255)
  })
})

// ─── importIntoProject ────────────────────────────────────────────────────────

describe('importIntoProject', () => {
  it('appends a palette to project.palettes for a built-in template', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    store.importIntoProject(store.builtIn[0].id, project)
    expect(project.palettes).toHaveLength(1)
  })

  it('cloned palette has a fresh id distinct from the source template', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    const template = store.builtIn[0]
    store.importIntoProject(template.id, project)
    expect(project.palettes[0].id).not.toBe(template.id)
  })

  it('source template is unchanged after import', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    const template = store.builtIn[0]
    const originalCount = template.colors.length
    store.importIntoProject(template.id, project)
    expect(template.colors).toHaveLength(originalCount)
  })

  it('cloned palette has slot 0 as transparent', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    store.importIntoProject(store.builtIn[0].id, project)
    const palette = project.palettes[0]
    expect(palette.colors[0].a).toBe(0)
    expect(palette.colors[0].name).toBe('transparent')
  })

  it('works for user templates', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    const project = makeProject()
    store.importIntoProject(store.userTemplates[0].id, project)
    expect(project.palettes).toHaveLength(1)
  })

  it('does nothing for an unknown templateId', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    store.importIntoProject('nonexistent', project)
    expect(project.palettes).toHaveLength(0)
  })

  it('multiple imports append separate palettes', () => {
    const store = usePaletteTemplateStore()
    const project = makeProject()
    const id = store.builtIn[0].id
    store.importIntoProject(id, project)
    store.importIntoProject(id, project)
    expect(project.palettes).toHaveLength(2)
    expect(project.palettes[0].id).not.toBe(project.palettes[1].id)
  })
})

// ─── deleteUserTemplate ───────────────────────────────────────────────────────

describe('deleteUserTemplate', () => {
  it('removes the named user template', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    store.deleteUserTemplate('My Palette')
    expect(store.userTemplates).toHaveLength(0)
  })

  it('has no effect when called with a built-in name', () => {
    const store = usePaletteTemplateStore()
    store.deleteUserTemplate('CGA')
    expect(store.builtIn).toHaveLength(6)
  })

  it('has no effect when called with an unknown name', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('My Palette'))
    store.deleteUserTemplate('Nonexistent')
    expect(store.userTemplates).toHaveLength(1)
  })

  it('only removes the matching template, leaving others intact', () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('Alpha'))
    store.promoteToTemplate(makePalette('Beta'))
    store.deleteUserTemplate('Alpha')
    expect(store.userTemplates).toHaveLength(1)
    expect(store.userTemplates[0].name).toBe('Beta')
  })
})

// ─── localStorage persistence ─────────────────────────────────────────────────

describe('persistence', () => {
  it('saves user templates to localStorage after mutation', async () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('Saved Palette'))
    await nextTick()
    const raw = localStorage.getItem('redit.palette-templates')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as unknown[]
    expect(parsed).toHaveLength(1)
    expect((parsed[0] as { name: string }).name).toBe('Saved Palette')
  })

  it('loads user templates from localStorage on store initialisation', () => {
    const template = {
      id: 'tmpl-stored', name: 'Preloaded', description: '',
      colors: [{ id: 'transparent', name: 'transparent', r: 0, g: 0, b: 0, a: 0 }],
      isBuiltIn: false,
    }
    localStorage.setItem('redit.palette-templates', JSON.stringify([template]))
    setActivePinia(createPinia())
    const store = usePaletteTemplateStore()
    expect(store.userTemplates).toHaveLength(1)
    expect(store.userTemplates[0].name).toBe('Preloaded')
  })

  it('deleting a user template updates localStorage', async () => {
    const store = usePaletteTemplateStore()
    store.promoteToTemplate(makePalette('ToDelete'))
    store.deleteUserTemplate('ToDelete')
    await nextTick()
    const raw = localStorage.getItem('redit.palette-templates')
    const parsed = JSON.parse(raw ?? '[]') as unknown[]
    expect(parsed).toHaveLength(0)
  })
})
