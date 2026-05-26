<script setup lang="ts">
import { watch, onMounted, ref, nextTick } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { Settings } from '@lucide/vue'
import { useProjectStore } from './stores/projectStore'
import { useEditorStore } from './stores/editorStore'
import { useSettingsStore } from './stores/settingsStore'
import { loadProject, saveProject } from './storage/db'

const router = useRouter()
const route = useRoute()
const project = useProjectStore()

const appTabs = [
  { label: 'Image',     path: '/'          },
  { label: 'Sprite',    path: '/sprite'    },
  { label: 'Animation', path: '/animation' },
  { label: 'Sheet',     path: '/sheet'     },
  { label: 'Palettes',  path: '/palettes'  },
]
const editor = useEditorStore()
const { settings, resolvedDefaultPaletteId } = useSettingsStore()

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
    project.newProject('Untitled', resolvedDefaultPaletteId.value)
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
  }, settings.autosaveFrequency * 1000)
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
      <button class="settings-btn" title="Settings" @click="router.push('/settings')">
        <Settings :size="13" />
      </button>
    </header>
    <nav class="app-nav-tabs">
      <button
        v-for="tab in appTabs"
        :key="tab.path"
        :class="['nav-tab', { active: route.path === tab.path }]"
        @click="router.push(tab.path)"
      >{{ tab.label }}</button>
    </nav>
    <div class="app-body">
      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
/* Global reset + page chrome.
   All design tokens live in src/styles/tokens.css (imported in main.ts). */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Hide number input spinners globally — keyboard arrows still work */
input[type='number'] { -moz-appearance: textfield; }
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Form controls inherit the document font instead of the UA default */
input, button, select, textarea { font-family: inherit; }

html, body, #app {
  height: 100%;
  background: var(--rd-color-bg);
  color: var(--rd-color-text);
  font-family: var(--rd-font-sans);
  font-size: var(--rd-text-12);
  line-height: var(--rd-leading-normal);
  overflow: hidden;
  user-select: none;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.app { display: flex; flex-direction: column; height: 100%; }

.app-header {
  height: var(--rd-header-h);
  background: var(--rd-color-surface-1);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  align-items: center;
  gap: var(--rd-space-6);
  padding: 0 var(--rd-space-6);
  flex-shrink: 0;
}

.app-title {
  font-weight: var(--rd-weight-bold);
  letter-spacing: var(--rd-tracking-brand);
  color: var(--rd-color-accent);
  font-size: var(--rd-text-13);
}
.project-name {
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
  cursor: default;
}

.settings-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rd-hit-md);
  height: var(--rd-hit-md);
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
}
.settings-btn:hover { color: var(--rd-color-text); background: var(--rd-color-surface-3); }
.dirty-marker { color: var(--rd-color-accent); }
.project-rename-input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  padding: 1px 5px;
  outline: none;
  width: 160px;
}

.app-nav-tabs {
  display: flex;
  background: var(--rd-color-surface-1);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
  padding: 0 var(--rd-space-3);
  gap: var(--rd-space-1);
}

.nav-tab {
  background: none;
  border: none;
  border-bottom: var(--rd-border-w-active) solid transparent;
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
  padding: 5px 10px 4px;
  cursor: pointer;
  white-space: nowrap;
}
.nav-tab:hover { color: var(--rd-color-text); }
.nav-tab.active { color: var(--rd-color-text); border-bottom-color: var(--rd-color-accent); }

.app-body { display: flex; flex: 1; overflow: hidden; }
.app-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>
