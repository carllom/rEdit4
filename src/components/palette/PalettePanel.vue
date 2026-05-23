<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { colorToCSSRGBA, makeColor } from '../../domain/color'
import ColorEditor from './ColorEditor.vue'

const project = useProjectStore()
const editor = useEditorStore()
const paint = usePaintStore()

const palette = computed(() => {
  if (!editor.activePaletteId) return null
  return project.getPalette(editor.activePaletteId) ?? null
})

const displayColors = computed(() => {
  if (!palette.value) return []
  return palette.value.colors.slice(1).map((c, i) => ({ color: c, index: i + 1 }))
})

const selectedColor = computed(() => {
  if (!palette.value) return null
  return palette.value.colors[paint.activeColorIndex] ?? null
})

function addColor() {
  if (!palette.value) return
  const color = makeColor('New color')
  palette.value.colors.push(color)
  paint.setColorIndex(palette.value.colors.length - 1)
  project.markDirty()
}

function onColorChange() {
  project.markDirty()
}
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
        :style="{ '--c': colorToCSSRGBA(color) }"
        :title="`[${index}] ${color.name}`"
        @click="paint.setColorIndex(index)"
      />
    </div>

    <button v-if="palette" class="add-btn" @click="addColor">+ Add color</button>

    <!-- Inline color editor for the selected color -->
    <ColorEditor
      v-if="selectedColor"
      :color="selectedColor"
      @change="onColorChange"
    />

    <div v-if="!palette" class="no-palette">No palette</div>
  </div>
</template>

<style scoped>
.palette-panel {
  padding: 6px 0;
  display: flex;
  flex-direction: column;
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
  background-image: linear-gradient(45deg, #555 25%, transparent 25%),
    linear-gradient(-45deg, #555 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #555 75%),
    linear-gradient(-45deg, transparent 75%, #555 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: var(--c, #333);
}

.swatch::after {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: var(--c, transparent);
}

.swatch:hover { outline: 1px solid var(--color-accent-hover); outline-offset: 1px; }
.swatch.active { outline: 2px solid var(--color-accent); outline-offset: 1px; position: relative; z-index: 1; }

.add-btn {
  margin: 4px 8px 0;
  padding: 4px 8px;
  background: none;
  border: 1px dashed var(--color-border);
  border-radius: 3px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 11px;
  text-align: left;
}
.add-btn:hover { color: var(--color-text); border-color: var(--color-accent); }

.no-palette {
  padding: 8px 10px;
  color: var(--color-text-muted);
  font-size: 11px;
}
</style>
