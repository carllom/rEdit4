<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { usePaletteTemplateStore } from '../stores/paletteTemplateStore'
import { colorToCSSRGBA, makePalette } from '../domain/color'
import { clonePalette, findPaletteUsage } from '../domain/paletteOps'
import type { Color } from '../domain/model'

type PaletteKind = 'project' | 'builtin' | 'user-template'

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

function swatchStyle(color: Color) {
  return { background: colorToCSSRGBA(color) }
}

function colorCount(entry: PaletteEntry) {
  return entry.colors.length - 1
}

function truncate(s: string, max = 100) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

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
        <div class="entry-row">
          <span class="entry-name">{{ entry.name }}</span>
          <span class="entry-count">{{ colorCount(entry) }} colors</span>
        </div>
        <div v-if="entry.description" class="entry-desc">{{ truncate(entry.description) }}</div>
        <div class="swatch-grid">
          <div
            v-for="(color, i) in entry.colors"
            :key="i"
            class="swatch-cell"
            :class="{ 'swatch-transparent': i === 0 }"
            :style="i === 0 ? {} : swatchStyle(color)"
          />
        </div>
      </button>

      <div class="section-header section-header--templates">Templates</div>
      <div v-if="templateEntries.length === 0" class="section-empty">No templates</div>
      <button
        v-for="entry in templateEntries"
        :key="entry.id"
        :class="['palette-entry', { selected: selectedId === entry.id }]"
        @click="selectedId = entry.id"
      >
        <div class="entry-row">
          <span class="entry-name">{{ entry.name }}</span>
          <span :class="['entry-badge', entry.kind === 'builtin' ? 'entry-badge--builtin' : 'entry-badge--user']">
            {{ entry.kind === 'builtin' ? 'built-in' : 'user' }}
          </span>
          <span class="entry-count">{{ colorCount(entry) }} colors</span>
        </div>
        <div v-if="entry.description" class="entry-desc">{{ truncate(entry.description) }}</div>
        <div class="swatch-grid">
          <div
            v-for="(color, i) in entry.colors"
            :key="i"
            class="swatch-cell"
            :class="{ 'swatch-transparent': i === 0 }"
            :style="i === 0 ? {} : swatchStyle(color)"
          />
        </div>
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
  width: 280px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 6px 6px 4px 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 1;
}

.section-header--templates {
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
}

.header-new-btn {
  margin-left: auto;
  width: 18px;
  height: 18px;
  padding: 0;
  line-height: 1;
  font-size: 14px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-new-btn:hover { color: var(--color-text); background: var(--color-surface-3); }

.section-empty {
  padding: 8px 10px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.palette-entry {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: none;
  color: var(--color-text);
  cursor: pointer;
}
.palette-entry:hover { background: var(--color-surface-2); }
.palette-entry.selected { background: var(--color-surface-3); }

.entry-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.entry-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-count {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.entry-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
}
.entry-badge--builtin {
  background: var(--color-surface-3);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.entry-badge--user {
  background: rgba(79, 195, 247, 0.12);
  color: var(--color-accent);
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.entry-desc {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-bottom: 5px;
  line-height: 1.3;
}

.swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}

.swatch-cell {
  width: 9px;
  height: 9px;
}

.swatch-transparent {
  background-image:
    linear-gradient(45deg, #555 25%, transparent 25%),
    linear-gradient(-45deg, #555 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #555 75%),
    linear-gradient(-45deg, transparent 75%, #555 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
  background-color: #333;
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
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.editor-name-input {
  flex: 1;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  padding: 3px 7px;
  outline: none;
}
.editor-name-input:focus { border-color: var(--color-accent); }

.editor-palette-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.editor-readonly-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 2px;
  background: var(--color-surface-3);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.editor-user-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 2px;
  background: rgba(79, 195, 247, 0.12);
  color: var(--color-accent);
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.editor-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.editor-desc-input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  color: var(--color-text);
  font-size: 11px;
  font-family: inherit;
  padding: 5px 7px;
  outline: none;
  resize: vertical;
  min-height: 46px;
}
.editor-desc-input:focus { border-color: var(--color-accent); }

.editor-desc-static {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.editor-section-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
}

.editor-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn {
  padding: 4px 10px;
  font-size: 11px;
  font-family: inherit;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  color: var(--color-text);
  cursor: pointer;
}
.btn:hover { background: var(--color-surface-3); border-color: var(--color-text-muted); }

.btn--danger { color: var(--color-danger); }
.btn--danger:hover { border-color: var(--color-danger); }

.editor-msg {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 2px;
  border-left: 2px solid;
}
.editor-msg--error {
  color: var(--color-danger);
  border-left-color: var(--color-danger);
  background: rgba(244, 71, 71, 0.08);
}
.editor-msg--success {
  color: #81c784;
  border-left-color: #81c784;
  background: rgba(129, 199, 132, 0.08);
}

.editor-panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
