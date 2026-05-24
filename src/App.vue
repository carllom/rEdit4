<script setup lang="ts">
import { watch, onMounted, ref, nextTick } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './components/ui/AppSidebar.vue'
import { useProjectStore } from './stores/projectStore'
import { useEditorStore } from './stores/editorStore'
import { loadProject, saveProject } from './storage/db'

const project = useProjectStore()
const editor = useEditorStore()

// --- Project rename ---
const renamingProject = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)

async function startRename() {
  if (!project.project) return
  renamingProject.value = true
  await nextTick()
  renameInput.value?.select()
}

function commitRename(value: string) {
  if (project.project) {
    project.project.name = value.trim() || project.project.name
    project.markDirty()
  }
  renamingProject.value = false
}

function cancelRename() { renamingProject.value = false }

// Startup: load saved project, or auto-create a blank one
onMounted(async () => {
  const saved = await loadProject()
  if (saved) {
    project.project = saved
    // Restore active image/layer if they still exist
    if (editor.activeImageId) {
      const img = project.getImage(editor.activeImageId)
      if (!img) {
        editor.activeImageId = null
        editor.activeLayerId = null
      }
    }
    // Auto-select first image if none is active
    if (!editor.activeImageId && saved.images.length > 0) {
      const img = saved.images[0]
      editor.setActiveImage(img.id, img.layers[img.layers.length - 1].id, img.paletteId)
    }
    if (!editor.activePaletteId && saved.palettes[0]) {
      editor.activePaletteId = saved.palettes[0].id
    }
  } else {
    project.newProject()
    if (project.project?.palettes[0]) {
      editor.activePaletteId = project.project.palettes[0].id
    }
  }
})

// Debounced auto-save: 2 seconds after isDirty flips true
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(() => project.isDirty, (dirty) => {
  if (!dirty || !project.project) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (!project.project) return
    await saveProject(project.project)
    project.markClean()
  }, 2000)
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <span class="app-title">rEdit</span>
      <template v-if="project.project">
        <input
          v-if="renamingProject"
          ref="renameInput"
          class="project-rename-input"
          :value="project.project.name"
          @blur="commitRename(($event.target as HTMLInputElement).value)"
          @keydown.enter="commitRename(($event.target as HTMLInputElement).value)"
          @keydown.escape="cancelRename"
        />
        <span
          v-else
          class="project-name"
          title="Double-click to rename"
          @dblclick="startRename"
        >{{ project.project.name }}<span v-if="project.isDirty" class="dirty-marker">*</span></span>
      </template>
    </header>
    <div class="app-body">
      <AppSidebar />
      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Hide number input spinners globally — keyboard arrows still work */
input[type='number'] { -moz-appearance: textfield; }
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

:root {
  --color-bg:           #1e1e1e;
  --color-surface:      #252526;
  --color-surface-2:    #2d2d2d;
  --color-surface-3:    #3a3a3a;
  --color-border:       #3c3c3c;
  --color-text:         #cccccc;
  --color-text-muted:   #888888;
  --color-accent:       #4fc3f7;
  --color-accent-hover: #81d4fa;
  --color-danger:       #f44747;
  --sidebar-width:      240px;
  --header-height:      34px;
}

html, body, #app {
  height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  overflow: hidden;
  user-select: none;
}
</style>

<style scoped>
.app { display: flex; flex-direction: column; height: 100%; }

.app-header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  flex-shrink: 0;
}

.app-title { font-weight: 700; letter-spacing: 0.08em; color: var(--color-accent); font-size: 13px; }
.project-name { color: var(--color-text-muted); font-size: 11px; cursor: default; }
.dirty-marker { color: var(--color-accent); }
.project-rename-input {
  background: var(--color-surface-3);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  color: var(--color-text);
  font-size: 11px;
  padding: 1px 5px;
  outline: none;
  width: 160px;
}

.app-body { display: flex; flex: 1; overflow: hidden; }
.app-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>
