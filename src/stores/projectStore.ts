import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ReImage, Palette } from '../domain/model'
import { uid, makePalette, makeImage } from '../domain/color'
import { clonePalette } from '../domain/paletteOps'
import { usePaletteTemplateStore } from './paletteTemplateStore'

const FALLBACK_PALETTE_ID = 'builtin-cga'

export const useProjectStore = defineStore('project', () => {
  const project = ref<Project | null>(null)
  const isDirty = ref(false)

  const hasProject = computed(() => project.value !== null)

  function newProject(name = 'Untitled', initialPaletteTemplateId?: string) {
    const templates = usePaletteTemplateStore()
    const id = initialPaletteTemplateId ?? FALLBACK_PALETTE_ID
    const all = [...templates.builtIn, ...templates.userTemplates]
    const template = all.find((t: Palette) => t.id === id) ?? all.find((t: Palette) => t.id === FALLBACK_PALETTE_ID)
    const palette = template ? clonePalette(template) : makePalette('Default')
    project.value = {
      id: uid(),
      name,
      description: '',
      palettes: [palette],
      images: [],
      sprites: [],
      animations: [],
      sheets: [],
    }
    isDirty.value = false
  }

  function addImage(width: number, height: number, name = 'Image'): ReImage | null {
    if (!project.value) return null
    const paletteId = project.value.palettes[0]?.id ?? ''
    const image = makeImage(width, height, paletteId, name)
    project.value.images.push(image)
    isDirty.value = true
    return image
  }

  function getPalette(id: string): Palette | undefined {
    return project.value?.palettes.find(p => p.id === id)
  }

  function getImage(id: string): ReImage | undefined {
    return project.value?.images.find(img => img.id === id)
  }

  function removeImage(id: string): void {
    if (!project.value) return
    project.value.images = project.value.images.filter(img => img.id !== id)
    isDirty.value = true
  }

  function reorderLayer(imageId: string, fromIdx: number, toIdx: number): void {
    const img = getImage(imageId)
    if (!img) return
    const layers = img.layers
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= layers.length || toIdx >= layers.length) return
    const [item] = layers.splice(fromIdx, 1)
    layers.splice(toIdx, 0, item)
    isDirty.value = true
  }

  function markDirty() { isDirty.value = true }
  function markClean() { isDirty.value = false }

  return { project, isDirty, hasProject, newProject, addImage, removeImage, getPalette, getImage, reorderLayer, markDirty, markClean }
})
