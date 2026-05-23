<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { colorToCSSRGBA } from '../../domain/color'

const project = useProjectStore()
const editor = useEditorStore()
const paint = usePaintStore()

const palette = computed(() => {
  if (!editor.activePaletteId) return null
  return project.getPalette(editor.activePaletteId) ?? null
})

// Colors excluding index 0 (transparent) for display; we still preserve the index offset
const displayColors = computed(() => {
  if (!palette.value) return []
  return palette.value.colors.slice(1).map((c, i) => ({ color: c, index: i + 1 }))
})
</script>

<template>
  <div class="palette-panel">
    <div class="section-label">Palette</div>
    <div v-if="palette" class="palette-name">{{ palette.name }}</div>
    <div v-if="palette" class="swatch-grid">
      <button
        v-for="{ color, index } in displayColors"
        :key="color.id"
        :class="['swatch', { active: paint.activeColorIndex === index }]"
        :style="{ background: colorToCSSRGBA(color) }"
        :title="`[${index}] ${color.name}`"
        @click="paint.setColorIndex(index)"
      />
    </div>
    <div v-else class="no-palette">No palette</div>
  </div>
</template>

<style scoped>
.palette-panel {
  padding: 6px 0;
  flex: 1;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 4px 10px 2px;
}

.palette-name {
  font-size: 11px;
  padding: 2px 10px 4px;
  color: var(--color-text-muted);
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 4px 8px;
}

.swatch {
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: 1px;
  cursor: pointer;
  padding: 0;
  /* checkerboard hint for transparent-ish colors */
  background-image: linear-gradient(45deg, #555 25%, transparent 25%),
    linear-gradient(-45deg, #555 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #555 75%),
    linear-gradient(-45deg, transparent 75%, #555 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: #333;
}

.swatch:hover {
  outline: 1px solid var(--color-accent-hover);
  outline-offset: 1px;
}

.swatch.active {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  z-index: 1;
  position: relative;
}

.no-palette {
  padding: 8px 10px;
  color: var(--color-text-muted);
  font-size: 11px;
}
</style>
