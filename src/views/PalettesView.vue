<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { usePaletteTemplateStore } from '../stores/paletteTemplateStore'
import { makePalette } from '../domain/color'
import { clonePalette, findPaletteUsage } from '../domain/paletteOps'
import type { PaletteKind } from '../domain/model'
import PaletteEntryCard from '../components/palette/PaletteEntryCard.vue'

interface PaletteEntry {
  id: string
  name: string
  description: string
  colors: Color[]
  kind: PaletteKind
}

const project = useProjectStore()
const templates = usePaletteTemplateStore()

const projectEntries = computed<PaletteEntry[]>(() =>
  (project.project?.palettes ?? []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    colors: p.colors,
    kind: 'project' as PaletteKind,
  }))
)

const templateEntries = computed<PaletteEntry[]>(() => [
  ...templates.builtIn.map(t => ({
    id: t.id, name: t.name, description: t.description, colors: t.colors, kind: 'builtin' as PaletteKind,
  })),
  ...templates.userTemplates.map(t => ({
    id: t.id, name: t.name, description: t.description, colors: t.colors, kind: 'user-template' as PaletteKind,
  })),
])

const allEntries = computed(() => [...projectEntries.value, ...templateEntries.value])
const selectedId = ref<string | null>(null)
const selectedEntry = computed(() => allEntries.value.find(e => e.id === selectedId.value) ?? null)

// Editor local state
const editName = ref('')
const editDesc = ref('')
const deleteError = ref<string | null>(null)
const promoteError = ref<string | null>(null)
const promoteSuccess = ref(false)

watch(selectedEntry, (entry) => {
  editName.value = entry?.name ?? ''
  editDesc.value = entry?.description ?? ''
  deleteError.value = null
  promoteError.value = null
  promoteSuccess.value = false
}, { immediate: true })

function createPalette() {
  if (!project.project) return
  const palette = makePalette('New Palette')
  project.project.palettes.push(palette)
  project.markDirty()
  selectedId.value = palette.id
}

function commitName() {
  const entry = selectedEntry.value
  if (!entry || entry.kind !== 'project') return
  const palette = project.getPalette(entry.id)
  if (!palette) return
  palette.name = editName.value.trim() || 'Unnamed'
  editName.value = palette.name
  project.markDirty()
}

function commitDesc() {
  const entry = selectedEntry.value
  if (!entry || entry.kind !== 'project') return
  const palette = project.getPalette(entry.id)
  if (!palette) return
  palette.description = editDesc.value
  project.markDirty()
}

function cloneCurrent() {
  if (!project.project) return
  const entry = selectedEntry.value
  if (!entry) return
  const src = [
    ...(project.project.palettes ?? []),
    ...templates.builtIn,
    ...templates.userTemplates,
  ].find(p => p.id === entry.id)
  if (!src) return
  const cloned = clonePalette(src)
  cloned.name = src.name + ' Copy'
  project.project.palettes.push(cloned)
  project.markDirty()
  selectedId.value = cloned.id
}

function deleteCurrent() {
  if (!project.project) return
  const entry = selectedEntry.value
  if (!entry || entry.kind !== 'project') return
  deleteError.value = null
  const usages = findPaletteUsage(project.project, entry.id)
  if (usages.length > 0) {
    const names = usages.map(img => `"${img.name}"`).join(', ')
    deleteError.value = `In use by ${names}`
    return
  }
  project.project.palettes = project.project.palettes.filter(p => p.id !== entry.id)
  project.markDirty()
  selectedId.value = null
}

function promote() {
  const entry = selectedEntry.value
  if (!entry || entry.kind !== 'project') return
  const palette = project.getPalette(entry.id)
  if (!palette) return
  promoteError.value = null
  promoteSuccess.value = false
  try {
    templates.promoteToTemplate(palette)
    promoteSuccess.value = true
  } catch (e: unknown) {
    promoteError.value = e instanceof Error ? e.message : String(e)
  }
}

function importTemplate() {
  if (!project.project) return
  const entry = selectedEntry.value
  if (!entry || entry.kind === 'project') return
  templates.importIntoProject(entry.id, project.project)
  project.markDirty()
  const newPalette = project.project.palettes[project.project.palettes.length - 1]
  if (newPalette) selectedId.value = newPalette.id
}

function deleteUserTemplate() {
  const entry = selectedEntry.value
  if (!entry || entry.kind !== 'user-template') return
  templates.deleteUserTemplate(entry.name)
  selectedId.value = null
}
</script>

<template>
  <div class="palettes-view">
    <!-- Selector panel -->
    <div class="selector-panel">
      <div class="section-header">
        Project Palettes
        <button class="header-new-btn" title="New palette" @click="createPalette">+</button>
      </div>
      <div v-if="projectEntries.length === 0" class="section-empty">No palettes in project</div>
      <button
        v-for="entry in projectEntries"
        :key="entry.id"
        :class="['palette-entry', { selected: selectedId === entry.id }]"
        @click="selectedId = entry.id"
      >
        <PaletteEntryCard :palette="entry" :kind="entry.kind" />
      </button>

      <div class="section-header section-header--templates">Templates</div>
      <div v-if="templateEntries.length === 0" class="section-empty">No templates</div>
      <button
        v-for="entry in templateEntries"
        :key="entry.id"
        :class="['palette-entry', { selected: selectedId === entry.id }]"
        @click="selectedId = entry.id"
      >
        <PaletteEntryCard :palette="entry" :kind="entry.kind" />
      </button>
    </div>

    <!-- Editor panel -->
    <div class="editor-panel">
      <template v-if="selectedEntry">
        <!-- Header -->
        <div class="editor-panel-header">
          <template v-if="selectedEntry.kind === 'project'">
            <input
              class="editor-name-input"
              v-model="editName"
              placeholder="Palette name"
              @blur="commitName"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
          </template>
          <template v-else>
            <span class="editor-palette-name">{{ selectedEntry.name }}</span>
            <span v-if="selectedEntry.kind === 'builtin'" class="editor-readonly-badge">read-only</span>
            <span v-else class="editor-user-badge">user template</span>
          </template>
        </div>

        <!-- Project palette editor -->
        <template v-if="selectedEntry.kind === 'project'">
          <div class="editor-body">
            <div class="editor-field">
              <label class="editor-label">Description</label>
              <textarea
                class="editor-desc-input"
                v-model="editDesc"
                rows="2"
                placeholder="Optional description…"
                @blur="commitDesc"
              />
            </div>

            <div class="editor-section-title">Actions</div>
            <div class="editor-actions">
              <button class="btn" @click="cloneCurrent">Clone</button>
              <button class="btn btn--danger" @click="deleteCurrent">Delete</button>
            </div>
            <div v-if="deleteError" class="editor-msg editor-msg--error">{{ deleteError }}</div>

            <div class="editor-section-title">Template</div>
            <div class="editor-actions">
              <button class="btn" @click="promote">Promote to template</button>
            </div>
            <div v-if="promoteError" class="editor-msg editor-msg--error">{{ promoteError }}</div>
            <div v-if="promoteSuccess" class="editor-msg editor-msg--success">Saved as template "{{ selectedEntry.name }}"</div>
          </div>
        </template>

        <!-- Template viewer (built-in or user) -->
        <template v-else>
          <div class="editor-body">
            <div v-if="selectedEntry.description" class="editor-desc-static">{{ selectedEntry.description }}</div>
            <div class="editor-section-title">Actions</div>
            <div class="editor-actions">
              <button class="btn" @click="importTemplate">Import into project</button>
              <button
                v-if="selectedEntry.kind === 'user-template'"
                class="btn btn--danger"
                @click="deleteUserTemplate"
              >Delete template</button>
            </div>
          </div>
        </template>
      </template>

      <div v-else class="editor-panel-empty">
        <p>Select a palette to edit.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palettes-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Selector panel ── */
.selector-panel {
  width: var(--rd-sidebar-w-wide);
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  padding: var(--rd-space-3) var(--rd-space-3) var(--rd-space-2) var(--rd-space-5);
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  letter-spacing: var(--rd-tracking-wide);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-1);
  position: sticky;
  top: 0;
  z-index: var(--rd-z-sticky);
}

.section-header--templates {
  margin-top: var(--rd-space-4);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
}

.header-new-btn {
  margin-left: auto;
  width: var(--rd-hit-sm);
  height: var(--rd-hit-sm);
  padding: 0;
  line-height: 1;
  font-size: var(--rd-text-14);
  background: none;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-new-btn:hover { color: var(--rd-color-text); background: var(--rd-color-surface-3); }

.section-empty {
  padding: var(--rd-space-4) var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}

.palette-entry {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--rd-space-4) var(--rd-space-5);
  border: none;
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  background: none;
  color: var(--rd-color-text);
  cursor: pointer;
  border-left: var(--rd-border-w-active) solid transparent;
}
.palette-entry:hover { background: var(--rd-color-surface-2); }
.palette-entry.selected {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
}

/* ── Editor panel ── */
.editor-panel {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.editor-panel-header {
  display: flex;
  align-items: center;
  gap: var(--rd-space-4);
  padding: var(--rd-space-4) var(--rd-space-7);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-1);
  flex-shrink: 0;
}

.editor-name-input {
  flex: 1;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-13);
  font-weight: var(--rd-weight-semibold);
  padding: 3px 7px;
  outline: none;
}
.editor-name-input:focus { border-color: var(--rd-color-accent); }

.editor-palette-name {
  font-size: var(--rd-text-13);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text);
}

.editor-readonly-badge {
  font-size: var(--rd-text-9);
  padding: 2px 6px;
  border-radius: var(--rd-radius-1);
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text-muted);
  border: var(--rd-border-w) solid var(--rd-color-border);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
}

.editor-user-badge {
  font-size: var(--rd-text-9);
  padding: 2px 6px;
  border-radius: var(--rd-radius-1);
  background: var(--rd-color-accent-soft);
  color: var(--rd-color-accent);
  border: var(--rd-border-w) solid var(--rd-color-accent-soft-border);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
}

.editor-body {
  padding: var(--rd-space-7) var(--rd-space-7);
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-6);
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
}

.editor-label {
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  letter-spacing: var(--rd-tracking-wide);
  text-transform: uppercase;
  color: var(--rd-color-text-muted);
}

.editor-desc-input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  font-family: inherit;
  padding: 5px 7px;
  outline: none;
  resize: vertical;
  min-height: 46px;
}
.editor-desc-input:focus { border-color: var(--rd-color-accent); }

.editor-desc-static {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-normal);
}

.editor-section-title {
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  letter-spacing: var(--rd-tracking-wide);
  text-transform: uppercase;
  color: var(--rd-color-text-muted);
  padding-top: var(--rd-space-2);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
}

.editor-actions {
  display: flex;
  gap: var(--rd-space-3);
  flex-wrap: wrap;
}

.btn {
  padding: 5px 12px;
  font-size: var(--rd-text-12);
  font-family: inherit;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
}
.btn:hover { background: var(--rd-color-surface-2); border-color: var(--rd-color-text-muted); }

.btn--danger { color: var(--rd-color-danger); }
.btn--danger:hover { border-color: var(--rd-color-danger); }

.editor-msg {
  font-size: var(--rd-text-11);
  padding: var(--rd-space-2) var(--rd-space-4);
  border-radius: var(--rd-radius-1);
  border-left: var(--rd-border-w-active) solid;
}
.editor-msg--error {
  color: var(--rd-color-danger);
  border-left-color: var(--rd-color-danger);
  background: var(--rd-color-danger-soft);
}
.editor-msg--success {
  color: var(--rd-color-success);
  border-left-color: var(--rd-color-success);
  background: var(--rd-color-success-soft);
}

.editor-panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-13);
}
</style>
