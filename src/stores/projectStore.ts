import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ReImage, Palette } from '../domain/model'
import { uid, makePalette, makeImage } from '../domain/color'

export const useProjectStore = defineStore('project', () => {
  const project = ref<Project | null>(null)
  const isDirty = ref(false)

  const hasProject = computed(() => project.value !== null)

  function newProject(name = 'Untitled') {
    const palette = makePalette('Default')
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

  function markDirty() { isDirty.value = true }
  function markClean() { isDirty.value = false }

  return { project, isDirty, hasProject, newProject, addImage, removeImage, getPalette, getImage, markDirty, markClean }
})
