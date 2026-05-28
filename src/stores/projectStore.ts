import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ReImage, Palette, Sprite, Animation } from '../domain/model'
import { uid, makePalette, makeImage } from '../domain/color'
import { clonePalette } from '../domain/paletteOps'
import { canRemoveImage } from '../domain/spriteOps'
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

  // Returns the names of Sprites that block removal. Empty array means the image was removed.
  function removeImage(id: string): string[] {
    if (!project.value) return []
    const blockers = canRemoveImage(project.value.sprites, id)
    if (blockers.length > 0) return blockers
    project.value.images = project.value.images.filter(img => img.id !== id)
    isDirty.value = true
    return []
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

  function appendImages(images: ReImage[]): void {
    if (!project.value) return
    project.value.images.push(...images)
    isDirty.value = true
  }

  function appendPalettes(palettes: Palette[]): void {
    if (!project.value) return
    project.value.palettes.push(...palettes)
    isDirty.value = true
  }

  function addSprite(name = 'Sprite'): Sprite | null {
    if (!project.value) return null
    const sprite: Sprite = { id: uid(), name, anchor: { x: 0, y: 0 }, parts: [] }
    project.value.sprites.push(sprite)
    isDirty.value = true
    return sprite
  }

  function removeSprite(id: string): void {
    if (!project.value) return
    project.value.sprites = project.value.sprites.filter(s => s.id !== id)
    isDirty.value = true
  }

  function getSprite(id: string): Sprite | undefined {
    return project.value?.sprites.find(s => s.id === id)
  }

  function addAnimation(name = 'Animation', width = 128, height = 128): Animation | null {
    if (!project.value) return null
    const animation: Animation = { id: uid(), name, width, height, frames: [] }
    project.value.animations.push(animation)
    isDirty.value = true
    return animation
  }

  function removeAnimation(id: string): void {
    if (!project.value) return
    const idx = project.value.animations.findIndex(a => a.id === id)
    if (idx === -1) return
    project.value.animations.splice(idx, 1)
    isDirty.value = true
  }

  function getAnimation(id: string): Animation | undefined {
    return project.value?.animations.find(a => a.id === id)
  }

  function updateAnimation(id: string, patch: Partial<Pick<Animation, 'name' | 'frames' | 'width' | 'height'>>): void {
    if (!project.value) return
    const idx = project.value.animations.findIndex(a => a.id === id)
    if (idx === -1) return
    project.value.animations[idx] = { ...project.value.animations[idx], ...patch }
    isDirty.value = true
  }

  function markDirty() { isDirty.value = true }
  function markClean() { isDirty.value = false }

  return { project, isDirty, hasProject, newProject, addImage, removeImage, getPalette, getImage, reorderLayer, appendImages, appendPalettes, addSprite, removeSprite, getSprite, addAnimation, removeAnimation, getAnimation, updateAnimation, markDirty, markClean }
})
