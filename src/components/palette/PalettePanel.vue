<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { colorToCSSRGBA, makeColor } from '../../domain/color'
import {
  clonePalette,
  findPaletteUsage,
  paletteExceedsImage,
  buildRemapTable,
  reassignPalette,
} from '../../domain/paletteOps'
import ColorEditor from './ColorEditor.vue'

const router = useRouter()
const project = useProjectStore()
const editor = useEditorStore()
const paint = usePaintStore()

const palette = computed(() => {
  if (!editor.activePaletteId) return null
  return project.getPalette(editor.activePaletteId) ?? null
})

const activeImage = computed(() => {
  if (!editor.activeImageId || !project.project) return null
  return project.project.images.find(img => img.id === editor.activeImageId) ?? null
})

const allPalettes = computed(() => project.project?.palettes ?? [])

const sharedWithImages = computed(() => {
  if (!palette.value || !project.project) return []
  return findPaletteUsage(project.project, palette.value.id)
})

const isShared = computed(() => sharedWithImages.value.length > 1)

const displayColors = computed(() => {
  if (!palette.value) return []
  return palette.value.colors.map((c, i) => ({ color: c, index: i }))
})

const selectedColor = computed(() => {
  if (!palette.value) return null
  return palette.value.colors[paint.activeColorIndex] ?? null
})

// ---- Shared-palette edit guard ----

const editGuardPassed = ref(false)
const showEditGuardDialog = ref(false)

watch([() => paint.activeColorIndex, () => editor.activePaletteId], () => {
  editGuardPassed.value = false
  showEditGuardDialog.value = false
})

const colorEditorVisible = computed(
  () => !!selectedColor.value && paint.activeColorIndex !== 0 && (!isShared.value || editGuardPassed.value)
)

const editGuardButtonVisible = computed(
  () => !!selectedColor.value && paint.activeColorIndex !== 0 && isShared.value && !editGuardPassed.value
)

function requestEdit() {
  showEditGuardDialog.value = true
}

function uniqueCloneName(baseName: string): string {
  const existingNames = new Set(project.project!.palettes.map(p => p.name))
  let n = 2
  while (existingNames.has(`${baseName} (${n})`)) n++
  return `${baseName} (${n})`
}

function cloneAndDecouple() {
  if (!palette.value || !activeImage.value || !project.project) return
  const clone = clonePalette(palette.value)
  clone.name = uniqueCloneName(palette.value.name)
  project.project.palettes.push(clone)
  activeImage.value.paletteId = clone.id
  editor.activePaletteId = clone.id
  editGuardPassed.value = true
  showEditGuardDialog.value = false
  project.markDirty()
}

function proceedEditShared() {
  editGuardPassed.value = true
  showEditGuardDialog.value = false
}

// ---- Color add / edit ----

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

// ---- Reassignment flow ----

const pendingNewPaletteId = ref<string | null>(null)
const showReassignDialog = ref(false)
const outOfRangeIndices = ref<number[]>([])
const remapToNValue = ref(1)

const pendingNewPalette = computed(() =>
  pendingNewPaletteId.value ? (project.getPalette(pendingNewPaletteId.value) ?? null) : null
)

const usedIndices = computed<number[]>(() => {
  if (!activeImage.value) return []
  const used = new Set<number>()
  for (const layer of activeImage.value.layers) {
    for (let i = 0; i < layer.data.length; i++) used.add(layer.data[i])
  }
  return [...used]
})

const canCompress = computed(() => {
  if (!pendingNewPalette.value) return false
  const targetSlots = pendingNewPalette.value.colors.length - 1 // slots 1..n
  const nonZeroUsed = usedIndices.value.filter(i => i !== 0)
  return nonZeroUsed.length <= targetSlots
})

function onPalettePickerChange(newId: string) {
  if (newId === editor.activePaletteId) return
  const toPalette = project.getPalette(newId)
  if (!toPalette) return

  const image = activeImage.value
  if (!image) {
    editor.activePaletteId = newId
    return
  }

  const exceeded = paletteExceedsImage(image, toPalette)
  if (exceeded.length === 0) {
    reassignPalette(image, toPalette)
    editor.activePaletteId = toPalette.id
    editGuardPassed.value = false
    project.markDirty()
    return
  }

  pendingNewPaletteId.value = newId
  outOfRangeIndices.value = exceeded
  remapToNValue.value = 1
  showReassignDialog.value = true
}

function executeReassign(strategy: 'remove' | 'remap-to-n' | 'compress') {
  const image = activeImage.value
  const toPalette = pendingNewPalette.value
  if (!image || !toPalette) return
  const maxN = toPalette.colors.length - 1
  const n = Math.max(1, Math.min(maxN, remapToNValue.value))
  const table = buildRemapTable(usedIndices.value, toPalette.colors.length, strategy, n)
  reassignPalette(image, toPalette, table)
  editor.activePaletteId = toPalette.id
  editGuardPassed.value = false
  project.markDirty()
  closeReassignDialog()
}

function closeReassignDialog() {
  showReassignDialog.value = false
  pendingNewPaletteId.value = null
  outOfRangeIndices.value = []
}

const outOfRangePreview = computed(() => {
  const shown = outOfRangeIndices.value.slice(0, 5).join(', ')
  return outOfRangeIndices.value.length > 5 ? shown + ', …' : shown
})
</script>

<template>
  <div class="palette-panel">
    <div class="section-label">Palette</div>

    <!-- Palette picker (shown when project has more than one palette) -->
    <div v-if="allPalettes.length > 1" class="picker-row">
      <select
        class="palette-picker"
        :value="editor.activePaletteId ?? ''"
        @change="onPalettePickerChange(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in allPalettes" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>
    <div v-else-if="palette" class="palette-name">{{ palette.name }}</div>

    <!-- Sharing badge -->
    <div v-if="isShared" class="shared-badge">
      Shared with {{ sharedWithImages.length }} images
    </div>

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

    <!-- Edit guard button (replaces ColorEditor when palette is shared and guard not yet passed) -->
    <button v-if="editGuardButtonVisible" class="edit-guard-btn" @click="requestEdit">
      Edit color…
    </button>

    <!-- Inline RGBA color editor (unchanged appearance) -->
    <ColorEditor
      v-if="colorEditorVisible"
      :color="selectedColor!"
      @change="onColorChange"
    />

    <!-- Manage palettes link -->
    <a class="manage-link" href="#" @click.prevent="router.push('/palettes')">Manage palettes →</a>

    <div v-if="!palette" class="no-palette">No palette</div>

    <!-- Shared-palette edit guard dialog -->
    <Teleport to="body">
      <div v-if="showEditGuardDialog" class="overlay" @click.self="showEditGuardDialog = false">
        <div class="dialog" role="dialog" aria-modal="true">
          <div class="dialog-title">Shared palette</div>
          <div class="dialog-message">
            This palette is used by {{ sharedWithImages.length }} images. Editing a color will affect all of them.
          </div>
          <div class="dialog-actions col">
            <button class="btn primary" @click="cloneAndDecouple">Clone &amp; decouple</button>
            <button class="btn" @click="proceedEditShared">Edit shared palette</button>
            <button class="btn muted" @click="showEditGuardDialog = false">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reassignment dialog -->
    <Teleport to="body">
      <div v-if="showReassignDialog" class="overlay" @click.self="closeReassignDialog">
        <div class="dialog" role="dialog" aria-modal="true">
          <div class="dialog-title">Palette size mismatch</div>
          <div class="dialog-message">
            The target palette is smaller. Pixel indices
            <strong>{{ outOfRangePreview }}</strong>
            are in use but out of range. How should they be handled?
          </div>
          <div class="dialog-actions col">
            <button class="btn" @click="executeReassign('remove')">Remove unmapped pixels</button>
            <div class="remap-row">
              <button class="btn remap-btn" @click="executeReassign('remap-to-n')">Remap to index</button>
              <input
                class="remap-n-input"
                type="number"
                :min="1"
                :max="(pendingNewPalette?.colors.length ?? 2) - 1"
                :value="remapToNValue"
                @input="remapToNValue = Number(($event.target as HTMLInputElement).value)"
              />
            </div>
            <button v-if="canCompress" class="btn" @click="executeReassign('compress')">Compress indices</button>
            <button class="btn muted" @click="closeReassignDialog">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.palette-panel {
  padding: var(--rd-space-3) 0;
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: var(--rd-text-10);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
  color: var(--rd-color-text-muted);
  padding: var(--rd-space-2) var(--rd-space-5) var(--rd-space-1);
}

.palette-name {
  font-size: var(--rd-text-11);
  padding: var(--rd-space-1) var(--rd-space-5) var(--rd-space-2);
  color: var(--rd-color-text-muted);
}

.picker-row {
  padding: var(--rd-space-1) var(--rd-space-4) var(--rd-space-2);
}

.palette-picker {
  width: 100%;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
}
.palette-picker:focus { border-color: var(--rd-color-accent); }

.shared-badge {
  font-size: var(--rd-text-10);
  color: var(--rd-color-accent);
  padding: 0 var(--rd-space-5) var(--rd-space-2);
  opacity: 0.85;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--rd-space-1);
  padding: var(--rd-space-2) var(--rd-space-4);
}

.swatch {
  aspect-ratio: 1;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: 1px;
  cursor: pointer;
  padding: 0;
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-light) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-light) 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: var(--c, var(--rd-color-checker-dark));
}

.swatch::after {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: var(--c, transparent);
}

.swatch:hover {
  outline: var(--rd-border-w) solid var(--rd-color-accent-hover);
  outline-offset: 1px;
}
.swatch.active {
  outline: var(--rd-border-w-active) solid var(--rd-color-accent);
  outline-offset: 1px;
  position: relative;
  z-index: 1;
}

.add-btn {
  margin: var(--rd-space-2) var(--rd-space-4) 0;
  padding: var(--rd-space-2) var(--rd-space-4);
  background: none;
  border: var(--rd-border-w) dashed var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-11);
  text-align: left;
}
.add-btn:hover { color: var(--rd-color-text); border-color: var(--rd-color-accent); }

.edit-guard-btn {
  margin: var(--rd-space-3) var(--rd-space-4) 0;
  padding: 5px var(--rd-space-4);
  background: none;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-11);
  text-align: left;
}
.edit-guard-btn:hover { color: var(--rd-color-text); border-color: var(--rd-color-accent); }

.manage-link {
  display: block;
  margin: var(--rd-space-4) var(--rd-space-5) var(--rd-space-2);
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  text-decoration: none;
  cursor: pointer;
}
.manage-link:hover { color: var(--rd-color-accent); }

.no-palette {
  padding: var(--rd-space-4) var(--rd-space-5);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
}

/* ---- Dialogs ---- */

.overlay {
  position: fixed;
  inset: 0;
  background: var(--rd-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--rd-z-overlay);
}

.dialog {
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-3);
  box-shadow: var(--rd-shadow-dialog);
  padding: var(--rd-space-8) var(--rd-space-9);
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-6);
}

.dialog-title {
  font-size: var(--rd-text-14);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-strong);
}

.dialog-message {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-relaxed);
}

.dialog-actions.col {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-3);
  margin-top: var(--rd-space-2);
}

.btn {
  padding: 5px 12px;
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-12);
  text-align: left;
}
.btn:hover { background: var(--rd-color-surface-2); border-color: var(--rd-color-text-muted); }
.btn.primary {
  background: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
  font-weight: var(--rd-weight-semibold);
}
.btn.primary:hover { background: var(--rd-color-accent-hover); border-color: var(--rd-color-accent-hover); }
.btn.muted { color: var(--rd-color-text-muted); background: none; border-color: transparent; }
.btn.muted:hover { color: var(--rd-color-text); background: var(--rd-color-surface-3); border-color: transparent; }

.remap-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
}

.remap-btn { flex: 1; }

.remap-n-input {
  width: 52px;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 4px 6px;
  outline: none;
  text-align: right;
  font-family: var(--rd-font-mono);
  font-variant-numeric: tabular-nums;
}
.remap-n-input:focus { border-color: var(--rd-color-accent); }
</style>
