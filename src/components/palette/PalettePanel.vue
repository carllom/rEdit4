<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { makeColor } from '../../domain/color'
import {
  clonePalette,
  findPaletteUsage,
  paletteExceedsImage,
  buildRemapTable,
  reassignPalette,
} from '../../domain/paletteOps'
import ColorEditor from './ColorEditor.vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import NumericInput from '../ui/NumericInput.vue'
import AppSelect from '../ui/AppSelect.vue'
import CheckerSwatch from '../ui/CheckerSwatch.vue'

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

const selectedPaletteId = computed({
  get: () => editor.activePaletteId ?? '',
  set: (v: string) => onPalettePickerChange(v),
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
    <div class="rd-section-label section-label">Palette</div>

    <!-- Palette picker (shown when project has more than one palette) -->
    <div v-if="allPalettes.length > 1" class="picker-row">
      <AppSelect class="palette-picker" v-model="selectedPaletteId">
        <option v-for="p in allPalettes" :key="p.id" :value="p.id">{{ p.name }}</option>
      </AppSelect>
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
        :title="`[${index}] ${color.name}`"
        @click="paint.setColorIndex(index)"
      >
        <CheckerSwatch class="swatch-fill" :color="color" />
      </button>
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
    <AppDialog
      :open="showEditGuardDialog"
      title="Shared palette"
      stack
      @close="showEditGuardDialog = false"
    >
      <p class="dialog-body">
        This palette is used by {{ sharedWithImages.length }} images. Editing a color will affect all of them.
      </p>
      <template #actions>
        <AppButton class="col-btn" variant="primary" @click="cloneAndDecouple">Clone &amp; decouple</AppButton>
        <AppButton class="col-btn" @click="proceedEditShared">Edit shared palette</AppButton>
        <AppButton class="col-btn" variant="muted" @click="showEditGuardDialog = false">Cancel</AppButton>
      </template>
    </AppDialog>

    <!-- Reassignment dialog -->
    <AppDialog
      :open="showReassignDialog"
      title="Palette size mismatch"
      stack
      width="300px"
      @close="closeReassignDialog"
    >
      <p class="dialog-body">
        The target palette is smaller. Pixel indices
        <strong>{{ outOfRangePreview }}</strong>
        are in use but out of range. How should they be handled?
      </p>
      <template #actions>
        <AppButton class="col-btn" @click="executeReassign('remove')">Remove unmapped pixels</AppButton>
        <div class="remap-row">
          <AppButton class="col-btn remap-btn" @click="executeReassign('remap-to-n')">Remap to index</AppButton>
          <NumericInput
            class="remap-n-input"
            v-model="remapToNValue"
            :min="1"
            :max="(pendingNewPalette?.colors.length ?? 2) - 1"
          />
        </div>
        <AppButton v-if="canCompress" class="col-btn" @click="executeReassign('compress')">Compress indices</AppButton>
        <AppButton class="col-btn" variant="muted" @click="closeReassignDialog">Cancel</AppButton>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.palette-panel {
  padding: var(--rd-space-3) 0;
  display: flex;
  flex-direction: column;
}

.section-label {
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

.palette-picker { width: 100%; }

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
  overflow: hidden;
}

.swatch-fill { display: block; width: 100%; height: 100%; }

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

/* ---- Dialog body content ---- */

.dialog-body {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-relaxed);
}

.col-btn { width: 100%; text-align: left; }

.remap-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
}

.remap-btn { flex: 1; }
.remap-n-input { width: 52px; }
</style>
