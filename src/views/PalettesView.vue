<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { usePaletteTemplateStore } from '../stores/paletteTemplateStore'
import { colorToCSSRGBA } from '../domain/color'
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

function swatchStyle(color: Color) {
  return { background: colorToCSSRGBA(color) }
}

function colorCount(entry: PaletteEntry) {
  return entry.colors.length - 1
}

function truncate(s: string, max = 100) {
  return s.length > max ? s.slice(0, max) + '…' : s
}
</script>

<template>
  <div class="palettes-view">
    <!-- Selector panel -->
    <div class="selector-panel">
      <div class="section-header">Project Palettes</div>
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

    <!-- Editor panel (placeholder for subsequent slices) -->
    <div class="editor-panel">
      <template v-if="selectedEntry">
        <div class="editor-panel-header">
          <span class="editor-palette-name">{{ selectedEntry.name }}</span>
          <span v-if="selectedEntry.kind === 'builtin'" class="editor-readonly-badge">read-only</span>
        </div>
        <div class="editor-panel-placeholder">
          <p>Palette editor — coming in a subsequent slice.</p>
        </div>
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
  padding: 6px 10px 4px;
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
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

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

.editor-panel-placeholder,
.editor-panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
